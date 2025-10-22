-- Fix password reset timestamp column type
-- This migration fixes the timezone issue by changing TIMESTAMP to TIMESTAMPTZ

-- First, drop the existing column
ALTER TABLE users DROP COLUMN IF EXISTS password_reset_expires_at;

-- Recreate with correct type (TIMESTAMPTZ)
ALTER TABLE users ADD COLUMN password_reset_expires_at TIMESTAMPTZ NULL;

-- Recreate the index
DROP INDEX IF EXISTS idx_users_password_reset_expires_at;
CREATE INDEX idx_users_password_reset_expires_at ON users(password_reset_expires_at);

-- Verify the fix
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'password_reset_expires_at';
