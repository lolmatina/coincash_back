-- Database Migration for Password Reset Fields
-- Run this SQL in your Supabase SQL editor or database management tool

-- Add password reset fields to users table
ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(64) NULL;
ALTER TABLE users ADD COLUMN password_reset_expires_at TIMESTAMPTZ NULL;

-- Add indexes for better performance
CREATE INDEX idx_users_password_reset_token ON users(password_reset_token);
CREATE INDEX idx_users_password_reset_expires_at ON users(password_reset_expires_at);

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('password_reset_token', 'password_reset_expires_at');
