import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'data', 'fingrow.db');
const db = new Database(dbPath);

try {
    console.log('Adding shipping_address column to users table...');

    // Check if column already exists
    const columns = db.prepare("PRAGMA table_info(users)").all();
    const hasShippingAddress = columns.some(col => col.name === 'shipping_address');

    if (hasShippingAddress) {
        console.log('✅ shipping_address column already exists');
    } else {
        db.exec(`
            ALTER TABLE users ADD COLUMN shipping_address TEXT;
        `);
        console.log('✅ shipping_address column added successfully');
    }

    db.close();
} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}
