/**
 * Seed Fingrow DNA and Users from CSV data
 * This script reads the CSV file and populates both users and fingrow_dna tables
 */

import pkg from 'sqlite3';
const { Database } = pkg.verbose();
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'data', 'fingrow.db');
const CSV_PATH = path.join(__dirname, '..', 'ตารางจำลองการสมัคร - Sheet2.csv');

// Connect to database
const db = new Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database:', err);
        process.exit(1);
    }
    console.log('✅ Connected to database');
});

// Parse CSV line
function parseCSVLine(line) {
    const parts = line.split(',');
    return {
        runNumber: parts[1] === 'Anatta' ? 0 : parseInt(parts[1]) || null,
        userId: parts[2],
        userType: parts[3],
        registTime: parts[4],
        registType: parts[5],
        invitor: parts[6] === '-' ? null : parts[6],
        maxFollower: parseInt(parts[7]) || 5,
        followerCount: parseInt(parts[8]) || 0,
        followerFullStatus: parts[9],
        maxLevelRoyalty: parseInt(parts[10]) || 19530,
        childCount: parseInt(parts[11]) || 0,
        parentId: parts[12] === '-' ? null : parts[12],
        ownFinpoint: parseFloat(parts[13]) || 0,
        totalFinpoint: parseFloat(parts[14]) || 0,
        level: parseInt(parts[15]) || 0
    };
}

// Generate username from userId
function generateUsername(userId, userType, runNumber) {
    // Anatta999 is the root user
    if (userId === 'Anatta999') return 'Anatta Root';
    if (userType === 'Anatta') return 'Anatta Root';
    if (userId.startsWith('UID-')) {
        const num = parseInt(userId.replace('UID-', ''));
        return `User${num}`;
    }
    return userId;
}

// Generate invite code
function generateInviteCode(username) {
    const cleaned = username.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return cleaned + random;
}

