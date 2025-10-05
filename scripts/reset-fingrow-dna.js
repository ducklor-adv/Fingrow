import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'data', 'fingrow.db');
const db = new Database(dbPath);

console.log('🔄 Resetting fingrow_dna table...');

try {
    // Check current data
    console.log('\n📊 Current fingrow_dna data:');
    const current = db.prepare('SELECT * FROM fingrow_dna ORDER BY id').all();
    console.table(current);

    // Delete all records except 25AAA0000 and 25AAA0001
    const deleteStmt = db.prepare(`
        DELETE FROM fingrow_dna
        WHERE user_id NOT IN ('25AAA0000', '25AAA0001')
    `);
    const deleteResult = deleteStmt.run();
    console.log(`\n✓ Deleted ${deleteResult.changes} records`);

    // Update 25AAA0000 to id=1, run_number=1
    const update1 = db.prepare(`
        UPDATE fingrow_dna
        SET id = 1, run_number = 1
        WHERE user_id = '25AAA0000'
    `);
    update1.run();
    console.log('✓ Updated 25AAA0000: id=1, run_number=1');

    // Update 25AAA0001 to id=2, run_number=2
    const update2 = db.prepare(`
        UPDATE fingrow_dna
        SET id = 2, run_number = 2
        WHERE user_id = '25AAA0001'
    `);
    update2.run();
    console.log('✓ Updated 25AAA0001: id=2, run_number=2');

    // Show final result
    console.log('\n📊 Final fingrow_dna data:');
    const final = db.prepare('SELECT * FROM fingrow_dna ORDER BY id').all();
    console.table(final);

    console.log('\n✅ fingrow_dna table reset complete!');

} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
} finally {
    db.close();
}
