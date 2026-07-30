-- =============================================================================
-- Migration 017: Invoices and Receipts
-- =============================================================================
-- Stores invoice and receipt number records (not PDF files).
-- PDFs are generated on-demand server-side, never stored.
-- =============================================================================

CREATE TABLE IF NOT EXISTS invoices (
  id             INT          NOT NULL AUTO_INCREMENT,
  booking_id     INT          NOT NULL,
  invoice_number VARCHAR(30)  NOT NULL COMMENT 'e.g. INV-20260727-000001',
  generated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_invoices_booking_id     (booking_id),
  UNIQUE KEY uq_invoices_invoice_number (invoice_number),

  CONSTRAINT fk_invoices_booking
    FOREIGN KEY (booking_id) REFERENCES bookings (id)
    ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Invoice number registry — PDFs are generated on demand, not stored here';


CREATE TABLE IF NOT EXISTS receipts (
  id             INT          NOT NULL AUTO_INCREMENT,
  booking_id     INT          NOT NULL,
  receipt_number VARCHAR(30)  NOT NULL COMMENT 'e.g. RCT-20260727-000001',
  generated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_receipts_booking_id     (booking_id),
  UNIQUE KEY uq_receipts_receipt_number (receipt_number),

  CONSTRAINT fk_receipts_booking
    FOREIGN KEY (booking_id) REFERENCES bookings (id)
    ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Receipt number registry — only created after confirmed payment';
