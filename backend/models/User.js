/**
 * models/User.js
 *
 * Data-access layer for the `users` table.
 * All SQL queries related to users are centralised here.
 *
 * Table schema (defined in database.sql):
 *   id           INT AUTO_INCREMENT PRIMARY KEY
 *   first_name   VARCHAR(50)  NOT NULL
 *   last_name    VARCHAR(50)  NOT NULL
 *   email        VARCHAR(150) NOT NULL UNIQUE
 *   password     VARCHAR(255) NOT NULL          — bcrypt hash
 *   phone        VARCHAR(20)  DEFAULT NULL
 *   role         ENUM('admin','customer')        DEFAULT 'customer'
 *   created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
 *   updated_at   TIMESTAMP    ON UPDATE CURRENT_TIMESTAMP
 *
 * Convention:
 *   - findById() strips the password field — safe to attach to req.user
 *   - findByEmail() returns the password hash — needed for bcrypt.compare in login
 *   - createUser() hashes the password internally before inserting
 */

const bcrypt = require("bcryptjs");
const pool   = require("../config/db");
const { parsePagination, buildPaginatedResponse } = require('../utils/paginate');

const SALT_ROUNDS = 12;

const User = {
  /**
   * createUser
   * Hash the password and insert a new user row.
   *
   * @param {object} userData
   * @param {string} userData.first_name
   * @param {string} userData.last_name
   * @param {string} userData.email
   * @param {string} userData.password   — plain text; hashed here before insert
   * @param {string} [userData.phone]
   * @returns {Promise<number>} insertId of the new user row
   */
  createUser: async ({ first_name, last_name, email, password, phone }) => {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const [result] = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password, phone)
       VALUES (?, ?, ?, ?, ?)`,
      [
        first_name.trim(),
        last_name.trim(),
        email.trim().toLowerCase(),
        hashedPassword,
        phone ? phone.trim() : null,
      ]
    );

    return result.insertId;
  },

  /**
   * findUserByEmail
   * Fetch a user by email — INCLUDES the password hash.
   * Used during login to run bcrypt.compare.
   * Never send this object directly to the client.
   *
   * @param {string} email
   * @returns {Promise<object|null>} full user row or null if not found
   */
  findUserByEmail: async (email) => {
    const [rows] = await pool.query(
      `SELECT id, first_name, last_name, email, password, phone, role,
              created_at, email_verified_at, password_changed_at, is_active
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email.trim().toLowerCase()]
    );
    return rows[0] || null;
  },

  /**
   * findUserById
   * Fetch a user by primary key — EXCLUDES the password field.
   * Safe to attach to req.user and return in API responses.
   *
   * @param {number} id
   * @returns {Promise<object|null>} user row without password, or null
   */
  findUserById: async (id) => {
    const [rows] = await pool.query(
      `SELECT id, first_name, last_name, email, phone, role,
              created_at, email_verified_at, password_changed_at, is_active
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  findAll: async (filters = {}, queryParams = {}) => {
    const conditions = [];
    const params = [];

    if (filters.role) {
      conditions.push('role = ?');
      params.push(filters.role);
    }
    if (filters.is_active !== undefined) {
      conditions.push('is_active = ?');
      params.push(filters.is_active ? 1 : 0);
    }
    if (filters.search) {
      conditions.push('(first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)');
      const t = `%${filters.search}%`;
      params.push(t, t, t);
    }

    const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
    const orderBy = ' ORDER BY created_at DESC, id DESC';

    if (!queryParams.paginate) {
      const [rows] = await pool.query(
        `SELECT id, first_name, last_name, email, phone, role, is_active, deactivated_at, created_at FROM users${where}${orderBy}`,
        params
      );
      return rows;
    }

    const { page, limit, offset } = parsePagination(queryParams);
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM users${where}`, params);
    const [rows] = await pool.query(
      `SELECT id, first_name, last_name, email, phone, role, is_active, deactivated_at, created_at
       FROM users${where}${orderBy} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return buildPaginatedResponse(rows, total, page, limit);
  },

  updateProfile: async (id, updates) => {
    const allowedFields = ["first_name", "last_name", "phone"];
    const setClauses = [];
    const params = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        if (field === "phone" && (updates[field] === null || updates[field].trim() === "")) {
          params.push(null);
        } else {
          params.push(
            typeof updates[field] === "string" ? updates[field].trim() : updates[field]
          );
        }
      }
    }

    if (setClauses.length === 0) {
      return 0;
    }

    params.push(id);

    const [result] = await pool.query(
      `UPDATE users SET ${setClauses.join(", ")} WHERE id = ?`,
      params
    );

    return result.affectedRows;
  },

  updatePassword: async (id, newPassword) => {
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const [result] = await pool.query(
      `UPDATE users
       SET password = ?,
           password_changed_at = CURRENT_TIMESTAMP,
           password_reset_token_hash = NULL,
           password_reset_expires_at = NULL
       WHERE id = ?`,
      [hashedPassword, id]
    );
    return result.affectedRows;
  },

  setVerificationToken: async (id, tokenHash, expiresAt) => {
    const [result] = await pool.query(
      `UPDATE users
       SET email_verification_token_hash = ?, email_verification_expires_at = ?
       WHERE id = ?`,
      [tokenHash, expiresAt, id]
    );
    return result.affectedRows;
  },

  findUserByVerificationToken: async (tokenHash) => {
    const [rows] = await pool.query(
      `SELECT id, first_name, last_name, email, email_verified_at, email_verification_expires_at
       FROM users
       WHERE email_verification_token_hash = ?
       LIMIT 1`,
      [tokenHash]
    );
    return rows[0] || null;
  },

  verifyEmail: async (id) => {
    const [result] = await pool.query(
      `UPDATE users
       SET email_verified_at = CURRENT_TIMESTAMP,
           email_verification_token_hash = NULL,
           email_verification_expires_at = NULL
       WHERE id = ?`,
      [id]
    );
    return result.affectedRows;
  },

  setResetToken: async (email, tokenHash, expiresAt) => {
    const [result] = await pool.query(
      `UPDATE users
       SET password_reset_token_hash = ?, password_reset_expires_at = ?
       WHERE email = ?`,
      [tokenHash, expiresAt, email]
    );
    return result.affectedRows;
  },

  findUserByResetToken: async (tokenHash) => {
    const [rows] = await pool.query(
      `SELECT id, first_name, last_name, email, password_reset_expires_at
       FROM users
       WHERE password_reset_token_hash = ?
       LIMIT 1`,
      [tokenHash]
    );
    return rows[0] || null;
  },

  /** Soft-deactivate a user account */
  deactivate: async (id, reason = 'self') => {
    const [result] = await pool.query(
      `UPDATE users
       SET is_active = 0, deactivated_at = CURRENT_TIMESTAMP, deactivation_reason = ?
       WHERE id = ?`,
      [reason, id]
    );
    return result.affectedRows;
  },

  /** Reactivate a previously deactivated account */
  reactivate: async (id) => {
    const [result] = await pool.query(
      `UPDATE users
       SET is_active = 1, deactivated_at = NULL, deactivation_reason = NULL
       WHERE id = ?`,
      [id]
    );
    return result.affectedRows;
  },

  /**
   * Count active admin accounts.
   * Used to prevent removing the last active admin.
   */
  countActiveAdmins: async () => {
    const [[{ cnt }]] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM users WHERE role = 'admin' AND is_active = 1`
    );
    return cnt;
  },
};

module.exports = User;
