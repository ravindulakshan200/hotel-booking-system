-- =============================================================================
-- TiDB Branch Schema Preflight Script
-- =============================================================================
-- STRICTLY SELECT-ONLY PRE-CHECKS.
-- =============================================================================

-- 1. All 10 target table existence states
SELECT table_name,
       CASE WHEN table_name IS NOT NULL THEN 'PRESENT (BLOCKED)' ELSE 'MISSING (PASS)' END AS status
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN (
    'email_outbox', 'promo_codes', 'notifications', 'checkin_reminders',
    'hotel_images', 'audit_logs', 'support_tickets', 'review_reports',
    'invoices', 'receipts'
  );

-- 2. Exact primary key definitions for users, bookings, hotels, and reviews
SELECT table_name, column_name, column_type, is_nullable, column_key, extra
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name IN ('users', 'bookings', 'hotels', 'reviews')
  AND column_name = 'id';

-- 3. Exact bookings.booking_status COLUMN_TYPE/default/nullability
SELECT table_name, column_name, column_type, is_nullable, column_default, extra
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name = 'bookings'
  AND column_name = 'booking_status';

-- 4. Aggregated booking_status values and counts
SELECT booking_status, COUNT(*) AS status_count
FROM bookings
GROUP BY booking_status;

-- 5. Existing constraint names and full definitions
SELECT constraint_name, table_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = DATABASE()
  AND constraint_name IN (
    'fk_email_outbox_user', 'fk_bookings_promo_code', 'fk_notifications_user',
    'fk_checkin_reminders_booking', 'fk_hotel_images_hotel', 'fk_audit_admin',
    'fk_support_user', 'fk_review_reports_review', 'fk_review_reports_reporter',
    'fk_invoices_booking', 'fk_receipts_booking'
  );
