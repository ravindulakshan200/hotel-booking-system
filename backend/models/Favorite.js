/**
 * models/Favorite.js
 * Data-access layer for the `favorites` table.
 */

const pool = require("../config/db");

const Favorite = {
  findByUser: async (userId) => {
    const [rows] = await pool.query(
      `SELECT f.id AS favorite_id, f.created_at AS favorited_at,
              h.*
       FROM favorites f
       JOIN hotels h ON f.hotel_id = h.id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`,
      [userId]
    );
    return rows;
  },

  exists: async (userId, hotelId) => {
    const [rows] = await pool.query(
      "SELECT id FROM favorites WHERE user_id = ? AND hotel_id = ? LIMIT 1",
      [userId, hotelId]
    );
    return rows.length > 0;
  },

  add: async (userId, hotelId) => {
    const [result] = await pool.query(
      "INSERT INTO favorites (user_id, hotel_id) VALUES (?, ?)",
      [userId, hotelId]
    );
    return result.insertId;
  },

  remove: async (userId, hotelId) => {
    const [result] = await pool.query(
      "DELETE FROM favorites WHERE user_id = ? AND hotel_id = ?",
      [userId, hotelId]
    );
    return result.affectedRows;
  },
};

module.exports = Favorite;
