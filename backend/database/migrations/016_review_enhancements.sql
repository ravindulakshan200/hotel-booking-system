-- =============================================================================
-- Migration 016: Review Enhancements (Soft Moderation + Reporting)
-- =============================================================================
-- Adds soft-hide fields to reviews and a review_reports table.
-- Existing reviews default to is_hidden = FALSE — no disruption.
-- =============================================================================

-- Soft moderation on reviews
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS is_hidden       TINYINT(1)  NOT NULL DEFAULT 0
    COMMENT '1 = hidden by admin moderation',
  ADD COLUMN IF NOT EXISTS hidden_at       TIMESTAMP   NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS hidden_by_admin_id INT       NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_deleted      TINYINT(1)  NOT NULL DEFAULT 0
    COMMENT '1 = soft-deleted by owner or admin',
  ADD COLUMN IF NOT EXISTS deleted_at      TIMESTAMP   NULL DEFAULT NULL;

-- User review reports
CREATE TABLE IF NOT EXISTS review_reports (
  id               INT            NOT NULL AUTO_INCREMENT,
  review_id        INT            NOT NULL,
  reporter_user_id INT            NOT NULL,
  reason           VARCHAR(2000)  NOT NULL,
  category         ENUM(
                     'spam', 'offensive', 'fake', 'irrelevant', 'other'
                   )              NOT NULL DEFAULT 'other',
  status           ENUM(
                     'pending', 'dismissed', 'actioned'
                   )              NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                            ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  -- Prevent duplicate active reports by same user on same review
  UNIQUE KEY uq_review_report_pending (review_id, reporter_user_id, status),
  KEY idx_review_reports_review_id  (review_id),
  KEY idx_review_reports_reporter   (reporter_user_id),
  KEY idx_review_reports_status     (status),

  CONSTRAINT fk_review_reports_review
    FOREIGN KEY (review_id) REFERENCES reviews (id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_review_reports_reporter
    FOREIGN KEY (reporter_user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='User-submitted reports on individual reviews';
