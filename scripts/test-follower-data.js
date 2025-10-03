// Test follower data from API
const response = await fetch('http://localhost:5000/api/users');
const data = await response.json();

if (data.success && data.data) {
    console.log('=== Follower Data Test ===\n');

    // Find users with followers
    const usersWithFollowers = data.data.filter(u => u.follower_count > 0);

    console.log(`Total users: ${data.data.length}`);
    console.log(`Users with followers: ${usersWithFollowers.length}\n`);

    if (usersWithFollowers.length > 0) {
        console.log('Users with followers:');
        usersWithFollowers.forEach(u => {
            console.log(`  ${u.username}:`);
            console.log(`    - follower_count field: ${u.follower_count}`);
            console.log(`    - stats.referrals.total: ${u.stats?.referrals?.total}`);
        });
    }

    // Sample first 3 users
    console.log('\n=== Sample Users (First 3) ===\n');
    data.data.slice(0, 3).forEach(u => {
        console.log(`${u.username}:`);
        console.log(`  follower_count: ${u.follower_count}`);
        console.log(`  sales_count: ${u.sales_count}`);
        console.log(`  purchase_count: ${u.purchase_count}`);
        console.log(`  stats:`, JSON.stringify(u.stats, null, 2));
        console.log('');
    });

    // Check Anatta Root specifically
    const anattaRoot = data.data.find(u => u.username === 'Anatta Root');
    if (anattaRoot) {
        console.log('\n=== Anatta Root Details ===');
        console.log(`follower_count: ${anattaRoot.follower_count}`);
        console.log(`stats.referrals.total: ${anattaRoot.stats?.referrals?.total}`);
        console.log('Full stats:', JSON.stringify(anattaRoot.stats, null, 2));
    }
} else {
    console.log('Error:', data);
}
