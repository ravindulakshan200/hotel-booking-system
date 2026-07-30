/**
 * controllers/invoiceController.js
 *
 * Invoice and receipt PDF generation.
 * PDFs are generated on demand server-side — never stored as files.
 *
 * Security:
 *  - Users can only access their own booking invoices/receipts
 *  - Totals are computed server-side from DB values (never from client)
 *  - Content-Disposition filenames are static (not user-controlled)
 *  - Receipts only generated after confirmed payment
 */

'use strict';

const Booking    = require('../models/Booking');
const Invoice    = require('../models/Invoice');
const User       = require('../models/User');
const pool       = require('../config/db');
const { generateInvoice, generateReceipt } = require('../services/pdfService');

/** Gather all data needed to generate an invoice/receipt */
const getBookingFullData = async (bookingId, userId) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) return null;
  if (booking.user_id !== userId) return null;

  const [payments] = await pool.query(
    'SELECT * FROM payments WHERE booking_id = ? ORDER BY id DESC LIMIT 1',
    [bookingId]
  );
  const [hotels] = await pool.query(
    `SELECT h.* FROM hotels h
     JOIN rooms r ON h.id = r.hotel_id
     WHERE r.id = ? LIMIT 1`,
    [booking.room_id]
  );
  const [rooms] = await pool.query(
    'SELECT * FROM rooms WHERE id = ? LIMIT 1',
    [booking.room_id]
  );
  const user = await User.findUserById(userId);

  return { booking, payment: payments[0] || null, hotel: hotels[0], room: rooms[0], user };
};

// ─── GET: Invoice PDF ─────────────────────────────────────────────────────────

const getInvoice = async (req, res, next) => {
  try {
    const bookingId = parseInt(req.params.bookingId, 10);
    if (!Number.isInteger(bookingId) || bookingId < 1) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
    }

    const data = await getBookingFullData(bookingId, req.user.id);
    if (!data) return res.status(404).json({ success: false, message: 'Booking not found.' });

    const invoiceRecord = await Invoice.findOrCreate(bookingId);
    const pdfBuffer = await generateInvoice({
      ...data,
      invoiceNumber: invoiceRecord.invoice_number,
      generatedAt:   invoiceRecord.generated_at,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${bookingId}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

// ─── GET: Receipt PDF ─────────────────────────────────────────────────────────

const getReceipt = async (req, res, next) => {
  try {
    const bookingId = parseInt(req.params.bookingId, 10);
    if (!Number.isInteger(bookingId) || bookingId < 1) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
    }

    const data = await getBookingFullData(bookingId, req.user.id);
    if (!data) return res.status(404).json({ success: false, message: 'Booking not found.' });

    // Receipt requires confirmed payment
    const paymentStatus = data.payment?.payment_status;
    const receiptRecord = await Invoice.findOrCreateReceipt(bookingId, paymentStatus || '');
    if (!receiptRecord) {
      return res.status(400).json({
        success: false,
        message: 'Receipt is only available after payment has been confirmed.',
      });
    }

    const pdfBuffer = await generateReceipt({
      ...data,
      receiptNumber: receiptRecord.receipt_number,
      generatedAt:   receiptRecord.generated_at,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${bookingId}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

// ─── GET: Invoice number (JSON, for UI display) ───────────────────────────────

const getInvoiceInfo = async (req, res, next) => {
  try {
    const bookingId = parseInt(req.params.bookingId, 10);
    const booking = await Booking.findById(bookingId);
    if (!booking || booking.user_id !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }
    const invoiceRecord = await Invoice.findOrCreate(bookingId);
    return res.status(200).json({
      success: true,
      message: 'Invoice info fetched.',
      data: { invoice_number: invoiceRecord.invoice_number, generated_at: invoiceRecord.generated_at },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getInvoice, getReceipt, getInvoiceInfo };
