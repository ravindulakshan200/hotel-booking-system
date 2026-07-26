-- =============================================================================
-- Migration: 010 Check-in Reminder Tracking
-- Description: Tracks which bookings have had a check-in reminder sent.
--              The UNIQUE KEY on booking_id enforces one reminder per booking.
--              The reminder worker uses INSERT IGNORE to safely skip duplicates.
-- =============================================================================

CREATE TABLE IF NOT EXISTS checkin_reminders (
  id          INT       NOT NULL AUTO_INCREMENT,
  booking_id  INT       NOT NULL,
  sent_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_checkin_reminder_booking (booking_id),

  CONSTRAINT fk_checkin_reminders_booking
    FOREIGN KEY (booking_id)
    REFERENCES bookings (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Tracks sent check-in reminders to prevent duplicates per booking';
