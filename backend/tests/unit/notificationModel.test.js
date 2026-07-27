const test = require("node:test");
const assert = require("node:assert/strict");
const sinon = require("sinon");
const Notification = require("../../../backend/models/Notification");
const pool = require("../../../backend/config/db");

test("Notification Model", async (t) => {
  let queryStub;

  t.beforeEach(() => {
    queryStub = sinon.stub(pool, "query");
  });

  t.afterEach(() => {
    sinon.restore();
  });

  await t.test("should create a notification safely using INSERT IGNORE", async () => {
    queryStub.resolves([{ insertId: 10 }]);

    const id = await Notification.create(null, {
      userId: 1,
      eventKey: "booking_created_5",
      type: "booking",
      title: "Booking Created",
      message: "Test message",
      metadata: { bookingId: 5 }
    });

    assert.equal(id, 10);
    assert.equal(queryStub.calledOnce, true);
    const [sql, params] = queryStub.getCall(0).args;
    assert.ok(sql.includes("INSERT IGNORE INTO notifications"));
    assert.equal(params[0], 1); // userId
    assert.equal(params[1], "booking_created_5"); // eventKey
    assert.equal(params[5], JSON.stringify({ bookingId: 5 })); // metadata
  });

  await t.test("should fetch paginated notifications", async () => {
    queryStub.onCall(0).resolves([[{ total: 5 }]]);
    queryStub.onCall(1).resolves([[{ id: 1, title: "N1" }, { id: 2, title: "N2" }]]);

    const result = await Notification.findByUserId(1, { page: 1, pageSize: 2 });
    assert.equal(result.total, 5);
    assert.equal(result.notifications.length, 2);
    assert.equal(result.page, 1);
    assert.equal(result.pageSize, 2);
    assert.equal(result.totalPages, 3);
  });

  await t.test("should mark a single notification as read with ownership check", async () => {
    queryStub.resolves([{ affectedRows: 1 }]);

    const success = await Notification.markOneRead(5, 1);
    assert.equal(success, true);

    const [sql, params] = queryStub.getCall(0).args;
    assert.ok(sql.includes("WHERE id = ? AND user_id = ?"));
    assert.equal(params[0], 5);
    assert.equal(params[1], 1);
  });

  await t.test("should mark all notifications as read for a user", async () => {
    queryStub.resolves([{ affectedRows: 3 }]);

    const count = await Notification.markAllRead(1);
    assert.equal(count, 3);

    const [sql, params] = queryStub.getCall(0).args;
    assert.ok(sql.includes("WHERE user_id = ?"));
    assert.equal(params[0], 1);
  });
});
