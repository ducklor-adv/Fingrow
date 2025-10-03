import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to database
const dbPath = path.join(__dirname, '..', 'data', 'fingrow.db');
const db = new Database(dbPath);

console.log('📦 Creating products for all users (except Anatta999)...\n');

try {
    // Get all users except Anatta999
    const users = db.prepare(`
        SELECT id, username, full_name, invite_code
        FROM users
        WHERE username != ?
        ORDER BY created_at ASC
    `).all('Anatta999');

    console.log(`Found ${users.length} users to create products for:\n`);

    // Product template - 300 THB with 7% Fin Fee
    const productPrice = 300;
    const finFeePercent = 7;
    const finFeeAmount = (productPrice * finFeePercent) / 100; // 21 THB

    // Sample product titles and descriptions
    const productTemplates = [
        {
            title: 'iPhone 13 Pro 128GB มือสอง สภาพดี',
            description: 'iPhone 13 Pro สีทอง 128GB ใช้งานมา 1 ปี สภาพสวยมาก ไม่มีรอยขีดข่วน แบตเตอรี่ 87% พร้อมกล่อง ฟิล์ม และเคสในกล่อง',
            condition: 'ดีมาก',
            brand: 'Apple',
            model: 'iPhone 13 Pro',
            images: ['https://picsum.photos/seed/iphone1/800/600', 'https://picsum.photos/seed/iphone2/800/600']
        },
        {
            title: 'MacBook Air M1 2020 สภาพใหม่',
            description: 'MacBook Air M1 8GB/256GB สีเงิน ซื้อมา 6 เดือน ใช้งานเบาๆ ไม่มีรอยตำหนิ พร้อมกล่อง อุปกรณ์ครบ และ AppleCare+ เหลืออีก 1.5 ปี',
            condition: 'ใหม่',
            brand: 'Apple',
            model: 'MacBook Air M1',
            images: ['https://picsum.photos/seed/macbook1/800/600', 'https://picsum.photos/seed/macbook2/800/600']
        },
        {
            title: 'Samsung Galaxy S23 Ultra มือ 1',
            description: 'Samsung Galaxy S23 Ultra สี Phantom Black 256GB มือ 1 ใช้งานมา 3 เดือน พร้อมเคส Samsung Official Cover และฟิล์มกระจก',
            condition: 'ดีมาก',
            brand: 'Samsung',
            model: 'Galaxy S23 Ultra',
            images: ['https://picsum.photos/seed/samsung1/800/600', 'https://picsum.photos/seed/samsung2/800/600']
        },
        {
            title: 'iPad Pro 11" 2022 Wi-Fi + Cellular',
            description: 'iPad Pro 11 นิ้ว M2 128GB Wi-Fi + Cellular สีเทา พร้อม Apple Pencil Gen 2 และ Magic Keyboard ประกันเหลืออีก 10 เดือน',
            condition: 'ใหม่',
            brand: 'Apple',
            model: 'iPad Pro 11" M2',
            images: ['https://picsum.photos/seed/ipad1/800/600', 'https://picsum.photos/seed/ipad2/800/600']
        },
        {
            title: 'AirPods Pro Gen 2 ของแท้ศูนย์ไทย',
            description: 'AirPods Pro รุ่น 2 USB-C ซื้อจากศูนย์ไทย มีใบเสร็จ ใช้งานมา 2 เดือน สภาพสวยมาก พร้อมกล่องและอุปกรณ์ครบ',
            condition: 'ดีมาก',
            brand: 'Apple',
            model: 'AirPods Pro Gen 2',
            images: ['https://picsum.photos/seed/airpods1/800/600', 'https://picsum.photos/seed/airpods2/800/600']
        }
    ];

    // Get default category
    const defaultCategory = db.prepare('SELECT id FROM categories LIMIT 1').get();
    const categoryId = defaultCategory ? defaultCategory.id : 'cat-general';

    console.log(`Using category: ${categoryId}\n`);

    // Default location (Bangkok, Thailand)
    const defaultLocation = JSON.stringify({
        city: 'Bangkok',
        country: 'Thailand',
        lat: 13.7563,
        lng: 100.5018
    });

    // Create products for each user
    const insertProduct = db.prepare(`
        INSERT INTO products (
            id,
            seller_id,
            category_id,
            title,
            description,
            price_local,
            currency_code,
            fin_fee_percent,
            amount_fee,
            condition,
            brand,
            model,
            location,
            images,
            is_available,
            status,
            created_at,
            updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    let successCount = 0;
    let errorCount = 0;

    users.forEach((user, index) => {
        try {
            // Use different product template for variety
            const template = productTemplates[index % productTemplates.length];

            // Generate unique product ID
            const productId = `PROD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Create product for this user
            insertProduct.run(
                productId,
                user.id,
                categoryId,
                template.title,
                template.description,
                productPrice,
                'THB',
                finFeePercent,
                finFeeAmount,
                template.condition,
                template.brand,
                template.model,
                defaultLocation,
                JSON.stringify(template.images),
                1, // is_available
                'active'
            );

            console.log(`✅ Created product for ${user.username} (${user.full_name})`);
            console.log(`   - Product: ${template.title}`);
            console.log(`   - Price: ${productPrice} THB`);
            console.log(`   - Fin Fee: ${finFeePercent}% (${finFeeAmount} THB)`);
            console.log(`   - Product ID: ${productId}\n`);

            successCount++;
        } catch (error) {
            console.error(`❌ Error creating product for ${user.username}:`, error.message);
            errorCount++;
        }
    });

    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log(`   Total users: ${users.length}`);
    console.log(`   ✅ Products created: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   💰 Product price: ${productPrice} THB`);
    console.log(`   💳 Fin Fee: ${finFeePercent}% (${finFeeAmount} THB per product)`);
    console.log('='.repeat(60));

} catch (error) {
    console.error('❌ Fatal error:', error);
} finally {
    db.close();
}
