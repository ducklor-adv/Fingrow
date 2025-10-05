import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'data', 'fingrow.db');
const db = new Database(dbPath);

console.log('🔄 Final reset to only 2 users (25AAA0000 and 25AAA0001)...');

try {
    // 1. Delete all users except 25AAA0000 and 25AAA0001 from users table
    console.log('\n🗑️  Deleting users from users table...');
    const deleteUsers = db.prepare(`
        DELETE FROM users
        WHERE id NOT IN ('25AAA0000', '25AAA0001')
    `);
    const deletedUsers = deleteUsers.run();
    console.log(`✓ Deleted ${deletedUsers.changes} users from users table`);

    // 2. Delete from fingrow_dna table
    console.log('\n🗑️  Deleting from fingrow_dna table...');
    const deleteDna = db.prepare(`
        DELETE FROM fingrow_dna
        WHERE user_id NOT IN ('25AAA0000', '25AAA0001')
    `);
    const deletedDna = deleteDna.run();
    console.log(`✓ Deleted ${deletedDna.changes} records from fingrow_dna`);

    // 3. Update 25AAA0000 in fingrow_dna (Root, no children)
    console.log('\n🔄 Updating 25AAA0000...');
    db.prepare(`
        UPDATE fingrow_dna
        SET
            id = 1,
            run_number = 1,
            user_type = 'Root',
            follower_count = 1,
            child_count = 1,
            max_follower = 1,
            level = 0,
            follower_full_status = 'Open'
        WHERE user_id = '25AAA0000'
    `).run();
    console.log('✓ Updated 25AAA0000: id=1, run_number=1, follower_count=1, child_count=1');

    // 4. Update 25AAA0001 in fingrow_dna (child of 25AAA0000)
    console.log('\n🔄 Updating 25AAA0001...');
    db.prepare(`
        UPDATE fingrow_dna
        SET
            id = 2,
            run_number = 2,
            user_type = 'Atta',
            follower_count = 0,
            child_count = 0,
            max_follower = 5,
            level = 1,
            follower_full_status = 'Open',
            parent_id = '25AAA0000'
        WHERE user_id = '25AAA0001'
    `).run();
    console.log('✓ Updated 25AAA0001: id=2, run_number=2, follower_count=0, child_count=0, parent=25AAA0000');

    // 5. Update users table parent_id
    console.log('\n🔄 Updating users table relationships...');
    db.prepare(`
        UPDATE users
        SET parent_id = '25AAA0000'
        WHERE id = '25AAA0001'
    `).run();
    console.log('✓ Set 25AAA0001 parent_id to 25AAA0000');

    // Show final results
    console.log('\n📊 Final fingrow_dna data:');
    const finalDna = db.prepare(`
        SELECT
            id,
            run_number,
            user_id,
            user_type,
            follower_count,
            child_count,
            parent_id,
            level,
            max_follower,
            follower_full_status
        FROM fingrow_dna
        ORDER BY id
    `).all();
    console.table(finalDna);

    console.log('\n📊 Final users data:');
    const finalUsers = db.prepare(`
        SELECT id, username, full_name, invitor_id, parent_id
        FROM users
        ORDER BY id
    `).all();
    console.table(finalUsers);

    console.log('\n✅ Reset complete! Only 25AAA0000 (Anatta999) and 25AAA0001 (Ducklord) remain.');

} catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
} finally {
    db.close();
}
