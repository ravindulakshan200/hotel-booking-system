const test = require("node:test");
const assert = require("node:assert/strict");
const sinon = require("sinon");

test("Reminder Worker", async (t) => {
  let reminderWorker;
  let poolStub;
  let emailOutboxStub;
  let notificationStub;
  let originalEnv;

  t.before(() => {
    // Keep a copy of original process.env
    originalEnv = { ...process.env };
  });

  t.beforeEach(() => {
    // We must reset process.env.NODE_ENV and REMINDER_WORKER_ENABLED
    process.env.NODE_ENV = "test"; // So start() doesn't actually schedule setInterval
    process.env.REMINDER_WORKER_ENABLED = "true";
    process.env.REMINDER_LEAD_DAYS = "1";

    // Re-require the worker to capture new env vars if needed
    delete require.cache[require.resolve("../../../backend/services/reminderWorker")];

    // Stub db and models before requiring
    const pool = require("../../../backend/config/db");
    poolStub = sinon.stub(pool, "query");

    const EmailOutbox = require("../../../backend/models/EmailOutbox");
    emailOutboxStub = sinon.stub(EmailOutbox, "enqueueEmailEvent");

    const Notification = require("../../../backend/models/Notification");
    notificationStub = sinon.stub(Notification, "create");

    reminderWorker = require("../../../backend/services/reminderWorker");
  });

  t.afterEach(() => {
    sinon.restore();
    // Restore env
    process.env = { ...originalEnv };
  });

  await t.test("should process a batch of reminders successfully", async () => {
    // Mock the bookings query
    poolStub.onCall(0).resolves([[
      { id: 10, user_id: 5, check_in: "2026-08-01", check_out: "2026-08-05", hotel_name: "Test Hotel", room_type: "Suite" }
    ]]);

    // Mock the checkin_reminders insert (success)
    poolStub.onCall(1).resolves([{ affectedRows: 1 }]);

    emailOutboxStub.resolves();
    notificationStub.resolves();

    await reminderWorker.processBatch();

    assert.equal(poolStub.callCount, 2);

    assert.equal(emailOutboxStub.callCount, 1);
    assert.equal(emailOutboxStub.getCall(0).args[1].eventKey, "checkin_reminder_10");

    assert.equal(notificationStub.callCount, 1);
    assert.equal(notificationStub.getCall(0).args[1].eventKey, "checkin_reminder_10");
  });

  await t.test("should skip already processed bookings (affectedRows = 0)", async () => {
    poolStub.onCall(0).resolves([[
      { id: 10, user_id: 5, check_in: "2026-08-01", check_out: "2026-08-05", hotel_name: "Test Hotel", room_type: "Suite" }
    ]]);

    // Mock the checkin_reminders insert (duplicate ignored)
    poolStub.onCall(1).resolves([{ affectedRows: 0 }]);

    await reminderWorker.processBatch();

    assert.equal(poolStub.callCount, 2);
    assert.equal(emailOutboxStub.callCount, 0);
    assert.equal(notificationStub.callCount, 0);
  });

  await t.test("should not start in test environment automatically", () => {
    // Even if we call start(), since NODE_ENV='test', it shouldn't set interval
    reminderWorker.start();
    assert.equal(reminderWorker.isRunning, false);
  });
});
