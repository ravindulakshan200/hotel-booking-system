/**
 * models/Booking.js
 *
 * Data-access layer for the `bookings` table.
 * findAll() returns enriched rows with guest name, hotel name, room number.
 */

const pool = require("../config/db");

const Booking = {
  /**
   * findAll
   * Retrieve all bookings with joined user, room, and hotel data.
   * Supports optional filters: user_id, room_id, booking_status.
   */
  findAll: async (filters = {}) => {
    let sql = `
      SELECT
        b.*,
        u.first_name,
        u.last_name,
        u.email        AS guest_email,
        r.room_number,
        r.room_type,
        r.price_per_night,
        h.id           AS hotel_id,
        h.name         AS hotel_name,
        h.city         AS hotel_city
      FROM bookings b
      JOIN users  u ON b.user_id = u.id
      JOIN rooms  r ON b.room_id = r.id
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
    if (filters.search) {
      conditions.push("(u.first_name LIKE ? OR u.last_name LIKE ? OR h.name LIKE ?)");
      const term = `%${filters.search.trim()}%`;
      params.push(term, term, term);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY b.created_at DESC";

    if (filters.limit) {
      sql += " LIMIT ?";
      params.push(parseInt(filters.limit, 10));
    }

    const [rows] = await pool.query(sql, params);
    return rows;
  },

  /**
   * findByUserId
   * Retrieve all bookings for a specific user, enriched with hotel/room data.
   */
  findByUserId: async (userId) => {
    const [rows] = await pool.query(
      `SELECT
         b.*,
         r.room_number,
         r.room_type,
         r.price_per_night,
         h.id   AS hotel_id,
         h.name AS hotel_name,
         h.city AS hotel_city
       FROM bookings b
       JOIN rooms  r ON b.room_id = r.id
       JOIN hotels h ON r.hotel_id = h.id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [userId]
    );
    return rows;
  },

  /**
   * findById
   * Retrieve a single booking by ID, enriched with related data.
   */
  findById: async (id) => {
    const [rows] = await pool.query(
      `SELECT
         b.*,
         u.first_name,
         u.last_name,
         u.email        AS guest_email,
         r.room_number,
         r.room_type,
         r.price_per_night,
         h.id           AS hotel_id,
         h.name         AS hotel_name,
         h.city         AS hotel_city
       FROM bookings b
       JOIN users  u ON b.user_id = u.id
       JOIN rooms  r ON b.room_id = r.id
       JOIN hotels h ON r.hotel_id = h.id
       WHERE b.id = ?
       LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  /**
   * create
   * Insert a new booking record.
   */
  create: async ({ user_id, room_id, check_in, check_out, total_price, booking_status }) => {
    const [result] = await pool.query(
      `INSERT INTO bookings (user_id, room_id, check_in, check_out, total_price, booking_status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        room_id,
        check_in,
        check_out,
        total_price,
        booking_status || "pending",
      ]
    );
    return result.insertId;
  },

  /**
   * updateStatus
   * Update the booking_status for a given booking ID.
   */
  updateStatus: async (id, status) => {
    const [result] = await pool.query(
      "UPDATE bookings SET booking_status = ? WHERE id = ?",
      [status, id]
    );
    return result.affectedRows;
  },

  /**
   * isRoomAvailable
   * Returns true if the room has no overlapping active bookings.
   */
  isRoomAvailable: async (roomId, checkIn, checkOut) => {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS overlapCount
       FROM bookings
       WHERE room_id = ?
         AND booking_status NOT IN ('cancelled', 'completed')
         AND check_in  < ?
         AND check_out > ?`,
      [roomId, checkOut, checkIn]
    );
    return rows[0].overlapCount === 0;
  },

  /**
   * getMonthlyRevenue
   * Returns revenue grouped by month for the past 6 months.
   */
  getMonthlyRevenue: async () => {
    const [rows] = await pool.query(`
      SELECT
        DATE_FORMAT(b.created_at, '%Y-%m') AS month,
        DATE_FORMAT(b.created_at, '%b %Y') AS label,
        COALESCE(SUM(p.amount), 0)          AS revenue,
        COUNT(b.id)                          AS bookings
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
