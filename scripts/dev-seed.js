/**
 * Development Seed Script for Fingrow V3
 * Creates test data for ACF network and earnings
 *
 * Usage: node scripts/dev-seed.js
 */

import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'data', 'fingrow.db');
const db = new Database(dbPath);

console.log('🌱 Fingrow V3 Development Seed Script');
console.log('=====================================\n');

// Configuration
const CONFIG = {
    CLEAR_EXISTING: true, // Set to false to keep existing data
    NUM_LEVELS: 3, // Max 7
    CHILDREN_PER_LEVEL: 5, // Max 5 (ACF constraint)
    EARNINGS_PER_USER: { min: 1, max: 5 },
    EARNING_AMOUNT: { min: 100, max: 5000 }
};

// Helper: Generate user ID
function generateUserId(sequence) {
    const year = '25';
    const letters = 'AAA';
    const numbers = sequence.toString().padStart(4, '0');
    return `${year}${letters}${numbers}`;
}

// Helper: Generate invite code
function generateInviteCode(username) {
    const clean = username.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const random = Math.random().toString(36).substr(2, 3).toUpperCase();
    return `${clean}${random}`;
}

// Helper: Random date in the past 90 days
function randomDate(daysAgo = 90) {
    const now = new Date();
    const past = new Date(now.getTime() - Math.random() * daysAgo * 24 * 60 * 60 * 1000);
    return past.toISOString();
}

