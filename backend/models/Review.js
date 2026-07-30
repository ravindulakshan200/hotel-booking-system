/**
 * models/Review.js
 * Data-access layer for the `reviews` table.
 * Phase 7C: adds edit, soft-delete, hide/unhide, and review reporting.
 */

'use strict';

const pool = require('../config/db');
const { parsePagination, buildPaginatedResponse } = require('../utils/paginate');

const Review = {
  findByHotel: async (hotelId) => {
    const [rows] = await pool.query(
      `SELECT r.*, u.first_name, u.last_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.hotel_id = ?
         AND r.is_deleted = 0
         AND r.is_hidden = 0
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
         AND r.is_deleted = 0
       ORDER BY r.created_at DESC`,
      [userId]
    );
    return rows;
  },

  findAll: async (queryParams = {}) => {
    if (!queryParams.paginate) {
      const [rows] = await pool.query(
        `SELECT r.*, u.first_name, u.last_name, h.name AS hotel_name
         FROM reviews r
         JOIN users u ON r.user_id = u.id
         JOIN hotels h ON r.hotel_id = h.id
         WHERE r.is_deleted = 0
         ORDER BY r.created_at DESC, r.id DESC`
      );
      return rows;
    }

    const { page, limit, offset } = parsePagination(queryParams);
    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM reviews WHERE is_deleted = 0');
    const [items] = await pool.query(
      `SELECT r.*, u.first_name, u.last_name, h.name AS hotel_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       JOIN hotels h ON r.hotel_id = h.id
       WHERE r.is_deleted = 0
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    return buildPaginatedResponse(items, total, page, limit);
  },

  findById: async (id) => {
    const [rows] = await pool.query(
      'SELECT * FROM reviews WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0] || null;
  },

  getAverageRating: async (hotelId) => {
    const [rows] = await pool.query(
      `SELECT AVG(rating) AS avg_rating, COUNT(*) AS review_count
       FROM reviews WHERE hotel_id = ? AND is_deleted = 0 AND is_hidden = 0`,
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

  /** Owner update — validate rating 1–5, comment ≤ 2000 chars */
  update: async (id, { rating, comment }) => {
    const [result] = await pool.query(
      `UPDATE reviews SET rating = ?, comment = ? WHERE id = ? AND is_deleted = 0`,
      [rating, comment ? comment.slice(0, 2000).trim() : null, id]
    );
    return result.affectedRows;
  },

  /** Soft-delete by owner */
  softDelete: async (id, userId) => {
    const [result] = await pool.query(
      `UPDATE reviews
       SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [id, userId]
    );
    return result.affectedRows;
  },

  /** Hard-delete by admin */
  delete: async (id) => {
    const [result] = await pool.query('DELETE FROM reviews WHERE id = ?', [id]);
    return result.affectedRows;
  },

  /** Admin: hide review */
  hide: async (id, adminId) => {
    const [result] = await pool.query(
      `UPDATE reviews
       SET is_hidden = 1, hidden_at = CURRENT_TIMESTAMP, hidden_by_admin_id = ?
       WHERE id = ? AND is_deleted = 0`,
      [adminId, id]
    );
    return result.affectedRows;
  },

  /** Admin: unhide review */
  unhide: async (id) => {
    const [result] = await pool.query(
      `UPDATE reviews
       SET is_hidden = 0, hidden_at = NULL, hidden_by_admin_id = NULL
       WHERE id = ?`,
      [id]
    );
    return result.affectedRows;
  },

  // ─── Review Reports ───────────────────────────────────────────────────────

  /** Create a report. Returns null if a pending report already exists. */
  createReport: async ({ reviewId, reporterUserId, reason, category }) => {
    // Prevent duplicate pending reports from same user
    const [existing] = await pool.query(
      `SELECT id FROM review_reports
       WHERE review_id = ? AND reporter_user_id = ? AND status = 'pending'
       LIMIT 1`,
      [reviewId, reporterUserId]
    );
    if (existing[0]) return null;

    const [result] = await pool.query(
      `INSERT INTO review_reports (review_id, reporter_user_id, reason, category)
       VALUES (?, ?, ?, ?)`,
      [reviewId, reporterUserId, reason.slice(0, 2000), category]
    );
    return result.insertId;
  },

  /** Admin: paginated list of reports */
  findReports: async (filters = {}, queryParams = {}) => {
    const conditions = [];
    const params = [];
    if (filters.status) { conditions.push('rr.status = ?'); params.push(filters.status); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    if (!queryParams.paginate) {
      const [rows] = await pool.query(
        `SELECT rr.*, r.rating, r.comment, u.first_name AS reporter_name, u.email AS reporter_email
         FROM review_reports rr
         JOIN reviews r ON rr.review_id = r.id
         JOIN users u ON rr.reporter_user_id = u.id
         ${where}
         ORDER BY rr.id DESC`,
        params
      );
      return rows;
    }

    const { page, limit, offset } = parsePagination(queryParams);
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM review_reports rr ${where}`, params);
    const [items] = await pool.query(
      `SELECT rr.*, r.rating, r.comment, u.first_name AS reporter_name, u.email AS reporter_email
       FROM review_reports rr
       JOIN reviews r ON rr.review_id = r.id
       JOIN users u ON rr.reporter_user_id = u.id
       ${where}
       ORDER BY rr.id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return buildPaginatedResponse(items, total, page, limit);
  },

  /** Admin: resolve a report */
  resolveReport: async (reportId, status) => {
    const [result] = await pool.query(
      'UPDATE review_reports SET status = ? WHERE id = ?',
      [status, reportId]
    );
    return result.affectedRows;
  },
};

module.exports = Review;
