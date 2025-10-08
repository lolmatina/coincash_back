-- Add profile_type column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_type VARCHAR(20) DEFAULT 'personal' CHECK (profile_type IN ('personal', 'company'));

-- Create index for profile_type
CREATE INDEX IF NOT EXISTS idx_users_profile_type ON users(profile_type);

-- Update existing users to have 'personal' as default
UPDATE users SET profile_type = 'personal' WHERE profile_type IS NULL;
