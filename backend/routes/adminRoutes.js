/**
 * routes/adminRoutes.js
 * Admin-only routes â€” all require protect + adminOnly middleware.
 */

const express  = require("express");
const router   = express.Router();

const {
  getDashboardStats,
  getAllUsers,
  deleteUser,
  updateBookingStatus,
} = require("../controllers/adminController");

const { protect }    = require("../middleware/authMiddleware");
const { adminOnly }  = require("../middleware/adminMiddleware");

// Apply auth + admin guard to every route in this file
router.use(protect, adminOnly);

// Dashboard (handles overview, charts, and recent bookings with ?period filter)
router.get("/dashboard", getDashboardStats);

// Alias for backward compatibility
router.get("/analytics", getDashboardStats);

// User management
router.get("/users",          getAllUsers);
router.delete("/users/:id",   deleteUser);

// Booking status management (admin override)
router.patch("/bookings/:id/status", updateBookingStatus);

module.exports = router;
