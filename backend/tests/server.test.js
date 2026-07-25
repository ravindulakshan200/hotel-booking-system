const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const { startServer } = require("../server");
const pool = require("../config/db");

const setupEnv = () => {
  return {
    JWT_SECRET: process.env.JWT_SECRET,
    PORT: process.env.PORT,
    DB_PORT: process.env.DB_PORT
  };
};

const restoreEnv = (original) => {
  const keys = ['JWT_SECRET', 'PORT', 'DB_PORT'];
  for (const key of keys) {
    if (original[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = original[key];
    }
  }
};

test("Failed DB verification prevents listen and throws error", async (t) => {
  const originalGetConnection = pool.getConnection;
  const originalEnv = setupEnv();

  // Mock failure
  pool.getConnection = async () => {
    throw new Error("Fake connection error containing secret_password_123");
  };

  try {
    process.env.JWT_SECRET = "test_only_secure_jwt_secret_for_testing_purposes";

    await assert.rejects(
      async () => { await startServer(); },
      (err) => {
        assert.match(err.message, /MySQL is currently unavailable/);
        assert.doesNotMatch(err.message, /secret_password_123/, "Should securely log failure without exposing credentials");
        // Ensure we don't expose secrets from connection strings if any exist
        return true;
      }
    );
  } finally {
    pool.getConnection = originalGetConnection;
    restoreEnv(originalEnv);
  }
});

test("Server starts only after successful DB verification", async () => {
  const originalGetConnection = pool.getConnection;
  const originalEnv = setupEnv();

  try {
    pool.getConnection = async () => ({ release: () => {} });

    process.env.PORT = "50123";
    process.env.JWT_SECRET = "test_only_secure_jwt_secret_for_testing_purposes";
    const server = await startServer();
    assert.ok(server.listening);

    // Test Graceful shutdown closes resources
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  } finally {
    pool.getConnection = originalGetConnection;
    restoreEnv(originalEnv);
  }
});

test("Executable entry-point sets non-zero exitCode on startup failure", () => {
  const node = process.execPath;
  const indexJsPath = path.join(__dirname, "..", "index.js");

  // Force failure by setting a bad DB port (or host)
  const result = spawnSync(node, [indexJsPath], {
    env: {
      ...process.env,
      DB_PORT: "99999",
      JWT_SECRET: "test_only_secure_jwt_secret_for_testing_purposes"
    }, // Guarantee connection failure
    encoding: "utf8",
  });

  assert.equal(result.status, 1, "Exit code should be 1 on failure");
  assert.match(result.stderr, /Server startup failed: MySQL is currently unavailable/, "Should securely log failure without exposing credentials");
});
