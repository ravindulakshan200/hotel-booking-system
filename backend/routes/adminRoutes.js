/**
 * routes/adminRoutes.js
 * Admin-only routes â€” all require protect + adminOnly middleware.
 */

const express  = require("express");
const router   = express.Router();

const {
  getDashboardStats,
  getAllUsers,
  getAllHotelsAdmin,
  deleteUser,
  updateBookingStatus,
  getEmailStats,
  retryEmail,
  updateBookingRefund,
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

// Hotel management
router.get("/hotels",         getAllHotelsAdmin);

// Booking status management (admin override)
router.patch("/bookings/:id/status", updateBookingStatus);
router.patch("/bookings/:id/refund", updateBookingRefund);

// Cleanup expired bookings manually (admin)
const { cleanupExpiredBookings } = require("../controllers/bookingController");
router.post("/bookings/cleanup-expired", cleanupExpiredBookings);

// Email Outbox Management
router.get("/email/stats", getEmailStats);
router.post("/email/retry/:id", retryEmail);

module.exports = router;
