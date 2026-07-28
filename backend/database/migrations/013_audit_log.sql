-- =============================================================================
-- Migration 013: Audit Log
-- =============================================================================
-- Immutable audit trail of admin actions.
-- Application layer MUST NOT UPDATE or DELETE rows from this table.
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id           BIGINT         NOT NULL AUTO_INCREMENT,
  admin_id     INT            NULL     COMMENT 'NULL for system-initiated actions',
  action       VARCHAR(100)   NOT NULL COMMENT 'e.g. hotel_created, booking_status_changed',
  entity_type  VARCHAR(60)    NOT NULL COMMENT 'e.g. hotel, booking, user, review',
  entity_id    INT            NULL     COMMENT 'Primary key of the affected entity',
  metadata     JSON           NULL     COMMENT 'Safe structured context — no passwords/secrets',
  ip_address   VARCHAR(45)    NULL     COMMENT 'IPv4 or IPv6, trimmed',
  created_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_audit_admin_id    (admin_id),
  KEY idx_audit_action      (action),
  KEY idx_audit_entity      (entity_type, entity_id),
  KEY idx_audit_created_at  (created_at),

  CONSTRAINT fk_audit_admin
    FOREIGN KEY (admin_id) REFERENCES users (id)
    ON DELETE SET NULL ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Immutable audit trail — rows must never be updated or deleted by the application';
