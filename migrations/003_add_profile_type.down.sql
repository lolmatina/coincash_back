-- Remove profile_type column from users table
ALTER TABLE users DROP COLUMN IF EXISTS profile_type;

-- Drop index for profile_type
DROP INDEX IF EXISTS idx_users_profile_type;
