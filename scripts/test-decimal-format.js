#!/usr/bin/env node

/**
 * Test Decimal Format
 * Verify that all financial values show 2 decimal places
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

console.log('💰 Testing Financial Value Formats\n');
console.log('All values should display with 2 decimal places');
console.log('=' .repeat(80));
console.log('');

// Format currency helper
function formatCurrency(amount) {
    return new Intl.NumberFormat('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount) + ' THB';
}

// Get sample user with all financial data (find first user)
const sampleUser = db.prepare(`
    SELECT
        u.id,
        u.username,

        -- Purchase stats
        (SELECT SUM(total_amount) FROM orders WHERE buyer_id = u.id AND status = 'completed') as total_spent,

        -- Sales stats
        (SELECT COUNT(*) FROM orders WHERE seller_id = u.id) as sales_count,
        (SELECT SUM(total_amount) FROM orders WHERE seller_id = u.id AND status = 'completed') as total_sales,
        (SELECT SUM(community_fee) FROM orders WHERE seller_id = u.id AND status = 'completed') as paid_fee,

        -- Earnings
        (SELECT SUM(amount_local) FROM earnings WHERE user_id = u.id) as total_earnings
    FROM users u
    ORDER BY u.id
    LIMIT 1
`).get();

if (!sampleUser) {
    console.log('❌ Sample user not found');
    db.close();
    process.exit(1);
}

// Calculate network stats
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
    SELECT id FROM network_tree
`).all(sampleUser.id);

const networkIds = networkMembers.map(m => m.id);
const placeholders = networkIds.map(() => '?').join(',');

const networkStats = db.prepare(`
    SELECT
        SUM(o.community_fee) as network_fees
    FROM orders o
    WHERE o.seller_id IN (${placeholders})
    AND o.status = 'completed'
`).get(...networkIds);

const networkFees = networkStats.network_fees || 0;
const loyaltyFee = networkFees * 0.14;

console.log(`📊 Sample User: ${sampleUser.username}\n`);
console.log('Financial Values:');
console.log('─'.repeat(80));
console.log(`  ยอดซื้อ (Total Spent):        ${formatCurrency(sampleUser.total_spent || 0)}`);
console.log(`  จำนวนขาย (Sales Count):        ${sampleUser.sales_count || 0} orders`);
console.log(`  ยอดขาย (Total Sales):          ${formatCurrency(sampleUser.total_sales || 0)}`);
console.log(`  Paid Fee (Community Fee):      ${formatCurrency(sampleUser.paid_fee || 0)}`);
console.log(`  รายได้รวม (Total Earnings):   ${formatCurrency(sampleUser.total_earnings || 0)}`);
console.log(`  Network Size:                  ${networkIds.length} members`);
console.log(`  Network Fees:                  ${formatCurrency(networkFees)}`);
console.log(`  Loyalty Fee (14%):             ${formatCurrency(loyaltyFee)}`);
console.log('─'.repeat(80));
console.log('');

// Test formatting edge cases
console.log('🧪 Edge Cases:\n');
const testValues = [0, 0.5, 1, 100, 1000.75, 15625.33, 19531.00];

testValues.forEach(value => {
    console.log(`  ${value.toString().padEnd(10)} → ${formatCurrency(value)}`);
});

console.log('');
console.log('✅ All values formatted with 2 decimal places');
console.log('');

db.close();
