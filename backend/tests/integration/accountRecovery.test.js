const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-only-secret-with-more-than-32-characters";
process.env.CLIENT_URL = "http://localhost:5173";
process.env.NODE_ENV = "test"; // to mock emails

const pool = require('../../config/db');
const createApp = require('../../app');
const User = require('../../models/User');
const { getCsrfHeaders } = require('../helpers/authHelper');

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

test("Account Recovery & Verification Flows", async (t) => {
  const testEmail = `test.recovery.${Date.now()}@example.com`;
  const testPassword = "Password123";

  await t.test("Register new user (unverified by default)", async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: "POST",
      headers: getCsrfHeaders(),
      body: JSON.stringify({
        first_name: "Test",
        last_name: "Recovery",
        email: testEmail,
        password: testPassword,
      }),
    });
    const body = await res.json();
    assert.equal(res.status, 201);
    assert.equal(body.message, "Account created successfully. Please verify your email.");
  });

  await t.test("Login before verification is rejected", async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: getCsrfHeaders(),
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    const body = await res.json();
    assert.equal(res.status, 403);
    assert.equal(body.message, "Please verify your email address.");
  });

  let tokenHash;
  let rawToken;

  await t.test("Fetch token from DB for verification test", async () => {
    const [rows] = await pool.query("SELECT email_verification_token_hash FROM users WHERE email = ?", [testEmail]);
    const user = rows[0];
    assert.ok(user.email_verification_token_hash);
    tokenHash = user.email_verification_token_hash;
    // We can't get rawToken from DB, so we'll simulate the endpoint by bypassing DB for the raw token
    // Actually, we can't test /verify-email/:token directly without the raw token.
    // Instead we can use the resend endpoint to see it succeeds, but still no raw token.
    // We will just directly call verifyEmail in User model or test the resend verification endpoint.
  });

  await t.test("Resend verification email", async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/resend-verification`, {
      method: "POST",
      headers: getCsrfHeaders(),
      body: JSON.stringify({ email: testEmail }),
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.message, "If the email is registered and unverified, a verification link has been sent.");
  });

  await t.test("Manually verify the user in DB for further tests", async () => {
    const user = await User.findUserByEmail(testEmail);
    await User.verifyEmail(user.id);
    const verifiedUser = await User.findUserByEmail(testEmail);
    assert.ok(verifiedUser.email_verified_at);
  });

  await t.test("Login succeeds after verification", async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: getCsrfHeaders(),
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.ok(res.headers.get("set-cookie")?.includes("jwt="));
  });

  await t.test("Forgot password flow returns generic response", async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/forgot-password`, {
      method: "POST",
      headers: getCsrfHeaders(),
      body: JSON.stringify({ email: testEmail }),
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.message, "If your email is registered, you will receive a password reset link.");
  });
});
