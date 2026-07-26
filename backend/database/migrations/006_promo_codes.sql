-- Migration: 006_promo_codes.sql
-- Description: Adds promo codes table and links bookings to promo codes, tracking original, discount, and final amounts.

CREATE TABLE IF NOT EXISTS promo_codes (
  id INT NOT NULL AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL,
  discount_type ENUM('fixed', 'percentage') NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  usage_limit INT NOT NULL DEFAULT 0 COMMENT '0 means unlimited',
  times_used INT NOT NULL DEFAULT 0,
  min_booking_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  description VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_promo_codes_code (code),
  INDEX idx_promo_codes_active_dates (is_active, start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add discount tracking columns to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS promo_code_id INT NULL DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS original_amount DECIMAL(10,2) NULL DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) NULL DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS final_amount DECIMAL(10,2) NULL DEFAULT NULL;

-- Add foreign key constraint for promo_code_id if not already present
ALTER TABLE bookings
  ADD CONSTRAINT fk_bookings_promo_code
  FOREIGN KEY (promo_code_id)
  REFERENCES promo_codes (id)
  ON DELETE SET NULL
  ON UPDATE CASCADE;
