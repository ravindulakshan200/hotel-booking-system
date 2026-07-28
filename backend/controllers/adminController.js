/**
 * controllers/adminController.js
 * Admin dashboard statistics, analytics, and user/booking management.
 */

const pool = require("../config/db");
const User = require("../models/User");
const Booking = require("../models/Booking");
const Hotel = require("../models/Hotel");
const EmailOutbox = require("../models/EmailOutbox");
const Notification = require("../models/Notification");

const getStripeSecret = () => {
  if (process.env.STRIPE_SECRET_KEY) return process.env.STRIPE_SECRET_KEY;
  if (process.env.NODE_ENV === "test") return "sk_test_mock_key";
  if (process.env.STRIPE_PAYMENTS_ENABLED !== "true") return "disabled_dummy_key";
  return undefined;
};
const stripe = require("stripe")(getStripeSecret());

// ─── REFUND NOTIFICATION HELPER ───────────────────────────────────────────────

/**
 * Enqueue email + in-app notification for a refund status change.
 * Both use INSERT IGNORE so concurrent calls are safe.
 * Never logs the cron secret or any sensitive credential.
 *
 * @param {number} userId
 * @param {number} bookingId
 * @param {'processing'|'completed'|'rejected'|'failed'} status
 */
const enqueueRefundNotification = async (userId, bookingId, status) => {
  const configs = {
    processing: {
      emailEventType: 'refund_processing',
      notifTitle: 'Refund Processing',
      notifMsg: `Your refund for booking #${bookingId} is being processed.`,
    },
    completed: {
      emailEventType: 'refund_completed',
      notifTitle: 'Refund Completed',
      notifMsg: `Your refund for booking #${bookingId} has been completed.`,
    },
    rejected: {
      emailEventType: 'refund_rejected',
      notifTitle: 'Refund Rejected',
      notifMsg: `Your refund request for booking #${bookingId} has been rejected. Please contact support.`,
    },
    failed: {
      emailEventType: null, // Admin sees the 400 error; no email to avoid confusion
      notifTitle: 'Refund Failed',
      notifMsg: `The refund for booking #${bookingId} could not be processed. Please contact support.`,
    },
  };

  const config = configs[status];
  if (!config) return;

  if (config.emailEventType) {
    try {
      await EmailOutbox.enqueueEmailEvent(null, {
        eventKey: `${config.emailEventType}_${bookingId}`,
        eventType: config.emailEventType,
        recipientUserId: userId,
        payload: { bookingId }
      });
    } catch (err) {
      console.error(`[Admin] Failed to enqueue ${config.emailEventType} email:`, err.message);
    }
  }

  try {
    await Notification.create(null, {
      userId,
      eventKey: `refund_${status}_${bookingId}`,
      type: 'refund',
      title: config.notifTitle,
      message: config.notifMsg,
      metadata: { bookingId }
    });
  } catch (err) {
    console.error(`[Admin] Failed to create refund_${status} notification:`, err.message);
  }
};


// ——————————————————————————————————————————————————————————————————————————————

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
        (SELECT COUNT(*) FROM bookings WHERE booking_status IN ('completed', 'checked_out')) AS completed_bookings,
        (SELECT COUNT(*) FROM bookings WHERE booking_status = 'cancelled') AS cancelled_bookings,
        (
          SELECT COALESCE(SUM(amount), 0) FROM payments p
          JOIN bookings b ON b.id = p.booking_id
          WHERE p.payment_status = 'completed'
            AND NOT (b.booking_status = 'cancelled' AND b.refund_status IN ('required', 'processing', 'completed'))
        ) AS total_revenue,
        (
          SELECT COALESCE(SUM(amount), 0) FROM payments p
          JOIN bookings b ON b.id = p.booking_id
          WHERE p.payment_status = 'completed'
            AND NOT (b.booking_status = 'cancelled' AND b.refund_status IN ('required', 'processing', 'completed'))
            AND b.created_at >= ?
        ) AS period_revenue,
        (
          SELECT COALESCE(AVG(total_price), 0) FROM bookings
          WHERE booking_status IN ('confirmed', 'completed', 'checked_out') AND created_at >= ?
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
      WHERE booking_status IN ('confirmed', 'completed', 'checked_in', 'checked_out')
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
      WHERE b.booking_status IN ('confirmed', 'completed', 'checked_in', 'checked_out') AND b.created_at >= ?
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
    console.error(error); next(error);
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
    console.error(error); next(error);
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
    console.error(error); next(error);
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
    console.error(error); next(error);
  }
};

