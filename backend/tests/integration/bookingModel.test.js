const test = require("node:test");
const assert = require("node:assert/strict");

const pool = require('../../config/db');
const Booking = require('../../models/Booking');

const originalGetConnection = pool.getConnection.bind(pool);

const makeConnection = ({ overlap = false } = {}) => {
  const calls = [];
  const connection = {
    calls,
    beginTransaction: async () => calls.push("begin"),
    commit: async () => calls.push("commit"),
    rollback: async () => calls.push("rollback"),
    release: () => calls.push("release"),
    query: async (sql, params) => {
      // Ignore strict checks for outbox/notification enqueuing during atomic booking transitions
      if (sql.includes("INSERT IGNORE INTO email_outbox") || sql.includes("INSERT IGNORE INTO notifications")) {
        return [{ insertId: 999 }];
      }
      calls.push(sql.replace(/\s+/g, " ").trim());
      if (sql.includes("FROM rooms")) {
        return [[{ id: 1, price_per_night: "25000.00", availability_status: "available" }]];
      }
      if (sql.includes("FROM bookings")) {
        return [overlap ? [{ id: 99 }] : []];
      }
      if (sql.includes("INSERT INTO bookings")) return [{ insertId: 42 }];
      if (sql.includes("INSERT INTO payments")) return [{ insertId: 84 }];
      throw new Error(`Unexpected SQL in test: ${sql}`);
    },
  };
  return connection;
};

test.afterEach(() => {
  pool.getConnection = originalGetConnection;
});

test("booking creation locks the room and commits one booking", async () => {
  const connection = makeConnection();
  pool.getConnection = async () => connection;

  const id = await Booking.createWithAvailability({
    user_id: 2,
    room_id: 1,
    check_in: "2028-01-10",
    check_out: "2028-01-12",
  });

  assert.equal(id, 42);
  assert.ok(connection.calls.some((call) => call.includes("FOR UPDATE")));
  assert.ok(connection.calls.includes("commit"));
  assert.ok(!connection.calls.includes("rollback"));
});

test("overlapping booking rolls back before insert", async () => {
  const connection = makeConnection({ overlap: true });
  pool.getConnection = async () => connection;

  await assert.rejects(
    Booking.createWithAvailability({
      user_id: 2,
      room_id: 1,
      check_in: "2028-01-10",
      check_out: "2028-01-12",
    }),
    (error) => error.statusCode === 409
  );
  assert.ok(connection.calls.includes("rollback"));
  assert.ok(!connection.calls.some((call) => call.includes("INSERT INTO bookings")));
});

test("demo checkout creates booking and payment in one transaction", async () => {
  const connection = makeConnection();
  pool.getConnection = async () => connection;

  const result = await Booking.checkoutDemo({
    user_id: 2,
    room_id: 1,
    check_in: "2028-01-10",
    check_out: "2028-01-12",
    payment_method: "card",
  });

  assert.deepEqual(result, { bookingId: 42, paymentId: 84 });
  assert.ok(connection.calls.some((call) => call.includes("INSERT INTO bookings")));
  assert.ok(connection.calls.some((call) => call.includes("INSERT INTO payments")));
  assert.ok(connection.calls.includes("commit"));
});

test("admin status transition locks the booking and returns refundRequired for paid bookings", async () => {
  const calls = [];
  const connection = {
    calls,
    beginTransaction: async () => calls.push("begin"),
    commit: async () => calls.push("commit"),
    rollback: async () => calls.push("rollback"),
    release: () => calls.push("release"),
    query: async (sql, params) => {
      if (sql.includes("INSERT IGNORE INTO email_outbox") || sql.includes("INSERT IGNORE INTO notifications")) {
        return [{ insertId: 999 }];
      }
      calls.push(sql.replace(/\s+/g, " ").trim());
      if (sql.includes("SELECT id, booking_status, refund_status")) {
        return [[{ id: 42, booking_status: "confirmed", refund_status: "not_required" }]];
      }
      if (sql.includes("SELECT id FROM payments")) return [[{ id: 84 }]]; // simulate paid
      if (sql.includes("UPDATE bookings")) return [{ affectedRows: 1 }];
      throw new Error(`Unexpected SQL in test: ${sql}`);
    },
  };
  pool.getConnection = async () => connection;

  const result = await Booking.updateStatusAtomic(42, "cancelled", { reason: "test", actorUserId: 1 });

  assert.deepEqual(result, { refundRequired: true, newStatus: "cancelled" });
  assert.ok(connection.calls.some((call) => call.includes("FOR UPDATE")));
  assert.ok(!connection.calls.some((call) => call.includes("UPDATE payments")));
  assert.ok(connection.calls.some((call) => call.includes("refund_status = 'required'")));
  assert.ok(connection.calls.includes("commit"));
});

