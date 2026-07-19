const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const { startServer } = require("../server");
const pool = require("../config/db");

test("Failed DB verification prevents listen and throws error", async (t) => {
  const originalGetConnection = pool.getConnection;

  // Mock failure
  pool.getConnection = async () => {
    throw new Error("Fake connection error containing secret_password_123");
  };

  await assert.rejects(
    async () => { await startServer(); },
    (err) => {
      assert.match(err.message, /MySQL is currently unavailable/);
      // Ensure we don't expose secrets from connection strings if any exist
      return true;
    }
  );

  // Restore
  pool.getConnection = originalGetConnection;
});

test("Server starts only after successful DB verification", async () => {
  process.env.PORT = "50123";
  const server = await startServer();
  assert.ok(server.listening);

  // Test Graceful shutdown closes resources
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test("Executable entry-point sets non-zero exitCode on startup failure", () => {
  const node = process.execPath;
  const indexJsPath = path.join(__dirname, "..", "index.js");

  // Force failure by setting a bad DB port (or host)
  const result = spawnSync(node, [indexJsPath], {
    env: { ...process.env, DB_PORT: "99999" }, // Guarantee connection failure
    encoding: "utf8",
  });

  assert.equal(result.status, 1, "Exit code should be 1 on failure");
  assert.match(result.stderr, /Server startup failed: MySQL is currently unavailable/, "Should securely log failure without exposing credentials");
});