// ─── USER DEACTIVATION / REACTIVATION ────────────────────────────────────────

const deactivateUser = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({ success: false, message: 'Invalid user ID.' });
    }

    const user = await User.findUserById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    if (user.id === req.user.id) {
      return res.status(403).json({ success: false, message: 'Cannot deactivate your own account.' });
    }
    if (!user.is_active) {
      return res.status(400).json({ success: false, message: 'User is already deactivated.' });
    }

    const reason = (req.body && req.body.reason) || 'admin_action';
    await User.deactivate(id, reason);

    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      adminId: req.user.id,
      action: 'user_deactivated',
      entityType: 'user',
      entityId: id,
      metadata: { email: user.email },
      ip: req.ip,
    });

    return res.status(200).json({ success: true, message: 'User deactivated successfully.', data: null });
  } catch (error) {
    next(error);
  }
};

const reactivateUser = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({ success: false, message: 'Invalid user ID.' });
    }

    const user = await User.findUserById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    if (user.is_active) {
      return res.status(400).json({ success: false, message: 'User is already active.' });
    }

    await User.reactivate(id);

    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      adminId: req.user.id,
      action: 'user_reactivated',
      entityType: 'user',
      entityId: id,
      metadata: { email: user.email },
      ip: req.ip,
    });

    return res.status(200).json({ success: true, message: 'User reactivated successfully.', data: null });
  } catch (error) {
    next(error);
  }
};

// ─── BOOKING MANAGEMENT ───────────────────────────────────────────────────────

const updateBookingStatus = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({ success: false, message: "Invalid booking ID." });
    }

    const { status, reason } = req.body;
    const validStatuses = ["pending", "confirmed", "checked_in", "checked_out", "cancelled", "no_show", "expired", "refunded", "completed"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status.",
      });
    }

    const result = await Booking.updateStatusAtomic(id, status, { actorUserId: req.user.id, reason });
    const updated = await Booking.findById(id);

    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      adminId: req.user.id,
      action: 'booking_status_updated',
      entityType: 'booking',
      entityId: id,
      metadata: { new_status: status },
      ip: req.ip
    });

    return res.status(200).json({
      success: true,
      message: result.refundRequired
        ? `Booking status updated to '${status}'. A manual refund is pending.`
        : `Booking status updated to '${status}'.`,
      data: { booking: updated, refund_required: result.refundRequired },
    });
  } catch (error) {
    console.error(error); next(error);
  }
};

// ─── EMAIL OUTBOX MANAGEMENT ───────────────────────────────────────────────────

const getEmailStats = async (req, res, next) => {
  try {
    const stats = await EmailOutbox.getHealthStats();
    return res.status(200).json({
      success: true,
      message: "Email outbox stats fetched successfully.",
      data: { stats }
    });
  } catch (error) {
    console.error(error); next(error);
  }
};

const retryEmail = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({ success: false, message: "Invalid email ID." });
    }

    const success = await EmailOutbox.retryDeadLetter(id);
    if (!success) {
      return res.status(404).json({ success: false, message: "Email not found or not a dead letter." });
    }

    return res.status(200).json({
      success: true,
      message: "Email queued for retry successfully.",
      data: null
    });
  } catch (error) {
    console.error(error); next(error);
  }
};

