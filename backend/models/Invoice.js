/**
 * models/Invoice.js
 * Invoice and Receipt number management.
 * PDFs are generated on demand — never stored here.
 */

'use strict';

const pool = require('../config/db');

/** Zero-padded sequential suffix based on count */
const pad = (n) => String(n).padStart(6, '0');

/** Generate a date string like 20260727 */
const dateStamp = () => {
  const d = new Date();
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
};

const Invoice = {
  /**
   * Idempotent: find existing invoice or create a new one.
   * @param {number} bookingId
   * @returns {{ invoice_number: string, generated_at: Date }}
   */
  findOrCreate: async (bookingId) => {
    const [existing] = await pool.query(
      'SELECT invoice_number, generated_at FROM invoices WHERE booking_id = ? LIMIT 1',
      [bookingId]
    );
    if (existing[0]) return existing[0];

    // Generate a unique sequential number
    const [[{ cnt }]] = await pool.query('SELECT COUNT(*) AS cnt FROM invoices');
    const invoiceNumber = `INV-${dateStamp()}-${pad(cnt + 1)}`;

    await pool.query(
      'INSERT INTO invoices (booking_id, invoice_number) VALUES (?, ?)',
      [bookingId, invoiceNumber]
    );
    const [row] = await pool.query(
      'SELECT invoice_number, generated_at FROM invoices WHERE booking_id = ? LIMIT 1',
      [bookingId]
    );
    return row[0];
  },

  /**
   * Find or create a receipt — only if payment is confirmed.
   * Returns null if payment is not confirmed.
   * @param {number} bookingId
   * @param {string} paymentStatus
   */
  findOrCreateReceipt: async (bookingId, paymentStatus) => {
    if (paymentStatus !== 'paid' && paymentStatus !== 'completed') return null;

    const [existing] = await pool.query(
      'SELECT receipt_number, generated_at FROM receipts WHERE booking_id = ? LIMIT 1',
      [bookingId]
    );
    if (existing[0]) return existing[0];

    const [[{ cnt }]] = await pool.query('SELECT COUNT(*) AS cnt FROM receipts');
    const receiptNumber = `RCT-${dateStamp()}-${pad(cnt + 1)}`;

    await pool.query(
      'INSERT INTO receipts (booking_id, receipt_number) VALUES (?, ?)',
      [bookingId, receiptNumber]
    );
    const [row] = await pool.query(
      'SELECT receipt_number, generated_at FROM receipts WHERE booking_id = ? LIMIT 1',
      [bookingId]
    );
    return row[0];
  },
};

module.exports = Invoice;
