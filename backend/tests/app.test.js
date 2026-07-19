const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-only-secret-with-more-than-32-characters";
process.env.CLIENT_URL = "http://localhost:5173";

const pool = require("../config/db");
const createApp = require("../app");

let server;
let baseUrl;

test.before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test("liveness endpoint responds without requiring the database", async () => {
  const response = await fetch(`${baseUrl}/api/v1/health/live`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.data.status, "live");
});

test("security headers are enabled and Express signature is hidden", async () => {
  const response = await fetch(`${baseUrl}/api/v1/health/live`);
  assert.equal(response.headers.get("x-powered-by"), null);
  assert.ok(response.headers.get("content-security-policy"));
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});

test("unknown routes return the standard JSON 404 response", async () => {
  const response = await fetch(`${baseUrl}/api/v1/does-not-exist`);
  const body = await response.json();
  assert.equal(response.status, 404);
  assert.equal(body.success, false);
});

test("disallowed browser origins are rejected", async () => {
  const response = await fetch(`${baseUrl}/api/v1/health/live`, {
    headers: { Origin: "https://not-allowed.example" },
  });
  assert.equal(response.status, 403);
});

test("malformed JSON returns 400 rather than 500", async () => {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{broken",
  });
  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.message, "Invalid JSON request body.");
});
