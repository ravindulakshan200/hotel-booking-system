const test = require("node:test");
const assert = require("node:assert/strict");

// ── env setup ───────────────────────────────────────────────────────────────────
process.env.JWT_SECRET   = process.env.JWT_SECRET   || 'test-only-secret-with-more-than-32-characters';
process.env.CLIENT_URL   = process.env.CLIENT_URL   || 'http://localhost:5173';
process.env.NODE_ENV     = 'test';

const pool       = require('../../config/db');
const createApp  = require('../../app');
const User       = require('../../models/User');
const AuditLog   = require('../../models/AuditLog');
const { getAuthHeaders, getCsrfHeaders } = require('../helpers/authHelper');

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

test("PUT /api/v1/hotels/:id - Hotel update and archiving via status", async (t) => {
  const adminHeaders = getAuthHeaders(99, 'admin');
  const userHeaders = getAuthHeaders(100, 'user');
  const unauthHeaders = getCsrfHeaders();

  let capturedSql = "";
  let capturedParams = [];
  const originalQuery = pool.query;
  const originalFindUserById = User.findUserById;
  const originalAuditLogCreate = AuditLog.create;

  test.afterEach(() => {
    pool.query = originalQuery;
    User.findUserById = originalFindUserById;
    AuditLog.create = originalAuditLogCreate;
    capturedSql = "";
    capturedParams = [];
  });

  test.beforeEach(() => {
    User.findUserById = async (id) => {
      if (id === 99) return { id: 99, role: 'admin', is_verified: true, status: 'active' };
      if (id === 100) return { id: 100, role: 'user', is_verified: true, status: 'active' };
      return null;
    };
    AuditLog.create = async () => 1;
  });

  await t.test("Unauthenticated rejection", async () => {
    const res = await fetch(`${baseUrl}/api/v1/hotels/10`, {
      method: "PUT",
      headers: unauthHeaders,
      body: JSON.stringify({ status: "inactive" })
    });
    assert.equal(res.status, 401);
  });

  await t.test("Non-admin rejection", async () => {
    const res = await fetch(`${baseUrl}/api/v1/hotels/10`, {
      method: "PUT",
      headers: userHeaders,
      body: JSON.stringify({ status: "inactive" })
    });
    assert.equal(res.status, 403);
  });

  await t.test("Invalid hotel ID rejection", async () => {
    const res = await fetch(`${baseUrl}/api/v1/hotels/abc`, {
      method: "PUT",
      headers: adminHeaders,
      body: JSON.stringify({ status: "inactive" })
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.match(data.message, /Invalid hotel ID/);
  });

  await t.test("Invalid status rejection", async () => {
    pool.query = async (sql, params) => {
      if (sql.includes("SELECT * FROM hotels WHERE id = ?")) {
        return [[{ id: 10, name: "Test Hotel", status: "active" }]];
      }
      return originalQuery(sql, params);
    };

    const res = await fetch(`${baseUrl}/api/v1/hotels/10`, {
      method: "PUT",
      headers: adminHeaders,
      body: JSON.stringify({ status: "deleted" })
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.message, 'Validation failed.');
    assert.match(data.errors[0], /status must be active or inactive/);
  });

  await t.test("Unknown hotel 404", async () => {
    pool.query = async (sql, params) => {
      if (sql.includes("SELECT * FROM hotels WHERE id = ?")) return [[]];
      return originalQuery(sql, params);
    };

    const res = await fetch(`${baseUrl}/api/v1/hotels/9999`, {
      method: "PUT",
      headers: adminHeaders,
      body: JSON.stringify({ status: "inactive" })
    });
    assert.equal(res.status, 404);
  });

  await t.test("Successful active-to-inactive update", async () => {
    pool.query = async (sql, params) => {
      if (sql.includes("SELECT * FROM hotels WHERE id = ?")) {
        return [[{ id: 10, name: "Test Hotel", status: "active" }]];
      }
      if (sql.includes("UPDATE hotels SET")) {
        capturedSql = sql;
        capturedParams = params;
        return [{ affectedRows: 1 }];
      }
      return originalQuery(sql, params);
    };

    const res = await fetch(`${baseUrl}/api/v1/hotels/10`, {
      method: "PUT",
      headers: adminHeaders,
      body: JSON.stringify({ status: "inactive" })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);

    assert.ok(capturedSql.includes("status = ?"));
    assert.equal(capturedParams[0], "inactive");
    assert.equal(capturedParams[1], 10);
  });

  await t.test("Successful inactive-to-active update", async () => {
    pool.query = async (sql, params) => {
      if (sql.includes("SELECT * FROM hotels WHERE id = ?")) {
        return [[{ id: 10, name: "Test Hotel", status: "inactive" }]];
      }
      if (sql.includes("UPDATE hotels SET")) {
        capturedSql = sql;
        capturedParams = params;
        return [{ affectedRows: 1 }];
      }
      return originalQuery(sql, params);
    };

    const res = await fetch(`${baseUrl}/api/v1/hotels/10`, {
      method: "PUT",
      headers: adminHeaders,
      body: JSON.stringify({ status: "active" })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);

    assert.ok(capturedSql.includes("status = ?"));
    assert.equal(capturedParams[0], "active");
    assert.equal(capturedParams[1], 10);
  });
});