const updateBookingRefund = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({ success: false, message: "Invalid booking ID." });
    }

    const { refund_status, refund_reason, refund_admin_notes } = req.body;
    if (!refund_status) {
      return res.status(400).json({ success: false, message: "refund_status is required." });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    // Find the linked completed payment
    const [payments] = await pool.query(
      "SELECT * FROM payments WHERE booking_id = ? AND payment_status = 'completed' LIMIT 1",
      [id]
    );
    const payment = payments[0];

    // Determine if it is a Stripe payment
    const isStripe = payment &&
      (payment.payment_method === 'card' || payment.payment_method === 'online') &&
      payment.transaction_reference &&
      !payment.transaction_reference.startsWith('DEMO-');

    if (isStripe) {
      if (refund_status === 'completed') {
        return res.status(400).json({ success: false, message: "Cannot manually complete Stripe refunds. These must be processed via Stripe." });
      }
      if (refund_status === 'rejected') {
        return res.status(400).json({ success: false, message: "Stripe refunds cannot be manually rejected." });
      }

      if (refund_status === 'processing') {
        // Call Stripe refund API
        let actualStatus = 'processing';
        try {
          const stripeRefund = await stripe.refunds.create({
            payment_intent: payment.transaction_reference
          });

          // Stripe refund status can be succeeded, pending, failed, or cancelled
          actualStatus = stripeRefund.status === 'succeeded' ? 'completed' : 'processing';

          await Booking.updateRefundAtomic(id, {
            refundStatus: actualStatus,
            providerRef: stripeRefund.id,
            reason: refund_reason || 'Stripe Refund Request',
            adminNotes: refund_admin_notes
          });
        } catch (stripeError) {
          if (stripeError.message && stripeError.message.includes("already been refunded")) {
            actualStatus = 'completed';
            const stripeRefunds = await stripe.refunds.list({ payment_intent: payment.transaction_reference });
            const refundId = stripeRefunds.data[0]?.id || "ALREADY_REFUNDED";
            await Booking.updateRefundAtomic(id, {
              refundStatus: 'completed',
              providerRef: refundId,
              reason: refund_reason || 'Stripe Refund (Already Refunded)',
              adminNotes: refund_admin_notes
            });
          } else {
            await Booking.updateRefundAtomic(id, {
              refundStatus: 'failed',
              reason: stripeError.message,
              adminNotes: refund_admin_notes
            });
            // Notify user of refund failure before returning 400
            await enqueueRefundNotification(booking.user_id, id, 'failed');
            return res.status(400).json({ success: false, message: `Stripe Refund API error: ${stripeError.message}` });
          }
        }
        // Notify user of the actual resolved status (processing or completed)
        await enqueueRefundNotification(booking.user_id, id, actualStatus);
      } else {
        await Booking.updateRefundAtomic(id, {
          refundStatus: refund_status,
          reason: refund_reason,
          adminNotes: refund_admin_notes
        });
        await enqueueRefundNotification(booking.user_id, id, refund_status);
      }
    } else {
      // Manual / non-Stripe payments
      console.log(`[AUDIT LOG] Admin (ID: ${req.user.id}) manually changed refund status for booking ID: ${id} to ${refund_status}. Notes: ${refund_admin_notes || 'N/A'}`);

      await Booking.updateRefundAtomic(id, {
        refundStatus: refund_status,
        providerRef: req.body.refund_provider_reference !== undefined ? req.body.refund_provider_reference : 'MANUAL-REFUND',
        reason: refund_reason || 'Manual/Demo Refund',
        adminNotes: refund_admin_notes
      });
      await enqueueRefundNotification(booking.user_id, id, refund_status);
    }

    const updated = await Booking.findById(id);

    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      adminId: req.user.id,
      action: 'booking_refund_updated',
      entityType: 'booking',
      entityId: id,
      metadata: { refund_status },
      ip: req.ip
    });

    return res.status(200).json({
      success: true,
      message: `Booking refund status updated to '${refund_status}'.`,
      data: { booking: updated }
    });
  } catch (error) {
    console.error(error); next(error);
  }
};

// ─── CRON ENDPOINTS ──────────────────────────────────────────────────────────

/**
 * POST /api/v1/admin/cron/reminders
 * Triggers one batch of the check-in reminder worker.
 * Protected by: protect + adminOnly + X-Cron-Secret header.
 * The secret value is NEVER logged.
 */
const triggerReminderCron = async (req, res, next) => {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return res.status(503).json({ success: false, message: 'Cron endpoint not configured on this server.' });
    }
    const providedSecret = req.headers['x-cron-secret'];
    // Constant-time comparison to prevent timing attacks
    const crypto = require('crypto');
    const expected = Buffer.from(cronSecret);
    const provided = providedSecret ? Buffer.from(providedSecret) : Buffer.alloc(0);
    const match =
      expected.length === provided.length &&
      crypto.timingSafeEqual(expected, provided);

    if (!match) {
      return res.status(403).json({ success: false, message: 'Invalid or missing cron secret.' });
    }

    const reminderWorker = require('../services/reminderWorker');
    await reminderWorker.processBatch();

    return res.status(200).json({ success: true, message: 'Reminder batch processed.' });
  } catch (error) {
    console.error(error); next(error);
  }
};

module.exports = {
  getDashboardStats,
  getAllUsers,
  getAllHotelsAdmin,
  deleteUser,
  deactivateUser,
  reactivateUser,
  updateBookingStatus,
  getEmailStats,
  retryEmail,
  updateBookingRefund,
  triggerReminderCron,
};
