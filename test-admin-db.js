// Test Admin Database Connection
import { initDatabase, TABLES, dbHelpers } from './lib/database.js';

async function testAdminDatabase() {
    try {
        console.log('🧪 Testing Admin Database Connection...');
        await initDatabase();

        // Test getting users like admin would
        console.log('\n👥 Getting users for admin...');
        const database = await import('./lib/database.js').then(m => m.getDatabase());

        const users = database.prepare(`
            SELECT u.*,
                   (SELECT COUNT(*) FROM referrals WHERE referrer_id = u.id) as referral_count,
                   (SELECT COUNT(*) FROM orders WHERE buyer_id = u.id) as total_orders,
                   (SELECT SUM(total_amount) FROM orders WHERE buyer_id = u.id AND status = 'completed') as total_spent
            FROM users u
            ORDER BY u.created_at DESC
        `).all();

        console.log(`✅ Found ${users.length} users:`);
        users.forEach((user, index) => {
            console.log(`  ${index + 1}. @${user.username} (${user.email})`);
            console.log(`     Active: ${user.is_active ? 'Yes' : 'No'}, Verified: ${user.is_verified ? 'Yes' : 'No'}`);
            console.log(`     Referrals: ${user.referral_count}, Orders: ${user.total_orders}`);
            console.log(`     Created: ${user.created_at}`);
        });

        // Test getting products for admin
        console.log('\n📦 Getting products for admin...');
        const products = database.prepare(`
            SELECT p.*,
                   u.username as seller_username,
                   u.email as seller_email,
                   c.name as category_name,
                   c.name_th as category_name_th
            FROM products p
            LEFT JOIN users u ON p.seller_id = u.id
            LEFT JOIN categories c ON p.category_id = c.id
            ORDER BY p.created_at DESC
        `).all();

        console.log(`✅ Found ${products.length} products:`);
        products.forEach((product, index) => {
            console.log(`  ${index + 1}. ${product.title} - ${product.price_local} THB`);
            console.log(`     Seller: @${product.seller_username}`);
            console.log(`     Status: ${product.status}, Available: ${product.is_available ? 'Yes' : 'No'}`);
            console.log(`     Category: ${product.category_name_th || product.category_name}`);
        });

        // Test dashboard stats
        console.log('\n📊 Getting dashboard stats...');
        const stats = {};

        stats.totalUsers = database.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').get().count;
        stats.totalProducts = database.prepare("SELECT COUNT(*) as count FROM products WHERE status = 'active'").get().count;

        const orderStats = database.prepare(`
            SELECT
                COUNT(*) as totalOrders,
                SUM(total_amount) as totalRevenue
            FROM orders
            WHERE status = 'completed'
        `).get();

        stats.totalOrders = orderStats.totalOrders || 0;
        stats.totalRevenue = orderStats.totalRevenue || 0;

        console.log('✅ Dashboard Stats:');
        console.log(`   👤 Active Users: ${stats.totalUsers}`);
        console.log(`   📦 Active Products: ${stats.totalProducts}`);
        console.log(`   🛒 Completed Orders: ${stats.totalOrders}`);
        console.log(`   💰 Total Revenue: ${stats.totalRevenue} THB`);

        console.log('\n🎉 Admin database connection test completed!');

    } catch (error) {
        console.error('❌ Admin database test failed:', error);
    }
}

testAdminDatabase();