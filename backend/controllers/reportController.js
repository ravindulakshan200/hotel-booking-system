/**
 * controllers/reportController.js
 *
 * Admin-only CSV and PDF report generation.
 *
 * Security:
 *  - Admin-only (protect + adminOnly middleware applied at route level)
 *  - CSV formula injection prevention (=, +, -, @ prefixed with tab)
 *  - PDF via pdfkit (no HTML rendering)
 *  - No temp files — streams to response buffer in memory
 *  - Does NOT expose: passwords, tokens, Stripe secrets, admin notes, encrypted payloads
 *  - Server-side filtering — all params validated
 */

'use strict';

const pool = require('../config/db');
const PDFDocument = require('pdfkit');
const AuditLog = require('../models/AuditLog');

const REPORT_TYPES = ['bookings', 'payments', 'revenue', 'hotel-performance', 'refunds'];
const FORMATS = ['csv', 'pdf'];

// CSV formula injection: prefix dangerous-start chars with tab and wrap in quotes
const csvEscape = (value) => {
  if (value === null || value === undefined) return '""';
  let str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = '\t' + str;
  }
  // Escape double-quotes by doubling them, and wrap the whole field in double-quotes
  return `"${str.replace(/"/g, '""')}"`;
};

const csvRow = (values) => values.map(csvEscape).join(',');

