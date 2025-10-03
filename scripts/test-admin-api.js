import AdminDatabaseService from '../admin/api/database-api.js';

console.log('=== Testing Admin API ===\n');

const adminDB = new AdminDatabaseService();

// Test getAllUsers
console.log('Testing getAllUsers()...\n');
const users = await adminDB.getAllUsers();

console.log(`Total users fetched: ${users.length}\n`);

// Show first 5 users with stats
console.log('Sample users with stats:\n');
users.slice(0, 5).forEach(user => {
    console.log(`User: ${user.username} (${user.full_name})`);
    console.log(`  Followers: ${user.follower_count}`);
    console.log(`  Purchases: ${user.purchase_count} orders, ${user.total_spent || 0} THB`);
    console.log(`  Sales: ${user.sales_count} orders, ${user.total_sales || 0} THB`);
    console.log(`  Total Earnings: ${user.total_earnings || 0} THB`);
    console.log(`  Stats object:`, user.stats);
    console.log('');
});

// Test users with most followers
console.log('\n=== Users with Most Followers ===\n');
const usersWithFollowers = users
    .filter(u => u.follower_count > 0)
    .sort((a, b) => b.follower_count - a.follower_count)
    .slice(0, 5);

usersWithFollowers.forEach(user => {
    console.log(`${user.username}: ${user.follower_count} followers`);
});

// Test users with most sales
console.log('\n=== Top Sellers ===\n');
const topSellers = users
    .filter(u => u.sales_count > 0)
    .sort((a, b) => b.total_sales - a.total_sales)
    .slice(0, 5);

topSellers.forEach(user => {
    console.log(`${user.username}: ${user.sales_count} sales, ${user.total_sales} THB revenue`);
});

console.log('\n✅ API Test Complete');
