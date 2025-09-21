import { initDatabase, TABLES, dbHelpers } from './lib/database.js';

// Mock data from App.js
const seedProducts = [
  { id: "p1", title: "เก้าอี้ไม้โอ๊ค", priceLocal: 1200, seller: "@ananya", pct: 3, condition: "ดีมาก", image: "https://via.placeholder.com/150" },
  { id: "p2", title: "โต๊ะทำงาน", priceLocal: 4500, seller: "@bank", pct: 5, condition: "ดี", image: "https://via.placeholder.com/150" },
  { id: "p3", title: "โน้ตบุ๊กมือสอง", priceLocal: 14500, seller: "@mild", pct: 4, condition: "ดี", image: "https://via.placeholder.com/150" },
  { id: "p4", title: "ไมโครเวฟ", priceLocal: 1800, seller: "@pong", pct: 2, condition: "ปานกลาง", image: "https://via.placeholder.com/150" },
];

const initialMyListings = [
  { id: "m1", title: "พัดลมตั้งโต๊ะ", priceLocal: 900, pct: 2, status: "ออนไลน์", date: "2025-09-05" },
  { id: "m2", title: "รองเท้ากีฬา", priceLocal: 1800, pct: 3, status: "ขายแล้ว", date: "2025-08-29" },
  { id: "m3", title: "หูฟังไร้สาย", priceLocal: 1200, pct: 1, status: "ออนไลน์", date: "2025-08-20" },
];

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    await initDatabase();

    // Create default category
    console.log('📂 Creating default category...');
    const categoryData = {
      id: 'cat-general',
      name: 'General',
      name_th: 'ทั่วไป',
      slug: 'general',
      icon: 'apps-outline',
      sort_order: 1
    };

    const { data: category, error: catError } = await dbHelpers.insert(TABLES.CATEGORIES, categoryData);
    if (catError) {
      console.error('Error creating category:', catError);
      return;
    }

    // Create mock users based on sellers
    console.log('👤 Creating users...');
    const sellers = ['@ananya', '@bank', '@mild', '@pong', '@user']; // Added @user for listings
    const users = [];

    for (let seller of sellers) {
      const userData = {
        id: `user-${seller.replace('@', '')}`,
        username: seller.replace('@', ''),
        email: `${seller.replace('@', '')}@example.com`,
        full_name: seller.replace('@', '').charAt(0).toUpperCase() + seller.replace('@', '').slice(1),
        world_id: `world_${seller.replace('@', '')}`,
        referral_code: `${seller.replace('@', '').toUpperCase()}2025`
      };

      const { data: user, error: userError } = await dbHelpers.insert(TABLES.USERS, userData);
      if (userError) {
        console.error(`Error creating user ${seller}:`, userError);
        continue;
      }
      users.push(user);
      console.log(`✅ Created user: ${seller}`);
    }

    // Create products from seedProducts
    console.log('🛍️ Creating products...');
    for (let product of seedProducts) {
      const sellerUsername = product.seller.replace('@', '');
      const sellerId = `user-${sellerUsername}`;

      const productData = {
        id: product.id,
        seller_id: sellerId,
        category_id: 'cat-general',
        title: product.title,
        description: `สินค้า ${product.title} ในสภาพ ${product.condition}`,
        condition: product.condition,
        price_local: product.priceLocal,
        currency_code: 'THB',
        location: JSON.stringify({ city: 'Bangkok', district: 'Central' }),
        images: JSON.stringify([product.image]),
        community_percentage: product.pct,
        status: 'active',
        is_available: 1
      };

      const { data: prod, error: prodError } = await dbHelpers.insert(TABLES.PRODUCTS, productData);
      if (prodError) {
        console.error(`Error creating product ${product.title}:`, prodError);
        continue;
      }
      console.log(`✅ Created product: ${product.title}`);
    }

    // Create products from initialMyListings (user's own listings)
    console.log('📋 Creating user listings...');
    const userId = 'user-user'; // Main user

    for (let listing of initialMyListings) {
      const productData = {
        id: listing.id,
        seller_id: userId,
        category_id: 'cat-general',
        title: listing.title,
        description: `รายการขายของฉัน: ${listing.title}`,
        condition: 'ดี',
        price_local: listing.priceLocal,
        currency_code: 'THB',
        location: JSON.stringify({ city: 'Bangkok', district: 'Central' }),
        images: JSON.stringify(['https://via.placeholder.com/150']),
        community_percentage: listing.pct,
        status: listing.status === 'ขายแล้ว' ? 'sold' : 'active',
        is_available: listing.status === 'ออนไลน์' ? 1 : 0,
        created_at: `${listing.date}T10:00:00Z`
      };

      const { data: prod, error: prodError } = await dbHelpers.insert(TABLES.PRODUCTS, productData);
      if (prodError) {
        console.error(`Error creating listing ${listing.title}:`, prodError);
        continue;
      }
      console.log(`✅ Created listing: ${listing.title}`);
    }

    // Verify data was inserted
    console.log('🔍 Verifying data...');
    const { data: allUsers } = await dbHelpers.select(TABLES.USERS, '*');
    const { data: allProducts } = await dbHelpers.select(TABLES.PRODUCTS, '*');
    const { data: allCategories } = await dbHelpers.select(TABLES.CATEGORIES, '*');

    console.log('\n📊 Database seeding completed!');
    console.log(`👤 Users: ${allUsers?.length || 0}`);
    console.log(`🛍️ Products: ${allProducts?.length || 0}`);
    console.log(`📂 Categories: ${allCategories?.length || 0}`);

    console.log('\n🎯 Sample data:');
    if (allUsers?.length > 0) {
      console.log('Users:', allUsers.map(u => u.username));
    }
    if (allProducts?.length > 0) {
      console.log('Products:', allProducts.map(p => p.title));
    }

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  }
}

seedDatabase();