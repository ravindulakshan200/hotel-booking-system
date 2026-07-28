/**
 * models/Hotel.js
 *
 * Data-access layer for the `hotels` table.
 * All SQL queries for hotels are centralised here.
 */

const pool = require("../config/db");
const { parsePagination, buildPaginatedResponse } = require('../utils/paginate');

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
  findAll: async (filters = {}, queryParams = {}) => {
    const conditions = [];
    const params = [];

    if (!filters.includeInactive) conditions.push("status = 'active'");
    if (!filters.includeArchived) conditions.push("is_archived = FALSE");

    if (filters.city) {
      conditions.push("LOWER(city) = LOWER(?)");
      params.push(filters.city.trim());
    }
    if (filters.search) {
      conditions.push("(name LIKE ? OR city LIKE ? OR address LIKE ?)");
      const term = `%${filters.search.trim()}%`;
      params.push(term, term, term);
    }

    const where = conditions.length > 0 ? " WHERE " + conditions.join(" AND ") : "";
    const orderBy = " ORDER BY created_at DESC, id DESC";

    // Return all (no pagination) when paginate flag not set — backward compat
    if (!queryParams.paginate) {
      const [rows] = await pool.query(`SELECT * FROM hotels${where}${orderBy}`, params);
      return rows.map(parseAmenities);
    }

    const { page, limit, offset } = parsePagination(queryParams);
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM hotels${where}`, params);
    const [rows] = await pool.query(
      `SELECT * FROM hotels${where}${orderBy} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return buildPaginatedResponse(rows.map(parseAmenities), total, page, limit);
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
  create: async ({ name, address, city, description, image_url, star_rating, amenities, contact_phone, contact_email, map_url, status, latitude, longitude }) => {
    const amStr = amenities ? JSON.stringify(amenities) : null;
    const [result] = await pool.query(
      `INSERT INTO hotels (name, address, city, description, image_url, star_rating, amenities, contact_phone, contact_email, map_url, status, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, 'active'), ?, ?)`,
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
        status ? status.trim() : 'active',
        latitude !== undefined ? latitude : null,
        longitude !== undefined ? longitude : null,
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
    const allowedFields = ["name", "address", "city", "description", "image_url", "star_rating", "amenities", "contact_phone", "contact_email", "map_url", "status", "is_archived", "latitude", "longitude"];
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
  findAvailable: async (filters = {}, queryParams = {}) => {
    const baseSql = `
      SELECT
        h.id, h.name, h.address, h.city, h.description, h.image_url,
        h.star_rating, h.amenities, h.contact_phone, h.contact_email,
        h.map_url, h.status, h.latitude, h.longitude, h.created_at, h.updated_at,
        COUNT(r.id) AS available_rooms,
        MIN(r.price_per_night) AS starting_price
      FROM hotels h
      JOIN rooms r ON h.id = r.hotel_id
      WHERE r.availability_status = 'available'
        AND h.status = 'active'
        AND h.is_archived = FALSE
        AND r.is_archived = FALSE
    `;
    const params = [];
    let extraWhere = '';

    if (filters.city) { extraWhere += " AND LOWER(h.city) = LOWER(?)"; params.push(filters.city.trim()); }
    if (filters.guests)     { extraWhere += " AND r.capacity >= ?";       params.push(filters.guests); }
    if (filters.room_type)  { extraWhere += " AND r.room_type = ?";       params.push(filters.room_type); }
    if (filters.min_price)  { extraWhere += " AND r.price_per_night >= ?"; params.push(filters.min_price); }
    if (filters.max_price)  { extraWhere += " AND r.price_per_night <= ?"; params.push(filters.max_price); }
    if (filters.check_in && filters.check_out) {
      extraWhere += ` AND r.id NOT IN (
        SELECT room_id FROM bookings
        WHERE booking_status NOT IN ('cancelled','expired','refunded','checked_out','completed')
          AND (booking_status != 'pending' OR expires_at IS NULL OR expires_at > NOW())
          AND check_in < ? AND check_out > ?)`;
      params.push(filters.check_out, filters.check_in);
    }

    const groupBy = " GROUP BY h.id";
    const orderBy = filters.sort === 'price_low'  ? " ORDER BY starting_price ASC,  h.name ASC, h.id ASC"
                  : filters.sort === 'price_high' ? " ORDER BY starting_price DESC, h.name ASC, h.id ASC"
                  : filters.sort === 'name'       ? " ORDER BY h.name ASC, h.id ASC"
                  :                                  " ORDER BY h.created_at DESC, h.id DESC";

    if (!queryParams.paginate) {
      const [rows] = await pool.query(baseSql + extraWhere + groupBy + orderBy, params);
      return rows.map(parseAmenities);
    }

    const { page, limit, offset } = parsePagination(queryParams);
    // Count distinct hotels
    const countSql = `SELECT COUNT(DISTINCT h.id) AS total FROM hotels h JOIN rooms r ON h.id = r.hotel_id
      WHERE r.availability_status = 'available' AND h.status = 'active' AND h.is_archived = FALSE AND r.is_archived = FALSE${extraWhere.replace(/AND r\.id NOT IN[\s\S]*?\?\)/g,'')}`;
    const [[{ total }]] = await pool.query(countSql, params.slice(0, params.length - (filters.check_in ? 2 : 0)));
    const [rows] = await pool.query(baseSql + extraWhere + groupBy + orderBy + " LIMIT ? OFFSET ?", [...params, limit, offset]);
    return buildPaginatedResponse(rows.map(parseAmenities), total, page, limit);
  },
};

/** Parse amenities JSON safely */
function parseAmenities(row) {
  if (typeof row.amenities === 'string') {
    try { row.amenities = JSON.parse(row.amenities); } catch(e) { row.amenities = []; }
  }
  return row;
}

module.exports = Hotel;
