/**
 * routes/invoiceRoutes.js
 * Invoice and receipt PDF download routes.
 * Mounted at /api/v1/bookings in app.js
 */

'use strict';

const express = require('express');
const router  = express.Router();
const { getInvoice, getReceipt, getInvoiceInfo } = require('../controllers/invoiceController');
const { protect } = require('../middleware/authMiddleware');

// GET /api/v1/bookings/:bookingId/invoice-info  — JSON invoice number
router.get('/:bookingId/invoice-info', protect, getInvoiceInfo);

// GET /api/v1/bookings/:bookingId/invoice.pdf   — Invoice PDF download
router.get('/:bookingId/invoice.pdf',  protect, getInvoice);

// GET /api/v1/bookings/:bookingId/receipt.pdf   — Receipt PDF (requires confirmed payment)
router.get('/:bookingId/receipt.pdf',  protect, getReceipt);

module.exports = router;
