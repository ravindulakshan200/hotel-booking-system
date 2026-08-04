const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");

process.env.JWT_SECRET = "test-only-secret-with-more-than-32-characters";
process.env.CLIENT_URL = "http://localhost:5173";
process.env.EMAIL_PAYLOAD_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.NODE_ENV = "test"; 

const pool = require('../../config/db');
const createApp = require('../../app');
const User = require('../../models/User');
const EmailOutbox = require('../../models/EmailOutbox');
const { getCsrfHeaders } = require('../helpers/authHelper');
const sinon = require('sinon');
const emailService = require('../../services/emailService');
const emailWorker = require('../../services/emailWorker');

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

test("Verification email immediate processing regression", async (t) => {
  const testId = Date.now();
  const testEmail = `test.worker.${testId}@example.com`;
  const testPassword = "Password123A!";
  let userId;
  let testEventIds = [];

  test.afterEach(() => {
    sinon.restore();
  });

  t.after(async () => {
    if (testEventIds.length > 0) {
      await pool.query('DELETE FROM email_outbox WHERE id IN (?)', [testEventIds]);
    }
    if (userId) {
      await pool.query('DELETE FROM users WHERE id = ?', [userId]);
    }
  });

  await t.test("registration enqueues and immediately processes its own verification event", async () => {
    const processStub = sinon.stub(emailService, 'processEmailEvent').resolves(true);

    const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: "POST",
      headers: getCsrfHeaders(),
      body: JSON.stringify({
        first_name: "Worker",
        last_name: "Test",
        email: testEmail,
        password: testPassword,
        phone: "+1234567890"
      }),
    });
    
    assert.equal(res.status, 201);
    const user = await User.findUserByEmail(testEmail);
    userId = user.id;

    const [rows] = await pool.query('SELECT * FROM email_outbox WHERE recipient_user_id = ? AND event_type = ?', [userId, 'email_verification_requested']);
    assert.equal(rows.length, 1, "Exactly one event should be enqueued");
    testEventIds.push(rows[0].id);
    
    assert.equal(rows[0].status, 'sent', "Immediate processing should mark status as sent");
    assert.equal(rows[0].payload, '{}', "Payload should be cleared to not store tokens permanently");
    assert.equal(processStub.calledOnce, true, "Email service should be called once");
  });

  await t.test("resend enqueues and immediately processes exactly one event", async () => {
    const processStub = sinon.stub(emailService, 'processEmailEvent').resolves(true);

    const res = await fetch(`${baseUrl}/api/v1/auth/resend-verification`, {
      method: "POST",
      headers: getCsrfHeaders(),
      body: JSON.stringify({ email: testEmail }),
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.message, "If the email is registered and unverified, a verification link has been sent.");
    assert.ok(!JSON.stringify(body).includes("token"), "Secrets must not appear in response");

    const [rows] = await pool.query('SELECT * FROM email_outbox WHERE recipient_user_id = ? AND event_type = ? ORDER BY id DESC', [userId, 'email_verification_requested']);
    assert.ok(rows.length >= 2, "Second event should be enqueued");
    testEventIds.push(rows[0].id);

    assert.equal(rows[0].status, 'sent');
    assert.equal(rows[0].payload, '{}');
    assert.equal(processStub.calledOnce, true, "Email service should be called once");
  });

  await t.test("forgot-password email is immediately processed", async () => {
    const processStub = sinon.stub(emailService, 'processEmailEvent').resolves(true);

    const res = await fetch(`${baseUrl}/api/v1/auth/forgot-password`, {
      method: "POST",
      headers: getCsrfHeaders(),
      body: JSON.stringify({ email: testEmail }),
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.message, "If your email is registered, you will receive a password reset link.");
    assert.ok(!JSON.stringify(body).includes("token"));

    const [rows] = await pool.query('SELECT * FROM email_outbox WHERE recipient_user_id = ? AND event_type = ? ORDER BY id DESC', [userId, 'password_reset_requested']);
    assert.equal(rows.length, 1);
    testEventIds.push(rows[0].id);

    assert.equal(rows[0].status, 'sent');
    assert.equal(processStub.calledOnce, true);
  });

  await t.test("existing and nonexistent email addresses receive the same generic resend response", async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/resend-verification`, {
      method: "POST",
      headers: getCsrfHeaders(),
      body: JSON.stringify({ email: `nonexistent.${Date.now()}@example.com` }),
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.message, "If the email is registered and unverified, a verification link has been sent.");
    assert.ok(!JSON.stringify(body).includes("token"));
  });

  await t.test("provider failure marks only the target event failed/retryable", async () => {
    const processStub = sinon.stub(emailService, 'processEmailEvent').resolves(false);

    const res = await fetch(`${baseUrl}/api/v1/auth/resend-verification`, {
      method: "POST",
      headers: getCsrfHeaders(),
      body: JSON.stringify({ email: testEmail }),
    });
    const body = await res.json();
    assert.equal(res.status, 200);

    const [rows] = await pool.query('SELECT * FROM email_outbox WHERE recipient_user_id = ? AND event_type = ? ORDER BY id DESC', [userId, 'email_verification_requested']);
    testEventIds.push(rows[0].id);

    assert.equal(rows[0].status, 'failed');
    assert.equal(rows[0].attempts, 1);
    assert.equal(rows[0].last_error_code, 'Provider returned false');
    assert.equal(processStub.calledOnce, true);
  });

  await t.test("TiDB stringified payloads parse and decrypt correctly", async () => {
    const processStub = sinon.stub(emailService, 'processEmailEvent').resolves(true);
    const eventKey = `test_encrypt_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    const eventId = await EmailOutbox.enqueueEmailEvent(null, {
      eventKey,
      eventType: 'email_verification_requested',
      recipientUserId: userId,
      payload: { rawToken: "my_raw_token" },
      expiresAt
    });
    testEventIds.push(eventId);
    
    // Simulate TiDB generic text parsing scenario
    // By directly setting the payload column in DB to stringified json string
    const [originalRows] = await pool.query('SELECT payload FROM email_outbox WHERE id = ?', [eventId]);
    const payloadVal = typeof originalRows[0].payload === 'string' ? originalRows[0].payload : JSON.stringify(originalRows[0].payload);
    await pool.query('UPDATE email_outbox SET payload = ? WHERE id = ?', [JSON.stringify(payloadVal), eventId]);
    
    const success = await emailWorker.processImmediate(eventId);
    assert.equal(success, true);
    
    const [rows] = await pool.query('SELECT status, payload FROM email_outbox WHERE id = ?', [eventId]);
    assert.equal(rows[0].status, 'sent');
    assert.equal(rows[0].payload, '{}');
  });

  await t.test("invalid payload envelopes fail safely", async () => {
    const processStub = sinon.stub(emailService, 'processEmailEvent').resolves(true);
    const eventKey = `test_invalid_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    const eventId = await EmailOutbox.enqueueEmailEvent(null, {
      eventKey,
      eventType: 'email_verification_requested',
      recipientUserId: userId,
      payload: { rawToken: "test" },
      expiresAt
    });
    testEventIds.push(eventId);
    
    // Make it invalid envelope by updating db directly
    await pool.query("UPDATE email_outbox SET payload = '{\"invalid\":1}' WHERE id = ?", [eventId]);
    
    const success = await emailWorker.processImmediate(eventId);
    assert.equal(success, false);
    
    const [rows] = await pool.query('SELECT status, last_error_code FROM email_outbox WHERE id = ?', [eventId]);
    assert.equal(rows[0].status, 'dead_letter');
    assert.ok(rows[0].last_error_code.includes("Decryption failed"));
  });

  await t.test("unrelated pending events are untouched", async () => {
    const eventKey = `test_untouched_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    const eventId = await EmailOutbox.enqueueEmailEvent(null, {
      eventKey,
      eventType: 'email_verification_requested',
      recipientUserId: userId,
      payload: { rawToken: "test" },
      expiresAt
    });
    testEventIds.push(eventId);

    // Call processImmediate for a non-existent ID
    const success = await emailWorker.processImmediate(99999999);
    assert.equal(success, false);

    const [rows] = await pool.query('SELECT status FROM email_outbox WHERE id = ?', [eventId]);
    assert.equal(rows[0].status, 'pending', "Unrelated pending event should remain pending");
  });
});
