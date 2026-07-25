const test = require("node:test");
const assert = require("node:assert/strict");
const { encryptPayload, decryptPayload } = require('../../utils/encryption');

test("Encryption Utility Tests", async (t) => {
  const originalKey = process.env.EMAIL_PAYLOAD_ENCRYPTION_KEY;
  const validKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  test.beforeEach(() => {
    process.env.EMAIL_PAYLOAD_ENCRYPTION_KEY = validKey;
  });

  test.afterEach(() => {
    process.env.EMAIL_PAYLOAD_ENCRYPTION_KEY = originalKey;
  });

  await t.test("Payload encrypts and decrypts correctly", () => {
    const payload = { token: "secret_value" };
    const eventKey = "test_event_1";

    const encrypted = encryptPayload(payload, eventKey);
    assert.equal(encrypted.v, 1);
    assert.ok(encrypted.iv);
    assert.ok(encrypted.tag);
    assert.ok(encrypted.ciphertext);

    const decrypted = decryptPayload(encrypted, eventKey);
    assert.deepEqual(decrypted, payload);
  });

  await t.test("Unique IV is generated for identical payloads", () => {
    const payload = { token: "secret_value" };
    const eventKey = "test_event_2";

    const encrypted1 = encryptPayload(payload, eventKey);
    const encrypted2 = encryptPayload(payload, eventKey);

    assert.notEqual(encrypted1.iv, encrypted2.iv);
    assert.notEqual(encrypted1.ciphertext, encrypted2.ciphertext);
  });

  await t.test("Fails to decrypt if AAD (eventKey) is tampered with", () => {
    const payload = { token: "secret_value" };
    const eventKey = "test_event_3";

    const encrypted = encryptPayload(payload, eventKey);

    assert.throws(() => {
      decryptPayload(encrypted, "wrong_event_key");
    }, /Unsupported state or unable to authenticate data/);
  });

  await t.test("Fails to decrypt if ciphertext is tampered with", () => {
    const payload = { token: "secret_value" };
    const eventKey = "test_event_4";

    const encrypted = encryptPayload(payload, eventKey);
    
    // Modify ciphertext (from hex, modifying last char)
    encrypted.ciphertext = encrypted.ciphertext.substring(0, encrypted.ciphertext.length - 1) + 'a';

    assert.throws(() => {
      decryptPayload(encrypted, eventKey);
    });
  });

  await t.test("Missing encryption key throws error", () => {
    delete process.env.EMAIL_PAYLOAD_ENCRYPTION_KEY;
    const payload = { token: "secret_value" };
    const eventKey = "test_event_5";

    assert.throws(() => {
      encryptPayload(payload, eventKey);
    }, /EMAIL_PAYLOAD_ENCRYPTION_KEY is missing or undefined/);
  });
  
  await t.test("Invalid key length throws error", () => {
    process.env.EMAIL_PAYLOAD_ENCRYPTION_KEY = "too_short_key";
    const payload = { token: "secret_value" };
    const eventKey = "test_event_6";

    assert.throws(() => {
      encryptPayload(payload, eventKey);
    }, /must be exactly 32 bytes/);
  });
});
