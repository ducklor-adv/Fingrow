import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'data', 'fingrow.db');
const db = new Database(dbPath);

console.log('🔄 Fixing total_invite counts...');

try {
    // Get all users
    const users = db.prepare('SELECT id FROM users').all();

    console.log('\n📊 Calculating actual invites...');
    for (const user of users) {
        // Count how many users have this user as invitor_id
        const inviteCount = db.prepare(`
            SELECT COUNT(*) as count
            FROM users
            WHERE invitor_id = ?
        `).get(user.id);

        // Update total_invites
        db.prepare(`
            UPDATE users
            SET total_invites = ?
            WHERE id = ?
        `).run(inviteCount.count, user.id);

        console.log(`✓ ${user.id}: total_invites = ${inviteCount.count}`);
    }

    // Show final results
    console.log('\n📊 Final users data with invite counts:');
    const finalUsers = db.prepare(`
        SELECT id, username, full_name, invitor_id, parent_id, total_invites
        FROM users
        ORDER BY id
    `).all();
    console.table(finalUsers);

    console.log('\n✅ total_invites counts fixed!');

} catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
} finally {
    db.close();
}
