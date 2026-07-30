/**
 * controllers/availabilityController.js
 *
 * Room availability calendar API.
 * Returns unavailable date strings for a given month.
 *
 * GET /api/v1/rooms/:id/availability?year=YYYY&month=M
 *
 * Excludes cancelled, expired, refunded, checked_out, completed bookings.
 * Uses Sri Lanka date arithmetic (date-only strings from DB, compared as dates).
 */

'use strict';

const pool = require('../config/db');

const EXCLUDED_STATUSES = ['cancelled', 'expired', 'refunded', 'checked_out', 'completed'];

const getAvailability = async (req, res, next) => {
  try {
    const roomId = parseInt(req.params.id, 10);
    if (!Number.isInteger(roomId) || roomId < 1) {
      return res.status(400).json({ success: false, message: 'Invalid room ID.' });
    }

    const year  = parseInt(req.query.year,  10);
    const month = parseInt(req.query.month, 10); // 1-based

    if (!Number.isInteger(year) || year < 2000 || year > 2100 ||
        !Number.isInteger(month) || month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: 'year and month query parameters are required (year: 2000-2100, month: 1-12).' });
    }

    // Build first and last date of the requested month
    const firstDay = new Date(Date.UTC(year, month - 1, 1));
    const lastDay  = new Date(Date.UTC(year, month, 0)); // day 0 of next month = last day of this month

    const firstStr = firstDay.toISOString().slice(0, 10);
    const lastStr  = lastDay.toISOString().slice(0, 10);

    // Fetch bookings that overlap with this month
    const [bookings] = await pool.query(
      `SELECT check_in, check_out
       FROM bookings
       WHERE room_id = ?
         AND booking_status NOT IN (${EXCLUDED_STATUSES.map(() => '?').join(',')})
         AND (booking_status != 'pending' OR expires_at IS NULL OR expires_at > NOW())
         AND check_in  < ?
         AND check_out > ?`,
      [roomId, ...EXCLUDED_STATUSES, lastStr, firstStr]
    );

    // Expand each booking into individual date strings (check_in inclusive, check_out exclusive)
    const unavailableDates = new Set();
    for (const { check_in, check_out } of bookings) {
      const start = new Date(check_in);
      const end   = new Date(check_out);

      let cur = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()));
      const endUTC = new Date(Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()));

      while (cur < endUTC) {
        const dateStr = cur.toISOString().slice(0, 10);
        // Only include dates in the requested month
        if (dateStr >= firstStr && dateStr <= lastStr) {
          unavailableDates.add(dateStr);
        }
        cur = new Date(cur.getTime() + 86400000); // advance one day
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Availability fetched.',
      data: {
        room_id:           roomId,
        year,
        month,
        unavailable_dates: Array.from(unavailableDates).sort(),
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAvailability };
