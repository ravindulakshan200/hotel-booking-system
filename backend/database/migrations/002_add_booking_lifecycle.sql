-- Migration: 002_add_booking_lifecycle.sql
-- Description: Adds expiry, cancellation details, check-in/out timestamps, archiving, and refund tracking without stored procedures.

-- 1. Add new columns to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(255) NULL DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by_user_id INT NULL DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS no_show_at TIMESTAMP NULL DEFAULT NULL;

-- Refund Tracking Fields
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_status VARCHAR(20) NOT NULL DEFAULT 'not_required';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_requested_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_completed_at TIMESTAMP NULL DEFAULT NULL;

-- Update the ENUM safely by re-defining the column
ALTER TABLE bookings MODIFY COLUMN booking_status ENUM('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show', 'expired', 'refunded', 'completed') NOT NULL DEFAULT 'pending';

-- Safely map existing 'completed' records to 'checked_out'
UPDATE bookings SET booking_status = 'checked_out', checked_out_at = updated_at WHERE booking_status = 'completed';

-- 2. Add is_archived to hotels
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Add is_archived to rooms
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