test("cancellation of unpaid booking works and returns refundRequired: false", async () => {
  const calls = [];
  const connection = {
    calls,
    beginTransaction: async () => calls.push("begin"),
    commit: async () => calls.push("commit"),
    rollback: async () => calls.push("rollback"),
    release: () => calls.push("release"),
    query: async (sql, params) => {
      if (sql.includes("INSERT IGNORE INTO email_outbox") || sql.includes("INSERT IGNORE INTO notifications")) {
        return [{ insertId: 999 }];
      }
      calls.push(sql.replace(/\s+/g, " ").trim());
      if (sql.includes("SELECT id, user_id, booking_status, refund_status")) {
        return [[{ id: 42, user_id: 1, booking_status: "pending", refund_status: "not_required" }]];
      }
      if (sql.includes("SELECT id FROM payments")) return [[]]; // simulate unpaid
      if (sql.includes("UPDATE bookings")) return [{ affectedRows: 1 }];
      throw new Error(`Unexpected SQL in test: ${sql}`);
    },
  };
  pool.getConnection = async () => connection;

  const result = await Booking.cancelAtomic(42, { actorUserId: 1, isAdmin: false });

  assert.deepEqual(result, { refundRequired: false, newStatus: "cancelled" });
  assert.ok(connection.calls.some((call) => call.includes("FOR UPDATE")));
  assert.ok(!connection.calls.some((call) => call.includes("UPDATE payments")));
  assert.ok(!connection.calls.some((call) => call.includes("refund_status = 'required'")));
  assert.ok(connection.calls.includes("commit"));
});

test("duplicate cancellation does not overwrite existing refund request", async () => {
  const calls = [];
  const connection = {
    calls,
    beginTransaction: async () => calls.push("begin"),
    commit: async () => calls.push("commit"),
    rollback: async () => calls.push("rollback"),
    release: () => calls.push("release"),
    query: async (sql, params) => {
      if (sql.includes("INSERT IGNORE INTO email_outbox") || sql.includes("INSERT IGNORE INTO notifications")) {
        return [{ insertId: 999 }];
      }
      calls.push(sql.replace(/\s+/g, " ").trim());
      // Admin update changes status but it's already a pending refund
      if (sql.includes("SELECT id, booking_status, refund_status")) {
        return [[{ id: 42, booking_status: "confirmed", refund_status: "processing" }]];
      }
      if (sql.includes("SELECT id FROM payments")) return [[{ id: 84 }]]; // simulate paid
      if (sql.includes("UPDATE bookings")) return [{ affectedRows: 1 }];
      throw new Error(`Unexpected SQL in test: ${sql}`);
    },
  };
  pool.getConnection = async () => connection;

  const result = await Booking.updateStatusAtomic(42, "cancelled", { reason: "test", actorUserId: 1 });

  assert.deepEqual(result, { refundRequired: true, newStatus: "cancelled" });
  assert.ok(connection.calls.some((call) => call.includes("FOR UPDATE")));
  // Should NOT include the refund_status update clause since it is already processing
  assert.ok(!connection.calls.some((call) => call.includes("refund_status = 'required'")));
  assert.ok(connection.calls.includes("commit"));
});

test("booking creation commits successfully even if outbox enqueue fails", async () => {
  const connection = makeConnection();
  // Override query to throw an error specifically for outbox insertion to simulate failure
  const originalQuery = connection.query;
  connection.query = async (sql, params) => {
    if (sql.includes("INSERT IGNORE INTO email_outbox") || sql.includes("INSERT IGNORE INTO notifications")) {
      throw new Error("Simulated encryption or outbox failure");
    }
    return originalQuery(sql, params);
  };
  pool.getConnection = async () => connection;

  const id = await Booking.createWithAvailability({
    user_id: 2,
    room_id: 1,
    check_in: "2028-01-10",
    check_out: "2028-01-12",
  });

  assert.equal(id, 42);
  assert.ok(connection.calls.some((call) => call.includes("FOR UPDATE")));
  // The transaction should still commit!
  assert.ok(connection.calls.includes("commit"));
  assert.ok(!connection.calls.includes("rollback"));
});
