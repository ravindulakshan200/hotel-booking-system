const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const fs = require("fs");
const path = require("path");
const pool = require("../config/db");

test.after(async () => {
  await pool.end();
});

test("backend/api/index.js exports the existing Express application", () => {
  const app = require("../api/index");
  assert.equal(typeof app, "function");
  assert.equal(typeof app.use, "function");
  assert.equal(typeof app.handle, "function");
});

test("Importing the serverless entry point does not call listen", () => {
  const app = require("../api/index");
  // Express app does not have .address or .close unless listen is called
  // and we store the returned Server, which api/index.js does not do.
  assert.equal(app.address, undefined);
  assert.equal(app.close, undefined);
});

test("Importing it does not call startServer", () => {
  const apiFileContent = fs.readFileSync(path.join(__dirname, "../api/index.js"), "utf8");
  assert.equal(apiFileContent.includes("startServer"), false);
});

test("/api/v1/health responds through the exported handler/app", async () => {
  const app = require("../api/index");

  // Create a temporary HTTP server bound to an ephemeral port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  const response = await fetch(`http://localhost:${port}/api/v1/health`);
  const body = await response.json();

  server.close();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
});

test("/api/v1/auth/login responds through the exported handler/app", async () => {
  const app = require("../api/index");

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  const response = await fetch(`http://localhost:${port}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{broken",
  });
  const body = await response.json();

  server.close();

  assert.equal(response.status, 400);
  assert.equal(body.message, "Invalid JSON request body.");
});

test("Vercel rewrite configuration is valid JSON and targets the serverless entry point", () => {
  const vercelJsonPath = path.join(__dirname, "../vercel.json");
  const content = fs.readFileSync(vercelJsonPath, "utf8");
  const config = JSON.parse(content);
  assert.ok(Array.isArray(config.rewrites));

  const catchAll = config.rewrites.find((r) => r.source === "/(.*)");
  assert.ok(catchAll);
  assert.equal(catchAll.destination, "/api");
});