// Helper: Random amount
function randomAmount(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Main seeding function
async function seed() {
    try {
        if (CONFIG.CLEAR_EXISTING) {
            console.log('🗑️  Clearing existing data...');
            db.exec('DELETE FROM earnings');
            db.exec('DELETE FROM users WHERE invitor_id IS NOT NULL'); // Keep root
            console.log('✅ Cleared existing data\n');
        }

        // Ensure root user exists
        let root = db.prepare('SELECT id FROM users WHERE invitor_id IS NULL LIMIT 1').get();
        if (!root) {
            console.log('🌳 Creating root user...');
            const rootId = '25AAA0000';
            const rootPassword = await bcrypt.hash('root123', 10);
            db.prepare(`
                INSERT INTO users (
                    id, username, email, full_name, password_hash,
                    invite_code, created_at, last_login, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
            `).run(
                rootId,
                'Anatta999',
                'root@fingrow.app',
                'Anatta Boonnuam',
                rootPassword,
                'ANATTA999ROOT',
                new Date().toISOString(),
                new Date().toISOString()
            );
            root = { id: rootId };
            console.log(`✅ Root user created: ${rootId}\n`);
        } else {
            console.log(`✅ Root user exists: ${root.id}\n`);
        }

        console.log(`📊 Seeding network: ${CONFIG.NUM_LEVELS} levels, ${CONFIG.CHILDREN_PER_LEVEL} children per node\n`);

        // Build network tree
        const allUsers = [root];
        let userSequence = 1;
        let queue = [{ id: root.id, level: 0 }];

        while (queue.length > 0) {
            const node = queue.shift();

            // Stop if we've reached max depth
            if (node.level >= CONFIG.NUM_LEVELS) continue;

            // Create children for this node
            for (let i = 0; i < CONFIG.CHILDREN_PER_LEVEL; i++) {
                const userId = generateUserId(userSequence++);
                const username = `user${userSequence - 1}`;
                const fullName = `Test User ${userSequence - 1}`;
                const email = `user${userSequence - 1}@test.com`;
                const password = await bcrypt.hash('test123', 10);
                const inviteCode = generateInviteCode(username);
                const createdAt = randomDate(60);

                db.prepare(`
                    INSERT INTO users (
                        id, username, email, full_name, password_hash,
                        invite_code, invitor_id, parent_id,
                        created_at, last_login, is_active
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                `).run(
                    userId,
                    username,
                    email,
                    fullName,
                    password,
                    inviteCode,
                    node.id, // invitor_id
                    node.id, // parent_id (same for seed data)
                    createdAt,
                    createdAt
                );

                allUsers.push({ id: userId, level: node.level + 1 });
                queue.push({ id: userId, level: node.level + 1 });

                console.log(`  Created: ${userId} (${username}) - Level ${node.level + 1}, Parent: ${node.id}`);
            }
        }

        console.log(`\n✅ Created ${allUsers.length} users\n`);

        // Generate random earnings
        console.log('💰 Generating earnings data...\n');

        const earningTypes = ['commission', 'sale', 'bonus', 'referral'];
        let totalEarnings = 0;
        let earningCount = 0;

        allUsers.forEach(user => {
            if (user.id === root.id) return; // Skip root user

            const numEarnings = randomAmount(
                CONFIG.EARNINGS_PER_USER.min,
                CONFIG.EARNINGS_PER_USER.max
            );

            for (let i = 0; i < numEarnings; i++) {
                const amount = randomAmount(
                    CONFIG.EARNING_AMOUNT.min,
                    CONFIG.EARNING_AMOUNT.max
                );
                const type = earningTypes[Math.floor(Math.random() * earningTypes.length)];
                const createdAt = randomDate(30);
                const earningId = `E${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

                db.prepare(`
                    INSERT INTO earnings (
                        id, user_id, type, amount, amount_local,
                        status, created_at
                    ) VALUES (?, ?, ?, ?, ?, 'pending', ?)
                `).run(
                    earningId,
                    user.id,
                    type,
                    amount,
                    amount, // amount_local same as amount for THB
                    createdAt
                );

                totalEarnings += amount;
                earningCount++;
            }
        });

        console.log(`✅ Generated ${earningCount} earnings records\n`);

        // Calculate and display summary
        console.log('📈 Summary Statistics');
        console.log('====================');

        const stats = {
            totalUsers: allUsers.length,
            totalEarnings: totalEarnings,
            avgEarningsPerUser: totalEarnings / allUsers.length,
            maxDepth: CONFIG.NUM_LEVELS,
            childrenPerNode: CONFIG.CHILDREN_PER_LEVEL
        };

        console.log(`Total Users: ${stats.totalUsers}`);
        console.log(`Total Earnings: ฿${stats.totalEarnings.toLocaleString('th-TH')}`);
        console.log(`Avg Earnings/User: ฿${Math.floor(stats.avgEarningsPerUser).toLocaleString('th-TH')}`);
        console.log(`Network Depth: ${stats.maxDepth} levels`);
        console.log(`Children per Node: ${stats.childrenPerNode}`);

        // Verify subtree calculations
        console.log('\n🔍 Verifying subtree calculations...');

        const rootSubtreeQuery = `
            WITH RECURSIVE subtree(level, id) AS (
                SELECT 0, ?
                UNION ALL
                SELECT s.level+1, u.id
                FROM users u JOIN subtree s ON u.parent_id = s.id
                WHERE s.level+1 <= 7
            )
            SELECT COUNT(*) as count FROM subtree
        `;

        const rootSubtreeCount = db.prepare(rootSubtreeQuery).get(root.id);
        console.log(`Root subtree members: ${rootSubtreeCount.count}`);

        const rootEarningsQuery = `
            WITH RECURSIVE subtree(level, id) AS (
                SELECT 0, ?
                UNION ALL
                SELECT s.level+1, u.id
                FROM users u JOIN subtree s ON u.parent_id = s.id
                WHERE s.level+1 <= 7
            )
            SELECT COALESCE(SUM(e.amount), 0) as total
            FROM subtree s
            LEFT JOIN earnings e ON e.user_id = s.id
        `;

        const rootEarningsTotal = db.prepare(rootEarningsQuery).get(root.id);
        console.log(`Root subtree earnings: ฿${rootEarningsTotal.total.toLocaleString('th-TH')}`);

        console.log('\n✅ Seed complete!\n');

        console.log('📝 Test Credentials:');
        console.log('  Root User: Anatta999 / root123');
        console.log('  Test Users: user1-user50 / test123');
        console.log(`  Root Invite Code: ANATTA999ROOT\n`);

        console.log('🚀 Next Steps:');
        console.log('  1. Start server: node server.js');
        console.log('  2. Open admin: http://localhost:5000/admin/');
        console.log('  3. Navigate to Network tab to view earnings\n');

    } catch (error) {
        console.error('❌ Error during seeding:', error);
        throw error;
    } finally {
        db.close();
    }
}

// Run seed
seed().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
