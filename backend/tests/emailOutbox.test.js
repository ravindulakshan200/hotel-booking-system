const test = require("node:test");
const assert = require("node:assert");
const EmailOutbox = require("../models/EmailOutbox");
const emailWorker = require("../services/emailWorker");
const pool = require("../config/db");

const originalEnv = { ...process.env };
const originalGetConnection = pool.getConnection;

test.afterEach(() => {
  pool.getConnection = originalGetConnection;
  process.env = { ...originalEnv };
});

test("Email Outbox Module (Mocked Database)", async (t) => {
  test.beforeEach(() => {
    process.env.EMAIL_PAYLOAD_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  // Save original pool.query
  const originalQuery = pool.query;
  
  t.after(() => {
    // Restore original pool.query
    pool.query = originalQuery;
  });

  await t.test("enqueueEmailEvent should insert a new event and return insertId", async () => {
    pool.query = async (queryStr, params) => {
      if (queryStr.includes("INSERT IGNORE INTO email_outbox")) {
        return [{ insertId: 101 }];
      }
      return [[]];
    };
    
    const id = await EmailOutbox.enqueueEmailEvent(null, {
      eventKey: "test_event_1",
      eventType: "booking_created",
      recipientUserId: 1,
      recipientEmail: "test1@example.com",
      payload: { bookingId: 123 }
    });
    
    assert.strictEqual(id, 101, "Should return the insert ID from the mock");
  });

  await t.test("claimPendingBatch should claim rows and return them", async () => {
    const workerId = "test_worker_1";
    
    pool.query = async (queryStr, params) => {
      if (queryStr.includes("UPDATE email_outbox")) {
        return [{ affectedRows: 2 }];
      }
      if (queryStr.includes("SELECT * FROM email_outbox")) {
        return [[
          { id: 1, event_key: "event_1", status: "processing", locked_by: workerId },
          { id: 2, event_key: "event_2", status: "processing", locked_by: workerId }
        ]];
      }
      return [[]];
    };
    
    const events = await EmailOutbox.claimPendingBatch(workerId, 5);
    assert.strictEqual(events.length, 2, "Should return 2 events");
    assert.strictEqual(events[0].locked_by, workerId, "Should match worker ID");
  });

  await t.test("markSent should update status and clear payload", async () => {
    let updateCalled = false;
    pool.query = async (queryStr, params) => {
      if (queryStr.includes("SET status = 'sent'")) {
        updateCalled = true;
        // Check params: [id]
        assert.strictEqual(params[0], 99, "Should pass correct ID");
        return [{ affectedRows: 1 }];
      }
      return [[]];
    };
    
    await EmailOutbox.markSent(99);
    assert.ok(updateCalled, "Query should be called");
  });

  await t.test("markRetry should increase attempts and backoff", async () => {
    let updateCalled = false;
    pool.query = async (queryStr, params) => {
      if (queryStr.includes("SET status = 'failed'")) {
        updateCalled = true;
        // params: [attemptNumber, backoffSeconds, lastErrorCode, id]
        assert.strictEqual(params[0], 2, "Attempt number");
        assert.strictEqual(params[1], 40, "Backoff seconds (2^2 * 10)");
        assert.strictEqual(params[2], "timeout", "Error code");
        assert.strictEqual(params[3], 77, "ID");
        return [{ affectedRows: 1 }];
      }
      return [[]];
    };
    
    await EmailOutbox.markRetry(77, 2, "timeout");
    assert.ok(updateCalled, "Query should be called");
  });

  await t.test("markDeadLetter should update status", async () => {
    let updateCalled = false;
    pool.query = async (queryStr, params) => {
      if (queryStr.includes("SET status = 'dead_letter'")) {
        updateCalled = true;
        assert.strictEqual(params[0], "fatal", "Error code");
        assert.strictEqual(params[1], 88, "ID");
        return [{ affectedRows: 1 }];
      }
      return [[]];
    };
    
    await EmailOutbox.markDeadLetter(88, "fatal");
    assert.ok(updateCalled, "Query should be called");
  });

  await t.test("worker start/stop methods exist", async () => {
    emailWorker.start();
    assert.strictEqual(emailWorker.isRunning, false, "Worker should not run in test environment");
    emailWorker.stop();
  });
});
