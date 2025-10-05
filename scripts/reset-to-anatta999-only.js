import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('========================================');
console.log('🗑️  RESET DATABASE TO ANATTA999 ONLY');
console.log('========================================\n');

try {
    // Connect to database
    const dbPath = path.join(__dirname, '../data/fingrow.db');
    const db = new Database(dbPath);

    console.log('📁 Connected to database:', dbPath);
    console.log('\n🔍 Current data before deletion:');

    // Show current counts
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
    const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders').get();
    const notificationCount = db.prepare('SELECT COUNT(*) as count FROM notifications').get();
    const dnaCount = db.prepare('SELECT COUNT(*) as count FROM fingrow_dna').get();

    console.log(`   Users: ${userCount.count}`);
    console.log(`   Products: ${productCount.count}`);
    console.log(`   Orders: ${orderCount.count}`);
    console.log(`   Notifications: ${notificationCount.count}`);
    console.log(`   DNA Records: ${dnaCount.count}`);

    // Get Anatta999 user ID
    const anatta999 = db.prepare('SELECT id, username FROM users WHERE username = ?').get('Anatta999');

    if (!anatta999) {
        console.error('\n❌ ERROR: Anatta999 user not found!');
        console.log('Please make sure Anatta999 exists before running this script.');
        process.exit(1);
    }

    console.log(`\n✅ Found Anatta999: ${anatta999.id}`);
    console.log('\n🗑️  Starting deletion process...\n');

    // Disable foreign key constraints temporarily
    db.prepare('PRAGMA foreign_keys = OFF').run();

    // Begin transaction
    db.prepare('BEGIN TRANSACTION').run();

    try {
        // Step 1: Delete all notifications
        console.log('   Deleting notifications...');
        db.prepare('DELETE FROM notifications').run();

        // Step 2: Delete all reviews
        console.log('   Deleting reviews...');
        db.prepare('DELETE FROM reviews').run();

        // Step 3: Delete all order items
        console.log('   Deleting order items...');
        db.prepare('DELETE FROM order_items').run();

        // Step 4: Delete all orders
        console.log('   Deleting orders...');
        db.prepare('DELETE FROM orders').run();

        // Step 5: Delete all products
        console.log('   Deleting products...');
        db.prepare('DELETE FROM products').run();

        // Step 6: Delete all addresses except Anatta999's
        console.log('   Deleting addresses...');
        db.prepare('DELETE FROM addresses WHERE user_id != ?').run(anatta999.id);

        // Step 7: Delete all earnings
        console.log('   Deleting earnings...');
        db.prepare('DELETE FROM earnings').run();

        // Step 8: Delete fingrow_dna except Anatta999
        console.log('   Deleting DNA records...');
        db.prepare('DELETE FROM fingrow_dna WHERE user_id != ?').run(anatta999.id);

        // Step 9: Delete all users except Anatta999
        console.log('   Deleting users...');
        db.prepare('DELETE FROM users WHERE username != ?').run('Anatta999');

        // Step 10: Reset Anatta999 stats to zero
        console.log('   Resetting Anatta999 stats...');
        db.prepare(`
            UPDATE users
            SET total_invites = 0,
                active_invites = 0,
                total_sales = 0,
                total_purchases = 0
            WHERE username = ?
        `).run('Anatta999');

        // Step 11: Reset Anatta999 DNA stats to zero
        console.log('   Resetting Anatta999 DNA stats...');
        db.prepare(`
            UPDATE fingrow_dna
            SET child_count = 0,
                follower_count = 0,
                own_finpoint = 0,
                total_finpoint = 0
            WHERE user_id = ?
        `).run(anatta999.id);

        // Commit transaction
        db.prepare('COMMIT').run();

        // Re-enable foreign key constraints
        db.prepare('PRAGMA foreign_keys = ON').run();

        console.log('\n✅ Deletion completed successfully!\n');

        // Show results
        console.log('📊 Final counts:');
        const finalUserCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
        const finalProductCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
        const finalOrderCount = db.prepare('SELECT COUNT(*) as count FROM orders').get();
        const finalNotificationCount = db.prepare('SELECT COUNT(*) as count FROM notifications').get();
        const finalDnaCount = db.prepare('SELECT COUNT(*) as count FROM fingrow_dna').get();

        console.log(`   Users: ${finalUserCount.count}`);
        console.log(`   Products: ${finalProductCount.count}`);
        console.log(`   Orders: ${finalOrderCount.count}`);
        console.log(`   Notifications: ${finalNotificationCount.count}`);
        console.log(`   DNA Records: ${finalDnaCount.count}`);

        console.log('\n👤 Remaining user:');
        const remainingUser = db.prepare('SELECT id, username, full_name, invite_code, total_invites FROM users').get();
        console.log(`   ID: ${remainingUser.id}`);
        console.log(`   Username: ${remainingUser.username}`);
        console.log(`   Full Name: ${remainingUser.full_name}`);
        console.log(`   Invite Code: ${remainingUser.invite_code}`);
        console.log(`   Total Invites: ${remainingUser.total_invites}`);

        console.log('\n========================================');
        console.log('✅ DATABASE RESET COMPLETED!');
        console.log('========================================\n');

    } catch (error) {
        // Rollback on error
        db.prepare('ROLLBACK').run();
        throw error;
    }

    db.close();

} catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
}
