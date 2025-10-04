#!/usr/bin/env node

/**
 * Test Anatta Root Network
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

function formatCurrency(amount) {
    return new Intl.NumberFormat('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount) + ' THB';
}

// Find Anatta Root
const anattaRoot = db.prepare(`
    SELECT * FROM users WHERE parent_id IS NULL ORDER BY id LIMIT 1
`).get();

console.log(`🌳 Testing Anatta Root: ${anattaRoot.username}\n`);

// Calculate network
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
    SELECT id, depth FROM network_tree
`).all(anattaRoot.id);

const networkIds = networkMembers.map(m => m.id);
const placeholders = networkIds.map(() => '?').join(',');

const networkStats = db.prepare(`
    SELECT
        COUNT(o.id) as total_orders,
        SUM(o.total_amount) as total_sales,
        SUM(o.community_fee) as total_fees
    FROM orders o
    WHERE o.seller_id IN (${placeholders})
    AND o.status = 'completed'
`).get(...networkIds);

const networkBreakdown = db.prepare(`
    SELECT
        u.id,
        u.username,
        u.full_name,
        COUNT(o.id) as order_count,
        SUM(o.total_amount) as total_sales,
        SUM(o.community_fee) as total_fees
    FROM users u
    LEFT JOIN orders o ON o.seller_id = u.id AND o.status = 'completed'
    WHERE u.id IN (${placeholders})
    GROUP BY u.id, u.username, u.full_name
    HAVING total_fees > 0
    ORDER BY total_fees DESC
`).all(...networkIds);

const networkFees = networkStats.total_fees || 0;
const loyaltyFee = networkFees * 0.14;

console.log('📊 Network Statistics:');
console.log('─'.repeat(80));
console.log(`  Network Size:      ${networkIds.length} members`);
console.log(`  Total Orders:      ${networkStats.total_orders || 0}`);
console.log(`  Total Sales:       ${formatCurrency(networkStats.total_sales || 0)}`);
console.log(`  Network Fees:      ${formatCurrency(networkFees)}`);
console.log(`  Loyalty Fee (14%): ${formatCurrency(loyaltyFee)}`);
console.log('─'.repeat(80));
console.log('');

console.log(`📋 Network Breakdown (${networkBreakdown.length} active sellers):\n`);
console.log('  Username            Orders    Sales           Fees');
console.log('  ' + '─'.repeat(76));

networkBreakdown.slice(0, 10).forEach(member => {
    const name = (member.username || 'Unknown').padEnd(18);
    const orders = String(member.order_count || 0).padStart(6);
    const sales = formatCurrency(member.total_sales || 0).padStart(15);
    const fees = formatCurrency(member.total_fees || 0).padStart(12);
    console.log(`  ${name} ${orders}    ${sales}   ${fees}`);
});

if (networkBreakdown.length > 10) {
    console.log(`  ... and ${networkBreakdown.length - 10} more members`);
}

console.log('');
console.log('✅ All values display with 2 decimal places');
console.log('');

db.close();
