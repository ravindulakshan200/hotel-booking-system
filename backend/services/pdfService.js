/**
 * services/pdfService.js
 *
 * Server-side PDF generation using pdfkit.
 * All user-provided text is passed through pdfkit's .text() API which outputs
 * plain text — it does NOT render HTML, preventing XSS in PDFs.
 *
 * No temporary files are created — all PDFs are streamed to in-memory Buffers.
 *
 * SECURITY:
 *  - Totals are computed server-side from DB values — never from frontend
 *  - No passwords, tokens, admin notes or internal IDs exposed
 *  - Safe Content-Disposition filenames (no user-controlled path components)
 */

'use strict';

const PDFDocument = require('pdfkit');

const LKR = (amount) =>
  `LKR ${Number(amount).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (d) => {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
};

const calculateNights = (checkIn, checkOut) => {
  const d1 = new Date(checkIn);
  const d2 = new Date(checkOut);
  return Math.round((d2 - d1) / 86400000);
};

/** Build a PDF buffer from a PDFDocument */
const buildBuffer = (doc) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

const BRAND_BLUE  = '#0b2239';
const BRAND_GOLD  = '#d4af37';
const GREY        = '#64748b';
const LIGHT_GREY  = '#f0ece4';

const drawHeader = (doc, title) => {
  doc.rect(0, 0, doc.page.width, 80).fill(BRAND_BLUE);
  doc.fillColor('white').fontSize(22).font('Helvetica-Bold')
     .text('LuxStay', 40, 25);
  doc.fillColor(BRAND_GOLD).fontSize(11).font('Helvetica')
     .text('Hotel Booking Management System', 40, 50);
  doc.fillColor('white').fontSize(16).font('Helvetica-Bold')
     .text(title, doc.page.width - 220, 30, { width: 180, align: 'right' });
  doc.moveDown(4);
};

const sectionLabel = (doc, label) => {
  doc.fillColor(BRAND_BLUE).fontSize(11).font('Helvetica-Bold').text(label);
  doc.moveTo(doc.page.margins.left, doc.y)
     .lineTo(doc.page.width - doc.page.margins.right, doc.y)
     .strokeColor(BRAND_GOLD).lineWidth(1).stroke();
  doc.moveDown(0.5);
};

const row = (doc, label, value, highlight = false) => {
  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  if (highlight) {
    doc.rect(x - 4, doc.y - 2, width + 8, 18).fill(LIGHT_GREY);
  }
  doc.fillColor(GREY).fontSize(10).font('Helvetica').text(label, x, doc.y, { continued: true, width: width / 2 });
  doc.fillColor(BRAND_BLUE).font('Helvetica-Bold').text(value, { align: 'right' });
  doc.moveDown(0.3);
};

/**
 * Generate an invoice PDF buffer.
 * @param {{ booking, payment, user, hotel, room, invoiceNumber, generatedAt }} data
 * @returns {Promise<Buffer>}
 */
const generateInvoice = async ({ booking, payment, user, hotel, room, invoiceNumber, generatedAt }) => {
  const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
  const bufferPromise = buildBuffer(doc);

  drawHeader(doc, 'INVOICE');

  // Invoice meta
  doc.fillColor(GREY).fontSize(10).font('Helvetica')
     .text(`Invoice Number: ${invoiceNumber}`, { align: 'right' })
     .text(`Generated: ${formatDate(generatedAt)}`, { align: 'right' });
  doc.moveDown(1);

  // Customer details
  sectionLabel(doc, 'Bill To');
  doc.fillColor(BRAND_BLUE).fontSize(11).font('Helvetica-Bold')
     .text(`${user.first_name} ${user.last_name}`);
  doc.fillColor(GREY).fontSize(10).font('Helvetica')
     .text(user.email);
  doc.moveDown(1);

  // Booking details
  sectionLabel(doc, 'Booking Details');
  const nights = calculateNights(booking.check_in, booking.check_out);
  row(doc, 'Booking Reference',    `#${booking.id}`);
  row(doc, 'Booking Status',       String(booking.booking_status).toUpperCase(), true);
  row(doc, 'Hotel',                hotel.name);
  row(doc, 'Room',                 `${room.room_number} (${room.room_type})`, true);
  row(doc, 'Check-in',             formatDate(booking.check_in));
  row(doc, 'Check-out',            formatDate(booking.check_out), true);
  row(doc, 'Duration',             `${nights} night${nights !== 1 ? 's' : ''}`);
  doc.moveDown(1);

  // Payment summary
  sectionLabel(doc, 'Payment Summary');
  const originalAmount  = Number(booking.original_amount  ?? booking.total_price);
  const discountAmount  = Number(booking.discount_amount  ?? 0);
  const finalAmount     = Number(booking.final_amount     ?? booking.total_price);

  row(doc, 'Room Rate / Night',    LKR(room.price_per_night));
  row(doc, 'Subtotal',             LKR(originalAmount),   true);
  if (discountAmount > 0) {
    row(doc, 'Promo Discount',     `- ${LKR(discountAmount)}`);
  }
  row(doc, 'Total Amount',         LKR(finalAmount),      true);
  if (payment) {
    row(doc, 'Payment Method',     payment.payment_method || 'N/A');
    row(doc, 'Payment Status',     String(payment.payment_status).toUpperCase(), true);
    if (payment.stripe_payment_intent_id) {
      row(doc, 'Payment Reference', payment.stripe_payment_intent_id);
    }
  }
  doc.moveDown(2);

  // Footer
  doc.fillColor(GREY).fontSize(9).font('Helvetica')
     .text('This is an automatically generated invoice. Please retain for your records.',
       { align: 'center' });

  doc.end();
  return bufferPromise;
};

