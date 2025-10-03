-- Migration: Add parent_id column to users table for ACF system
-- This separates the invitor (who invited) from parent (actual tree placement)

-- Add parent_id column if it doesn't exist
ALTER TABLE users ADD COLUMN parent_id TEXT;

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_users_parent_id ON users(parent_id);
CREATE INDEX IF NOT EXISTS idx_users_invitor_id ON users(invitor_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_earnings_user_id ON earnings(user_id);
CREATE INDEX IF NOT EXISTS idx_earnings_created_at ON earnings(created_at);

-- Backfill parent_id with invitor_id for existing users (initial migration)
UPDATE users SET parent_id = invitor_id WHERE parent_id IS NULL AND invitor_id IS NOT NULL;
