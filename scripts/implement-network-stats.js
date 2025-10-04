import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'data', 'fingrow.db');
const db = new Database(dbPath);

console.log('🔥 Implementing Network Statistics Calculator\n');
console.log('='.repeat(80));

/**
 * Calculate network statistics for a user
 * Returns: { networkSize, networkFees, networkSales, networkOrders }
 */
function calculateNetworkStats(userId) {
    // Step 1: Get all network member IDs using recursive CTE
    const networkMembers = db.prepare(`
        WITH RECURSIVE network_tree AS (
            -- Base: the user itself
            SELECT id, 0 as depth
            FROM users
            WHERE id = ?

            UNION ALL

            -- Recursive: get all children
            SELECT u.id, nt.depth + 1 as depth
            FROM users u
            INNER JOIN network_tree nt ON u.parent_id = nt.id
            WHERE nt.depth < 7  -- Max 7 levels
        )
        SELECT id, depth FROM network_tree
        ORDER BY depth
    `).all(userId);

    const networkIds = networkMembers.map(m => m.id);
    const networkSize = networkIds.length;

    if (networkIds.length === 0) {
        return {
            networkSize: 0,
            networkFees: 0,
            networkSales: 0,
            networkOrders: 0,
            members: []
        };
    }

    // Step 2: Calculate total fees and sales from network
    const placeholders = networkIds.map(() => '?').join(',');
    const networkStats = db.prepare(`
        SELECT
            COUNT(DISTINCT o.seller_id) as sellers_count,
            COUNT(o.id) as total_orders,
            SUM(o.total_amount) as total_sales,
            SUM(o.community_fee) as total_fees
        FROM orders o
        WHERE o.seller_id IN (${placeholders})
        AND o.status = 'completed'
    `).get(...networkIds);

    return {
        networkSize: networkSize,
        networkFees: networkStats.total_fees || 0,
        networkSales: networkStats.total_sales || 0,
        networkOrders: networkStats.total_orders || 0,
        networkSellers: networkStats.sellers_count || 0,
        members: networkMembers
    };
}

// Test with sample users
console.log('\n📊 Testing Network Calculator:\n');

const testUsers = [
    'Anatta Root',  // Should have 43 members (entire network)
    'User1',        // Should have User2-6 as children + their children
    'User2',        // Should have 5 direct children + grandchildren
    'User10',       // Leaf node - should have 1 (self only)
];

testUsers.forEach(username => {
    const user = db.prepare('SELECT id, username FROM users WHERE username = ?').get(username);
    if (!user) {
        console.log(`❌ ${username}: User not found\n`);
        return;
    }

    const stats = calculateNetworkStats(user.id);

    console.log(`✅ ${user.username} (${user.id}):`);
    console.log(`   Network Size: ${stats.networkSize} members`);
    console.log(`   Network Sellers: ${stats.networkSellers} active sellers`);
    console.log(`   Network Orders: ${stats.networkOrders} completed`);
    console.log(`   Network Sales: ${stats.networkSales?.toLocaleString() || 0} THB`);
    console.log(`   Network Fees: ${stats.networkFees?.toLocaleString() || 0} THB`);

    // Show depth distribution
    const depthCount = {};
    stats.members.forEach(m => {
        depthCount[m.depth] = (depthCount[m.depth] || 0) + 1;
    });
    const depthStr = Object.keys(depthCount).map(d => `L${d}:${depthCount[d]}`).join(', ');
    console.log(`   Depth Distribution: ${depthStr}`);
    console.log('');
});

// Calculate for ALL users
console.log('='.repeat(80));
console.log('\n📈 Calculating Network Stats for ALL Users:\n');

const allUsers = db.prepare('SELECT id, username FROM users ORDER BY username').all();
const results = [];

allUsers.forEach((user, index) => {
    const stats = calculateNetworkStats(user.id);
    results.push({
        username: user.username,
        networkSize: stats.networkSize,
        networkFees: stats.networkFees,
        networkSales: stats.networkSales
    });

    if ((index + 1) % 10 === 0) {
        console.log(`Processed ${index + 1}/${allUsers.length} users...`);
    }
});

console.log(`\n✅ Completed! Processed ${results.length} users\n`);

// Show top networks by size
console.log('🏆 Top 5 Networks by Size:\n');
const topBySize = [...results].sort((a, b) => b.networkSize - a.networkSize).slice(0, 5);
topBySize.forEach((r, i) => {
    console.log(`${i + 1}. ${r.username}: ${r.networkSize} members, ${r.networkFees.toLocaleString()} THB fees`);
});

// Show top networks by fees
console.log('\n💰 Top 5 Networks by Fees:\n');
const topByFees = [...results].sort((a, b) => b.networkFees - a.networkFees).slice(0, 5);
topByFees.forEach((r, i) => {
    console.log(`${i + 1}. ${r.username}: ${r.networkFees.toLocaleString()} THB fees, ${r.networkSize} members`);
});

console.log('\n' + '='.repeat(80));
console.log('\n✨ Next Step: Add these calculations to API /api/users endpoint');
console.log('   Fields to add:');
console.log('   - network_size (INTEGER)');
console.log('   - network_fees (REAL)');
console.log('   - network_sales (REAL)');
console.log('   - network_orders (INTEGER)');

db.close();
