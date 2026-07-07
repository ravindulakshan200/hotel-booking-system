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
    return rows;
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
  create: async ({ name, address, city, description }) => {
    const [result] = await pool.query(
      `INSERT INTO hotels (name, address, city, description)
       VALUES (?, ?, ?, ?)`,
      [
        name.trim(),
        address.trim(),
        city.trim(),
        description ? description.trim() : null,
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
    const allowedFields = ["name", "address", "city", "description"];
    const setClauses = [];
    const params     = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        params.push(
          typeof updates[field] === "string"
            ? updates[field].trim()
            : updates[field]
        );
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
};

module.exports = Hotel;
