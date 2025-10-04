import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '..', 'data', 'fingrow.db');

const db = new Database(dbPath);

console.log('Creating payment_methods table...');

// Drop existing table if exists
db.exec(`DROP TABLE IF EXISTS payment_methods;`);
console.log('✓ Dropped old payment_methods table');

// Create payment_methods table
db.exec(`
    CREATE TABLE payment_methods (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('bank', 'crypto', 'promptpay', 'other')),
        account_name TEXT NOT NULL,
        account_number TEXT,
        bank_name TEXT,
        wallet_address TEXT,
        network TEXT,
        qr_code_path TEXT,
        is_default INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
`);

console.log('✓ payment_methods table created');

// Create indexes
db.exec(`
    CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
    CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON payment_methods(user_id, is_default);
`);

console.log('✓ Indexes created');

// Create default payment method for Anatta999
const paymentId = 'PM-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
db.prepare(`
    INSERT INTO payment_methods (id, user_id, type, account_name, bank_name, account_number, is_default, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1, 1)
`).run(paymentId, '25AAA0000', 'bank', 'Anatta Boonnuam', 'ธนาคารกสิกรไทย', '1234567890');

console.log('✓ Default payment method created for Anatta999');

db.close();
console.log('\n✅ Payment methods table setup complete!');
