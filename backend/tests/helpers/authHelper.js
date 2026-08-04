const crypto = require("crypto");
const generateToken = require("../../utils/generateToken");

/**
 * Generates authentication headers including the HttpOnly JWT cookie, 
 * the CSRF cookie, and the X-CSRF-Token header.
 * 
 * @param {number} userId - The user ID for the JWT payload
 * @param {string} role - The user role
 * @returns {Object} HTTP headers to be attached to supertest requests
 */
const getAuthHeaders = (userId, role = "user") => {
  const jwtToken = generateToken(userId, role);
  const csrfToken = crypto.randomBytes(32).toString("hex");
  
  return {
    "Cookie": `jwt=${jwtToken}; csrfToken=${csrfToken}`,
    "x-csrf-token": csrfToken,
    "Content-Type": "application/json"
  };
};

/**
 * Generates headers for unauthenticated requests with only CSRF.
 */
const getCsrfHeaders = () => {
  const csrfToken = crypto.randomBytes(32).toString("hex");
  return {
    "Cookie": `csrfToken=${csrfToken}`,
    "x-csrf-token": csrfToken,
    "Content-Type": "application/json"
  };
};

module.exports = { getAuthHeaders, getCsrfHeaders };
