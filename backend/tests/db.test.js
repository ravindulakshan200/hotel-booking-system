const test = require("node:test");
const assert = require("node:assert/strict");

const loadPool = () => {
  delete require.cache[require.resolve("../config/db")];
  delete require.cache[require.resolve("../config/env")];
  return require("../config/db");
};

const originalEnv = { ...process.env };

test.afterEach(() => {
  process.env = { ...originalEnv };
});

test("Local/default pool configuration contains no ssl property", () => {
  delete process.env.DB_SSL;
  const pool = loadPool();
  assert.equal(pool.pool.config.connectionConfig.ssl, false);
});

test("DB_SSL=false contains no ssl property", () => {
  process.env.DB_SSL = "false";
  const pool = loadPool();
  assert.equal(pool.pool.config.connectionConfig.ssl, false);
});

test("DB_SSL=true supplies { rejectUnauthorized: true }", () => {
  process.env.DB_SSL = "true";
  delete process.env.DB_SSL_CA_BASE64;
  const pool = loadPool();
  assert.equal(pool.pool.config.connectionConfig.ssl.rejectUnauthorized, true);
  assert.equal(pool.pool.config.connectionConfig.ssl.ca, undefined);
});

test("Valid Base64 CA is decoded and supplied correctly", () => {
  process.env.DB_SSL = "true";
  const fakeCert = "fake-cert-content";
  process.env.DB_SSL_CA_BASE64 = Buffer.from(fakeCert).toString("base64");
  const pool = loadPool();
  assert.equal(pool.pool.config.connectionConfig.ssl.rejectUnauthorized, true);
  assert.equal(pool.pool.config.connectionConfig.ssl.ca, fakeCert);
});

test("Invalid Base64 rejects initialization safely", () => {
  process.env.DB_SSL = "true";
  process.env.DB_SSL_CA_BASE64 = "not-base-64-!!";
  assert.throws(() => loadPool(), /valid base64 string/);
});

test("Existing pool options remain intact", () => {
  delete process.env.DB_SSL;
  const pool = loadPool();
  assert.equal(pool.pool.config.waitForConnections, true);
  assert.equal(pool.pool.config.connectionLimit, 10);
});