/**
 * Generate a payment receipt PDF buffer.
 * Only generated after confirmed payment.
 */
const generateReceipt = async ({ booking, payment, user, hotel, room, receiptNumber, generatedAt }) => {
  const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
  const bufferPromise = buildBuffer(doc);

  drawHeader(doc, 'RECEIPT');

  doc.fillColor(GREY).fontSize(10).font('Helvetica')
     .text(`Receipt Number: ${receiptNumber}`, { align: 'right' })
     .text(`Generated: ${formatDate(generatedAt)}`, { align: 'right' });
  doc.moveDown(1);

  sectionLabel(doc, 'Receipt Issued To');
  doc.fillColor(BRAND_BLUE).fontSize(11).font('Helvetica-Bold')
     .text(`${user.first_name} ${user.last_name}`);
  doc.fillColor(GREY).fontSize(10).font('Helvetica')
     .text(user.email);
  doc.moveDown(1);

  const nights = calculateNights(booking.check_in, booking.check_out);
  sectionLabel(doc, 'Booking Summary');
  row(doc, 'Booking Reference', `#${booking.id}`);
  row(doc, 'Hotel',             hotel.name, true);
  row(doc, 'Room',              `${room.room_number} (${room.room_type})`);
  row(doc, 'Check-in',         formatDate(booking.check_in), true);
  row(doc, 'Check-out',        formatDate(booking.check_out));
  row(doc, 'Duration',         `${nights} night${nights !== 1 ? 's' : ''}`, true);
  doc.moveDown(1);

  sectionLabel(doc, 'Payment Confirmed');
  const finalAmount = Number(booking.final_amount ?? booking.total_price);
  const discountAmount = Number(booking.discount_amount ?? 0);
  if (discountAmount > 0) {
    row(doc, 'Original Amount', LKR(Number(booking.original_amount ?? booking.total_price)));
    row(doc, 'Discount Applied', `- ${LKR(discountAmount)}`, true);
  }
  row(doc, 'Amount Paid',        LKR(finalAmount), true);
  row(doc, 'Payment Method',     payment.payment_method || 'N/A');
  row(doc, 'Payment Status',     'PAID', true);
  if (payment.stripe_payment_intent_id) {
    row(doc, 'Transaction Reference', payment.stripe_payment_intent_id);
  }
  doc.moveDown(2);

  doc.fillColor(GREY).fontSize(9).font('Helvetica')
     .text('Thank you for your booking! This receipt confirms your payment has been received.',
       { align: 'center' });

  doc.end();
  return bufferPromise;
};

module.exports = { generateInvoice, generateReceipt };
