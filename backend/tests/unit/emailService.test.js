const test = require("node:test");
const assert = require("node:assert/strict");
const sinon = require("sinon");
const nodemailer = require("nodemailer");

process.env.EMAIL_PAYLOAD_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

const emailService = require("../../services/emailService");

test("Email Service Production Fail-Closed Tests", async (t) => {
  let originalEnv;
  let logStub;
  let errorStub;
  let createTransportStub;
  let sendMailStub;

  test.beforeEach(() => {
    originalEnv = { ...process.env };
    logStub = sinon.stub(console, "log");
    errorStub = sinon.stub(console, "error");

    sendMailStub = sinon.stub();
    createTransportStub = sinon.stub(nodemailer, "createTransport").returns({
      sendMail: sendMailStub
    });
  });

  test.afterEach(() => {
    process.env = originalEnv;
    sinon.restore();
  });

  const getTestEvent = () => ({
    id: 101,
    event_type: "email_verification_requested",
    recipient_email: "test_recipient_123@example.com",
    payload: {
      userName: "TestUser",
      rawToken: "my_secret_token_abc123"
    }
  });

  await t.test("production missing EMAIL_USER fails closed and never produces fake success", async () => {
    process.env.NODE_ENV = "production";
    process.env.FRONTEND_URL = "https://example.com";
    delete process.env.EMAIL_USER;
    process.env.EMAIL_PASS = "some_pass";

    const event = getTestEvent();
    const result = await emailService.processEmailEvent(event);

    assert.equal(result, false, "Must return false and fail closed");
    assert.equal(sendMailStub.called, false, "Nodemailer must not be called");

    // Check logs for safe metadata but no sensitive data
    assert.ok(errorStub.called, "Error should be logged");
    const logStr = errorStub.args.join(" ");
    assert.ok(logStr.includes("Missing EMAIL_USER or EMAIL_PASS"), "Must log configuration error");
    assert.ok(!logStr.includes(event.recipient_email), "Log must not contain recipient email");
    assert.ok(!logStr.includes(event.payload.rawToken), "Log must not contain token");
  });

  await t.test("production missing EMAIL_PASS fails closed", async () => {
    process.env.NODE_ENV = "production";
    process.env.FRONTEND_URL = "https://example.com";
    process.env.EMAIL_USER = "user@example.com";
    delete process.env.EMAIL_PASS;

    const event = getTestEvent();
    const result = await emailService.processEmailEvent(event);

    assert.equal(result, false);
    assert.equal(sendMailStub.called, false);
  });

  await t.test("production missing FRONTEND_URL fails safely", async () => {
    process.env.NODE_ENV = "production";
    process.env.EMAIL_USER = "user@example.com";
    process.env.EMAIL_PASS = "some_pass";
    delete process.env.FRONTEND_URL;

    const event = getTestEvent();
    const result = await emailService.processEmailEvent(event);

    assert.equal(result, false);

    const logStr = errorStub.args.join(" ");
    assert.ok(logStr.includes("Template generation failed"), "Must catch template error");
    assert.ok(logStr.includes("FRONTEND_URL is required"), "Must report missing URL safely");
    assert.ok(!logStr.includes(event.recipient_email), "Log must not contain recipient email");
  });

  await t.test("production localhost/HTTP FRONTEND_URL is rejected", async () => {
    process.env.NODE_ENV = "production";
    process.env.EMAIL_USER = "user@example.com";
    process.env.EMAIL_PASS = "some_pass";
    process.env.FRONTEND_URL = "http://localhost:5173";

    const event = getTestEvent();
    const result = await emailService.processEmailEvent(event);

    assert.equal(result, false);
    const logStr = errorStub.args.join(" ");
    assert.ok(logStr.includes("HTTPS URL"));
  });

  await t.test("test-only mock behavior remains available", async () => {
    process.env.NODE_ENV = "test";
    delete process.env.EMAIL_USER;
    delete process.env.EMAIL_PASS;

    const event = getTestEvent();
    const result = await emailService.processEmailEvent(event);

    assert.equal(result, true, "Must return true in test environment mock");

    const logStr = logStub.args.join(" ");
    assert.ok(logStr.includes("[Email Mock Worker]"), "Must log mock processing");
    assert.ok(!logStr.includes(event.recipient_email), "Mock log must not contain recipient address");
    assert.ok(!logStr.includes(event.payload.rawToken), "Mock log must not contain token");
  });

  await t.test("configured provider success returns success", async () => {
    process.env.NODE_ENV = "production";
    process.env.FRONTEND_URL = "https://example.com";
    process.env.EMAIL_USER = "user@example.com";
    process.env.EMAIL_PASS = "some_pass";

    sendMailStub.resolves({ messageId: "12345" });

    const event = getTestEvent();
    const result = await emailService.processEmailEvent(event);

    assert.equal(result, true);
    assert.ok(sendMailStub.calledOnce);
  });

  await t.test("provider failure returns failure for retry and logs safely", async () => {
    process.env.NODE_ENV = "production";
    process.env.FRONTEND_URL = "https://example.com";
    process.env.EMAIL_USER = "user@example.com";
    process.env.EMAIL_PASS = "some_pass";

    sendMailStub.rejects(new Error("SMTP Connection Timeout"));

    const event = getTestEvent();
    const result = await emailService.processEmailEvent(event);

    assert.equal(result, false);

    const logStr = errorStub.args.join(" ");
    assert.ok(logStr.includes("SMTP Connection Timeout"));
    assert.ok(!logStr.includes(event.recipient_email), "Error log must not expose recipient address");
    assert.ok(!logStr.includes(event.payload.rawToken), "Error log must not expose token");
  });
});
