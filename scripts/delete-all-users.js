import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project-url.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

// Tables constant
const TABLES = {
    USERS: 'users',
    PRODUCTS: 'products'
};

// Delete all users from database
async function deleteAllUsers() {
    console.log('🗑️  Starting user deletion process...');
    console.log('⚠️  WARNING: This will delete ALL users from the database!');

    // Mock database for demonstration
    let mockDB = {
        users: [
            {
                id: 'user-001',
                username: 'seller1',
                email: 'seller1@example.com'
            },
            {
                id: 'user-002',
                username: 'seller2',
                email: 'seller2@example.com'
            },
            {
                id: 'ducklord-new-1758447546564',
                username: 'ducklord',
                email: 'ducklord@fingrow.com'
            }
        ],
        products: [
            {
                id: 'prod-001',
                title: 'iPhone 14 Pro',
                seller_id: 'ducklord-new-1758447546564'
            },
            {
                id: 'prod-002',
                title: 'MacBook Pro M2',
                seller_id: 'ducklord-new-1758447546564'
            }
        ]
    };

    try {
        // Check if Supabase is configured
        if (supabaseUrl === 'https://your-project-url.supabase.co' || supabaseKey === 'your-anon-key') {
            console.log('⚠️  Using mock database for demonstration...\n');
        }

        // 1. Show current users
        console.log('📋 Current users in database:');
        mockDB.users.forEach((user, index) => {
            console.log(`  ${index + 1}. ${user.username} (${user.id}) - ${user.email}`);
        });

        console.log(`\n📊 Total users to delete: ${mockDB.users.length}`);

        // 2. Check for products that will become orphaned
        const productsWithUsers = mockDB.products.filter(p =>
            mockDB.users.some(u => u.id === p.seller_id)
        );

        if (productsWithUsers.length > 0) {
            console.log(`\n⚠️  Warning: ${productsWithUsers.length} products will become orphaned:`);
            productsWithUsers.forEach(product => {
                const owner = mockDB.users.find(u => u.id === product.seller_id);
                console.log(`  - ${product.title} (Owner: ${owner?.username || 'Unknown'})`);
            });
        }

        // 3. Confirm deletion (in real scenario, you might want user confirmation)
        console.log('\n🔥 Proceeding with user deletion...');

        // 4. Delete all users
        console.log('🗑️  Deleting users...');
        const deletedUsers = [...mockDB.users]; // Keep copy for reporting
        mockDB.users = []; // Clear all users

        console.log(`✅ Successfully deleted ${deletedUsers.length} users!`);

        // 5. Show deleted users
        console.log('\n🗑️  Deleted users:');
        deletedUsers.forEach((user, index) => {
            console.log(`  ❌ ${index + 1}. ${user.username} (${user.id})`);
        });

        // 6. Verify deletion
        console.log('\n✅ Verification:');
        console.log(`👥 Users remaining: ${mockDB.users.length}`);
        console.log(`📦 Products now orphaned: ${mockDB.products.length}`);

        if (mockDB.users.length === 0) {
            console.log('🎉 All users successfully deleted from database!');
            console.log('⚠️  Note: All products are now without owners');
        } else {
            console.log(`❌ Error: ${mockDB.users.length} users still remain`);
        }

        // 7. Summary
        console.log('\n📊 Deletion Summary:');
        console.log(`🗑️  Users deleted: ${deletedUsers.length}`);
        console.log(`👥 Users remaining: ${mockDB.users.length}`);
        console.log(`💔 Orphaned products: ${mockDB.products.length}`);
        console.log('✅ Database ready for fresh user data!');

    } catch (error) {
        console.error('💥 Deletion process failed:', error);
    }
}

// Real Supabase version (when configured)
async function deleteAllUsersSupabase() {
    console.log('🗑️  Starting user deletion with real Supabase...');

    try {
        // 1. Get all current users
        const { data: allUsers, error: usersError } = await supabase
            .from(TABLES.USERS)
            .select('id, username, email');

        if (usersError) {
            console.error('❌ Error fetching users:', usersError);
            return;
        }

        console.log(`📊 Found ${allUsers.length} users to delete`);

        if (allUsers.length === 0) {
            console.log('ℹ️  No users to delete');
            return;
        }

        // 2. Show users to be deleted
        console.log('📋 Users to be deleted:');
        allUsers.forEach((user, index) => {
            console.log(`  ${index + 1}. ${user.username} (${user.id})`);
        });

        // 3. Check for products that will become orphaned
        const { data: allProducts, error: productsError } = await supabase
            .from(TABLES.PRODUCTS)
            .select('id, title, seller_id');

        if (!productsError && allProducts.length > 0) {
            console.log(`⚠️  Warning: ${allProducts.length} products will become orphaned`);
        }

        // 4. Delete all users
        const { error: deleteError } = await supabase
            .from(TABLES.USERS)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using dummy condition)

        if (deleteError) {
            console.error('❌ Error deleting users:', deleteError);
            return;
        }

        console.log(`✅ Successfully deleted ${allUsers.length} users!`);

        // 5. Verify deletion
        const { data: remainingUsers, error: verifyError } = await supabase
            .from(TABLES.USERS)
            .select('id');

        if (!verifyError) {
            console.log(`✅ Verification: ${remainingUsers.length} users remaining`);
            if (remainingUsers.length === 0) {
                console.log('🎉 All users successfully deleted from database!');
            }
        }

    } catch (error) {
        console.error('💥 Supabase deletion failed:', error);
    }
}

// Main function
async function main() {
    if (supabaseUrl === 'https://your-project-url.supabase.co' || supabaseKey === 'your-anon-key') {
        await deleteAllUsers(); // Mock version
    } else {
        await deleteAllUsersSupabase(); // Real version
    }
}

// Run the deletion
console.log('Script started...');
main();

export { deleteAllUsers, deleteAllUsersSupabase };