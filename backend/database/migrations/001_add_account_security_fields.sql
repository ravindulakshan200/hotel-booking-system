-- Migration 001: Add account security fields
-- Description: Adds fields for email verification and password reset. Marks existing users as verified.

DELIMITER $$
CREATE PROCEDURE AddAccountSecurityFields()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'email_verified_at'
    ) THEN
        ALTER TABLE users
        ADD COLUMN email_verified_at TIMESTAMP NULL DEFAULT NULL,
        ADD COLUMN email_verification_token_hash VARCHAR(255) NULL DEFAULT NULL,
        ADD COLUMN email_verification_expires_at TIMESTAMP NULL DEFAULT NULL,
        ADD COLUMN password_reset_token_hash VARCHAR(255) NULL DEFAULT NULL,
        ADD COLUMN password_reset_expires_at TIMESTAMP NULL DEFAULT NULL,
        ADD COLUMN password_changed_at TIMESTAMP NULL DEFAULT NULL;

        -- Safe migration for existing users: treat them as verified so they are not locked out
        UPDATE users
        SET email_verified_at = CURRENT_TIMESTAMP
        WHERE email_verified_at IS NULL;
    END IF;
END$$
DELIMITER ;

CALL AddAccountSecurityFields();
DROP PROCEDURE AddAccountSecurityFields;
