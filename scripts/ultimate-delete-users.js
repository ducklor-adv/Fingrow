import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Try multiple ways to get Supabase credentials
let supabaseUrl = null;
let supabaseKey = null;

// Method 1: From environment variables
if (process.env.SUPABASE_URL && process.env.SUPABASE_URL !== 'https://your-project-url.supabase.co') {
    supabaseUrl = process.env.SUPABASE_URL;
    supabaseKey = process.env.SUPABASE_ANON_KEY;
    console.log('✅ Using credentials from .env file');
}

// Method 2: Check if there are any environment variables that look like Supabase
if (!supabaseUrl) {
    const envKeys = Object.keys(process.env);
    const possibleUrl = envKeys.find(key =>
        key.toLowerCase().includes('supabase') &&
        process.env[key] &&
        process.env[key].includes('.supabase.co')
    );
    const possibleKey = envKeys.find(key =>
        key.toLowerCase().includes('supabase') &&
        key.toLowerCase().includes('key') &&
        process.env[key] &&
        process.env[key].length > 50
    );

    if (possibleUrl && possibleKey) {
        supabaseUrl = process.env[possibleUrl];
        supabaseKey = process.env[possibleKey];
        console.log(`✅ Found credentials: ${possibleUrl} and ${possibleKey}`);
    }
}

// Ultimate user deletion function
async function ultimateDeleteAllUsers() {
    console.log('🚀 ULTIMATE USER DELETION SCRIPT');
    console.log('⚠️  This will find and delete ALL users from your database!');

    // If we still don't have credentials, use mock deletion with instructions
    if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-project-url')) {
        console.log('\n❌ No valid Supabase credentials found!');
        console.log('\n📝 To delete real data, you need to:');
        console.log('1. Get your Supabase project URL and anon key');
        console.log('2. Update .env file:');
        console.log('   SUPABASE_URL=https://yourproject.supabase.co');
        console.log('   SUPABASE_ANON_KEY=your_actual_anon_key_here');
        console.log('\n🔄 Running mock deletion for demonstration...\n');
        await mockDeleteAllUsers();
        return;
    }

    console.log(`🔗 Connecting to: ${supabaseUrl}`);
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // Test connection first
        console.log('🔍 Testing database connection...');
        const { data: testData, error: testError } = await supabase
            .from('users')
            .select('count', { count: 'exact', head: true });

        if (testError) {
            console.log('❌ Connection failed:', testError.message);
            console.log('🔄 Falling back to mock deletion...\n');
            await mockDeleteAllUsers();
            return;
        }

        console.log(`✅ Connected! Found ${testData?.length || 0} users in database`);

        // Get all users
        const { data: allUsers, error: fetchError } = await supabase
            .from('users')
            .select('id, username, email');

        if (fetchError) {
            console.error('❌ Error fetching users:', fetchError.message);
            return;
        }

        if (allUsers.length === 0) {
            console.log('✅ No users found - database is already clean!');
            return;
        }

        console.log(`\n📊 Found ${allUsers.length} users to delete:`);
        allUsers.forEach((user, index) => {
            console.log(`  ${index + 1}. ${user.username || 'unnamed'} (${user.id})`);
        });

        // Delete all users using multiple methods
        console.log('\n🔥 Starting deletion process...');

        // Method 1: Delete with condition that matches all
        const { error: deleteError1, count: count1 } = await supabase
            .from('users')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

        if (deleteError1) {
            console.log('❌ Method 1 failed, trying method 2...');

            // Method 2: Delete in batches
            for (const user of allUsers) {
                const { error } = await supabase
                    .from('users')
                    .delete()
                    .eq('id', user.id);

                if (error) {
                    console.log(`❌ Failed to delete ${user.username}: ${error.message}`);
                } else {
                    console.log(`✅ Deleted ${user.username}`);
                }
            }
        } else {
            console.log(`✅ Batch deletion successful (${count1 || allUsers.length} users)`);
        }

        // Verify deletion
        console.log('\n🔍 Verifying deletion...');
        const { data: remainingUsers, error: verifyError } = await supabase
            .from('users')
            .select('id, username');

        if (verifyError) {
            console.log('⚠️  Could not verify deletion:', verifyError.message);
        } else {
            console.log(`📊 Users remaining: ${remainingUsers.length}`);

            if (remainingUsers.length === 0) {
                console.log('🎉 SUCCESS: All users deleted from real database!');
            } else {
                console.log('⚠️  Some users still remain:');
                remainingUsers.forEach(user => {
                    console.log(`  - ${user.username || 'unnamed'} (${user.id})`);
                });
            }
        }

        // Check products
        const { data: products } = await supabase
            .from('products')
            .select('id');

        if (products) {
            console.log(`📦 Products in database: ${products.length} (now orphaned)`);
        }

    } catch (error) {
        console.error('💥 Real deletion failed:', error.message);
        console.log('🔄 Falling back to mock deletion...\n');
        await mockDeleteAllUsers();
    }
}

// Mock deletion as fallback
async function mockDeleteAllUsers() {
    console.log('🎭 MOCK DELETION (Demonstration)');

    const mockUsers = [
        { id: 'user-001', username: 'seller1', email: 'seller1@example.com' },
        { id: 'user-002', username: 'seller2', email: 'seller2@example.com' },
        { id: 'ducklord-001', username: 'ducklord', email: 'ducklord@fingrow.com' }
    ];

    console.log(`📊 Mock database has ${mockUsers.length} users:`);
    mockUsers.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.username} (${user.id})`);
    });

    console.log('\n🗑️  Deleting all mock users...');
    mockUsers.length = 0; // Clear array

    console.log('✅ Mock deletion complete!');
    console.log(`📊 Users remaining: ${mockUsers.length}`);
    console.log('🎉 Mock database is now clean!');

    console.log('\n💡 To delete REAL data:');
    console.log('1. Update your .env file with real Supabase credentials');
    console.log('2. Run this script again');
}

// Run the ultimate deletion
console.log('Script started...');
ultimateDeleteAllUsers();

export default ultimateDeleteAllUsers;