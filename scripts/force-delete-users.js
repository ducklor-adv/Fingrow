import { createClient } from '@supabase/supabase-js';

// Direct deletion script - YOU NEED TO FILL IN YOUR SUPABASE CREDENTIALS HERE
const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';  // Replace with your actual URL
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';  // Replace with your actual key

// Force delete all users
async function forceDeleteAllUsers() {
    console.log('💀 FORCE DELETE ALL USERS');
    console.log('⚠️  WARNING: This will PERMANENTLY delete ALL users!');

    // Check if credentials are provided
    if (SUPABASE_URL === 'YOUR_SUPABASE_URL_HERE' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY_HERE') {
        console.log('❌ ERROR: Please update SUPABASE_URL and SUPABASE_ANON_KEY in this script first!');
        console.log('');
        console.log('1. Open: scripts/force-delete-users.js');
        console.log('2. Replace YOUR_SUPABASE_URL_HERE with your actual Supabase URL');
        console.log('3. Replace YOUR_SUPABASE_ANON_KEY_HERE with your actual anon key');
        console.log('4. Run the script again');
        return;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    try {
        // 1. Get all users first
        console.log('📋 Fetching all users...');
        const { data: allUsers, error: fetchError } = await supabase
            .from('users')
            .select('id, username, email');

        if (fetchError) {
            console.error('❌ Error fetching users:', fetchError.message);
            return;
        }

        console.log(`📊 Found ${allUsers.length} users to delete`);

        if (allUsers.length === 0) {
            console.log('✅ No users to delete - database is already clean!');
            return;
        }

        // 2. Show users that will be deleted
        console.log('\n👥 Users to be deleted:');
        allUsers.forEach((user, index) => {
            console.log(`  ${index + 1}. ${user.username || 'No username'} (${user.id}) - ${user.email || 'No email'}`);
        });

        // 3. Delete ALL users
        console.log('\n🔥 Deleting ALL users...');
        const { error: deleteError, count } = await supabase
            .from('users')
            .delete()
            .gte('id', '00000000-0000-0000-0000-000000000000'); // This condition matches all UUIDs

        if (deleteError) {
            console.error('❌ Error deleting users:', deleteError.message);
            return;
        }

        console.log(`✅ Deletion command executed (affected rows: ${count || 'unknown'})`);

        // 4. Verify deletion
        console.log('\n🔍 Verifying deletion...');
        const { data: remainingUsers, error: verifyError } = await supabase
            .from('users')
            .select('id, username');

        if (verifyError) {
            console.error('❌ Error verifying deletion:', verifyError.message);
            return;
        }

        // 5. Final result
        console.log(`📊 Users remaining: ${remainingUsers.length}`);

        if (remainingUsers.length === 0) {
            console.log('🎉 SUCCESS: All users have been deleted from the database!');
            console.log('✅ Database is now clean and ready for new user data');
        } else {
            console.log('⚠️  Some users may still remain:');
            remainingUsers.forEach(user => {
                console.log(`  - ${user.username || 'No username'} (${user.id})`);
            });
        }

        // 6. Check orphaned products
        const { data: products, error: productError } = await supabase
            .from('products')
            .select('id, title, seller_id');

        if (!productError && products) {
            console.log(`\n📦 Products status: ${products.length} products (all now orphaned)`);
        }

    } catch (error) {
        console.error('💥 Force deletion failed:', error.message);
    }
}

// Run immediately
console.log('Script started...');
forceDeleteAllUsers();

export default forceDeleteAllUsers;