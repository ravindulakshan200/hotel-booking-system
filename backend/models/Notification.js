/**
 * models/Notification.js
 * Data-access layer for the `notifications` table.
 *
 * Security guarantees:
 *  - user_id must always come from req.user.id (enforced at controller level)
 *  - metadata must never contain passwords, tokens, or payment secrets
 *  - ownership is enforced in markOneRead via WHERE user_id = ?
 *  - INSERT IGNORE on event_key prevents duplicate notifications
 */

const pool = require('../config/db');

const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 20;

const Notification = {
  /**
   * Create an in-app notification.
   * Uses INSERT IGNORE so duplicate event_key entries are silently skipped,
   * providing the same idempotency guarantee as the email outbox.
   *
   * @param {object|null} db - A transaction connection or null to use the global pool.
   * @param {object} params
   * @param {number}  params.userId
   * @param {string}  params.eventKey  - Deterministic unique key (e.g. booking_created_42)
   * @param {string}  params.type      - 'booking'|'payment'|'refund'|'reminder'|'system'
   * @param {string}  params.title
   * @param {string}  params.message
   * @param {object|null} [params.metadata]  - Safe non-sensitive JSON context
   * @param {Date|null}   [params.expiresAt]
   */
  create: async (db, { userId, eventKey, type, title, message, metadata = null, expiresAt = null }) => {
    const dbConn = db || pool;
    const safeMetadata = metadata !== null ? JSON.stringify(metadata) : null;
    const [result] = await dbConn.query(
      `INSERT IGNORE INTO notifications (user_id, event_key, type, title, message, metadata, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, eventKey, type, title, message, safeMetadata, expiresAt || null]
    );
    return result.insertId;
  },

  /**
   * Get paginated notifications for a user.
   * user_id must come from req.user.id — never from the client request body.
   *
   * @param {number} userId
   * @param {{ page?: number, pageSize?: number }} options
   */
  findByUserId: async (userId, { page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}) => {
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safePageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(pageSize, 10) || DEFAULT_PAGE_SIZE));
    const offset = (safePage - 1) * safePageSize;

    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) AS total FROM notifications WHERE user_id = ?',
      [userId]
    );

    const [rows] = await pool.query(
      `SELECT id, event_key, type, title, message, metadata, read_at, expires_at, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, safePageSize, offset]
    );

    const totalNum = Number(total);
    return {
      notifications: rows,
      total: totalNum,
      page: safePage,
      pageSize: safePageSize,
      totalPages: Math.ceil(totalNum / safePageSize) || 1,
    };
  },

  /**
   * Count unread notifications for a user.
   * @param {number} userId
   */
  getUnreadCount: async (userId) => {
    const [[{ count }]] = await pool.query(
      'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND read_at IS NULL',
      [userId]
    );
    return Number(count);
  },

  /**
   * Mark a single notification as read.
   * Ownership is enforced by requiring user_id to match — a user cannot
   * mark another user's notification as read.
   *
   * @param {number} id      - Notification ID
   * @param {number} userId  - Must come from req.user.id
   * @returns {boolean} true if the row was updated
   */
  markOneRead: async (id, userId) => {
    const [result] = await pool.query(
      `UPDATE notifications SET read_at = NOW()
       WHERE id = ? AND user_id = ? AND read_at IS NULL`,
      [id, userId]
    );
    return result.affectedRows > 0;
  },

  /**
   * Mark all notifications for a user as read.
   * @param {number} userId  - Must come from req.user.id
   * @returns {number} count of rows updated
   */
  markAllRead: async (userId) => {
    const [result] = await pool.query(
      `UPDATE notifications SET read_at = NOW()
       WHERE user_id = ? AND read_at IS NULL`,
      [userId]
    );
    return result.affectedRows;
  },
};

module.exports = Notification;
