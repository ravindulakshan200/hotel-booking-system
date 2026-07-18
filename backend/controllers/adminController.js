/**
 * controllers/adminController.js
 * Admin dashboard statistics, analytics, and user/booking management.
 */

const pool = require("../config/db");
const User = require("../models/User");
const Booking = require("../models/Booking");

// ─── DASHBOARD STATS ──────────────────────────────────────────────────────────

const getDashboardStats = async (req, res, next) => {
  try {
    const [[stats]] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'customer') AS total_customers,
        (SELECT COUNT(*) FROM hotels)                         AS total_hotels,
        (SELECT COUNT(*) FROM rooms)                          AS total_rooms,
        (SELECT COUNT(*) FROM bookings)                       AS total_bookings,
        (SELECT COUNT(*) FROM bookings WHERE booking_status = 'confirmed')  AS confirmed_bookings,
        (SELECT COUNT(*) FROM bookings WHERE booking_status = 'pending')    AS pending_bookings,
        (SELECT COUNT(*) FROM bookings WHERE booking_status = 'cancelled')  AS cancelled_bookings,
        (SELECT COUNT(*) FROM bookings WHERE booking_status = 'completed')  AS completed_bookings,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payment_status = 'completed') AS total_revenue,
        (SELECT COUNT(*) FROM reviews) AS total_reviews
    `);

    const recentBookings = await Booking.findAll({ limit: 5 });

    return res.status(200).json({
      success: true,
      message: "Dashboard stats fetched successfully.",
      data: { stats, recentBookings },
    });
  } catch (error) {
    next(error);
  }
};

// ─── ANALYTICS ────────────────────────────────────────────────────────────────

const getAnalytics = async (req, res, next) => {
  try {
    // Monthly revenue for last 6 months
    const monthlyRevenue = await Booking.getMonthlyRevenue();

    // Top 5 hotels by booking count
    const [topHotels] = await pool.query(`
      SELECT
        h.id,
        h.name,
        h.city,
        COUNT(b.id)                         AS total_bookings,
        COALESCE(SUM(p.paid_amount), 0)     AS total_revenue
      FROM hotels h
      LEFT JOIN rooms r ON r.hotel_id = h.id
      LEFT JOIN bookings b ON b.room_id = r.id AND b.booking_status != 'cancelled'
      LEFT JOIN (
        SELECT booking_id, SUM(amount) AS paid_amount
        FROM payments
        WHERE payment_status = 'completed'
        GROUP BY booking_id
      ) p ON p.booking_id = b.id
      GROUP BY h.id, h.name, h.city
      ORDER BY total_bookings DESC
      LIMIT 5
    `);

    // Booking status breakdown
    const [statusBreakdown] = await pool.query(`
      SELECT booking_status, COUNT(*) AS count
      FROM bookings
      GROUP BY booking_status
    `);

    return res.status(200).json({
      success: true,
      message: "Analytics fetched successfully.",
      data: { monthlyRevenue, topHotels, statusBreakdown },
    });
  } catch (error) {
    next(error);
  }
};

// ─── USER MANAGEMENT ─────────────────────────────────────────────────────────

const getAllUsers = async (req, res, next) => {
  try {
    const { role } = req.query;
    if (role && !["admin", "customer"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role filter." });
    }
    const users = await User.findAll({ role });

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully.",
      data: { count: users.length, users },
    });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({ success: false, message: "Invalid user ID." });
    }

    const user = await User.findUserById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (user.role === "admin") {
      return res.status(403).json({ success: false, message: "Cannot delete an admin account." });
    }

    // Prevent deleting self
    if (user.id === req.user.id) {
      return res.status(403).json({ success: false, message: "Cannot delete your own account." });
    }

    await pool.query("DELETE FROM users WHERE id = ?", [id]);

    return res.status(200).json({
      success: true,
      message: "User deleted successfully.",
      data: null,
    });
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        success: false,
        message: "Cannot delete user — they have existing bookings or reviews.",
      });
    }
    next(error);
  }
};

// ─── BOOKING MANAGEMENT ──────────────────────────────────────────────────────

const updateBookingStatus = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({ success: false, message: "Invalid booking ID." });
    }

    const { status } = req.body;
    const validStatuses = ["pending", "confirmed", "cancelled", "completed"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "status must be one of: pending, confirmed, cancelled, completed.",
      });
    }

    await Booking.updateStatusAtomic(id, status);
    const updated = await Booking.findById(id);

    return res.status(200).json({
      success: true,
      message: `Booking status updated to '${status}'.`,
      data: { booking: updated },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getAnalytics,
  getAllUsers,
  deleteUser,
  updateBookingStatus,
};
