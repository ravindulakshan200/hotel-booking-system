-- =============================================================================
-- Migration 015: User Deactivation (Soft Delete)
-- =============================================================================
-- Adds soft-deactivation fields to users.
-- Existing rows default to is_active = TRUE (no disruption).
-- Financial records (bookings/payments) are preserved on deactivation.
-- =============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_active          TINYINT(1)  NOT NULL DEFAULT 1
    COMMENT '0 = deactivated (soft-deleted), 1 = active',
  ADD COLUMN IF NOT EXISTS deactivated_at     TIMESTAMP   NULL DEFAULT NULL
    COMMENT 'When the account was deactivated',
  ADD COLUMN IF NOT EXISTS deactivation_reason VARCHAR(500) NULL DEFAULT NULL
    COMMENT 'Admin-supplied reason or "self" for self-deactivation';

-- Index to quickly filter active users in auth middleware
ALTER TABLE users
  ADD INDEX IF NOT EXISTS idx_users_is_active (is_active);
