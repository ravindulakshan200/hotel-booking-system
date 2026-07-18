const test = require("node:test");
const assert = require("node:assert/strict");

const { getJwtSecret, getAllowedOrigins, validateEnvironment } = require("../config/env");

const originalEnv = { ...process.env };

test.afterEach(() => {
  process.env = { ...originalEnv };
});

test("JWT configuration rejects the example placeholder", () => {
  process.env.JWT_SECRET =
    "replace_with_a_private_random_secret_of_at_least_32_characters";
  assert.throws(() => getJwtSecret(), /private value/);
});

test("production requires a sufficiently long JWT secret", () => {
  process.env.NODE_ENV = "production";
  process.env.JWT_SECRET = "short-private-secret";
  assert.throws(() => validateEnvironment(), /at least 32 characters/);
});

test("multiple configured client origins are normalized", () => {
  process.env.CLIENT_URLS = "https://one.example, https://two.example ";
  assert.deepEqual(getAllowedOrigins(), [
    "https://one.example",
    "https://two.example",
  ]);
});