// Create tables if they don't exist
function createTables() {
    return new Promise((resolve, reject) => {
        console.log('📝 Creating tables...');

        db.serialize(() => {
            // Add parent_id to users if not exists
            db.run(`
                ALTER TABLE users ADD COLUMN parent_id TEXT;
            `, (err) => {
                if (err && !err.message.includes('duplicate column')) {
                    console.error('⚠️  Warning adding parent_id:', err.message);
                } else {
                    console.log('✅ Added parent_id to users table');
                }
            });

            // Create fingrow_dna table
            db.run(`
                CREATE TABLE IF NOT EXISTS fingrow_dna (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    run_number INTEGER UNIQUE,
                    user_id TEXT UNIQUE NOT NULL,
                    user_type TEXT NOT NULL DEFAULT 'Atta',
                    regist_time TEXT NOT NULL,
                    regist_type TEXT NOT NULL,
                    invitor TEXT,
                    max_follower INTEGER NOT NULL DEFAULT 5,
                    follower_count INTEGER NOT NULL DEFAULT 0,
                    follower_full_status TEXT NOT NULL DEFAULT 'Open',
                    max_level_royalty INTEGER NOT NULL DEFAULT 19530,
                    child_count INTEGER NOT NULL DEFAULT 0,
                    parent_id TEXT,
                    own_finpoint REAL NOT NULL DEFAULT 0,
                    total_finpoint REAL NOT NULL DEFAULT 0,
                    level INTEGER NOT NULL DEFAULT 0,
                    js_file_path TEXT,
                    parent_file TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) {
                    console.error('❌ Error creating fingrow_dna:', err);
                    reject(err);
                } else {
                    console.log('✅ fingrow_dna table ready');
                    resolve();
                }
            });
        });
    });
}

// Clear existing data
function clearData() {
    return new Promise((resolve, reject) => {
        console.log('🗑️  Clearing existing data...');
        db.serialize(() => {
            db.run('DELETE FROM fingrow_dna', (err) => {
                if (err) console.error('⚠️  Warning clearing DNA:', err);
            });
            db.run('DELETE FROM users WHERE id LIKE "UID-%" OR id = "Anatta999"', (err) => {
                if (err) console.error('⚠️  Warning clearing users:', err);
                else console.log('✅ Data cleared');
                resolve();
            });
        });
    });
}

// Insert user
function insertUser(data) {
    const username = generateUsername(data.userId, data.userType, data.runNumber);
    const inviteCode = generateInviteCode(username);
    const email = `${data.userId.toLowerCase()}@fingrow.test`;

    return new Promise((resolve, reject) => {
        db.run(`
            INSERT OR REPLACE INTO users (
                id, username, email, password_hash, full_name,
                invite_code, invitor_id, parent_id,
                is_verified, is_active, trust_score,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 5.0, ?, ?)
        `, [
            data.userId,
            username,
            email,
            '$2b$10$dummyhashforseeding', // dummy hash
            username,
            inviteCode,
            data.invitor,
            data.parentId,
            data.registTime,
            data.registTime
        ], (err) => {
            if (err) {
                console.error(`❌ Error inserting user ${data.userId}:`, err);
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

// Insert DNA record
function insertDNA(data) {
    const jsFilePath = `/net/${data.userId}.js`;
    const parentFile = data.parentId ? `/net/${data.parentId}.js` : null;

    return new Promise((resolve, reject) => {
        db.run(`
            INSERT OR REPLACE INTO fingrow_dna (
                run_number, user_id, user_type, regist_time, regist_type,
                invitor, max_follower, follower_count, follower_full_status,
                max_level_royalty, child_count, parent_id,
                own_finpoint, total_finpoint, level,
                js_file_path, parent_file
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            data.runNumber,
            data.userId,
            data.userType,
            data.registTime,
            data.registType,
            data.invitor,
            data.maxFollower,
            data.followerCount,
            data.followerFullStatus,
            data.maxLevelRoyalty,
            data.childCount,
            data.parentId,
            data.ownFinpoint,
            data.totalFinpoint,
            data.level,
            jsFilePath,
            parentFile
        ], (err) => {
            if (err) {
                console.error(`❌ Error inserting DNA ${data.userId}:`, err);
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

// Main execution
async function main() {
    try {
        console.log('🚀 Starting DNA seeding process...\n');

        // Create tables
        await createTables();

        // Clear existing data
        await clearData();

        // Read CSV file
        console.log('\n📖 Reading CSV file...');
        const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
        const lines = csvContent.split('\n').filter(line => line.trim());

        // Skip header
        const dataLines = lines.slice(1);
        console.log(`✅ Found ${dataLines.length} records\n`);

        // Process each line
        console.log('💾 Inserting data...');
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < dataLines.length; i++) {
            const line = dataLines[i];
            if (!line.trim()) continue;

            try {
                const data = parseCSVLine(line);

                // Insert user first
                await insertUser(data);

                // Then insert DNA
                await insertDNA(data);

                successCount++;
                process.stdout.write(`\r✅ Processed: ${successCount}/${dataLines.length}`);
            } catch (err) {
                errorCount++;
                console.error(`\n❌ Error processing line ${i + 1}:`, err.message);
            }
        }

        console.log('\n\n📊 Summary:');
        console.log(`   ✅ Success: ${successCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);

        // Show stats
        db.get('SELECT COUNT(*) as count FROM users WHERE id LIKE "UID-%" OR id = "Anatta999"', (err, row) => {
            if (!err) console.log(`   👥 Total users: ${row.count}`);
        });

        db.get('SELECT COUNT(*) as count FROM fingrow_dna', (err, row) => {
            if (!err) console.log(`   🧬 Total DNA records: ${row.count}`);
        });

        // Show network structure
        setTimeout(() => {
            console.log('\n🌳 Network Structure:');
            db.all(`
                SELECT
                    user_id,
                    user_type,
                    level,
                    parent_id,
                    invitor,
                    follower_count,
                    follower_full_status
                FROM fingrow_dna
                ORDER BY run_number
                LIMIT 10
            `, (err, rows) => {
                if (!err && rows) {
                    console.table(rows);
                }

                console.log('\n✅ Seeding completed!');
                db.close();
            });
        }, 500);

    } catch (err) {
        console.error('❌ Fatal error:', err);
        db.close();
        process.exit(1);
    }
}

main();
