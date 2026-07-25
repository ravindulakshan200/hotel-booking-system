-- Migration 003: Corrective migration for account security fields
-- Description: TiDB-compatible idempotent migration to ensure Phase 2 columns exist without stored procedures.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS email_verification_token_hash VARCHAR(255) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS password_reset_token_hash VARCHAR(255) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP NULL DEFAULT NULL;

-- Safely backfill legacy users as verified only if they were created before the Phase 3 migration cutoff.
-- This fixed UTC cutoff ('2026-07-25 00:00:00') ensures future reruns of this script do not automatically verify newly registered users.
UPDATE users
SET email_verified_at = COALESCE(email_verified_at, created_at)
WHERE email_verified_at IS NULL
  AND created_at < '2026-07-25 00:00:00';
