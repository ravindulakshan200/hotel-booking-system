/**
 * models/Payment.js
 * Data-access layer for the `payments` table.
 */

const pool = require("../config/db");
const HttpError = require("../utils/httpError");

const Payment = {
  findAll: async (filters = {}) => {
    let sql = `
      SELECT p.*,
             b.user_id, b.check_in, b.check_out, b.booking_status,
             u.first_name, u.last_name, u.email,
             r.room_number, h.name AS hotel_name
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN users u ON b.user_id = u.id
      JOIN rooms r ON b.room_id = r.id
      JOIN hotels h ON r.hotel_id = h.id
    `;
    const params = [];
    const conditions = [];

    if (filters.payment_status) {
      conditions.push("p.payment_status = ?");
      params.push(filters.payment_status);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY p.created_at DESC";

    const [rows] = await pool.query(sql, params);
    return rows;
  },

  findByUser: async (userId) => {
    const [rows] = await pool.query(
      `SELECT p.*,
              b.check_in, b.check_out, b.booking_status, b.total_price,
              r.room_number, h.name AS hotel_name
       FROM payments p
       JOIN bookings b ON p.booking_id = b.id
       JOIN rooms r ON b.room_id = r.id
       JOIN hotels h ON r.hotel_id = h.id
       WHERE b.user_id = ?
       ORDER BY p.created_at DESC`,
      [userId]
    );
    return rows;
  },

  findById: async (id) => {
    const [rows] = await pool.query(
      `SELECT p.*,
              b.user_id, b.check_in, b.check_out, b.booking_status, b.total_price,
              r.room_number, h.name AS hotel_name
       FROM payments p
       JOIN bookings b ON p.booking_id = b.id
       JOIN rooms r ON b.room_id = r.id
       JOIN hotels h ON r.hotel_id = h.id
       WHERE p.id = ?
       LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  findByBooking: async (bookingId) => {
    const [rows] = await pool.query(
      "SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at DESC LIMIT 1",
      [bookingId]
    );
    return rows[0] || null;
  },

  processAtomic: async ({ bookingId, paymentMethod, actorUserId, isAdmin = false, transactionReference }) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [bookings] = await connection.query(
        `SELECT id, user_id, total_price, booking_status
         FROM bookings
         WHERE id = ?
         LIMIT 1
         FOR UPDATE`,
        [bookingId]
      );
      const booking = bookings[0];

      if (!booking) throw new HttpError(404, "Booking not found.");
      if (!isAdmin && booking.user_id !== actorUserId) {
        throw new HttpError(403, "Access denied.");
      }
      if (booking.booking_status !== "pending") {
        throw new HttpError(409, "Only pending bookings can be paid.");
      }

      const [existing] = await connection.query(
        `SELECT id FROM payments
         WHERE booking_id = ? AND payment_status = 'completed'
         LIMIT 1`,
        [bookingId]
      );
      if (existing.length > 0) {
        throw new HttpError(409, "This booking has already been paid.");
      }

      const txRef = transactionReference || `DEMO-${Date.now()}-${bookingId}`;
      const [result] = await connection.query(
        `INSERT INTO payments
           (booking_id, payment_method, amount, payment_status, transaction_reference)
         VALUES (?, ?, ?, 'completed', ?)`,
        [bookingId, paymentMethod, booking.total_price, txRef]
      );
      await connection.query(
        "UPDATE bookings SET booking_status = 'confirmed' WHERE id = ?",
        [bookingId]
      );
      await connection.commit();
      return result.insertId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  refundAtomic: async (paymentId) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [paymentLookup] = await connection.query(
        `SELECT id, booking_id, payment_status
         FROM payments
         WHERE id = ?
         LIMIT 1`,
        [paymentId]
      );
      const paymentToLock = paymentLookup[0];

      if (!paymentToLock) throw new HttpError(404, "Payment not found.");

      // Keep the lock order consistent with booking cancellation: booking first,
      // then payment. This avoids deadlocks when both actions happen together.
      await connection.query(
        `SELECT id
         FROM bookings
         WHERE id = ?
         LIMIT 1
         FOR UPDATE`,
        [paymentToLock.booking_id]
      );

      const [rows] = await connection.query(
        `SELECT id, booking_id, payment_status
         FROM payments
         WHERE id = ?
         LIMIT 1
         FOR UPDATE`,
        [paymentId]
      );
      const payment = rows[0];

      if (!payment) throw new HttpError(404, "Payment not found.");
      if (payment.payment_status !== "completed") {
        throw new HttpError(400, "Only completed payments can be refunded.");
      }

      await connection.query(
        "UPDATE payments SET payment_status = 'refunded' WHERE id = ?",
        [paymentId]
      );
      await connection.query(
        `UPDATE bookings
         SET booking_status = CASE
           WHEN booking_status = 'completed' THEN 'completed'
           ELSE 'cancelled'
         END
         WHERE id = ?`,
        [payment.booking_id]
      );
      await connection.commit();
      return payment.booking_id;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

};

module.exports = Payment;
