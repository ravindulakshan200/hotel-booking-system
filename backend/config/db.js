/**
 * config/db.js
 * MySQL Connection Pool
 *
 * Creates and exports a mysql2 promise-based connection pool.
 * The pool is shared across all model files — do NOT create
 * separate connections in individual modules.
 *
 * Usage:
 *   const pool = require('../config/db');
 *   const [rows] = await pool.query('SELECT * FROM users');
 */

const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "hotel_booking_system",
  waitForConnections: true,
  connectionLimit: 10,       // Maximum simultaneous connections
  queueLimit: 0,             // Unlimited queued requests
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

module.exports = pool;
