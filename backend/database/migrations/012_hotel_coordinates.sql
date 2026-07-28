-- =============================================================================
-- Migration 012: Hotel Coordinates (Latitude / Longitude)
-- =============================================================================
-- Adds optional lat/lng fields to hotels for map display.
-- Both columns are nullable — safe for all existing rows.
-- =============================================================================

ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS latitude  DECIMAL(10, 7) NULL DEFAULT NULL
    COMMENT 'WGS-84 latitude  (-90 to +90)',
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7) NULL DEFAULT NULL
    COMMENT 'WGS-84 longitude (-180 to +180)';
