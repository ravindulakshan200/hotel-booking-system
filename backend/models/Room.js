/**
 * models/Room.js
 *
 * Data-access layer for the `rooms` table.
 */

const pool = require("../config/db");

const Room = {
  findAll: async (filters = {}) => {
    let sql = "SELECT * FROM rooms";
    const params = [];
    const conditions = [];

    if (filters.hotel_id) {
      conditions.push("hotel_id = ?");
      params.push(filters.hotel_id);
    }
    if (filters.room_type) {
      conditions.push("room_type = ?");
      params.push(filters.room_type);
    }
    if (filters.availability_status) {
      conditions.push("availability_status = ?");
      params.push(filters.availability_status);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY created_at DESC";

    const [rows] = await pool.query(sql, params);
    return rows;
  },

  findById: async (id) => {
    const [rows] = await pool.query(
      "SELECT * FROM rooms WHERE id = ? LIMIT 1",
      [id]
    );
    return rows[0] || null;
  },

  create: async ({ hotel_id, room_number, room_type, price_per_night, capacity, availability_status, image_url }) => {
    const [result] = await pool.query(
      `INSERT INTO rooms (hotel_id, room_number, room_type, price_per_night, capacity, availability_status, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        hotel_id,
        room_number.trim(),
        room_type || 'single',
        price_per_night,
        capacity || 1,
        availability_status || 'available',
        image_url ? image_url.trim() : null,
      ]
    );
    return result.insertId;
  },

  update: async (id, updates) => {
    const allowedFields = ["hotel_id", "room_number", "room_type", "price_per_night", "capacity", "availability_status", "image_url"];
    const setClauses = [];
    const params = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        params.push(
          typeof updates[field] === "string" ? updates[field].trim() : updates[field]
        );
      }
    }

    if (setClauses.length === 0) {
      return 0; // Nothing to update
    }

    params.push(id); // WHERE id = ?

    const [result] = await pool.query(
      `UPDATE rooms SET ${setClauses.join(", ")} WHERE id = ?`,
      params
    );

    return result.affectedRows;
  },

  delete: async (id) => {
    const [result] = await pool.query("DELETE FROM rooms WHERE id = ?", [id]);
    return result.affectedRows;
  },
};

module.exports = Room;
