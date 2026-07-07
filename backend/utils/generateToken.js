/**
 * utils/generateToken.js
 *
 * JWT token generator utility.
 * Signs a payload with the application JWT_SECRET and a fixed expiry.
 *
 * Usage:
 *   const generateToken = require('../utils/generateToken');
 *   const token = generateToken(user.id);
 */

const jwt = require("jsonwebtoken");

/**
 * Generate a signed JWT for a given user ID.
 *
 * @param {number} userId — The authenticated user's primary key
 * @returns {string}      — Signed JWT string
 */
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },                       // Payload — keep minimal; never include password
    process.env.JWT_SECRET || "change_this_secret", // Secret from .env
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } // Token lifetime
  );
};

module.exports = generateToken;
