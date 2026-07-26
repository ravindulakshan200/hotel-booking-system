-- =============================================================================
-- Migration: 009 In-App Notifications
-- Description: Creates the notifications table for in-app user notifications.
--              Uses INSERT IGNORE on event_key for idempotent creation,
--              mirroring the email_outbox deduplication strategy.
-- =============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id          INT           NOT NULL AUTO_INCREMENT,
  user_id     INT           NOT NULL,
  event_key   VARCHAR(150)  NOT NULL COMMENT 'Unique key for idempotency – mirrors email_outbox event_key',
  type        ENUM(
                'booking',
                'payment',
                'refund',
                'reminder',
                'system'
              )             NOT NULL DEFAULT 'system',
  title       VARCHAR(255)  NOT NULL,
  message     TEXT          NOT NULL,
  metadata    JSON          NULL     COMMENT 'Safe non-sensitive context: booking_id, hotel_name, etc.',
  read_at     TIMESTAMP     NULL     DEFAULT NULL,
  expires_at  TIMESTAMP     NULL     DEFAULT NULL,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_notifications_event_key (event_key),

  CONSTRAINT fk_notifications_user
    FOREIGN KEY (user_id)
    REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  -- Optimised for listing a user's unread/recent notifications
  INDEX idx_notifications_user_read_created (user_id, read_at, created_at)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='In-app notifications for users';
