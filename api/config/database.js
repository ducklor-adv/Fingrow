import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../data', 'fingrow.db');
let db = null;

export const initDatabase = () => {
    if (db) return db;

    try {
        db = new Database(dbPath);
        
        // Disable foreign key constraints globally for this connection
        db.exec('PRAGMA foreign_keys = OFF');
        
        console.log('✅ Database connected:', dbPath);
        
        // Run migrations
        runMigrations();
        
        return db;
    } catch (error) {
        console.error('❌ Database connection error:', error);
        throw error;
    }
};

const runMigrations = () => {
    try {
        // Add parent_id column if it doesn't exist
        const columns = db.prepare("PRAGMA table_info(users)").all();
        const hasParentId = columns.some(col => col.name === 'parent_id');
        
        if (!hasParentId) {
            console.log('🔄 Running migration: Adding parent_id column...');
            db.exec('ALTER TABLE users ADD COLUMN parent_id TEXT');
            console.log('✅ Migration complete: parent_id added');
        }
        
        // Create indices
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_users_parent_id ON users(parent_id);
            CREATE INDEX IF NOT EXISTS idx_users_invitor_id ON users(invitor_id);
            CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
            CREATE INDEX IF NOT EXISTS idx_earnings_user_id ON earnings(user_id);
            CREATE INDEX IF NOT EXISTS idx_earnings_created_at ON earnings(created_at);
        `);
        
        // Backfill parent_id for existing users
        const needsBackfill = db.prepare('SELECT COUNT(*) as count FROM users WHERE parent_id IS NULL AND invitor_id IS NOT NULL').get();
        if (needsBackfill.count > 0) {
            console.log(`🔄 Backfilling parent_id for ${needsBackfill.count} users...`);
            db.exec('UPDATE users SET parent_id = invitor_id WHERE parent_id IS NULL AND invitor_id IS NOT NULL');
            console.log('✅ Backfill complete');
        }
        
        // Ensure root user exists (for NIC registration)
        const rootUser = db.prepare('SELECT id FROM users WHERE invitor_id IS NULL LIMIT 1').get();
        if (!rootUser) {
            console.log('🔄 Creating root user (Anatta999)...');
            const rootId = '25AAA0000';
            const rootInviteCode = 'ANATTA999ROOT';
            db.prepare(`
                INSERT INTO users (id, username, email, full_name, invite_code, created_at, last_login)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
                rootId,
                'Anatta999',
                'root@fingrow.app',
                'Anatta Boonnuam',
                rootInviteCode,
                new Date().toISOString(),
                new Date().toISOString()
            );
            console.log(`✅ Root user created: ${rootId}`);
        }
        
    } catch (migrationError) {
        console.error('⚠️  Migration warning:', migrationError.message);
    }
};

export const getDatabase = () => {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
};

export default { initDatabase, getDatabase };