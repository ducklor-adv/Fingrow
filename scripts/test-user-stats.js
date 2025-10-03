import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'data', 'fingrow.db');
const db = new Database(dbPath);

console.log('=== Testing User Statistics ===\n');

// Test query with stats
const users = db.prepare(`
    SELECT u.username,
           u.full_name,
           -- Follower count (people who used this user's invite code)
           (SELECT COUNT(*) FROM users WHERE invitor_id = u.id) as follower_count,

           -- Purchase stats (as buyer)
           (SELECT COUNT(*) FROM orders WHERE buyer_id = u.id) as purchase_count,
           (SELECT SUM(total_amount) FROM orders WHERE buyer_id = u.id AND status = 'completed') as total_spent,

           -- Sales stats (as seller)
           (SELECT COUNT(*) FROM orders WHERE seller_id = u.id) as sales_count,
           (SELECT SUM(total_amount) FROM orders WHERE seller_id = u.id AND status = 'completed') as total_sales,
           (SELECT SUM(community_fee) FROM orders WHERE seller_id = u.id AND status = 'completed') as total_fees_paid
    FROM users u
    ORDER BY u.created_at ASC
    LIMIT 10
`).all();

console.log('Sample User Stats:\n');
users.forEach(user => {
    console.log(`User: ${user.username} (${user.full_name})`);
    console.log(`  Followers: ${user.follower_count || 0}`);
    console.log(`  Purchases: ${user.purchase_count || 0} orders, ${user.total_spent || 0} THB spent`);
    console.log(`  Sales: ${user.sales_count || 0} orders, ${user.total_sales || 0} THB revenue`);
    console.log(`  Fees paid: ${user.total_fees_paid || 0} THB`);
    console.log('');
});

// Check follower relationships
console.log('\n=== Follower/Invitor Relationships ===\n');

const relationships = db.prepare(`
    SELECT
        invitor.username as invitor_name,
        COUNT(invitee.id) as follower_count
    FROM users invitor
    LEFT JOIN users invitee ON invitee.invitor_id = invitor.id
    GROUP BY invitor.id
    HAVING follower_count > 0
    ORDER BY follower_count DESC
    LIMIT 10
`).all();

relationships.forEach(rel => {
    console.log(`${rel.invitor_name} has ${rel.follower_count} followers`);
});

// Overall stats
console.log('\n=== Overall Statistics ===\n');

const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
const completedOrders = db.prepare('SELECT COUNT(*) as count FROM orders WHERE status = ?').get('completed').count;
const totalRevenue = db.prepare('SELECT SUM(total_amount) as total FROM orders WHERE status = ?').get('completed').total;
const totalFees = db.prepare('SELECT SUM(community_fee) as total FROM orders WHERE status = ?').get('completed').total;

const usersWithFollowers = db.prepare('SELECT COUNT(DISTINCT invitor_id) as count FROM users WHERE invitor_id IS NOT NULL').get().count;

console.log(`Total Users: ${totalUsers}`);
console.log(`Total Orders: ${totalOrders}`);
console.log(`Completed Orders: ${completedOrders}`);
console.log(`Total Revenue: ${totalRevenue?.toLocaleString() || 0} THB`);
console.log(`Total Fees: ${totalFees?.toLocaleString() || 0} THB`);
console.log(`Users with followers: ${usersWithFollowers}`);

db.close();
