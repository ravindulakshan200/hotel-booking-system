/**
 * controllers/adminController.js
 * Admin dashboard statistics, analytics, and user/booking management.
 */

const pool = require("../config/db");
const User = require("../models/User");
const Booking = require("../models/Booking");
const Hotel = require("../models/Hotel");

// â”€â”€â”€ DASHBOARD STATS & ANALYTICS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const getPeriodDates = (period) => {
  const now = new Date();
  let startDate = new Date();
  let days = 0;

  if (period === '7days') { startDate.setDate(now.getDate() - 7); days = 7; }
  else if (period === '30days') { startDate.setDate(now.getDate() - 30); days = 30; }
  else if (period === '6months') { startDate.setMonth(now.getMonth() - 6); days = 180; }
  else if (period === '12months') { startDate.setMonth(now.getMonth() - 12); days = 365; }
  else if (period === 'all') { startDate = new Date(0); days = 10000; }
  else { return null; }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: now.toISOString().split('T')[0],
    days
  };
};

const getDashboardStats = async (req, res, next) => {
  try {
    const period = req.query.period || '30days';
    const periodData = getPeriodDates(period);

    if (!periodData) {
      return res.status(400).json({ success: false, message: "Invalid period." });
    }

    const { startDate, endDate, days } = periodData;

    // Overview stats
    const [[overview]] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'customer') AS total_users,
        (SELECT COUNT(*) FROM hotels) AS total_hotels,
        (SELECT COUNT(*) FROM rooms) AS total_rooms,
        (SELECT COUNT(*) FROM bookings) AS total_bookings,
        (SELECT COUNT(*) FROM bookings WHERE booking_status = 'pending') AS pending_bookings,
        (SELECT COUNT(*) FROM bookings WHERE booking_status = 'confirmed') AS confirmed_bookings,
        (SELECT COUNT(*) FROM bookings WHERE booking_status = 'completed') AS completed_bookings,
        (SELECT COUNT(*) FROM bookings WHERE booking_status = 'cancelled') AS cancelled_bookings,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payment_status = 'completed') AS total_revenue,
        (
          SELECT COALESCE(SUM(amount), 0) FROM payments p
          JOIN bookings b ON b.id = p.booking_id
          WHERE p.payment_status = 'completed' AND b.created_at >= ?
        ) AS period_revenue,
        (
          SELECT COALESCE(AVG(total_price), 0) FROM bookings
          WHERE booking_status IN ('confirmed', 'completed') AND created_at >= ?
        ) AS avg_booking_value
    `, [startDate, startDate]);

    // Occupancy calculation (occupied room-nights / available room-nights * 100)
    // Counts intersection of booking dates with the selected period window
    const [[occupancyData]] = await pool.query(`
      SELECT
        COALESCE(SUM(
          DATEDIFF(
            LEAST(check_out, ?),
            GREATEST(check_in, ?)
          )
        ), 0) AS occupied_room_nights
      FROM bookings
      WHERE booking_status IN ('confirmed', 'completed')
        AND check_in < ? AND check_out > ?
    `, [endDate, startDate, endDate, startDate]);

    const totalRooms = overview.total_rooms || 0;
    // Limit available room nights to 1 yr for 'all' to prevent highly skewed denominator
    const availableRoomNights = totalRooms * (days === 10000 ? 365 : days);
    const occupiedNights = occupancyData.occupied_room_nights;
    let occupancyRate = availableRoomNights > 0 ? (occupiedNights / availableRoomNights) * 100 : 0;
    occupancyRate = Math.max(0, Math.min(100, occupancyRate));

    // Booking Trend
    const groupBy = (days <= 30) ? "DATE_FORMAT(created_at, '%Y-%m-%d')" : "DATE_FORMAT(created_at, '%Y-%m')";
    const [bookingTrend] = await pool.query(`
      SELECT ${groupBy} AS label, COUNT(*) AS bookings, COALESCE(SUM(total_price), 0) AS revenue
      FROM bookings
      WHERE created_at >= ?
      GROUP BY label
      ORDER BY label ASC
    `, [startDate]);

    // Status breakdown
    const [statusBreakdown] = await pool.query(`
      SELECT booking_status AS name, COUNT(*) AS value
      FROM bookings
      WHERE created_at >= ?
      GROUP BY booking_status
    `, [startDate]);

    // Popular hotels
    const [popularHotels] = await pool.query(`
      SELECT h.name, COUNT(b.id) AS bookings
      FROM hotels h
      JOIN rooms r ON r.hotel_id = h.id
      JOIN bookings b ON b.room_id = r.id
      WHERE b.booking_status IN ('confirmed', 'completed') AND b.created_at >= ?
      GROUP BY h.id, h.name
      ORDER BY bookings DESC
      LIMIT 5
    `, [startDate]);

    // Recent bookings
    const [recentBookings] = await pool.query(`
      SELECT b.id, b.check_in, b.check_out, b.total_price, b.booking_status, b.created_at,
             u.first_name, u.last_name,
             h.name AS hotel_name, r.room_number
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN rooms r ON b.room_id = r.id
      JOIN hotels h ON r.hotel_id = h.id
      ORDER BY b.created_at DESC
      LIMIT 10
    `);

    const safeBookings = recentBookings.map(b => ({
      id: b.id,
      guest_name: `${b.first_name} ${b.last_name}`,
      hotel_name: b.hotel_name,
      room_number: b.room_number,
      check_in: b.check_in,
      check_out: b.check_out,
      total_price: b.total_price,
      status: b.booking_status,
      created_at: b.created_at
    }));

    return res.status(200).json({
      success: true,
      message: "Analytics fetched successfully.",
      data: {
        overview: {
          ...overview,
          occupancy_rate: occupancyRate
        },
        charts: {
          bookingTrend,
          statusBreakdown,
          popularHotels
        },
        recentBookings: safeBookings
      }
    });

  } catch (error) {
    next(error);
  }
};

// â”€â”€â”€ USER MANAGEMENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

const getAllHotelsAdmin = async (req, res, next) => {
  try {
    const { city, search } = req.query;
    if ((city && typeof city !== "string") || (search && typeof search !== "string")) {
      return res.status(400).json({ success: false, message: "city and search filters must be text." });
    }
    if ((city && city.length > 100) || (search && search.length > 150)) {
      return res.status(400).json({ success: false, message: "Search filter is too long." });
    }
    const hotels = await Hotel.findAll({ city, search, includeInactive: true });

    return res.status(200).json({
      success: true,
      message: hotels.length > 0 ? "Hotels fetched successfully." : "No hotels found.",
      data: {
        count: hotels.length,
        hotels,
      },
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
        message: "Cannot delete user â€” they have existing bookings or reviews.",
      });
    }
    next(error);
  }
};

// â”€â”€â”€ BOOKING MANAGEMENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  getAllUsers,
  getAllHotelsAdmin,
  deleteUser,
  updateBookingStatus,
};
