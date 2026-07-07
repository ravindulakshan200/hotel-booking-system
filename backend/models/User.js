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

const SALT_ROUNDS = 10;

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
      `SELECT id, first_name, last_name, email, password, phone, role, created_at
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
      `SELECT id, first_name, last_name, email, phone, role, created_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    return rows[0] || null;
  },

  findAll: async (filters = {}) => {
    let sql = `SELECT id, first_name, last_name, email, phone, role, created_at
               FROM users`;
    const params = [];

    if (filters.role) {
      sql += " WHERE role = ?";
      params.push(filters.role);
    }

    sql += " ORDER BY created_at DESC";

    const [rows] = await pool.query(sql, params);
    return rows;
  },

  updateProfile: async (id, updates) => {
    const allowedFields = ["first_name", "last_name", "phone"];
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
      "UPDATE users SET password = ? WHERE id = ?",
      [hashedPassword, id]
    );
    return result.affectedRows;
  },
};

module.exports = User;
