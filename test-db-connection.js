// Database Connection Test Script
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://khllsglohatwxiibcydc.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_xM-7CpiP0JhpW08QNVZE3w_AQ9cWX1o';

console.log('🔄 Testing Supabase Database Connection...\n');
console.log('📍 URL:', supabaseUrl);
console.log('🔑 Key:', supabaseAnonKey.substring(0, 20) + '...\n');

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDatabaseConnection() {
  let testsPassed = 0;
  let totalTests = 0;

  console.log('=' .repeat(50));
  console.log('🧪 DATABASE CONNECTION TESTS');
  console.log('=' .repeat(50));

  // Test 1: Basic Connection
  console.log('\n1️⃣ Testing basic connection...');
  totalTests++;
  try {
    const { data, error } = await supabase.from('information_schema.tables').select('table_name').limit(1);
    if (error) throw error;
    console.log('✅ Connection successful!');
    testsPassed++;
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
  }

  // Test 2: Check if main tables exist
  console.log('\n2️⃣ Checking if main tables exist...');
  const expectedTables = ['users', 'products', 'categories', 'orders', 'reviews'];

  for (const tableName of expectedTables) {
    totalTests++;
    try {
      const { data, error } = await supabase.from(tableName).select('*').limit(1);
      if (error) throw error;
      console.log(`✅ Table '${tableName}' exists and accessible`);
      testsPassed++;
    } catch (error) {
      console.log(`❌ Table '${tableName}' error:`, error.message);
    }
  }

  // Test 3: Check table structures
  console.log('\n3️⃣ Checking table structures...');

  // Test users table structure
  totalTests++;
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, email, created_at')
      .limit(1);
    if (error) throw error;
    console.log('✅ Users table structure is correct');
    testsPassed++;
  } catch (error) {
    console.log('❌ Users table structure error:', error.message);
  }

  // Test products table structure
  totalTests++;
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, title, price_local, seller_id')
      .limit(1);
    if (error) throw error;
    console.log('✅ Products table structure is correct');
    testsPassed++;
  } catch (error) {
    console.log('❌ Products table structure error:', error.message);
  }

  // Test 4: Check for sample data
  console.log('\n4️⃣ Checking for existing data...');
  const dataTables = ['users', 'products', 'categories'];

  for (const tableName of dataTables) {
    totalTests++;
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      console.log(`✅ Table '${tableName}' has ${count || 0} records`);
      testsPassed++;
    } catch (error) {
      console.log(`❌ Error counting '${tableName}':`, error.message);
    }
  }

  // Test 5: Test INSERT operation (if users table is empty, create a test user)
  console.log('\n5️⃣ Testing INSERT operation...');
  totalTests++;
  try {
    // Check if test user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', 'test_connection_user')
      .single();

    if (!existingUser) {
      // Insert test user
      const { data, error } = await supabase
        .from('users')
        .insert([{
          username: 'test_connection_user',
          email: 'test@example.com',
          full_name: 'Test Connection User',
          referral_code: 'TEST001'
        }])
        .select()
        .single();

      if (error) throw error;
      console.log('✅ INSERT test successful - Created test user with ID:', data.id);
      testsPassed++;
    } else {
      console.log('✅ Test user already exists - INSERT functionality works');
      testsPassed++;
    }
  } catch (error) {
    console.log('❌ INSERT test failed:', error.message);
  }

  // Test 6: Test SELECT with JOIN
  console.log('\n6️⃣ Testing SELECT with JOIN...');
  totalTests++;
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        title,
        seller:seller_id (
          id,
          username,
          full_name
        )
      `)
      .limit(1);

    if (error) throw error;
    console.log('✅ JOIN query successful');
    testsPassed++;
  } catch (error) {
    console.log('❌ JOIN query failed:', error.message);
  }

  // Final Results
  console.log('\n' + '=' .repeat(50));
  console.log('📊 TEST RESULTS');
  console.log('=' .repeat(50));
  console.log(`✅ Passed: ${testsPassed}/${totalTests} tests`);
  console.log(`❌ Failed: ${totalTests - testsPassed}/${totalTests} tests`);

  if (testsPassed === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED! Database connection is working perfectly!');
    console.log('✅ Your app can connect to the database successfully');
  } else {
    console.log('\n⚠️  Some tests failed. Please check:');
    console.log('1. Supabase URL and API key are correct');
    console.log('2. Database schema has been created');
    console.log('3. Row Level Security (RLS) policies are properly configured');
  }

  console.log('\n' + '=' .repeat(50));
}

// Additional utility functions
async function showDatabaseInfo() {
  console.log('\n📋 DATABASE INFORMATION');
  console.log('=' .repeat(50));

  try {
    // Get all tables
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');

    if (error) throw error;

    console.log('\n📄 Available Tables:');
    tables.forEach((table, index) => {
      console.log(`${index + 1}. ${table.table_name}`);
    });

  } catch (error) {
    console.log('❌ Error fetching database info:', error.message);
  }
}

// Run tests
async function runAllTests() {
  await testDatabaseConnection();
  await showDatabaseInfo();
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { testDatabaseConnection, showDatabaseInfo };