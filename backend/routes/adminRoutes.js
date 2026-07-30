/**
 * routes/adminRoutes.js
 * Admin-only routes — all require protect + adminOnly middleware.
 * Phase 7C: adds audit log, deactivation, support management, review reports, reports.
 */

const express  = require('express');
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
  deactivateUser,
  reactivateUser,
  triggerReminderCron,
} = require('../controllers/adminController');

const {
  adminGetAllTickets,
  adminUpdateStatus: adminUpdateTicketStatus,
  adminAddNote,
  adminGetTicket,
} = require('../controllers/supportController');

const {
  getAllReviews: getAdminReviews,
  moderateReview,
  deleteReview,
  getReviewReports,
  resolveReport,
} = require('../controllers/reviewController');

const { generateReport } = require('../controllers/reportController');
const AuditLog = require('../models/AuditLog');
const { parsePagination, buildPaginatedResponse } = require('../utils/paginate');

const { protect }    = require('../middleware/authMiddleware');
const { adminOnly }  = require('../middleware/adminMiddleware');

// Apply auth + admin guard to every route in this file
router.use(protect, adminOnly);

// Dashboard
router.get('/dashboard',  getDashboardStats);
router.get('/analytics',  getDashboardStats); // backward compat alias

// User management
router.get('/users',                     getAllUsers);
router.delete('/users/:id',              deleteUser);
router.patch('/users/:id/deactivate',    deactivateUser);
router.patch('/users/:id/reactivate',    reactivateUser);

// Hotel management
router.get('/hotels',         getAllHotelsAdmin);

// Booking management
router.patch('/bookings/:id/status', updateBookingStatus);
router.patch('/bookings/:id/refund', updateBookingRefund);

const { cleanupExpiredBookings } = require('../controllers/bookingController');
router.post('/bookings/cleanup-expired', cleanupExpiredBookings);

// Email Outbox
router.get('/email/stats',      getEmailStats);
router.post('/email/retry/:id', retryEmail);

// Cron
router.post('/cron/reminders',  triggerReminderCron);

// Reports (CSV/PDF)
router.get('/reports/:type.:format', generateReport);

// Audit Log
router.get('/audit-logs', async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query);
    const filters = {};
    if (req.query.admin_id)   filters.admin_id   = req.query.admin_id;
    if (req.query.action)     filters.action      = req.query.action;
    if (req.query.entity_type) filters.entity_type = req.query.entity_type;
    if (req.query.entity_id)  filters.entity_id   = req.query.entity_id;
    if (req.query.start_date) filters.start_date  = req.query.start_date;
    if (req.query.end_date)   filters.end_date    = req.query.end_date;

    const { items, total } = await AuditLog.findAll(filters, page, limit);
    return res.status(200).json({
      success: true,
      message: 'Audit logs fetched.',
      data: buildPaginatedResponse(items, total, page, limit),
    });
  } catch (err) {
    next(err);
  }
});

// Support ticket management
router.get('/support',              adminGetAllTickets);
router.get('/support/:id',          adminGetTicket);
router.patch('/support/:id/status', adminUpdateTicketStatus);
router.post('/support/:id/notes',   adminAddNote);

// Review management
router.get('/reviews',                            getAdminReviews);
router.patch('/reviews/:id/moderate',             moderateReview);
router.delete('/reviews/:id',                     deleteReview);
router.get('/reviews/reports',                    getReviewReports);
router.patch('/reviews/reports/:reportId/resolve', resolveReport);

module.exports = router;
