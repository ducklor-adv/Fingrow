// Test API endpoint
const response = await fetch('http://localhost:5000/api/users');
const data = await response.json();

console.log('=== API Response ===\n');
console.log('Success:', data.success);
console.log('Total users:', data.total);
console.log('\n=== Sample Users (First 3) ===\n');

if (data.data && data.data.length > 0) {
    data.data.slice(0, 3).forEach((user, index) => {
        console.log(`${index + 1}. ${user.username} (${user.full_name})`);
        console.log(`   Followers: ${user.follower_count}`);
        console.log(`   Sales: ${user.sales_count} orders, ${user.total_sales_amount || 0} THB`);
        console.log(`   Purchases: ${user.purchase_count} orders, ${user.total_spent || 0} THB`);
        console.log(`   Stats object:`, user.stats);
        console.log('');
    });

    // Find users with most followers
    const withFollowers = data.data.filter(u => u.follower_count > 0);
    console.log('\n=== Users with Followers ===\n');
    withFollowers.forEach(u => {
        console.log(`${u.username}: ${u.follower_count} followers`);
    });

    // Find users with most sales
    const withSales = data.data.filter(u => u.sales_count > 0).slice(0, 5);
    console.log('\n=== Top 5 Sellers ===\n');
    withSales.forEach(u => {
        console.log(`${u.username}: ${u.sales_count} sales, ${u.total_sales_amount} THB`);
    });
} else {
    console.log('No users data returned');
    console.log('Full response:', JSON.stringify(data, null, 2));
}
