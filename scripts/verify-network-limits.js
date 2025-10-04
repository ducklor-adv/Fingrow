#!/usr/bin/env node

/**
 * Verify Network Limits Script
 *
 * Checks that the network structure follows these rules:
 * - Maximum 5 children per node
 * - Maximum 7 levels depth (including self as level 0)
 * - Maximum network size: 19,531 members (1+5+25+125+625+3,125+15,625)
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);
const dbPath = join(projectRoot, 'data', 'fingrow.db');

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

console.log('🔍 Verifying Network Structure Limits\n');
console.log('Rules:');
console.log('  ✓ Max 5 children per node');
console.log('  ✓ Max 7 levels depth (0-6)');
console.log('  ✓ Max network size: 19,531 members');
console.log('  ✓ Formula: 1 + 5 + 25 + 125 + 625 + 3,125 + 15,625 = 19,531');
console.log('=' .repeat(80));
console.log('');

// Check 1: Verify each user has max 5 children
console.log('📊 Check 1: Children Count per User\n');

const childrenCount = db.prepare(`
    SELECT
        u.id,
        u.username,
        COUNT(c.id) as children_count
    FROM users u
    LEFT JOIN users c ON c.parent_id = u.id
    GROUP BY u.id, u.username
    HAVING children_count > 0
    ORDER BY children_count DESC
`).all();

let maxChildrenViolations = 0;
childrenCount.forEach(user => {
    const status = user.children_count <= 5 ? '✅' : '❌';
    if (user.children_count > 5) {
        maxChildrenViolations++;
        console.log(`${status} ${user.username}: ${user.children_count} children (VIOLATION! Max is 5)`);
    }
});

if (maxChildrenViolations === 0) {
    console.log('✅ All users have 5 or fewer children\n');
} else {
    console.log(`\n❌ Found ${maxChildrenViolations} users with more than 5 children!\n`);
}

// Check 2: Verify network depth for each user
console.log('📊 Check 2: Network Depth Analysis\n');

const users = db.prepare('SELECT id, username FROM users ORDER BY id').all();
let depthViolations = 0;
let maxDepthFound = 0;

users.forEach(user => {
    // Get network depth using recursive CTE
    const depthQuery = db.prepare(`
        WITH RECURSIVE network_tree AS (
            SELECT id, 0 as depth
            FROM users
            WHERE id = ?

            UNION ALL

            SELECT u.id, nt.depth + 1 as depth
            FROM users u
            INNER JOIN network_tree nt ON u.parent_id = nt.id
        )
        SELECT MAX(depth) as max_depth FROM network_tree
    `).get(user.id);

    const maxDepth = depthQuery.max_depth;
    maxDepthFound = Math.max(maxDepthFound, maxDepth);

    if (maxDepth > 6) {
        depthViolations++;
        console.log(`❌ ${user.username}: Network depth ${maxDepth} (VIOLATION! Max is 6, i.e., 7 levels including self)`);
    }
});

if (depthViolations === 0) {
    console.log(`✅ All networks have depth ≤ 6 (Max depth found: ${maxDepthFound})\n`);
} else {
    console.log(`\n❌ Found ${depthViolations} users with network depth > 6!\n`);
}

// Check 3: Verify network size for each user
console.log('📊 Check 3: Network Size Analysis\n');

let sizeViolations = 0;
let maxSizeFound = 0;
const maxAllowedSize = 19531;

const usersWithNetworkSize = users.map(user => {
    // Calculate network size
    const networkMembers = db.prepare(`
        WITH RECURSIVE network_tree AS (
            SELECT id, 0 as depth
            FROM users
            WHERE id = ?

            UNION ALL

            SELECT u.id, nt.depth + 1 as depth
            FROM users u
            INNER JOIN network_tree nt ON u.parent_id = nt.id
            WHERE nt.depth < 7
        )
        SELECT COUNT(*) as size FROM network_tree
    `).get(user.id);

    const networkSize = networkMembers.size;
    maxSizeFound = Math.max(maxSizeFound, networkSize);

    if (networkSize > maxAllowedSize) {
        sizeViolations++;
        console.log(`❌ ${user.username}: Network size ${networkSize.toLocaleString()} (VIOLATION! Max is ${maxAllowedSize.toLocaleString()})`);
    }

    return {
        ...user,
        networkSize
    };
});

if (sizeViolations === 0) {
    console.log(`✅ All networks have size ≤ ${maxAllowedSize.toLocaleString()} (Max size found: ${maxSizeFound.toLocaleString()})\n`);
} else {
    console.log(`\n❌ Found ${sizeViolations} users with network size > ${maxAllowedSize.toLocaleString()}!\n`);
}

// Summary
console.log('=' .repeat(80));
console.log('\n📋 Summary:\n');

const topNetworks = usersWithNetworkSize
    .sort((a, b) => b.networkSize - a.networkSize)
    .slice(0, 10);

console.log('Top 10 Largest Networks:');
topNetworks.forEach((user, index) => {
    console.log(`  ${index + 1}. ${user.username}: ${user.networkSize.toLocaleString()} members`);
});

console.log('');
console.log('Validation Results:');
console.log(`  Children Limit (≤5):     ${maxChildrenViolations === 0 ? '✅ PASS' : `❌ FAIL (${maxChildrenViolations} violations)`}`);
console.log(`  Depth Limit (≤6):        ${depthViolations === 0 ? '✅ PASS' : `❌ FAIL (${depthViolations} violations)`}`);
console.log(`  Size Limit (≤19,531):    ${sizeViolations === 0 ? '✅ PASS' : `❌ FAIL (${sizeViolations} violations)`}`);

const allPassed = maxChildrenViolations === 0 && depthViolations === 0 && sizeViolations === 0;
console.log('');
console.log(allPassed ? '✅ ALL CHECKS PASSED!' : '❌ SOME CHECKS FAILED!');
console.log('');

db.close();
