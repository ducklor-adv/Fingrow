-- Create fingrow_dna table for network structure and ACF (Auto-Connect Follower) system
-- This table stores the hierarchical network structure separate from user registration

CREATE TABLE IF NOT EXISTS fingrow_dna (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_number INTEGER UNIQUE,
    user_id TEXT UNIQUE NOT NULL,
    user_type TEXT NOT NULL DEFAULT 'Atta',
    regist_time TEXT NOT NULL,
    regist_type TEXT NOT NULL,
    invitor TEXT,
    max_follower INTEGER NOT NULL DEFAULT 5,
    follower_count INTEGER NOT NULL DEFAULT 0,
    follower_full_status TEXT NOT NULL DEFAULT 'Open',
    max_level_royalty INTEGER NOT NULL DEFAULT 19530,
    child_count INTEGER NOT NULL DEFAULT 0,
    parent_id TEXT,
    own_finpoint REAL NOT NULL DEFAULT 0,
    total_finpoint REAL NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 0,
    js_file_path TEXT,
    parent_file TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (invitor) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_dna_user_id ON fingrow_dna(user_id);
CREATE INDEX IF NOT EXISTS idx_dna_parent_id ON fingrow_dna(parent_id);
CREATE INDEX IF NOT EXISTS idx_dna_invitor ON fingrow_dna(invitor);
CREATE INDEX IF NOT EXISTS idx_dna_run_number ON fingrow_dna(run_number);
CREATE INDEX IF NOT EXISTS idx_dna_level ON fingrow_dna(level);
CREATE INDEX IF NOT EXISTS idx_dna_follower_status ON fingrow_dna(follower_full_status);

-- Add parent_id to users table if not exists (for ACF system)
-- This will be run safely in the migration script