const LKR = (n) =>
  `LKR ${Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '';

// ─── Data Fetchers ────────────────────────────────────────────────────────────

const fetchBookings = async (filters) => {
  const conditions = ['1=1'];
  const params = [];
  if (filters.start_date) { conditions.push('b.check_in >= ?'); params.push(filters.start_date); }
  if (filters.end_date)   { conditions.push('b.check_in <= ?'); params.push(filters.end_date); }
  if (filters.hotel_id)   { conditions.push('h.id = ?');        params.push(filters.hotel_id); }
  if (filters.status)     { conditions.push('b.booking_status = ?'); params.push(filters.status); }

  const [rows] = await pool.query(
    `SELECT b.id, b.booking_status, b.check_in, b.check_out,
            b.final_amount, b.discount_amount, b.original_amount,
            u.first_name, u.last_name, u.email,
            h.name AS hotel_name, r.room_number, r.room_type,
            b.created_at
     FROM bookings b
     JOIN users u ON b.user_id = u.id
     JOIN rooms r ON b.room_id = r.id
     JOIN hotels h ON r.hotel_id = h.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY b.id DESC`,
    params
  );
  return rows;
};

const fetchPayments = async (filters) => {
  const conditions = ['1=1'];
  const params = [];
  if (filters.start_date) { conditions.push('p.created_at >= ?'); params.push(filters.start_date); }
  if (filters.end_date)   { conditions.push('p.created_at <= ?'); params.push(filters.end_date); }
  if (filters.hotel_id)   { conditions.push('h.id = ?');          params.push(filters.hotel_id); }
  if (filters.status)     { conditions.push('p.payment_status = ?'); params.push(filters.status); }

  const [rows] = await pool.query(
    `SELECT p.id, p.payment_method, p.payment_status, p.amount,
            p.transaction_reference, p.created_at,
            b.id AS booking_id, b.booking_status,
            u.first_name, u.last_name, u.email,
            h.name AS hotel_name
     FROM payments p
     JOIN bookings b ON p.booking_id = b.id
     JOIN users u ON b.user_id = u.id
     JOIN rooms r ON b.room_id = r.id
     JOIN hotels h ON r.hotel_id = h.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY p.id DESC`,
    params
  );
  return rows;
};

const fetchRevenue = async (filters) => {
  const conditions = ['p.payment_status = "paid"'];
  const params = [];
  if (filters.start_date) { conditions.push('p.created_at >= ?'); params.push(filters.start_date); }
  if (filters.end_date)   { conditions.push('p.created_at <= ?'); params.push(filters.end_date); }
  if (filters.hotel_id)   { conditions.push('h.id = ?');          params.push(filters.hotel_id); }

  const [rows] = await pool.query(
    `SELECT DATE(p.created_at) AS date,
            COUNT(*) AS transactions,
            SUM(p.amount) AS revenue
     FROM payments p
     JOIN bookings b ON p.booking_id = b.id
     JOIN rooms r ON b.room_id = r.id
     JOIN hotels h ON r.hotel_id = h.id
     WHERE ${conditions.join(' AND ')}
     GROUP BY DATE(p.created_at)
     ORDER BY date DESC`,
    params
  );
  return rows;
};

const fetchHotelPerformance = async (filters) => {
  const conditions = ['1=1'];
  const params = [];
  if (filters.start_date) { conditions.push('b.check_in >= ?'); params.push(filters.start_date); }
  if (filters.end_date)   { conditions.push('b.check_in <= ?'); params.push(filters.end_date); }
  if (filters.hotel_id)   { conditions.push('h.id = ?');        params.push(filters.hotel_id); }

  const [rows] = await pool.query(
    `SELECT h.id AS hotel_id, h.name AS hotel_name, h.city,
            COUNT(b.id) AS total_bookings,
            SUM(CASE WHEN b.booking_status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed,
            SUM(CASE WHEN b.booking_status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
            SUM(b.final_amount) AS total_revenue
     FROM hotels h
     LEFT JOIN rooms r ON h.id = r.hotel_id
     LEFT JOIN bookings b ON r.id = b.room_id AND ${conditions.join(' AND ')}
     GROUP BY h.id
     ORDER BY total_revenue DESC`,
    params
  );
  return rows;
};

const fetchRefunds = async (filters) => {
  const conditions = ["b.booking_status = 'refunded' OR b.refund_status IS NOT NULL"];
  const params = [];
  if (filters.start_date) { conditions.push('b.updated_at >= ?'); params.push(filters.start_date); }
  if (filters.end_date)   { conditions.push('b.updated_at <= ?'); params.push(filters.end_date); }
  if (filters.hotel_id)   { conditions.push('h.id = ?');          params.push(filters.hotel_id); }

  const [rows] = await pool.query(
    `SELECT b.id AS booking_id, b.booking_status, b.refund_status,
            b.refund_amount, b.final_amount,
            u.first_name, u.last_name, u.email,
            h.name AS hotel_name, b.updated_at
     FROM bookings b
     JOIN users u ON b.user_id = u.id
     JOIN rooms r ON b.room_id = r.id
     JOIN hotels h ON r.hotel_id = h.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY b.id DESC`,
    params
  );
  return rows;
};

// ─── CSV Generators ───────────────────────────────────────────────────────────

const toCSV = (type, rows) => {
  if (type === 'bookings') {
    const headers = csvRow(['Booking ID','Status','Guest Name','Email','Hotel','Room','Room Type','Check-in','Check-out','Original Amount','Discount','Final Amount','Created']);
    const dataRows = rows.map(r => csvRow([
      r.id, r.booking_status, `${r.first_name} ${r.last_name}`, r.email,
      r.hotel_name, r.room_number, r.room_type,
      formatDate(r.check_in), formatDate(r.check_out),
      LKR(r.original_amount), LKR(r.discount_amount), LKR(r.final_amount),
      formatDate(r.created_at),
    ]));
    return [headers, ...dataRows].join('\r\n');
  }
  if (type === 'payments') {
    const headers = csvRow(['Payment ID','Booking ID','Status','Method','Amount','Guest','Email','Hotel','Created']);
    const dataRows = rows.map(r => csvRow([
      r.id, r.booking_id, r.payment_status, r.payment_method,
      LKR(r.amount), `${r.first_name} ${r.last_name}`, r.email,
      r.hotel_name, formatDate(r.created_at),
    ]));
    return [headers, ...dataRows].join('\r\n');
  }
  if (type === 'revenue') {
    const headers = csvRow(['Date','Transactions','Revenue']);
    const dataRows = rows.map(r => csvRow([formatDate(r.date), r.transactions, LKR(r.revenue)]));
    return [headers, ...dataRows].join('\r\n');
  }
  if (type === 'hotel-performance') {
    const headers = csvRow(['Hotel ID','Hotel Name','City','Total Bookings','Confirmed','Cancelled','Total Revenue']);
    const dataRows = rows.map(r => csvRow([
      r.hotel_id, r.hotel_name, r.city,
      r.total_bookings, r.confirmed, r.cancelled, LKR(r.total_revenue),
    ]));
    return [headers, ...dataRows].join('\r\n');
  }
  if (type === 'refunds') {
    const headers = csvRow(['Booking ID','Booking Status','Refund Status','Refund Amount','Original Amount','Guest','Email','Hotel','Updated']);
    const dataRows = rows.map(r => csvRow([
      r.booking_id, r.booking_status, r.refund_status || 'N/A',
      LKR(r.refund_amount), LKR(r.final_amount),
      `${r.first_name} ${r.last_name}`, r.email,
      r.hotel_name, formatDate(r.updated_at),
    ]));
    return [headers, ...dataRows].join('\r\n');
  }
  return '';
};

// ─── PDF Generator ────────────────────────────────────────────────────────────

const toPDF = (type, rows, filters) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40, layout: 'landscape' });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.rect(0, 0, doc.page.width, 60).fill('#0b2239');
    doc.fillColor('white').fontSize(18).font('Helvetica-Bold')
       .text(`LuxStay — ${type.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())} Report`, 40, 18);
    doc.fillColor('#d4af37').fontSize(9).font('Helvetica')
       .text(`Generated: ${new Date().toLocaleString('en-GB')}  |  Filters: ${JSON.stringify(filters)}`, 40, 42);
    doc.moveDown(3);

    const titles = {
      'bookings': ['ID','Status','Guest','Hotel','Room','Check-in','Check-out','Amount'],
      'payments': ['ID','Booking','Status','Method','Amount','Guest','Hotel'],
      'revenue':  ['Date','Transactions','Revenue'],
      'hotel-performance': ['Hotel','City','Bookings','Confirmed','Cancelled','Revenue'],
      'refunds':  ['Booking ID','Status','Refund Status','Refund Amt','Guest','Hotel'],
    };

    const cols = titles[type] || [];
    const colWidth = (doc.page.width - 80) / Math.max(cols.length, 1);
    let x = 40;
    const headerY = doc.y;

    doc.fillColor('#0b2239').fontSize(9).font('Helvetica-Bold');
    cols.forEach((col, i) => {
      doc.text(col, x + i * colWidth, headerY, { width: colWidth, ellipsis: true });
    });
    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).strokeColor('#d4af37').stroke();
    doc.moveDown(0.3);

    doc.fillColor('#1f2937').fontSize(8).font('Helvetica');
    const getRowValues = (r) => {
      if (type === 'bookings')          return [r.id, r.booking_status, `${r.first_name} ${r.last_name}`, r.hotel_name, r.room_number, formatDate(r.check_in), formatDate(r.check_out), LKR(r.final_amount)];
      if (type === 'payments')          return [r.id, r.booking_id, r.payment_status, r.payment_method, LKR(r.amount), `${r.first_name} ${r.last_name}`, r.hotel_name];
      if (type === 'revenue')           return [formatDate(r.date), r.transactions, LKR(r.revenue)];
      if (type === 'hotel-performance') return [r.hotel_name, r.city, r.total_bookings, r.confirmed, r.cancelled, LKR(r.total_revenue)];
      if (type === 'refunds')           return [r.booking_id, r.booking_status, r.refund_status || 'N/A', LKR(r.refund_amount), `${r.first_name} ${r.last_name}`, r.hotel_name];
      return [];
    };

    rows.forEach((r, idx) => {
      if (doc.y > doc.page.height - 60) doc.addPage({ layout: 'landscape' });
      const rowY = doc.y;
      if (idx % 2 === 0) doc.rect(40, rowY - 2, doc.page.width - 80, 16).fill('#f5f1e8');
      doc.fillColor('#1f2937');
      getRowValues(r).forEach((val, i) => {
        doc.text(String(val ?? ''), 40 + i * colWidth, rowY, { width: colWidth - 2, ellipsis: true });
      });
      doc.moveDown(0.6);
    });

    if (rows.length === 0) {
      doc.fillColor('#64748b').text('No data found for the selected filters.', { align: 'center' });
    }

    doc.end();
  });
};

// ─── Main Handler ─────────────────────────────────────────────────────────────

const generateReport = async (req, res, next) => {
  try {
    const { type, format } = req.params;

    if (!REPORT_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: `type must be one of: ${REPORT_TYPES.join(', ')}` });
    }
    if (!FORMATS.includes(format)) {
      return res.status(400).json({ success: false, message: 'format must be csv or pdf' });
    }

    const filters = {};
    if (req.query.start_date) filters.start_date = req.query.start_date;
    if (req.query.end_date)   filters.end_date   = req.query.end_date;
    if (req.query.hotel_id)   filters.hotel_id   = parseInt(req.query.hotel_id, 10) || undefined;
    if (req.query.status)     filters.status     = req.query.status;

    let rows;
    if (type === 'bookings')          rows = await fetchBookings(filters);
    else if (type === 'payments')     rows = await fetchPayments(filters);
    else if (type === 'revenue')      rows = await fetchRevenue(filters);
    else if (type === 'hotel-performance') rows = await fetchHotelPerformance(filters);
    else if (type === 'refunds')      rows = await fetchRefunds(filters);

    const safeType = type.replace(/[^a-z-]/g, '');
    const dateStr  = new Date().toISOString().slice(0, 10);

    // Log report export (no sensitive data in metadata)
    await AuditLog.create({
      adminId: req.user.id,
      action: 'report_exported',
      entityType: 'report',
      entityId: null,
      metadata: { report_type: type, format, filters: { ...filters, hotel_id: filters.hotel_id } },
      ip: req.ip,
    });

    if (format === 'csv') {
      const csv = toCSV(type, rows);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="report-${safeType}-${dateStr}.csv"`);
      return res.send('\uFEFF' + csv); // BOM for Excel UTF-8
    }

    // PDF
    const pdfBuffer = await toPDF(type, rows, filters);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${safeType}-${dateStr}.pdf"`);
    return res.send(pdfBuffer);

  } catch (err) {
    next(err);
  }
};

module.exports = { generateReport, csvEscape };
