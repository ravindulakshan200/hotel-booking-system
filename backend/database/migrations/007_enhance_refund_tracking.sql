-- Migration: 007_enhance_refund_tracking.sql
-- Description: Enhances refund tracking on bookings table and adds discount tracking columns to payments table.

-- Add refund tracking columns to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_provider_reference VARCHAR(255) NULL DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_reason VARCHAR(255) NULL DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_admin_notes TEXT NULL DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_processing_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_rejected_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_failed_at TIMESTAMP NULL DEFAULT NULL;

-- Add discount/amount tracking columns to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS original_amount DECIMAL(10,2) NULL DEFAULT NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) NULL DEFAULT NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS final_amount DECIMAL(10,2) NULL DEFAULT NULL;
