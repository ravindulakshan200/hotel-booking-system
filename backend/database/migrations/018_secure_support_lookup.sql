-- =============================================================================
-- Migration 018: Secure Support Ticket Lookup
-- =============================================================================

ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS lookup_token_hash VARCHAR(64) NULL COMMENT 'SHA-256 hash of high-entropy lookup token';
ALTER TABLE support_tickets ADD UNIQUE KEY uq_support_lookup_hash (lookup_token_hash);
