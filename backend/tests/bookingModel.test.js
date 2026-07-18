const test = require("node:test");
const assert = require("node:assert/strict");

const pool = require("../config/db");
const Booking = require("../models/Booking");

const originalGetConnection = pool.getConnection.bind(pool);

const makeConnection = ({ overlap = false } = {}) => {
  const calls = [];
  const connection = {
    calls,
    beginTransaction: async () => calls.push("begin"),
    commit: async () => calls.push("commit"),
    rollback: async () => calls.push("rollback"),
    release: () => calls.push("release"),
    query: async (sql) => {
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

test("admin status transition locks the booking and refunds on cancellation", async () => {
  const calls = [];
  const connection = {
    calls,
    beginTransaction: async () => calls.push("begin"),
    commit: async () => calls.push("commit"),
    rollback: async () => calls.push("rollback"),
    release: () => calls.push("release"),
    query: async (sql) => {
      calls.push(sql.replace(/\s+/g, " ").trim());
      if (sql.includes("SELECT id, booking_status")) {
        return [[{ id: 42, booking_status: "confirmed" }]];
      }
      if (sql.includes("UPDATE payments")) return [{ affectedRows: 1 }];
      if (sql.includes("UPDATE bookings")) return [{ affectedRows: 1 }];
      throw new Error(`Unexpected SQL in test: ${sql}`);
    },
  };
  pool.getConnection = async () => connection;

  const result = await Booking.updateStatusAtomic(42, "cancelled");

  assert.deepEqual(result, { refundedPayments: 1 });
  assert.ok(connection.calls.some((call) => call.includes("FOR UPDATE")));
  assert.ok(connection.calls.includes("commit"));
});
