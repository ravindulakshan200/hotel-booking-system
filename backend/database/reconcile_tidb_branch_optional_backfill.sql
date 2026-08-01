-- =============================================================================
-- TiDB Branch Optional Data Backfill Script
-- =============================================================================
-- These statements perform data backfilling for legacy records.
-- Run these only after the schema reconciliation is complete.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Backfill Users (Migration 003)
-- -----------------------------------------------------------------------------
-- Pre-check: Count how many legacy users require backfilling.
SELECT COUNT(*) AS legacy_users_to_verify
FROM users
WHERE email_verified_at IS NULL
  AND created_at < '2026-07-25 00:00:00';

-- Execute the backfill
UPDATE users
SET email_verified_at = COALESCE(email_verified_at, created_at)
WHERE email_verified_at IS NULL
  AND created_at < '2026-07-25 00:00:00';

-- -----------------------------------------------------------------------------
-- Backfill Bookings (Migration 002)
-- -----------------------------------------------------------------------------
-- Pre-check: Count how many legacy bookings require status updates.
SELECT COUNT(*) AS legacy_bookings_to_checkout
FROM bookings
WHERE booking_status = 'completed';

-- Execute the backfill
UPDATE bookings
SET booking_status = 'checked_out', checked_out_at = updated_at
WHERE booking_status = 'completed';
