-- =============================================================================
-- Migration 011: Hotel Images Gallery
-- =============================================================================
-- Adds hotel_images table for multi-image gallery support.
-- Backward compatible: hotels.image_url remains unchanged.
-- =============================================================================

CREATE TABLE IF NOT EXISTS hotel_images (
  id           INT            NOT NULL AUTO_INCREMENT,
  hotel_id     INT            NOT NULL,
  storage_key  VARCHAR(512)   NOT NULL COMMENT 'Adapter-specific unique key (never original filename)',
  url          VARCHAR(1024)  NOT NULL COMMENT 'Public URL served to clients',
  alt_text     VARCHAR(255)   NOT NULL DEFAULT '' COMMENT 'Accessibility alt text',
  sort_order   SMALLINT       NOT NULL DEFAULT 0,
  is_cover     TINYINT(1)     NOT NULL DEFAULT 0,
  created_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY  uq_hotel_images_storage_key (storage_key),
  KEY         idx_hotel_images_hotel_id   (hotel_id),
  KEY         idx_hotel_images_sort       (hotel_id, sort_order),

  CONSTRAINT fk_hotel_images_hotel
    FOREIGN KEY (hotel_id) REFERENCES hotels (id)
    ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Hotel gallery images — supports multiple images per hotel';
