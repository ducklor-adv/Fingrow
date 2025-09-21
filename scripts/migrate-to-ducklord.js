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

// Migration script to transfer all products to ducklord user
async function migrateProductsToDucklord() {
    console.log('🦆 Starting migration to ducklord...');

    // Check if Supabase is configured
    if (supabaseUrl === 'https://your-project-url.supabase.co' || supabaseKey === 'your-anon-key') {
        console.log('⚠️ Supabase not configured! Please update your .env file with real values:');
        console.log('SUPABASE_URL=your-real-supabase-url');
        console.log('SUPABASE_ANON_KEY=your-real-anon-key');
        console.log('\n🔄 Running with mock data instead...\n');

        // Use mock migration instead
        const mockMigration = await import('./migrate-mock-data.js');
        return;
    }

    try {
        // 1. Find ducklord user
        console.log('📝 Looking for ducklord user...');
        const { data: ducklordUser, error: userError } = await supabase
            .from(TABLES.USERS)
            .select('id, username')
            .ilike('username', '%ducklord%')
            .single();

        if (userError || !ducklordUser) {
            console.log('❌ ducklord user not found, creating one...');

            // Create ducklord user if doesn't exist
            const { data: newUser, error: createError } = await supabase
                .from(TABLES.USERS)
                .insert({
                    id: crypto.randomUUID(),
                    username: 'ducklord',
                    email: 'ducklord@fingrow.com',
                    full_name: 'Duck Lord',
                    bio: 'The supreme duck ruler of all products',
                    trust_score: 5.0,
                    is_verified: true,
                    referral_code: 'DUCKLORD2024',
                    currency_code: 'THB'
                })
                .select()
                .single();

            if (createError) {
                console.error('❌ Error creating ducklord user:', createError);
                return;
            }

            console.log('✅ Created ducklord user:', newUser);
            ducklordUser.id = newUser.id;
            ducklordUser.username = newUser.username;
        } else {
            console.log('✅ Found ducklord user:', ducklordUser);
        }

        // 2. Get all current products
        console.log('📦 Fetching all products...');
        const { data: allProducts, error: productsError } = await supabase
            .from(TABLES.PRODUCTS)
            .select('id, title, seller_id')
            .neq('seller_id', ducklordUser.id); // Don't update products already owned by ducklord

        if (productsError) {
            console.error('❌ Error fetching products:', productsError);
            return;
        }

        console.log(`📊 Found ${allProducts.length} products to migrate`);

        if (allProducts.length === 0) {
            console.log('ℹ️ No products to migrate (all already belong to ducklord)');
            return;
        }

        // 3. Update all products to belong to ducklord
        console.log('🔄 Updating product ownership...');
        const { data: updatedProducts, error: updateError } = await supabase
            .from(TABLES.PRODUCTS)
            .update({
                seller_id: ducklordUser.id,
                updated_at: new Date().toISOString()
            })
            .neq('seller_id', ducklordUser.id)
            .select('id, title, seller_id');

        if (updateError) {
            console.error('❌ Error updating products:', updateError);
            return;
        }

        console.log(`✅ Successfully migrated ${updatedProducts.length} products to ducklord!`);

        // 4. Display summary
        console.log('\n📈 Migration Summary:');
        console.log(`👑 Owner: ${ducklordUser.username} (${ducklordUser.id})`);
        console.log(`📦 Products migrated: ${updatedProducts.length}`);
        console.log('🎉 Migration completed successfully!');

        // 5. Verify migration
        const { data: verifyProducts, error: verifyError } = await supabase
            .from(TABLES.PRODUCTS)
            .select('seller_id')
            .neq('seller_id', ducklordUser.id);

        if (verifyError) {
            console.error('⚠️ Error verifying migration:', verifyError);
        } else {
            console.log(`✅ Verification: ${verifyProducts.length} products still owned by others`);
        }

    } catch (error) {
        console.error('💥 Migration failed:', error);
    }
}

// Run migration
console.log('Script started...');
migrateProductsToDucklord();

export default migrateProductsToDucklord;