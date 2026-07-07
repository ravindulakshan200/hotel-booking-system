/**
 * models/Payment.js
 * Data-access layer for the `payments` table.
 */

const pool = require("../config/db");

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

  create: async ({ booking_id, payment_method, amount, payment_status, transaction_reference }) => {
    const [result] = await pool.query(
      `INSERT INTO payments (booking_id, payment_method, amount, payment_status, transaction_reference)
       VALUES (?, ?, ?, ?, ?)`,
      [
        booking_id,
        payment_method,
        amount,
        payment_status || "pending",
        transaction_reference || null,
      ]
    );
    return result.insertId;
  },

  updateStatus: async (id, status) => {
    const [result] = await pool.query(
      "UPDATE payments SET payment_status = ? WHERE id = ?",
      [status, id]
    );
    return result.affectedRows;
  },
};

module.exports = Payment;
