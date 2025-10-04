#!/usr/bin/env node

/**
 * Debug Network Structure
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

console.log('🔍 Debug Network Structure\n');

// Find root users (no parent_id)
const rootUsers = db.prepare(`
    SELECT id, username, parent_id, invitor_id FROM users WHERE parent_id IS NULL
`).all();

console.log(`📌 Root Users (parent_id IS NULL): ${rootUsers.length} users\n`);
rootUsers.forEach(user => {
    console.log(`  - ${user.username} (${user.id}), invitor: ${user.invitor_id || 'none'}`);
});

console.log('\n' + '─'.repeat(80) + '\n');

// Check each root user's network
rootUsers.forEach(root => {
    const network = db.prepare(`
        WITH RECURSIVE network_tree AS (
            SELECT id, username, parent_id, 0 as depth
            FROM users
            WHERE id = ?

            UNION ALL

            SELECT u.id, u.username, u.parent_id, nt.depth + 1 as depth
            FROM users u
            INNER JOIN network_tree nt ON u.parent_id = nt.id
            WHERE nt.depth < 7
        )
        SELECT * FROM network_tree ORDER BY depth, id
    `).all(root.id);

    console.log(`🌳 ${root.username} Network: ${network.length} members\n`);

    const byDepth = {};
    network.forEach(member => {
        if (!byDepth[member.depth]) byDepth[member.depth] = [];
        byDepth[member.depth].push(member);
    });

    Object.keys(byDepth).sort().forEach(depth => {
        console.log(`  Level ${depth}: ${byDepth[depth].length} members`);
        if (depth <= 2) {
            byDepth[depth].forEach(member => {
                console.log(`    - ${member.username} (${member.id}), parent: ${member.parent_id || 'ROOT'}`);
            });
        }
    });

    console.log('');
});

// Sample parent-child relationships
console.log('─'.repeat(80));
console.log('\n📊 Sample Parent-Child Relationships:\n');

const relationships = db.prepare(`
    SELECT
        p.username as parent_username,
        p.id as parent_id,
        COUNT(c.id) as children_count
    FROM users p
    LEFT JOIN users c ON c.parent_id = p.id
    GROUP BY p.id, p.username
    HAVING children_count > 0
    ORDER BY children_count DESC
    LIMIT 10
`).all();

relationships.forEach(rel => {
    console.log(`  ${rel.parent_username}: ${rel.children_count} children`);
});

db.close();
