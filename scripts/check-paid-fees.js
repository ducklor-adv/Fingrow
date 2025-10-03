import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'data', 'fingrow.db');
const db = new Database(dbPath);

console.log('💰 Checking Paid Fees (Community Fees from Sales)\n');
console.log('='.repeat(70));

// Get paid fees per user
const paidFees = db.prepare(`
    SELECT
        u.id,
        u.username,
        u.full_name,
        COUNT(o.id) as sales_count,
        SUM(o.total_amount) as total_sales,
        SUM(o.community_fee) as total_fees_paid
    FROM users u
    LEFT JOIN orders o ON u.id = o.seller_id AND o.status = 'completed'
    GROUP BY u.id
    HAVING sales_count > 0
    ORDER BY total_fees_paid DESC
    LIMIT 10
`).all();

console.log('\n📊 Top 10 Users by Paid Fees:\n');
paidFees.forEach((user, index) => {
    console.log(`${index + 1}. ${user.username} (${user.full_name || 'N/A'})`);
    console.log(`   Sales: ${user.sales_count} orders`);
    console.log(`   Revenue: ${user.total_sales?.toLocaleString() || 0} THB`);
    console.log(`   Paid Fee: ${user.total_fees_paid?.toLocaleString() || 0} THB`);
    console.log('');
});

// Summary statistics
const summary = db.prepare(`
    SELECT
        COUNT(DISTINCT seller_id) as sellers_count,
        COUNT(*) as total_orders,
        SUM(total_amount) as total_revenue,
        SUM(community_fee) as total_fees
    FROM orders
    WHERE status = 'completed'
`).get();

console.log('='.repeat(70));
console.log('\n💵 Overall Summary:\n');
console.log(`   Sellers with sales: ${summary.sellers_count}`);
console.log(`   Completed orders: ${summary.total_orders}`);
console.log(`   Total revenue: ${summary.total_revenue?.toLocaleString() || 0} THB`);
console.log(`   Total fees collected: ${summary.total_fees?.toLocaleString() || 0} THB`);
console.log(`   Average fee per order: ${(summary.total_fees / summary.total_orders).toFixed(2)} THB`);

// Check specific users
console.log('\n='.repeat(70));
console.log('\n🔍 Sample Users Check:\n');

const samples = ['Anatta999', 'Anatta Root', 'User1', 'User10'];
samples.forEach(username => {
    const user = db.prepare(`
        SELECT
            u.id,
            u.username,
            COUNT(o.id) as sales_count,
            SUM(o.community_fee) as fees_paid
        FROM users u
        LEFT JOIN orders o ON u.id = o.seller_id AND o.status = 'completed'
        WHERE u.username = ?
        GROUP BY u.id
    `).get(username);

    if (user) {
        console.log(`${user.username}:`);
        console.log(`  Sales: ${user.sales_count || 0} orders`);
        console.log(`  Paid Fee: ${user.fees_paid?.toLocaleString() || 0} THB`);
    }
});

console.log('\n' + '='.repeat(70));

db.close();
