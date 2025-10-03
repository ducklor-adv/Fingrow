/**
 * Quick check script to verify DNA data
 */

import pkg from 'sqlite3';
const { Database } = pkg.verbose();
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', 'data', 'fingrow.db');

const db = new Database(DB_PATH);

console.log('🔍 Checking fingrow_dna data...\n');

// Count records
db.get('SELECT COUNT(*) as count FROM fingrow_dna', (err, row) => {
    if (err) {
        console.error('Error:', err);
        return;
    }
    console.log(`📊 Total DNA records: ${row.count}\n`);
});

// Show all records
db.all(`
    SELECT
        user_id,
        user_type,
        level,
        parent_id,
        invitor,
        follower_count,
        follower_full_status,
        child_count
    FROM fingrow_dna
    ORDER BY run_number
`, (err, rows) => {
    if (err) {
        console.error('Error:', err);
        db.close();
        return;
    }

    console.log('🌳 Complete Network Structure:\n');
    console.table(rows);

    // Count by level
    db.all(`
        SELECT level, COUNT(*) as count
        FROM fingrow_dna
        GROUP BY level
        ORDER BY level
    `, (err, levelCounts) => {
        if (!err) {
            console.log('\n📊 Users by Level:');
            console.table(levelCounts);
        }

        // Count by status
        db.all(`
            SELECT follower_full_status, COUNT(*) as count
            FROM fingrow_dna
            GROUP BY follower_full_status
        `, (err, statusCounts) => {
            if (!err) {
                console.log('\n📊 Users by Status:');
                console.table(statusCounts);
            }

            // Check users table
            db.all(`
                SELECT id, username, invite_code, invitor_id, parent_id
                FROM users
                WHERE id LIKE 'UID-%' OR id = 'Anatta999'
                ORDER BY created_at
                LIMIT 10
            `, (err, users) => {
                if (!err) {
                    console.log('\n👥 Sample Users:');
                    console.table(users);
                }

                db.close();
                console.log('\n✅ Check completed!');
            });
        });
    });
});
