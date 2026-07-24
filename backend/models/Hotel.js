/**
 * models/Hotel.js
 *
 * Data-access layer for the `hotels` table.
 * All SQL queries for hotels are centralised here.
 *
 * Table schema (defined in database.sql):
 *   id           INT AUTO_INCREMENT PRIMARY KEY
 *   name         VARCHAR(150)  NOT NULL
 *   address      VARCHAR(255)  NOT NULL
 *   city         VARCHAR(100)  NOT NULL
 *   description  TEXT          DEFAULT NULL
 *   created_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
 *   updated_at   TIMESTAMP     ON UPDATE CURRENT_TIMESTAMP
 *
 * Usage:
 *   const Hotel = require('../models/Hotel');
 *   const hotels = await Hotel.findAll({ city: 'Miami' });
 */

const pool = require("../config/db");

const Hotel = {
  /**
   * findAll
   * Retrieve all hotels. Optionally filter by city or search by name.
   *
   * @param {object}  [filters={}]
   * @param {string}  [filters.city]    — exact city match (case-insensitive)
   * @param {string}  [filters.search]  — partial name / city / address match
   * @returns {Promise<object[]>}       — array of hotel rows
   */
  findAll: async (filters = {}) => {
    let sql    = "SELECT * FROM hotels";
    const params = [];

    const conditions = [];

    if (!filters.includeInactive) {
      conditions.push("status = 'active'");
    }

    if (filters.city) {
      conditions.push("LOWER(city) = LOWER(?)");
      params.push(filters.city.trim());
    }

    if (filters.search) {
      conditions.push(
        "(name LIKE ? OR city LIKE ? OR address LIKE ?)"
      );
      const term = `%${filters.search.trim()}%`;
      params.push(term, term, term);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY created_at DESC";

    const [rows] = await pool.query(sql, params);
    return rows.map(row => {
      if (typeof row.amenities === 'string') {
        try { row.amenities = JSON.parse(row.amenities); } catch(e) { row.amenities = []; }
      }
      return row;
    });
  },

  /**
   * findById
   * Retrieve a single hotel by primary key.
   *
   * @param {number} id
   * @returns {Promise<object|null>} — hotel row or null if not found
   */
  findById: async (id) => {
    const [rows] = await pool.query(
      "SELECT * FROM hotels WHERE id = ? LIMIT 1",
      [id]
    );
    if (rows[0] && typeof rows[0].amenities === 'string') {
      try { rows[0].amenities = JSON.parse(rows[0].amenities); } catch(e) { rows[0].amenities = []; }
    }
    return rows[0] || null;
  },

  /**
   * create
   * Insert a new hotel record.
   *
   * @param {object} hotelData
   * @param {string} hotelData.name
   * @param {string} hotelData.address
   * @param {string} hotelData.city
   * @param {string} [hotelData.description]
   * @returns {Promise<number>} — insertId of the new row
   */
  create: async ({ name, address, city, description, image_url, star_rating, amenities, contact_phone, contact_email, map_url, status }) => {
    const amStr = amenities ? JSON.stringify(amenities) : null;
    const [result] = await pool.query(
      `INSERT INTO hotels (name, address, city, description, image_url, star_rating, amenities, contact_phone, contact_email, map_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, 'active'))`,
      [
        name.trim(),
        address.trim(),
        city.trim(),
        description ? description.trim() : null,
        image_url ? image_url.trim() : null,
        star_rating !== undefined ? star_rating : null,
        amStr,
        contact_phone ? contact_phone.trim() : null,
        contact_email ? contact_email.trim() : null,
        map_url ? map_url.trim() : null,
        status ? status.trim() : 'active'
      ]
    );
    return result.insertId;
  },

  /**
   * update
   * Update an existing hotel record by ID.
   * Only columns provided in the `updates` object are changed.
   *
   * @param {number} id
   * @param {object} updates — subset of hotel columns to update
   * @returns {Promise<number>} — affectedRows count
   */
  update: async (id, updates) => {
    // Build SET clause dynamically from provided fields
    const allowedFields = ["name", "address", "city", "description", "image_url", "star_rating", "amenities", "contact_phone", "contact_email", "map_url", "status"];
    const setClauses = [];
    const params     = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        if (field === 'amenities') {
          params.push(updates[field] ? JSON.stringify(updates[field]) : null);
        } else {
          params.push(
            typeof updates[field] === "string"
              ? updates[field].trim()
              : updates[field]
          );
        }
      }
    }

    if (setClauses.length === 0) {
      return 0; // Nothing to update
    }

    params.push(id); // WHERE id = ?

    const [result] = await pool.query(
      `UPDATE hotels SET ${setClauses.join(", ")} WHERE id = ?`,
      params
    );

    return result.affectedRows;
  },

  /**
   * delete
   * Hard-delete a hotel by ID.
   * Note: will fail (FK constraint) if rooms are linked to this hotel.
   *
   * @param {number} id
   * @returns {Promise<number>} — affectedRows count
   */
  delete: async (id) => {
    const [result] = await pool.query(
      "DELETE FROM hotels WHERE id = ?",
      [id]
    );
    return result.affectedRows;
  },

  /**
   * findAvailable
   * Search hotels based on room availability and filters.
   */
  findAvailable: async (filters = {}) => {
    let sql = `
      SELECT
        h.id, h.name, h.address, h.city, h.description, h.image_url, h.star_rating, h.amenities, h.contact_phone, h.contact_email, h.map_url, h.status, h.created_at, h.updated_at,
        COUNT(r.id) AS available_rooms,
        MIN(r.price_per_night) AS starting_price
      FROM hotels h
      JOIN rooms r ON h.id = r.hotel_id
      WHERE r.availability_status = 'available' AND h.status = 'active'
    `;
    const params = [];

    if (filters.city) {
      sql += " AND LOWER(h.city) = LOWER(?)";
      params.push(filters.city.trim());
    }
    if (filters.guests) {
      sql += " AND r.capacity >= ?";
      params.push(filters.guests);
    }
    if (filters.room_type) {
      sql += " AND r.room_type = ?";
      params.push(filters.room_type);
    }
    if (filters.min_price) {
      sql += " AND r.price_per_night >= ?";
      params.push(filters.min_price);
    }
    if (filters.max_price) {
      sql += " AND r.price_per_night <= ?";
      params.push(filters.max_price);
    }
    if (filters.check_in && filters.check_out) {
      sql += ` AND r.id NOT IN (
        SELECT room_id FROM bookings
        WHERE booking_status NOT IN ('cancelled', 'completed')
          AND check_in < ? AND check_out > ?
      )`;
      params.push(filters.check_out, filters.check_in);
    }

    sql += " GROUP BY h.id";

    if (filters.sort === 'price_low') {
      sql += " ORDER BY starting_price ASC, h.name ASC";
    } else if (filters.sort === 'price_high') {
      sql += " ORDER BY starting_price DESC, h.name ASC";
    } else if (filters.sort === 'name') {
      sql += " ORDER BY h.name ASC";
    } else {
      sql += " ORDER BY h.created_at DESC";
    }

    const [rows] = await pool.query(sql, params);
    return rows.map(row => {
      if (typeof row.amenities === 'string') {
        try { row.amenities = JSON.parse(row.amenities); } catch(e) { row.amenities = []; }
      }
      return row;
    });
  },
};

module.exports = Hotel;
