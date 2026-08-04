const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-only-secret-with-more-than-32-characters";
process.env.NODE_ENV = "test"; 

const pool = require('../../config/db');
const createApp = require('../../app');
const bcrypt = require("bcryptjs");

let server;
let baseUrl;
let testEmail = "sectest_flow@example.com";
let testPassword = "Password123!";

test.before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const hashedPw = await bcrypt.hash(testPassword, 10);
  await pool.query(
    "INSERT INTO users (first_name, last_name, email, password, email_verified_at, is_active) VALUES (?, ?, ?, ?, NOW(), 1)",
    ["Sec", "User", testEmail, hashedPw]
  );
});

test.after(async () => {
  await pool.query("DELETE FROM users WHERE email = ?", [testEmail]);
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test("Security Regression Tests: True HTTP Flow", async (t) => {
  let csrfTokenValue = "";
  let csrfCookie = "";
  let sessionCookies = [];

  await t.test("CSRF endpoint returns token and Set-Cookie", async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/csrf-token`, { method: "GET" });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    
    csrfTokenValue = body.data.csrfToken;
    assert.ok(csrfTokenValue, "JSON must contain csrfToken");

    const setCookies = res.headers.getSetCookie();
    const csrfCookieHeader = setCookies.find(c => c.startsWith("csrfToken="));
    assert.ok(csrfCookieHeader, "Must set csrfToken cookie");
    assert.ok(csrfCookieHeader.includes("HttpOnly"), "csrfToken cookie must be HttpOnly");
    
    // Extract the raw cookie for future requests
    csrfCookie = csrfCookieHeader.split(";")[0];
  });

  await t.test("login sets HttpOnly JWT cookie and excludes it from JSON", async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfTokenValue,
        "Cookie": csrfCookie
      },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.ok(body.data.user, "Should return user object in JSON");
    assert.equal(body.data.token, undefined, "JWT must NOT be in JSON");

    const setCookies = res.headers.getSetCookie();
    assert.ok(setCookies.length >= 2, "Should set jwt and csrfToken cookies");
    
    const jwtCookieHeader = setCookies.find(c => c.startsWith("jwt="));
    assert.ok(jwtCookieHeader, "JWT cookie must be present");
    assert.ok(jwtCookieHeader.includes("HttpOnly"), "JWT cookie must be HttpOnly");
    assert.ok(jwtCookieHeader.includes("Path=/"), "JWT cookie must have Path=/");
    assert.ok(!jwtCookieHeader.includes("Domain="), "JWT cookie must NOT have Domain attribute");

    const newCsrfCookieHeader = setCookies.find(c => c.startsWith("csrfToken="));
    assert.ok(newCsrfCookieHeader, "csrfToken cookie must be present");
    assert.ok(newCsrfCookieHeader.includes("HttpOnly"), "csrfToken cookie must be HttpOnly");
    assert.ok(newCsrfCookieHeader.includes("Path=/"), "csrfToken cookie must have Path=/");
    assert.ok(!newCsrfCookieHeader.includes("Domain="), "csrfToken cookie must NOT have Domain attribute");

    // Capture cookies for authenticated requests
    sessionCookies = setCookies.map(c => c.split(";")[0]);
    
    // Optionally update our token memory if the backend rotated it
    if (body.data.csrfToken) {
      csrfTokenValue = body.data.csrfToken;
    }
  });

  await t.test("cookie-authenticated protected endpoint succeeds (safe method bypasses CSRF headers but needs JWT cookie)", async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/profile`, {
      method: "GET",
      headers: {
        "Cookie": sessionCookies.join("; ")
      }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.user.email, testEmail);
  });

  await t.test("missing JWT cookie fails on protected endpoint", async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/profile`, {
      method: "GET",
      headers: {
        "Cookie": sessionCookies.find(c => c.startsWith("csrfToken="))
      }
    });
    assert.equal(res.status, 401);
  });

  await t.test("Bearer-only authentication fails (no localStorage/token fallback)", async () => {
    // Extract JWT value for test
    const jwtHeader = sessionCookies.find(c => c.startsWith("jwt="));
    const tokenVal = jwtHeader.split("=")[1];

    const res = await fetch(`${baseUrl}/api/v1/auth/profile`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${tokenVal}`
      }
    });
    assert.equal(res.status, 401, "Bearer authentication must be rejected");
  });

  await t.test("valid real CSRF pair succeeds for mutation", async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfTokenValue,
        "Cookie": sessionCookies.join("; ")
      },
      body: JSON.stringify({ first_name: "Sec Updated" })
    });
    assert.equal(res.status, 200);
  });

  await t.test("missing CSRF header fails mutation", async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Cookie": sessionCookies.join("; ")
      },
      body: JSON.stringify({ first_name: "Sec Failed" })
    });
    assert.equal(res.status, 403);
  });

  await t.test("missing CSRF cookie fails mutation", async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfTokenValue,
        "Cookie": sessionCookies.find(c => c.startsWith("jwt=")) // missing csrfToken cookie
      },
      body: JSON.stringify({ first_name: "Sec Failed" })
    });
    assert.equal(res.status, 403);
  });

  await t.test("mismatched CSRF pair fails mutation", async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfTokenValue + "invalid",
        "Cookie": sessionCookies.join("; ")
      },
      body: JSON.stringify({ first_name: "Sec Failed" })
    });
    assert.equal(res.status, 403);
  });

  await t.test("logout clears both cookies", async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfTokenValue,
        "Cookie": sessionCookies.join("; ")
      }
    });
    assert.equal(res.status, 200);

    const setCookies = res.headers.getSetCookie();
    
    const jwtCookieHeader = setCookies.find(c => c.startsWith("jwt="));
    assert.ok(jwtCookieHeader.includes("Max-Age=0") || jwtCookieHeader.includes("Expires="), "jwt must be cleared");
    assert.ok(jwtCookieHeader.includes("Path=/"), "jwt clear must have Path=/");

    const csrfCookieHeader = setCookies.find(c => c.startsWith("csrfToken="));
    assert.ok(csrfCookieHeader.includes("Max-Age=0") || csrfCookieHeader.includes("Expires="), "csrfToken must be cleared");
    assert.ok(csrfCookieHeader.includes("Path=/"), "csrfToken clear must have Path=/");
  });

  await t.test("production environment sets Secure and SameSite=None", async () => {
    // temporarily set production
    const oldEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const res = await fetch(`${baseUrl}/api/v1/auth/csrf-token`, { method: "GET" });
    const setCookies = res.headers.getSetCookie();
    
    // revert
    process.env.NODE_ENV = oldEnv;

    const csrfCookieHeader = setCookies.find(c => c.startsWith("csrfToken="));
    assert.ok(csrfCookieHeader.includes("Secure"), "In production, cookie must be Secure");
    assert.ok(csrfCookieHeader.includes("SameSite=none") || csrfCookieHeader.includes("SameSite=None"), "In production, cookie must be SameSite=None");
  });
});
