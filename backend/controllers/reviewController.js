/**
 * controllers/reviewController.js
 * Phase 7C: adds edit, soft-delete by owner, report, and admin moderation.
 */

'use strict';

const Review  = require('../models/Review');
const Hotel   = require('../models/Hotel');
const Booking = require('../models/Booking');
const AuditLog = require('../models/AuditLog');

const VALID_REPORT_CATEGORIES = ['spam', 'offensive', 'fake', 'irrelevant', 'other'];

const validateRating = (rating) => {
  const r = Number(rating);
  return Number.isInteger(r) && r >= 1 && r <= 5 ? r : null;
};

// ─── Public ──────────────────────────────────────────────────────────────────

const getHotelReviews = async (req, res, next) => {
  try {
    const hotelId = parseInt(req.params.hotelId, 10);
    if (isNaN(hotelId) || hotelId < 1) {
      return res.status(400).json({ success: false, message: 'Invalid hotel ID.' });
    }

    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return res.status(404).json({ success: false, message: 'Hotel not found.' });
    }

    const [reviews, stats] = await Promise.all([
      Review.findByHotel(hotelId),
      Review.getAverageRating(hotelId),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Reviews fetched successfully.',
      data: { reviews, stats },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Authenticated: Create ────────────────────────────────────────────────────

const createReview = async (req, res, next) => {
  try {
    const { hotel_id, rating, comment } = req.body;

    const hotelId = Number(hotel_id);
    if (!Number.isInteger(hotelId) || hotelId < 1 || rating === undefined) {
      return res.status(400).json({ success: false, message: 'hotel_id and rating are required.' });
    }

    const ratingNum = validateRating(rating);
    if (!ratingNum) {
      return res.status(400).json({ success: false, message: 'rating must be between 1 and 5.' });
    }

    if (comment !== undefined && comment !== null && typeof comment !== 'string') {
      return res.status(400).json({ success: false, message: 'comment must be text.' });
    }
    if (typeof comment === 'string' && comment.trim().length > 2000) {
      return res.status(400).json({ success: false, message: 'comment must not exceed 2000 characters.' });
    }

    const hotel = await Hotel.findById(hotelId);
    if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found.' });

    const hasCompletedStay = await Booking.hasCompletedStay(req.user.id, hotelId);
    if (!hasCompletedStay) {
      return res.status(403).json({
        success: false,
        message: 'A completed stay at this hotel is required before submitting a review.',
      });
    }

    const reviewId = await Review.create({ user_id: req.user.id, hotel_id: hotelId, rating: ratingNum, comment });
    const review   = await Review.findById(reviewId);

    return res.status(201).json({ success: true, message: 'Review submitted successfully.', data: { review } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'You have already reviewed this hotel.' });
    }
    next(error);
  }
};

// ─── Authenticated: Edit own review ──────────────────────────────────────────

const updateReview = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) return res.status(400).json({ success: false, message: 'Invalid review ID.' });

    const review = await Review.findById(id);
    if (!review || review.is_deleted) return res.status(404).json({ success: false, message: 'Review not found.' });
    if (review.user_id !== req.user.id) return res.status(403).json({ success: false, message: 'Access denied.' });

    const { rating, comment } = req.body;
    const ratingNum = validateRating(rating);
    if (!ratingNum) return res.status(400).json({ success: false, message: 'rating must be 1–5.' });

    if (comment !== undefined && comment !== null && typeof comment === 'string' && comment.trim().length > 2000) {
      return res.status(400).json({ success: false, message: 'comment must not exceed 2000 characters.' });
    }

    await Review.update(id, { rating: ratingNum, comment });
    const updated = await Review.findById(id);
    return res.status(200).json({ success: true, message: 'Review updated.', data: { review: updated } });
  } catch (err) {
    next(err);
  }
};

// ─── Authenticated: Delete own review (soft) ─────────────────────────────────

const deleteOwnReview = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) return res.status(400).json({ success: false, message: 'Invalid review ID.' });

    const review = await Review.findById(id);
    if (!review || review.is_deleted) return res.status(404).json({ success: false, message: 'Review not found.' });
    if (review.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    await Review.softDelete(id, req.user.id);
    return res.status(200).json({ success: true, message: 'Review deleted.', data: null });
  } catch (err) {
    next(err);
  }
};

// ─── Authenticated: Report a review ──────────────────────────────────────────

