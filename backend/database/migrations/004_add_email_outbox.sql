-- =============================================================================
-- Migration: 004 Add Email Outbox
-- Description: Creates the email_outbox table for the background email worker.
-- =============================================================================

CREATE TABLE IF NOT EXISTS email_outbox (
  id                  INT             NOT NULL AUTO_INCREMENT,
  event_key           VARCHAR(150)    NOT NULL COMMENT 'Unique key for idempotency',
  event_type          VARCHAR(50)     NOT NULL,
  recipient_user_id   INT             NULL COMMENT 'FK to users if applicable',
  recipient_email     VARCHAR(150)    NULL,
  payload             JSON            NOT NULL,
  payload_expires_at  TIMESTAMP       NULL DEFAULT NULL,
  status              ENUM(
                        'pending',
                        'processing',
                        'sent',
                        'failed',
                        'dead_letter'
                      )               NOT NULL DEFAULT 'pending',
  attempts            INT             NOT NULL DEFAULT 0,
  max_attempts        INT             NOT NULL DEFAULT 3,
  next_attempt_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  locked_at           TIMESTAMP       NULL DEFAULT NULL,
  locked_by           VARCHAR(255)    NULL DEFAULT NULL,
  last_error_code     TEXT            NULL DEFAULT NULL,
  sent_at             TIMESTAMP       NULL DEFAULT NULL,
  created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                               ON UPDATE CURRENT_TIMESTAMP,

  -- Constraints
  PRIMARY KEY (id),
  UNIQUE KEY uq_email_outbox_event_key (event_key),

  -- Optional FK to users
  CONSTRAINT fk_email_outbox_user
    FOREIGN KEY (recipient_user_id)
    REFERENCES users (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,

  -- Indexes for efficient worker claiming
  INDEX idx_email_outbox_status_next_attempt (status, next_attempt_at),
  INDEX idx_email_outbox_locked_at (locked_at)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Outbox for transactional emails';
