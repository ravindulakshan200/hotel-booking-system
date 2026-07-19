const test = require("node:test");
const assert = require("node:assert/strict");

const { getJwtSecret, getAllowedOrigins, getTrustProxy, validateEnvironment } = require("../config/env");

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

test("TRUST_PROXY defaults to false", () => {
  delete process.env.TRUST_PROXY;
  assert.equal(getTrustProxy(), false);
});

test("TRUST_PROXY=true is parsed correctly", () => {
  process.env.TRUST_PROXY = "true";
  assert.equal(getTrustProxy(), true);
});

test("TRUST_PROXY=1 becomes numeric hop count 1", () => {
  process.env.TRUST_PROXY = "1";
  assert.equal(getTrustProxy(), 1);
});

test("TRUST_PROXY invalid values are rejected", () => {
  process.env.TRUST_PROXY = "invalid";
  assert.throws(() => getTrustProxy(), /non-negative integer hop count/);
  process.env.TRUST_PROXY = "-1";
  assert.throws(() => getTrustProxy(), /non-negative integer hop count/);
});
