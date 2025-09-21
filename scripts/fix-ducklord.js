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

// Fix ducklord and orphaned products
async function fixDucklordAndProducts() {
    console.log('🔧 Starting ducklord fix process...');

    // Mock database for testing
    let mockDB = {
        users: [
            {
                id: 'user-001',
                username: 'seller1',
                email: 'seller1@example.com',
                trust_score: 4.5
            },
            {
                id: 'user-002',
                username: 'seller2',
                email: 'seller2@example.com',
                trust_score: 4.2
            }
            // Note: ducklord user is missing!
        ],
        products: [
            {
                id: 'prod-001',
                title: 'iPhone 14 Pro',
                seller_id: 'ducklord-001', // This references missing user!
                price_local: 35000,
                currency_code: 'THB'
            },
            {
                id: 'prod-002',
                title: 'MacBook Pro M2',
                seller_id: 'ducklord-001', // This references missing user!
                price_local: 65000,
                currency_code: 'THB'
            },
            {
                id: 'prod-003',
                title: 'iPad Air',
                seller_id: 'user-002', // This is OK
                price_local: 25000,
                currency_code: 'THB'
            },
            {
                id: 'prod-004',
                title: 'Samsung Galaxy S23',
                seller_id: 'nonexistent-user', // This is also orphaned!
                price_local: 28000,
                currency_code: 'THB'
            }
        ]
    };

    try {
        // Check if Supabase is configured
        if (supabaseUrl === 'https://your-project-url.supabase.co' || supabaseKey === 'your-anon-key') {
            console.log('⚠️ Using mock database for demonstration...\n');
        }

        // 1. Check current state
        console.log('🔍 Analyzing current database state...');

        // Find all user IDs that exist
        const existingUserIds = mockDB.users.map(u => u.id);
        console.log('👥 Existing users:', existingUserIds);

        // Find orphaned products (products with seller_id that doesn't exist)
        const orphanedProducts = mockDB.products.filter(p => !existingUserIds.includes(p.seller_id));
        console.log(`💔 Found ${orphanedProducts.length} orphaned products:`);
        orphanedProducts.forEach(p => console.log(`  - ${p.title} (seller_id: ${p.seller_id})`));

        // 2. Recreate ducklord user
        console.log('\n🦆 Creating new ducklord user...');
        const newDucklord = {
            id: 'ducklord-new-' + Date.now(),
            username: 'ducklord',
            email: 'ducklord@fingrow.com',
            full_name: 'Duck Lord',
            bio: 'The supreme duck ruler - now restored!',
            trust_score: 5.0,
            is_verified: true,
            referral_code: 'DUCKLORD2024',
            currency_code: 'THB',
            created_at: new Date().toISOString()
        };

        mockDB.users.push(newDucklord);
        console.log('✅ Created new ducklord:', newDucklord);

        // 3. Fix all orphaned products
        console.log('\n🔧 Fixing orphaned products...');
        let fixedCount = 0;

        mockDB.products.forEach(product => {
            if (!existingUserIds.includes(product.seller_id)) {
                console.log(`  📦 Fixing: ${product.title} (${product.seller_id} → ${newDucklord.id})`);
                product.seller_id = newDucklord.id;
                product.updated_at = new Date().toISOString();
                fixedCount++;
            }
        });

        console.log(`✅ Fixed ${fixedCount} orphaned products!`);

        // 4. Verify fix
        console.log('\n✅ Verification - All products now:');
        mockDB.products.forEach(product => {
            const owner = mockDB.users.find(u => u.id === product.seller_id);
            const status = owner ? '✅' : '❌';
            console.log(`  ${status} ${product.title} → ${owner ? owner.username : 'STILL ORPHANED!!'}`);
        });

        // 5. Summary
        console.log('\n📊 Fix Summary:');
        console.log(`🦆 Ducklord user: RECREATED (${newDucklord.id})`);
        console.log(`🔧 Products fixed: ${fixedCount}`);
        console.log(`👥 Total users: ${mockDB.users.length}`);
        console.log(`📦 Total products: ${mockDB.products.length}`);

        const stillOrphaned = mockDB.products.filter(p => !mockDB.users.find(u => u.id === p.seller_id));
        if (stillOrphaned.length === 0) {
            console.log('🎉 All products now have valid owners!');
        } else {
            console.log(`⚠️ Still ${stillOrphaned.length} orphaned products remaining`);
        }

    } catch (error) {
        console.error('💥 Fix process failed:', error);
    }
}

// Real Supabase version (when configured)
async function fixDucklordSupabase() {
    console.log('🔧 Starting ducklord fix with real Supabase...');

    try {
        // 1. Check for orphaned products
        const { data: allProducts, error: productsError } = await supabase
            .from(TABLES.PRODUCTS)
            .select('id, title, seller_id');

        if (productsError) {
            console.error('❌ Error fetching products:', productsError);
            return;
        }

        // 2. Get all user IDs
        const { data: allUsers, error: usersError } = await supabase
            .from(TABLES.USERS)
            .select('id, username');

        if (usersError) {
            console.error('❌ Error fetching users:', usersError);
            return;
        }

        const existingUserIds = allUsers.map(u => u.id);
        const orphanedProducts = allProducts.filter(p => !existingUserIds.includes(p.seller_id));

        console.log(`💔 Found ${orphanedProducts.length} orphaned products`);

        // 3. Create new ducklord
        const { data: newDucklord, error: createError } = await supabase
            .from(TABLES.USERS)
            .insert({
                id: crypto.randomUUID(),
                username: 'ducklord',
                email: 'ducklord@fingrow.com',
                full_name: 'Duck Lord',
                bio: 'The supreme duck ruler - now restored!',
                trust_score: 5.0,
                is_verified: true,
                referral_code: 'DUCKLORD' + Date.now(),
                currency_code: 'THB'
            })
            .select()
            .single();

        if (createError) {
            console.error('❌ Error creating ducklord:', createError);
            return;
        }

        console.log('✅ Created new ducklord:', newDucklord);

        // 4. Fix orphaned products
        if (orphanedProducts.length > 0) {
            const orphanedIds = orphanedProducts.map(p => p.id);

            const { data: fixedProducts, error: fixError } = await supabase
                .from(TABLES.PRODUCTS)
                .update({
                    seller_id: newDucklord.id,
                    updated_at: new Date().toISOString()
                })
                .in('id', orphanedIds)
                .select('id, title');

            if (fixError) {
                console.error('❌ Error fixing products:', fixError);
                return;
            }

            console.log(`✅ Fixed ${fixedProducts.length} products!`);
        }

        console.log('🎉 Ducklord restoration completed!');

    } catch (error) {
        console.error('💥 Supabase fix failed:', error);
    }
}

// Main function
async function main() {
    if (supabaseUrl === 'https://your-project-url.supabase.co' || supabaseKey === 'your-anon-key') {
        await fixDucklordAndProducts(); // Mock version
    } else {
        await fixDucklordSupabase(); // Real version
    }
}

// Run the fix
console.log('Script started...');
main();

export { fixDucklordAndProducts, fixDucklordSupabase };