/**
 * services/reminderWorker.js
 *
 * Safe check-in reminder scheduler.
 *
 * Behaviour:
 *  - Disabled by default (REMINDER_WORKER_ENABLED must be 'true')
 *  - Never starts in NODE_ENV === 'test'
 *  - Uses INSERT IGNORE on checkin_reminders(booking_id) for deduplication
 *  - Only processes confirmed/paid bookings checking in on targetDate
 *  - Enqueues email + in-app notification for each newly-sent reminder
 *  - Graceful shutdown on SIGINT / SIGTERM
 *  - No duplicate timers on module import
 *
 * Configuration:
 *  REMINDER_WORKER_ENABLED      = 'true'  (default: disabled)
 *  REMINDER_LEAD_DAYS           = 1       (send X days before check-in)
 *  REMINDER_BATCH_SIZE          = 50
 *  REMINDER_WORKER_INTERVAL_MS  = 3600000 (1 hour)
 *  APP_TIMEZONE                 = 'Asia/Colombo'
 */

const { randomUUID } = require('crypto');
const { getTodayDateOnly } = require('../utils/dateUtils');

class ReminderWorker {
  constructor() {
    this.workerId = `reminder-${randomUUID()}`;
    this.intervalId = null;
    this.isRunning = false;
    this.isShuttingDown = false;
    this.intervalMs = parseInt(process.env.REMINDER_WORKER_INTERVAL_MS, 10) || 3_600_000;
    this.batchSize = parseInt(process.env.REMINDER_BATCH_SIZE, 10) || 50;
    this.leadDays = parseInt(process.env.REMINDER_LEAD_DAYS, 10) || 1;
  }

  /**
   * Start the periodic reminder scheduler.
   * No-op if already running, in test env, or REMINDER_WORKER_ENABLED !== 'true'.
   */
  start() {
    if (
      this.isRunning ||
      process.env.NODE_ENV === 'test' ||
      process.env.REMINDER_WORKER_ENABLED !== 'true'
    ) {
      if (process.env.NODE_ENV !== 'test') {
        console.log(`[ReminderWorker] Worker not started. (ENABLED=${process.env.REMINDER_WORKER_ENABLED})`);
      }
      return;
    }

    console.log(
      `[ReminderWorker] Starting worker ${this.workerId} ` +
      `(lead: ${this.leadDays}d, interval: ${this.intervalMs}ms, batch: ${this.batchSize})`
    );
    this.isRunning = true;
    this.isShuttingDown = false;

    // Run one batch immediately, then on each interval
    this.processBatch().catch(err =>
      console.error('[ReminderWorker] Initial batch error:', err.message)
    );
    this.intervalId = setInterval(() => {
      this.processBatch().catch(err =>
        console.error('[ReminderWorker] Interval batch error:', err.message)
      );
    }, this.intervalMs);
  }

  /**
   * Process one batch of upcoming-check-in reminders.
   * Can be called directly (e.g. from the admin cron endpoint) regardless of
   * whether the worker is running.
   */
  async processBatch() {
    if (this.isShuttingDown) return;

    const pool = require('../config/db');
    const EmailOutbox = require('../models/EmailOutbox');
    const Notification = require('../models/Notification');

    const tz = process.env.APP_TIMEZONE || 'Asia/Colombo';
    const today = getTodayDateOnly(tz);

    // Target date = today + leadDays
    const target = new Date(today + 'T00:00:00Z');
    target.setUTCDate(target.getUTCDate() + this.leadDays);
    const targetDateStr = target.toISOString().split('T')[0];

    // Find confirmed bookings checking in on targetDate that have NOT been reminded yet
    const [bookings] = await pool.query(
      `SELECT b.id, b.user_id, b.check_in, b.check_out, b.total_price,
              h.name AS hotel_name, r.room_type, r.room_number
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       JOIN hotels h ON r.hotel_id = h.id
       WHERE b.booking_status = 'confirmed'
         AND DATE(b.check_in) = ?
         AND b.id NOT IN (SELECT booking_id FROM checkin_reminders)
       LIMIT ?`,
      [targetDateStr, this.batchSize]
    );

    if (bookings.length === 0) return;

    console.log(`[ReminderWorker] Processing ${bookings.length} reminder(s) for ${targetDateStr}`);

    for (const booking of bookings) {
      if (this.isShuttingDown) break;

      try {
        // INSERT IGNORE on the unique booking_id — prevents concurrent/duplicate sends
        const [reminderResult] = await pool.query(
          'INSERT IGNORE INTO checkin_reminders (booking_id) VALUES (?)',
          [booking.id]
        );

        if (reminderResult.affectedRows === 0) {
          // Already sent (race condition from concurrent workers or manual cron trigger)
          continue;
        }

        const eventKey = `checkin_reminder_${booking.id}`;

        // Enqueue email (INSERT IGNORE in EmailOutbox prevents duplicates)
        try {
          await EmailOutbox.enqueueEmailEvent(null, {
            eventKey,
            eventType: 'checkin_reminder',
            recipientUserId: booking.user_id,
            payload: {
              bookingId: booking.id,
              hotelName: booking.hotel_name,
              roomType: booking.room_type,
              checkIn: booking.check_in,
              checkOut: booking.check_out,
            },
          });
        } catch (emailErr) {
          console.error(`[ReminderWorker] Failed to enqueue email for booking ${booking.id}:`, emailErr.message);
        }

        // Create in-app notification (INSERT IGNORE prevents duplicates)
        try {
          await Notification.create(null, {
            userId: booking.user_id,
            eventKey,
            type: 'reminder',
            title: 'Check-in Reminder',
            message: `Your check-in at ${booking.hotel_name} is tomorrow (${booking.check_in}). We look forward to hosting you!`,
            metadata: {
              bookingId: booking.id,
              hotelName: booking.hotel_name,
              checkIn: booking.check_in,
            },
          });
        } catch (notifErr) {
          console.error(`[ReminderWorker] Failed to create notification for booking ${booking.id}:`, notifErr.message);
        }

        console.log(`[ReminderWorker] Reminder sent for booking ${booking.id}`);
      } catch (err) {
        console.error(`[ReminderWorker] Error processing booking ${booking.id}:`, err.message);
      }
    }
  }

  /**
   * Gracefully shut down the worker.
   */
  stop() {
    if (!this.isRunning) return;
    console.log(`[ReminderWorker] Shutting down worker ${this.workerId}...`);
    this.isShuttingDown = true;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }
}

const worker = new ReminderWorker();

// Graceful shutdown
process.on('SIGINT', () => worker.stop());
process.on('SIGTERM', () => worker.stop());

module.exports = worker;
