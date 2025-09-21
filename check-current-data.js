import { initDatabase, TABLES, dbHelpers } from './lib/database.js';

async function checkCurrentData() {
  try {
    await initDatabase();

    // Check users
    const { data: users } = await dbHelpers.select(TABLES.USERS, '*');
    console.log(`📊 Users: ${users?.length || 0} รายการ`);
    if (users?.length > 0) {
      console.log('User ตัวอย่าง:', users.slice(0, 3).map(u => ({
        username: u.username,
        email: u.email,
        created_at: u.created_at
      })));
    }

    // Check products
    const { data: products } = await dbHelpers.select(TABLES.PRODUCTS, '*');
    console.log(`📦 Products: ${products?.length || 0} รายการ`);
    if (products?.length > 0) {
      console.log('Product ตัวอย่าง:', products.slice(0, 3).map(p => ({
        title: p.title,
        price_local: p.price_local,
        created_at: p.created_at
      })));
    }

    // Check orders
    const { data: orders } = await dbHelpers.select(TABLES.ORDERS, '*');
    console.log(`🛍️ Orders: ${orders?.length || 0} รายการ`);

    // Check categories
    const { data: categories } = await dbHelpers.select(TABLES.CATEGORIES, '*');
    console.log(`📂 Categories: ${categories?.length || 0} รายการ`);

  } catch (error) {
    console.error('Error checking data:', error);
  }
}

checkCurrentData();