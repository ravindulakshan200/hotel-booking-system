const test = require("node:test");
const assert = require("node:assert/strict");

const { getJwtSecret, getAllowedOrigins, getTrustProxy, getDbSslConfig, validateEnvironment } = require("../config/env");

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

test("SSL is disabled by default", () => {
  delete process.env.DB_SSL;
  assert.equal(getDbSslConfig(), false);
});

test("DB_SSL=false disables SSL", () => {
  process.env.DB_SSL = "false";
  assert.equal(getDbSslConfig(), false);
});



test("DB_SSL=true enables certificate verification", () => {
  process.env.DB_SSL = "true";
  delete process.env.DB_SSL_CA_BASE64;
  assert.deepEqual(getDbSslConfig(), { rejectUnauthorized: true });
});

test("Optional Base64 CA is decoded and supplied", () => {
  process.env.DB_SSL = "true";
  process.env.DB_SSL_CA_BASE64 = Buffer.from("fake-cert-content").toString("base64");
  const config = getDbSslConfig();
  assert.equal(config.rejectUnauthorized, true);
  assert.equal(config.ca, "fake-cert-content");
});

test("Whitespace around a valid Base64 CA is handled consistently", () => {
  process.env.DB_SSL = "true";
  process.env.DB_SSL_CA_BASE64 = "  " + Buffer.from("fake-cert-content").toString("base64") + "  \n";
  const config = getDbSslConfig();
  assert.equal(config.ca, "fake-cert-content");
});

test("Empty CA input behaves as absent", () => {
  process.env.DB_SSL = "true";
  process.env.DB_SSL_CA_BASE64 = "   ";
  const config = getDbSslConfig();
  assert.equal(config.rejectUnauthorized, true);
  assert.equal(config.ca, undefined);
});

test("Malformed Base64 is rejected strictly", () => {
  process.env.DB_SSL = "true";
  process.env.DB_SSL_CA_BASE64 = "not-base-64-!!";
  assert.throws(() => getDbSslConfig(), /valid base64 string/);
});

test("Decoded empty CA is rejected", () => {
  process.env.DB_SSL = "true";
  process.env.DB_SSL_CA_BASE64 = Buffer.from("   ").toString("base64");
  assert.throws(() => getDbSslConfig(), /empty certificate/);
});

test("Invalid DB_SSL is rejected", () => {
  process.env.DB_SSL = "invalid";
  assert.throws(() => getDbSslConfig(), /'true', 'false', or unset/);
});
