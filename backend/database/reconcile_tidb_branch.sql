-- =============================================================================
-- TiDB Branch Schema Reconciliation Script
-- =============================================================================
-- STRICTLY SCHEMA DDL ONLY. NO DATA MODIFICATIONS.
-- ONE-TIME EXECUTION SCRIPT.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Migration 001/003: Account Security Fields
-- -----------------------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS email_verification_token_hash VARCHAR(255) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS password_reset_token_hash VARCHAR(255) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP NULL DEFAULT NULL;

-- -----------------------------------------------------------------------------
-- Migration 002: Booking Lifecycle & Rooms
-- -----------------------------------------------------------------------------
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(255) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cancelled_by_user_id INT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS no_show_at TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS refund_status VARCHAR(20) NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS refund_requested_at TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS refund_completed_at TIMESTAMP NULL DEFAULT NULL;

ALTER TABLE bookings MODIFY COLUMN booking_status ENUM('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show', 'expired', 'refunded', 'completed') NOT NULL DEFAULT 'pending';

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

-- -----------------------------------------------------------------------------
-- Migration 004: Email Outbox
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_outbox (
  id                  INT             NOT NULL AUTO_INCREMENT,
  event_key           VARCHAR(150)    NOT NULL COMMENT 'Unique key for idempotency',
  event_type          VARCHAR(50)     NOT NULL,
  recipient_user_id   INT             NULL COMMENT 'FK to users if applicable',
  recipient_email     VARCHAR(150)    NULL,
  payload             JSON            NOT NULL,
  payload_expires_at  TIMESTAMP       NULL DEFAULT NULL,
  status              ENUM('pending','processing','sent','failed','dead_letter') NOT NULL DEFAULT 'pending',
  attempts            INT             NOT NULL DEFAULT 0,
  max_attempts        INT             NOT NULL DEFAULT 3,
  next_attempt_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  locked_at           TIMESTAMP       NULL DEFAULT NULL,
  locked_by           VARCHAR(255)    NULL DEFAULT NULL,
  last_error_code     TEXT            NULL DEFAULT NULL,
  sent_at             TIMESTAMP       NULL DEFAULT NULL,
  created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_email_outbox_event_key (event_key),
  INDEX idx_email_outbox_status_next_attempt (status, next_attempt_at),
  INDEX idx_email_outbox_locked_at (locked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Outbox for transactional emails';

ALTER TABLE email_outbox ADD CONSTRAINT fk_email_outbox_user FOREIGN KEY (recipient_user_id) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- Migration 006 & 008: Promo Codes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS promo_codes (
  id INT NOT NULL AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL,
  discount_type ENUM('fixed', 'percentage') NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  usage_limit INT NOT NULL DEFAULT 0 COMMENT '0 means unlimited',
  times_used INT NOT NULL DEFAULT 0,
  times_reserved INT NOT NULL DEFAULT 0,
  min_booking_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  description VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_promo_codes_code (code),
  INDEX idx_promo_codes_active_dates (is_active, start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS promo_code_id INT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS original_amount DECIMAL(10,2) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS final_amount DECIMAL(10,2) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS promo_reserved BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE bookings ADD CONSTRAINT fk_bookings_promo_code FOREIGN KEY (promo_code_id) REFERENCES promo_codes (id) ON DELETE SET NULL ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- Migration 007: Enhanced Refund Tracking
-- -----------------------------------------------------------------------------
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS refund_provider_reference VARCHAR(255) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS refund_reason VARCHAR(255) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS refund_admin_notes TEXT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS refund_processing_at TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS refund_rejected_at TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS refund_failed_at TIMESTAMP NULL DEFAULT NULL;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS original_amount DECIMAL(10,2) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS final_amount DECIMAL(10,2) NULL DEFAULT NULL;

-- -----------------------------------------------------------------------------
-- Migration 009: Notifications
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id          INT           NOT NULL AUTO_INCREMENT,
  user_id     INT           NOT NULL,
  event_key   VARCHAR(150)  NOT NULL COMMENT 'Unique key for idempotency',
  type        ENUM('booking','payment','refund','reminder','system') NOT NULL DEFAULT 'system',
  title       VARCHAR(255)  NOT NULL,
  message     TEXT          NOT NULL,
  metadata    JSON          NULL     COMMENT 'Safe non-sensitive context',
  read_at     TIMESTAMP     NULL     DEFAULT NULL,
  expires_at  TIMESTAMP     NULL     DEFAULT NULL,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_notifications_event_key (event_key),
  INDEX idx_notifications_user_read_created (user_id, read_at, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='In-app notifications for users';

ALTER TABLE notifications ADD CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- Migration 010: Checkin Reminders
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS checkin_reminders (
  id          INT       NOT NULL AUTO_INCREMENT,
  booking_id  INT       NOT NULL,
  sent_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_checkin_reminder_booking (booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tracks sent check-in reminders';

ALTER TABLE checkin_reminders ADD CONSTRAINT fk_checkin_reminders_booking FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE CASCADE ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- Migration 011: Hotel Images
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hotel_images (
  id           INT            NOT NULL AUTO_INCREMENT,
  hotel_id     INT            NOT NULL,
  storage_key  VARCHAR(512)   NOT NULL COMMENT 'Adapter-specific unique key',
  url          VARCHAR(1024)  NOT NULL COMMENT 'Public URL served to clients',
  alt_text     VARCHAR(255)   NOT NULL DEFAULT '' COMMENT 'Accessibility alt text',
  sort_order   SMALLINT       NOT NULL DEFAULT 0,
  is_cover     TINYINT(1)     NOT NULL DEFAULT 0,
  created_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY  uq_hotel_images_storage_key (storage_key),
  KEY         idx_hotel_images_hotel_id   (hotel_id),
  KEY         idx_hotel_images_sort       (hotel_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE hotel_images ADD CONSTRAINT fk_hotel_images_hotel FOREIGN KEY (hotel_id) REFERENCES hotels (id) ON DELETE CASCADE ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- Migration 012: Hotel Coordinates
-- -----------------------------------------------------------------------------
ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS latitude  DECIMAL(10, 7) NULL DEFAULT NULL COMMENT 'WGS-84 latitude  (-90 to +90)',
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7) NULL DEFAULT NULL COMMENT 'WGS-84 longitude (-180 to +180)';

-- -----------------------------------------------------------------------------
-- Migration 013: Audit Logs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id           BIGINT         NOT NULL AUTO_INCREMENT,
  admin_id     INT            NULL     COMMENT 'NULL for system-initiated actions',
  action       VARCHAR(100)   NOT NULL COMMENT 'e.g. hotel_created, booking_status_changed',
  entity_type  VARCHAR(60)    NOT NULL COMMENT 'e.g. hotel, booking, user, review',
  entity_id    INT            NULL     COMMENT 'Primary key of the affected entity',
  metadata     JSON           NULL     COMMENT 'Safe structured context',
  ip_address   VARCHAR(45)    NULL     COMMENT 'IPv4 or IPv6, trimmed',
  created_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_admin_id    (admin_id),
  KEY idx_audit_action      (action),
  KEY idx_audit_entity      (entity_type, entity_id),
  KEY idx_audit_created_at  (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE audit_logs ADD CONSTRAINT fk_audit_admin FOREIGN KEY (admin_id) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- Migration 014 & 018: Support Tickets
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS support_tickets (
  id           INT            NOT NULL AUTO_INCREMENT,
  user_id      INT            NULL     COMMENT 'NULL for unauthenticated submissions',
  ticket_ref   VARCHAR(20)    NOT NULL COMMENT 'Unique human-readable reference e.g. TKT-20260727-A3F2',
  name         VARCHAR(80)    NOT NULL,
  email        VARCHAR(150)   NOT NULL,
  subject      VARCHAR(120)   NOT NULL,
  category     ENUM('booking', 'payment', 'refund', 'technical', 'complaint', 'other') NOT NULL DEFAULT 'other',
  message      TEXT           NOT NULL,
  status       ENUM('open', 'in_progress', 'resolved', 'closed') NOT NULL DEFAULT 'open',
  agent_notes  TEXT           NULL     COMMENT 'Internal',
  lookup_token_hash VARCHAR(64) NULL   COMMENT 'SHA-256 hash of high-entropy lookup token',
  created_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY  uq_support_ticket_ref  (ticket_ref),
  UNIQUE KEY  uq_support_lookup_hash  (lookup_token_hash),
  KEY         idx_support_user_id    (user_id),
  KEY         idx_support_status     (status),
  KEY         idx_support_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE support_tickets ADD CONSTRAINT fk_support_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- Migration 015: User Deactivation
-- -----------------------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '0 = deactivated (soft-deleted), 1 = active',
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP NULL DEFAULT NULL COMMENT 'When the account was deactivated',
  ADD COLUMN IF NOT EXISTS deactivation_reason VARCHAR(500) NULL DEFAULT NULL COMMENT 'Admin-supplied reason or "self" for self-deactivation';

ALTER TABLE users ADD INDEX IF NOT EXISTS idx_users_is_active (is_active);

-- -----------------------------------------------------------------------------
-- Migration 016: Reviews Enhancements
-- -----------------------------------------------------------------------------
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS is_hidden TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = hidden by admin moderation',
  ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS hidden_by_admin_id INT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = soft-deleted by owner or admin',
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL;

CREATE TABLE IF NOT EXISTS review_reports (
  id               INT            NOT NULL AUTO_INCREMENT,
  review_id        INT            NOT NULL,
  reporter_user_id INT            NOT NULL,
  reason           VARCHAR(2000)  NOT NULL,
  category         ENUM('spam', 'offensive', 'fake', 'irrelevant', 'other') NOT NULL DEFAULT 'other',
  status           ENUM('pending', 'dismissed', 'actioned') NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_review_report_pending (review_id, reporter_user_id, status),
  KEY idx_review_reports_review_id  (review_id),
  KEY idx_review_reports_reporter   (reporter_user_id),
  KEY idx_review_reports_status     (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE review_reports ADD CONSTRAINT fk_review_reports_review FOREIGN KEY (review_id) REFERENCES reviews (id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE review_reports ADD CONSTRAINT fk_review_reports_reporter FOREIGN KEY (reporter_user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- Migration 017: Invoices and Receipts
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id             INT          NOT NULL AUTO_INCREMENT,
  booking_id     INT          NOT NULL,
  invoice_number VARCHAR(30)  NOT NULL COMMENT 'e.g. INV-20260727-000001',
  generated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_invoices_booking_id     (booking_id),
  UNIQUE KEY uq_invoices_invoice_number (invoice_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE invoices ADD CONSTRAINT fk_invoices_booking FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS receipts (
  id             INT          NOT NULL AUTO_INCREMENT,
  booking_id     INT          NOT NULL,
  receipt_number VARCHAR(30)  NOT NULL COMMENT 'e.g. RCT-20260727-000001',
  generated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_receipts_booking_id     (booking_id),
  UNIQUE KEY uq_receipts_receipt_number (receipt_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE receipts ADD CONSTRAINT fk_receipts_booking FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE CASCADE ON UPDATE CASCADE;
