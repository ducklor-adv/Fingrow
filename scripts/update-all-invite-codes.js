import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('========================================');
console.log('🔄 UPDATE ALL INVITE CODES TO USER IDs');
console.log('========================================\n');

try {
    // Connect to database
    const dbPath = path.join(__dirname, '../data/fingrow.db');
    const db = new Database(dbPath);

    console.log('📁 Connected to database:', dbPath);

    // Get all users
    const users = db.prepare('SELECT id, username, invite_code FROM users').all();

    console.log(`\n📊 Found ${users.length} users\n`);

    if (users.length === 0) {
        console.log('⚠️  No users found in database');
        db.close();
        process.exit(0);
    }

    // Update each user's invite_code to their user_id
    let updatedCount = 0;
    let skippedCount = 0;

    console.log('🔄 Updating invite codes...\n');

    for (const user of users) {
        if (user.invite_code === user.id) {
            console.log(`⏭️  Skipped: ${user.id} (${user.username}) - already correct`);
            skippedCount++;
        } else {
            const oldCode = user.invite_code;
            db.prepare('UPDATE users SET invite_code = id WHERE id = ?').run(user.id);
            console.log(`✅ Updated: ${user.id} (${user.username})`);
            console.log(`   Old: ${oldCode} → New: ${user.id}`);
            updatedCount++;
        }
    }

    console.log('\n========================================');
    console.log('📊 SUMMARY:');
    console.log(`   Total users: ${users.length}`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log('========================================');

    // Show sample of updated users
    console.log('\n📋 Sample of updated users:');
    const sampleUsers = db.prepare('SELECT id, username, invite_code FROM users LIMIT 10').all();
    sampleUsers.forEach(user => {
        console.log(`   ${user.id} | ${user.username.padEnd(20)} | ${user.invite_code}`);
    });

    console.log('\n✅ UPDATE COMPLETED!\n');

    db.close();

} catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
}
