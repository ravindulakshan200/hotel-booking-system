/**
 * models/Review.js
 * Data-access layer for the `reviews` table.
 */

const pool = require("../config/db");

const Review = {
  findByHotel: async (hotelId) => {
    const [rows] = await pool.query(
      `SELECT r.*, u.first_name, u.last_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.hotel_id = ?
       ORDER BY r.created_at DESC`,
      [hotelId]
    );
    return rows;
  },

  findByUser: async (userId) => {
    const [rows] = await pool.query(
      `SELECT r.*, h.name AS hotel_name, h.city
       FROM reviews r
       JOIN hotels h ON r.hotel_id = h.id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC`,
      [userId]
    );
    return rows;
  },

  findAll: async () => {
    const [rows] = await pool.query(
      `SELECT r.*, u.first_name, u.last_name, h.name AS hotel_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       JOIN hotels h ON r.hotel_id = h.id
       ORDER BY r.created_at DESC`
    );
    return rows;
  },

  findById: async (id) => {
    const [rows] = await pool.query(
      "SELECT * FROM reviews WHERE id = ? LIMIT 1",
      [id]
    );
    return rows[0] || null;
  },

  getAverageRating: async (hotelId) => {
    const [rows] = await pool.query(
      `SELECT AVG(rating) AS avg_rating, COUNT(*) AS review_count
       FROM reviews WHERE hotel_id = ?`,
      [hotelId]
    );
    return {
      avg_rating: rows[0].avg_rating ? parseFloat(rows[0].avg_rating).toFixed(1) : null,
      review_count: rows[0].review_count || 0,
    };
  },

  create: async ({ user_id, hotel_id, rating, comment }) => {
    const [result] = await pool.query(
      `INSERT INTO reviews (user_id, hotel_id, rating, comment)
       VALUES (?, ?, ?, ?)`,
      [user_id, hotel_id, rating, comment ? comment.trim() : null]
    );
    return result.insertId;
  },

  delete: async (id) => {
    const [result] = await pool.query("DELETE FROM reviews WHERE id = ?", [id]);
    return result.affectedRows;
  },
};

module.exports = Review;
