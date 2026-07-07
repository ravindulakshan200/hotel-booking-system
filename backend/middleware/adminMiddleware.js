/**
 * middleware/adminMiddleware.js
 *
 * Role-Based Authorization Middleware.
 *
 * Must be chained AFTER the `protect` middleware from authMiddleware.js,
 * which guarantees req.user is already populated when adminOnly runs.
 *
 * Returns 403 Forbidden if the authenticated user does not have
 * the 'admin' role.
 *
 * Usage:
 *   const { protect }   = require('../middleware/authMiddleware');
 *   const { adminOnly } = require('../middleware/adminMiddleware');
 *
 *   router.post('/', protect, adminOnly, createHotel);
 */

/**
 * adminOnly
 * Restrict a route to users whose role is 'admin'.
 */
const adminOnly = (req, res, next) => {
  // protect middleware always sets req.user before this runs
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admins only.",
    });
  }
  next();
};

module.exports = { adminOnly };
