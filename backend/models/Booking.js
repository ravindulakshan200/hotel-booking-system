const { randomUUID } = require("crypto");
const pool = require("../config/db");
const HttpError = require("../utils/httpError");
const { calculateNights } = require("../utils/dateUtils");

const lockBookableRoom = async (connection, roomId) => {
  const [rooms] = await connection.query(
    `SELECT id, price_per_night, availability_status
     FROM rooms
     WHERE id = ?
     LIMIT 1
     FOR UPDATE`,
    [roomId]
  );

  const room = rooms[0];
  if (!room) throw new HttpError(404, "Room not found.");
  if (room.availability_status !== "available") {
    throw new HttpError(409, "Room is not currently bookable.");
  }
  return room;
};

const assertNoOverlap = async (connection, roomId, checkIn, checkOut) => {
  const [rows] = await connection.query(
    `SELECT id
     FROM bookings
     WHERE room_id = ?
       AND booking_status NOT IN ('cancelled', 'completed')
       AND check_in < ?
       AND check_out > ?
     LIMIT 1`,
    [roomId, checkOut, checkIn]
  );

  if (rows.length > 0) {
    throw new HttpError(409, "Room is not available for the selected dates.");
  }
};

const insertBooking = async (
  connection,
  { userId, roomId, checkIn, checkOut, pricePerNight, status }
) => {
  const nights = calculateNights(checkIn, checkOut);
  const totalPrice = (Number(pricePerNight) * nights).toFixed(2);
  const [result] = await connection.query(
    `INSERT INTO bookings
       (user_id, room_id, check_in, check_out, total_price, booking_status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, roomId, checkIn, checkOut, totalPrice, status]
  );

  return { bookingId: result.insertId, totalPrice };
};

const Booking = {
  findAll: async (filters = {}) => {
    let sql = `
      SELECT
        b.*,
        u.first_name,
        u.last_name,
        u.email AS guest_email,
        r.room_number,
        r.room_type,
        r.price_per_night,
        h.id AS hotel_id,
        h.name AS hotel_name,
        h.city AS hotel_city
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN rooms r ON b.room_id = r.id
      JOIN hotels h ON r.hotel_id = h.id
    `;
    const params = [];
    const conditions = [];

    if (filters.user_id) {
      conditions.push("b.user_id = ?");
      params.push(filters.user_id);
    }
    if (filters.room_id) {
      conditions.push("b.room_id = ?");
      params.push(filters.room_id);
    }
    if (filters.booking_status) {
      conditions.push("b.booking_status = ?");
      params.push(filters.booking_status);
    }
    if (typeof filters.search === "string" && filters.search.trim()) {
      conditions.push("(u.first_name LIKE ? OR u.last_name LIKE ? OR h.name LIKE ?)");
      const term = `%${filters.search.trim()}%`;
      params.push(term, term, term);
    }

    if (conditions.length > 0) sql += ` WHERE ${conditions.join(" AND ")}`;
    sql += " ORDER BY b.created_at DESC";

    if (filters.limit) {
      const limit = Math.min(Math.max(Number.parseInt(filters.limit, 10) || 20, 1), 100);
      sql += " LIMIT ?";
      params.push(limit);
    }

    const [rows] = await pool.query(sql, params);
    return rows;
  },

  findByUserId: async (userId) => {
    const [rows] = await pool.query(
      `SELECT b.*, r.room_number, r.room_type, r.price_per_night,
              h.id AS hotel_id, h.name AS hotel_name, h.city AS hotel_city
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       JOIN hotels h ON r.hotel_id = h.id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [userId]
    );
    return rows;
  },

  findById: async (id) => {
    const [rows] = await pool.query(
      `SELECT b.*, u.first_name, u.last_name, u.email AS guest_email,
              r.room_number, r.room_type, r.price_per_night,
              h.id AS hotel_id, h.name AS hotel_name, h.city AS hotel_city
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN rooms r ON b.room_id = r.id
       JOIN hotels h ON r.hotel_id = h.id
       WHERE b.id = ?
       LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  createWithAvailability: async ({ user_id, room_id, check_in, check_out }) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const room = await lockBookableRoom(connection, room_id);
      await assertNoOverlap(connection, room_id, check_in, check_out);
      const { bookingId } = await insertBooking(connection, {
        userId: user_id,
        roomId: room_id,
        checkIn: check_in,
        checkOut: check_out,
        pricePerNight: room.price_per_night,
        status: "pending",
      });
      await connection.commit();
      return bookingId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  checkoutDemo: async ({ user_id, room_id, check_in, check_out, payment_method }) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const room = await lockBookableRoom(connection, room_id);
      await assertNoOverlap(connection, room_id, check_in, check_out);

      const { bookingId, totalPrice } = await insertBooking(connection, {
        userId: user_id,
        roomId: room_id,
        checkIn: check_in,
        checkOut: check_out,
        pricePerNight: room.price_per_night,
        status: "confirmed",
      });

      const transactionReference = `DEMO-${Date.now()}-${randomUUID()}`;
      const [paymentResult] = await connection.query(
        `INSERT INTO payments
           (booking_id, payment_method, amount, payment_status, transaction_reference)
         VALUES (?, ?, ?, 'completed', ?)`,
        [bookingId, payment_method, totalPrice, transactionReference]
      );

      await connection.commit();
      return { bookingId, paymentId: paymentResult.insertId };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  cancelAtomic: async (id, { actorUserId, isAdmin = false } = {}) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.query(
        "SELECT id, user_id, booking_status FROM bookings WHERE id = ? LIMIT 1 FOR UPDATE",
        [id]
      );
      const booking = rows[0];

      if (!booking) throw new HttpError(404, "Booking not found.");
      if (!isAdmin && booking.user_id !== actorUserId) {
        throw new HttpError(403, "Access denied. You do not own this booking.");
      }
      if (booking.booking_status === "cancelled") {
        throw new HttpError(400, "Booking is already cancelled.");
      }
      if (booking.booking_status === "completed") {
        throw new HttpError(400, "Cannot cancel a completed booking.");
      }

      const [refundResult] = await connection.query(
        `UPDATE payments
         SET payment_status = 'refunded'
         WHERE booking_id = ? AND payment_status = 'completed'`,
        [id]
      );
      await connection.query(
        "UPDATE bookings SET booking_status = 'cancelled' WHERE id = ?",
        [id]
      );
      await connection.commit();
      return { refundedPayments: refundResult.affectedRows };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  updateStatusAtomic: async (id, status) => {
    const allowedTransitions = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["completed", "cancelled"],
      cancelled: [],
      completed: [],
    };
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      const [rows] = await connection.query(
        "SELECT id, booking_status FROM bookings WHERE id = ? LIMIT 1 FOR UPDATE",
        [id]
      );
      const booking = rows[0];

      if (!booking) throw new HttpError(404, "Booking not found.");
      if (!allowedTransitions[booking.booking_status]?.includes(status)) {
        throw new HttpError(
          409,
          `Cannot change booking from '${booking.booking_status}' to '${status}'.`
        );
      }

      let refundedPayments = 0;
      if (status === "cancelled") {
        const [refundResult] = await connection.query(
          `UPDATE payments
           SET payment_status = 'refunded'
           WHERE booking_id = ? AND payment_status = 'completed'`,
          [id]
        );
        refundedPayments = refundResult.affectedRows;
      }

      await connection.query(
        "UPDATE bookings SET booking_status = ? WHERE id = ?",
        [status, id]
      );
      await connection.commit();
      return { refundedPayments };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  isRoomAvailable: async (roomId, checkIn, checkOut) => {
    const [rooms] = await pool.query(
      "SELECT availability_status FROM rooms WHERE id = ? LIMIT 1",
      [roomId]
    );
    if (!rooms[0] || rooms[0].availability_status !== "available") return false;

    const [rows] = await pool.query(
      `SELECT COUNT(*) AS overlapCount
       FROM bookings
       WHERE room_id = ?
         AND booking_status NOT IN ('cancelled', 'completed')
         AND check_in < ?
         AND check_out > ?`,
      [roomId, checkOut, checkIn]
    );
    return Number(rows[0].overlapCount) === 0;
  },

  hasCompletedStay: async (userId, hotelId) => {
    const [rows] = await pool.query(
      `SELECT b.id
       FROM bookings b
       JOIN rooms r ON r.id = b.room_id
       WHERE b.user_id = ? AND r.hotel_id = ? AND b.booking_status = 'completed'
       LIMIT 1`,
      [userId, hotelId]
    );
    return rows.length > 0;
  },

  getMonthlyRevenue: async () => {
    const [rows] = await pool.query(`
      SELECT DATE_FORMAT(b.created_at, '%Y-%m') AS month,
             DATE_FORMAT(b.created_at, '%b %Y') AS label,
             COALESCE(SUM(p.amount), 0) AS revenue,
             COUNT(DISTINCT b.id) AS bookings
      FROM bookings b
      LEFT JOIN payments p ON p.booking_id = b.id AND p.payment_status = 'completed'
      WHERE b.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(b.created_at, '%Y-%m'), DATE_FORMAT(b.created_at, '%b %Y')
      ORDER BY month ASC
    `);
    return rows;
  },
};

module.exports = Booking;
