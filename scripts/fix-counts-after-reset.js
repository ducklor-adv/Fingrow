import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'data', 'fingrow.db');
const db = new Database(dbPath);

console.log('🔄 Fixing counts after reset...');

try {
    // Get all users to check actual relationships
    const users = db.prepare('SELECT id, invitor_id, parent_id FROM users').all();
    const dnaRecords = db.prepare('SELECT user_id FROM fingrow_dna').all();
    const validUserIds = dnaRecords.map(d => d.user_id);

    console.log('\n📊 Valid users in fingrow_dna:', validUserIds);
    console.log('\n📊 All users in database:', users.length);

    // Calculate actual counts for each user
    const userCounts = {};

    validUserIds.forEach(userId => {
        // Count direct invites (users who have this user as invitor_id)
        const directInvites = users.filter(u =>
            u.invitor_id === userId && validUserIds.includes(u.id)
        ).length;

        // Count children (users who have this user as parent_id)
        const childCount = users.filter(u =>
            u.parent_id === userId && validUserIds.includes(u.id)
        ).length;

        // Count network size (all descendants)
        const getNetworkSize = (parentId) => {
            const children = users.filter(u =>
                u.parent_id === parentId && validUserIds.includes(u.id)
            );
            let size = children.length;
            children.forEach(child => {
                size += getNetworkSize(child.id);
            });
            return size;
        };
        const networkSize = getNetworkSize(userId);

        userCounts[userId] = {
            directInvites,
            childCount,
            networkSize
        };
    });

    console.log('\n📊 Calculated counts:');
    console.table(userCounts);

    // Update fingrow_dna table
    console.log('\n🔄 Updating fingrow_dna table...');
    for (const [userId, counts] of Object.entries(userCounts)) {
        const updateDna = db.prepare(`
            UPDATE fingrow_dna
            SET follower_count = ?,
                child_count = ?
            WHERE user_id = ?
        `);
        updateDna.run(counts.childCount, counts.childCount, userId);
        console.log(`✓ Updated ${userId}: follower_count=${counts.childCount}, child_count=${counts.childCount}`);
    }

    // Show final results
    console.log('\n📊 Final fingrow_dna data:');
    const finalDna = db.prepare(`
        SELECT
            user_id,
            follower_count as 'Child Count',
            child_count as 'Follower Count',
            level,
            follower_full_status as 'Status'
        FROM fingrow_dna
        ORDER BY id
    `).all();
    console.table(finalDna);

    console.log('\n📊 Verification - Count direct invites from users table:');
    for (const userId of validUserIds) {
        const directInvites = users.filter(u => u.invitor_id === userId && validUserIds.includes(u.id)).length;
        const children = users.filter(u => u.parent_id === userId && validUserIds.includes(u.id)).length;
        console.log(`  ${userId}: Direct Invites=${directInvites}, Children=${children}`);
    }

    console.log('\n✅ Counts fixed successfully!');

} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
} finally {
    db.close();
}
