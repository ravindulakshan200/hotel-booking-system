/**
 * routes/reviewRoutes.js
 * Phase 7C: adds edit, owner-delete, report, and admin moderation routes.
 */

const express = require('express');
const router  = express.Router();
const {
  getHotelReviews, createReview, updateReview, deleteOwnReview,
  reportReview, getAllReviews, deleteReview, moderateReview,
  getReviewReports, resolveReport,
} = require('../controllers/reviewController');
const { protect }   = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');

// Public
router.get('/hotel/:hotelId', getHotelReviews);

// Authenticated
router.post('/',        protect, createReview);
router.put('/:id',     protect, updateReview);
router.delete('/:id',  protect, deleteOwnReview);
router.post('/:id/report', protect, reportReview);

// Admin
router.get('/',                              protect, adminOnly, getAllReviews);
router.patch('/:id/moderate',               protect, adminOnly, moderateReview);
router.delete('/:id/admin',                 protect, adminOnly, deleteReview);
router.get('/reports',                      protect, adminOnly, getReviewReports);
router.patch('/reports/:reportId/resolve',  protect, adminOnly, resolveReport);

module.exports = router;
