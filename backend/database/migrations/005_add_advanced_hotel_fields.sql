-- =============================================================================
-- Migration: 005_add_advanced_hotel_fields.sql
-- Description: Adds advanced hotel management fields to the hotels table.
-- Note on idempotency: MySQL/TiDB does not natively support ADD COLUMN IF NOT EXISTS
-- in a simple ALTER TABLE. Before running this migration, ensure the columns do
-- not already exist. You can check this by running:
-- SHOW COLUMNS FROM hotels LIKE 'image_url';
-- If it returns a row, do not run this migration.
-- =============================================================================

ALTER TABLE hotels
  ADD COLUMN image_url VARCHAR(500) DEFAULT NULL,
  ADD COLUMN star_rating TINYINT DEFAULT NULL,
  ADD COLUMN amenities JSON DEFAULT NULL,
  ADD COLUMN contact_phone VARCHAR(20) DEFAULT NULL,
  ADD COLUMN contact_email VARCHAR(150) DEFAULT NULL,
  ADD COLUMN map_url VARCHAR(500) DEFAULT NULL,
  ADD COLUMN status ENUM('active', 'inactive') NOT NULL DEFAULT 'active';

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- Run the following query to verify the columns were added correctly:
-- SELECT column_name, column_type
-- FROM information_schema.columns
-- WHERE table_name = 'hotels' AND table_schema = DATABASE();

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- If you need to revert this migration, run the following:
-- ALTER TABLE hotels
--   DROP COLUMN image_url,
--   DROP COLUMN star_rating,
--   DROP COLUMN amenities,
--   DROP COLUMN contact_phone,
--   DROP COLUMN contact_email,
--   DROP COLUMN map_url,
--   DROP COLUMN status;
