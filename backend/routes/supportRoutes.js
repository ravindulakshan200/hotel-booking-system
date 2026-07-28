/**
 * routes/supportRoutes.js
 * Public/authenticated support ticket routes.
 */

'use strict';

const express = require('express');
const router  = express.Router();
const rateLimit = require('express-rate-limit');

const {
  createTicket, getMyTickets, getTicketByRef, lookupTicket
} = require('../controllers/supportController');
const { protect } = require('../middleware/authMiddleware');

// Rate limit: 3 ticket submissions per hour per IP
const ticketLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many support tickets submitted. Please try again in an hour.' },
  skip: () => process.env.NODE_ENV === 'test',
});

// Rate limit: 5 lookup attempts per 15 minutes per IP
const lookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many lookup attempts. Please try again later.' },
  skip: () => process.env.NODE_ENV === 'test',
});

// POST /api/v1/support — public or authenticated
router.post('/', ticketLimiter, (req, res, next) => {
  // Optionally attach user if authenticated (not required)
  const jwt = req.cookies?.jwt;
  if (jwt) {
    const { protect: authProtect } = require('../middleware/authMiddleware');
    return authProtect(req, res, (err) => {
      if (err) { req.user = null; }
      next();
    });
  }
  next();
}, createTicket);

// POST /api/v1/support/lookup — unauthenticated lookup by token
router.post('/lookup', lookupLimiter, lookupTicket);

// GET /api/v1/support/my-tickets — authenticated
router.get('/my-tickets', protect, getMyTickets);

// GET /api/v1/support/:ref — authenticated owner
router.get('/:ref', protect, getTicketByRef);

module.exports = router;