const reportReview = async (req, res, next) => {
  try {
    const reviewId = parseInt(req.params.id, 10);
    if (isNaN(reviewId) || reviewId < 1) return res.status(400).json({ success: false, message: 'Invalid review ID.' });

    const review = await Review.findById(reviewId);
    if (!review || review.is_deleted) return res.status(404).json({ success: false, message: 'Review not found.' });
    if (review.user_id === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot report your own review.' });
    }

    const { reason, category } = req.body;
    if (!reason || typeof reason !== 'string' || reason.trim().length < 5 || reason.trim().length > 2000) {
      return res.status(400).json({ success: false, message: 'reason must be 5–2000 characters.' });
    }
    if (!category || !VALID_REPORT_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, message: `category must be one of: ${VALID_REPORT_CATEGORIES.join(', ')}` });
    }

    const reportId = await Review.createReport({
      reviewId, reporterUserId: req.user.id, reason: reason.trim(), category,
    });

    if (!reportId) {
      return res.status(409).json({ success: false, message: 'You have already reported this review.' });
    }

    return res.status(201).json({ success: true, message: 'Review reported. Thank you for your feedback.', data: null });
  } catch (err) {
    next(err);
  }
};

// ─── Admin: Get all reviews (paginated) ──────────────────────────────────────

const getAllReviews = async (req, res, next) => {
  try {
    const result = await Review.findAll({ ...req.query, paginate: true });
    return res.status(200).json({ success: true, message: 'Reviews fetched successfully.', data: result });
  } catch (error) {
    next(error);
  }
};

// ─── Admin: Hard-delete ───────────────────────────────────────────────────────

const deleteReview = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) return res.status(400).json({ success: false, message: 'Invalid review ID.' });

    const review = await Review.findById(id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });

    await Review.delete(id);

    await AuditLog.create({
      adminId: req.user.id, action: 'review_deleted',
      entityType: 'review', entityId: id,
      metadata: { hotel_id: review.hotel_id, user_id: review.user_id },
      ip: req.ip,
    });

    return res.status(200).json({ success: true, message: 'Review deleted.', data: null });
  } catch (error) {
    next(error);
  }
};

// ─── Admin: Moderate (hide/unhide) ───────────────────────────────────────────

const moderateReview = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) return res.status(400).json({ success: false, message: 'Invalid review ID.' });

    const { action } = req.body;
    if (!['hide', 'unhide'].includes(action)) {
      return res.status(400).json({ success: false, message: 'action must be hide or unhide.' });
    }

    const review = await Review.findById(id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });

    if (action === 'hide')   await Review.hide(id, req.user.id);
    if (action === 'unhide') await Review.unhide(id);

    await AuditLog.create({
      adminId: req.user.id, action: `review_${action}d`,
      entityType: 'review', entityId: id,
      metadata: { hotel_id: review.hotel_id },
      ip: req.ip,
    });

    return res.status(200).json({ success: true, message: `Review ${action}d.`, data: null });
  } catch (err) {
    next(err);
  }
};

// ─── Admin: Get review reports ────────────────────────────────────────────────

const getReviewReports = async (req, res, next) => {
  try {
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    const result = await Review.findReports(filters, { ...req.query, paginate: true });
    return res.status(200).json({ success: true, message: 'Reports fetched.', data: result });
  } catch (err) {
    next(err);
  }
};

// ─── Admin: Resolve a report ─────────────────────────────────────────────────

const resolveReport = async (req, res, next) => {
  try {
    const reportId = parseInt(req.params.reportId, 10);
    if (isNaN(reportId) || reportId < 1) return res.status(400).json({ success: false, message: 'Invalid report ID.' });

    const { action } = req.body;
    if (!['dismissed', 'actioned'].includes(action)) {
      return res.status(400).json({ success: false, message: 'action must be dismissed or actioned.' });
    }

    await Review.resolveReport(reportId, action);

    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      adminId: req.user.id,
      action: `review_report_${action}`,
      entityType: 'review_report',
      entityId: reportId,
      metadata: {},
      ip: req.ip,
    });

    return res.status(200).json({ success: true, message: `Report ${action}.`, data: null });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getHotelReviews, createReview, updateReview, deleteOwnReview,
  reportReview, getAllReviews, deleteReview, moderateReview,
  getReviewReports, resolveReport,
};
