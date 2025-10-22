-- Rollback migration for password reset fields
-- Run this SQL to remove the password reset fields if needed

-- Drop indexes first
DROP INDEX IF EXISTS idx_users_password_reset_token;
DROP INDEX IF EXISTS idx_users_password_reset_expires_at;

-- Remove password reset fields from users table
ALTER TABLE users DROP COLUMN IF EXISTS password_reset_token;
ALTER TABLE users DROP COLUMN IF EXISTS password_reset_expires_at;
