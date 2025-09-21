import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndSetupDatabase() {
    console.log('🔍 Checking Supabase database structure...');

    try {
        // Check what tables exist
        console.log('📋 Checking existing tables...');

        // Try to list all tables using information_schema
        const { data: tables, error: tablesError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public');

        if (tablesError) {
            console.log('❌ Could not check existing tables:', tablesError.message);
            console.log('🔄 Trying alternative method...');

            // Try a direct query to see what we can access
            const testTables = ['users', 'products', 'categories', 'orders'];

            for (const tableName of testTables) {
                try {
                    const { data, error } = await supabase
                        .from(tableName)
                        .select('*')
                        .limit(1);

                    if (error) {
                        console.log(`❌ Table '${tableName}': ${error.message}`);
                    } else {
                        console.log(`✅ Table '${tableName}': exists and accessible`);
                        console.log(`📊 Sample data:`, data?.length || 0, 'rows');
                    }
                } catch (e) {
                    console.log(`❌ Table '${tableName}': ${e.message}`);
                }
            }
        } else {
            console.log('✅ Found tables:', tables?.map(t => t.table_name).join(', ') || 'none');
        }

        // Try to create basic tables if they don't exist
        console.log('\n🛠️  Setting up basic database structure...');

        const createUsersSQL = `
            CREATE TABLE IF NOT EXISTS users (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                username VARCHAR UNIQUE NOT NULL,
                email VARCHAR,
                full_name VARCHAR,
                avatar_url VARCHAR,
                bio TEXT,
                phone_number VARCHAR,
                location JSONB,
                trust_score DECIMAL(3,2) DEFAULT 5.0,
                is_verified BOOLEAN DEFAULT FALSE,
                referral_code VARCHAR UNIQUE,
                referred_by VARCHAR,
                total_earnings DECIMAL(20,8) DEFAULT 0,
                total_earnings_local DECIMAL(15,2) DEFAULT 0,
                currency_code VARCHAR(3) DEFAULT 'THB',
                is_active BOOLEAN DEFAULT TRUE,
                last_active_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `;

        const createProductsSQL = `
            CREATE TABLE IF NOT EXISTS products (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                seller_id UUID REFERENCES users(id),
                title VARCHAR NOT NULL,
                description TEXT,
                condition VARCHAR CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'poor')),
                price_wld DECIMAL(20,8) NOT NULL,
                price_local DECIMAL(15,2) NOT NULL,
                currency_code VARCHAR(3) DEFAULT 'THB',
                images JSONB,
                location JSONB,
                is_available BOOLEAN DEFAULT TRUE,
                status VARCHAR DEFAULT 'active' CHECK (status IN ('draft', 'active', 'sold', 'removed')),
                view_count INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `;

        // Execute SQL using RPC (if available)
        try {
            const { error: usersError } = await supabase.rpc('exec_sql', { sql: createUsersSQL });
            const { error: productsError } = await supabase.rpc('exec_sql', { sql: createProductsSQL });

            if (usersError) {
                console.log('⚠️  Could not create users table via RPC:', usersError.message);
            } else {
                console.log('✅ Users table ready');
            }

            if (productsError) {
                console.log('⚠️  Could not create products table via RPC:', productsError.message);
            } else {
                console.log('✅ Products table ready');
            }

        } catch (error) {
            console.log('❌ RPC not available or no permissions for table creation');
            console.log('💡 You may need to create tables manually in Supabase dashboard');
        }

        // Final verification
        console.log('\n🔍 Final verification...');
        try {
            const { data: users, error: usersError } = await supabase
                .from('users')
                .select('count', { count: 'exact', head: true });

            if (usersError) {
                console.log('❌ Users table still not accessible:', usersError.message);
            } else {
                console.log('✅ Users table is ready!');
                console.log(`📊 Current users: ${users?.length || 0}`);
            }
        } catch (e) {
            console.log('❌ Users table verification failed:', e.message);
        }

        // Show manual setup instructions
        console.log('\n💡 If tables are still missing, create them manually:');
        console.log('1. Go to https://khllsglohatwxiibcydc.supabase.co');
        console.log('2. Open SQL Editor');
        console.log('3. Run the following SQL:');
        console.log('\n--- SQL TO COPY ---');
        console.log(createUsersSQL);
        console.log('\n--- END SQL ---\n');

    } catch (error) {
        console.error('💥 Database check failed:', error.message);
    }
}

// Run the check
console.log('Script started...');
checkAndSetupDatabase();

export default checkAndSetupDatabase;