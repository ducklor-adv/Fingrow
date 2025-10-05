import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('========================================');
console.log('🔄 UPDATE ANATTA999 INVITE CODE');
console.log('========================================\n');

try {
    // Connect to database
    const dbPath = path.join(__dirname, '../data/fingrow.db');
    const db = new Database(dbPath);

    console.log('📁 Connected to database:', dbPath);

    // Get Anatta999 user
    const anatta999 = db.prepare('SELECT id, username, invite_code FROM users WHERE username = ?').get('Anatta999');

    if (!anatta999) {
        console.error('\n❌ ERROR: Anatta999 user not found!');
        process.exit(1);
    }

    console.log('\n📋 Current Anatta999 info:');
    console.log(`   ID: ${anatta999.id}`);
    console.log(`   Username: ${anatta999.username}`);
    console.log(`   Old Invite Code: ${anatta999.invite_code}`);

    // Update invite code to be the same as user ID
    console.log('\n🔄 Updating invite code to User ID...');
    db.prepare('UPDATE users SET invite_code = id WHERE username = ?').run('Anatta999');

    // Get updated user
    const updatedUser = db.prepare('SELECT id, username, invite_code FROM users WHERE username = ?').get('Anatta999');

    console.log('\n✅ Updated Anatta999 info:');
    console.log(`   ID: ${updatedUser.id}`);
    console.log(`   Username: ${updatedUser.username}`);
    console.log(`   New Invite Code: ${updatedUser.invite_code}`);

    console.log('\n========================================');
    console.log('✅ UPDATE COMPLETED!');
    console.log('========================================\n');

    db.close();

} catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
}
