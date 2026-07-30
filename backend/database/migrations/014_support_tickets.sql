-- =============================================================================
-- Migration 014: Support Tickets
-- =============================================================================
-- Public/authenticated support ticket system.
-- agent_notes is server-only — never returned to customers.
-- =============================================================================

CREATE TABLE IF NOT EXISTS support_tickets (
  id           INT            NOT NULL AUTO_INCREMENT,
  user_id      INT            NULL     COMMENT 'NULL for unauthenticated submissions',
  ticket_ref   VARCHAR(20)    NOT NULL COMMENT 'Unique human-readable reference e.g. TKT-20260727-A3F2',
  name         VARCHAR(80)    NOT NULL,
  email        VARCHAR(150)   NOT NULL,
  subject      VARCHAR(120)   NOT NULL,
  category     ENUM(
                 'booking', 'payment', 'refund', 'technical',
                 'complaint', 'other'
               )              NOT NULL DEFAULT 'other',
  message      TEXT           NOT NULL,
  status       ENUM(
                 'open', 'in_progress', 'resolved', 'closed'
               )              NOT NULL DEFAULT 'open',
  agent_notes  TEXT           NULL     COMMENT 'Internal — NEVER exposed to customers',
  lookup_token_hash VARCHAR(64) NULL    COMMENT 'SHA-256 hash of high-entropy lookup token',
  created_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                        ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY  uq_support_ticket_ref  (ticket_ref),
  UNIQUE KEY  uq_support_lookup_hash  (lookup_token_hash),
  KEY         idx_support_user_id    (user_id),
  KEY         idx_support_status     (status),
  KEY         idx_support_created_at (created_at),

  CONSTRAINT fk_support_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE SET NULL ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Customer support tickets';
