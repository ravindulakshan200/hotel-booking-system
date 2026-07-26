-- Migration: 008_add_promo_reserved_field.sql
-- Description: Adds times_reserved to promo_codes and promo_reserved tracking to bookings.

ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS times_reserved INT NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS promo_reserved BOOLEAN NOT NULL DEFAULT FALSE;
