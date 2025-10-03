// Create reviews for all completed orders
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);
const dbPath = join(projectRoot, 'data', 'fingrow.db');

const db = new Database(dbPath);

// Review templates for different ratings
const reviewTemplates = {
    5: {
        titles: [
            'ดีมากๆ ประทับใจมาก!',
            'สินค้าดีเยี่ยม ตรงตามที่โฆษณา',
            'ของดีมาก แนะนำเลยครับ',
            'พอใจมากๆ ครับ ขอบคุณมากๆ',
            'สินค้าคุณภาพดี ส่งไวมาก'
        ],
        comments: [
            'สินค้าสภาพดีมากๆ ตรงตามที่แชทคุยไว้ ผู้ขายใจดี ตอบเร็ว ส่งไวมาก แพ็คสินค้าดีมากครับ ประทับใจมากๆ ครับ ขอบคุณมากครับ',
            'ของดีมากครับ สภาพสมบูรณ์ ใช้งานได้ปกติ ผู้ขายบริการดี ตอบคำถามเร็ว แพ็คของดี ส่งไวมาก แนะนำเลยครับ',
            'ได้ของแล้วครับ สภาพดีเยี่ยมเลย ตรงตามรูปที่โพสต์ไว้ ผู้ขายน่ารักมาก แชทสุภาพ ส่งเร็วมาก ขอบคุณมากครับ',
            'พอใจมากๆ ครับ สินค้าสภาพใหม่มาก ใช้งานได้ดี ไม่มีปัญหาอะไร ผู้ขายดูแลดีมาก แพ็คดี ส่งไว ขอบคุณมากนะครับ',
            'สินค้าดีเยี่ยม คุณภาพดี ตรงตามคำบรรยาย การติดต่อสื่อสารดีมาก ตอบเร็ว อธิบายละเอียด ส่งไวมากๆ ครับ'
        ]
    },
    4: {
        titles: [
            'ดีครับ โอเคมาก',
            'พอใจครับ สินค้าดี',
            'ดีครับ แนะนำได้',
            'โอเคมากครับ ของดี',
            'พอใจครับ ราคาดี'
        ],
        comments: [
            'สินค้าโอเคครับ ตรงตามที่บอกไว้ มีรอยนิดหน่อยตามอายุการใช้งาน แต่โดยรวมดีครับ ผู้ขายใจดี ขอบคุณครับ',
            'ของดีครับ ใช้งานได้ปกติ มีรอยเล็กน้อยแต่ไม่เป็นไร ผู้ขายตอบเร็ว ส่งไวมาก แนะนำได้ครับ',
            'โอเคครับ ราคานี้ถือว่าคุ้มค่า สภาพพอใช้ได้ ไม่มีปัญหาการใช้งาน ผู้ขายดีครับ ขอบคุณครับ',
            'พอใจครับ สภาพตามที่บรรยายไว้ มีตำหนิเล็กน้อยแต่ยังใช้งานได้ดี การติดต่อดี ส่งไว ขอบคุณครับ',
            'ดีครับ ของตามราคา มีรอยเล็กน้อยตามที่บอก แต่โดยรวมพอใจ ผู้ขายน่ารัก ส่งเร็ว ขอบคุณครับ'
        ]
    },
    3: {
        titles: [
            'พอใช้ได้ครับ',
            'โอเคครับ ราคานี้',
            'ใช้ได้ครับ ธรรมดา',
            'พอใช้ครับ',
            'โอเคครับ แต่มีตำหนิ'
        ],
        comments: [
            'ได้ของแล้วครับ สภาพตามที่บอก มีรอยค่อนข้างเยอะหน่อย แต่ยังใช้งานได้ครับ ราคานี้โอเค ผู้ขายตอบช้านิดหน่อย',
            'ของมาแล้ว มีตำหนิเล็กน้อยมากกว่าที่คิด แต่ยังพอใช้งานได้ ผู้ขายโอเค ส่งไวดีครับ',
            'พอใช้ได้ครับ สภาพพอใช้ มีรอยตามอายุใช้งาน แพ็คธรรมดา ผู้ขายตอบช้าหน่อย แต่โดยรวมโอเค',
            'โอเค มีตำหนิมากกว่าที่คาดหน่อย แต่ราคานี้พอรับได้ ใช้งานได้ปกติ ผู้ขายน่ารัก ขอบคุณครับ',
            'พอได้ครับ สินค้าตามราคา มีรอยใช้งานเยอะหน่อย แต่ฟังก์ชั่นยังใช้ได้ดี การติดต่อโอเค'
        ]
    }
};

// Get random item from array
function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Generate random rating (weighted towards higher ratings)
function generateRating() {
    const rand = Math.random();
    if (rand < 0.6) return 5; // 60% chance
    if (rand < 0.85) return 4; // 25% chance
    return 3; // 15% chance
}

// Generate sub-ratings based on main rating
function generateSubRatings(mainRating) {
    return {
        communication: mainRating + Math.floor(Math.random() * 2) - (mainRating === 5 ? 0 : 1),
        quality: mainRating,
        shipping: mainRating + Math.floor(Math.random() * 2) - (mainRating === 5 ? 0 : 1)
    };
}

// Main function
async function createReviews() {
    console.log('🔍 Finding completed orders without reviews...\n');

    // Get all completed orders that don't have reviews
    const orders = db.prepare(`
        SELECT o.*, oi.product_id, oi.product_title
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN reviews r ON o.id = r.order_id
        WHERE o.status = 'completed'
        AND r.id IS NULL
        ORDER BY o.completed_at DESC
    `).all();

    console.log(`📦 Found ${orders.length} completed orders without reviews\n`);

    if (orders.length === 0) {
        console.log('✅ No orders to create reviews for!');
        return;
    }

    let successCount = 0;
    let errorCount = 0;

    // Prepare insert statement
    const insertReview = db.prepare(`
        INSERT INTO reviews (
            id, order_id, reviewer_id, reviewed_user_id, product_id,
            rating, title, comment,
            communication_rating, item_quality_rating, shipping_rating,
            is_verified_purchase, is_visible,
            created_at, updated_at
        ) VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            1, 1,
            ?, ?
        )
    `);

    // Create reviews for each order
    for (const order of orders) {
        try {
            const rating = generateRating();
            const subRatings = generateSubRatings(rating);
            const template = reviewTemplates[rating];

            const reviewId = `REVIEW_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const title = getRandomItem(template.titles);
            const comment = getRandomItem(template.comments);

            // Random date between order completion and now
            const completedDate = new Date(order.completed_at);
            const now = new Date();
            const randomDate = new Date(completedDate.getTime() + Math.random() * (now.getTime() - completedDate.getTime()));

            insertReview.run(
                reviewId,
                order.id,
                order.buyer_id,
                order.seller_id,
                order.product_id,
                rating,
                title,
                comment,
                Math.max(1, Math.min(5, subRatings.communication)),
                Math.max(1, Math.min(5, subRatings.quality)),
                Math.max(1, Math.min(5, subRatings.shipping)),
                randomDate.toISOString(),
                randomDate.toISOString()
            );

            successCount++;
            console.log(`✅ Created review #${successCount}: Order ${order.order_number} - ${rating}⭐ - ${title}`);

        } catch (error) {
            errorCount++;
            console.error(`❌ Error creating review for order ${order.order_number}:`, error.message);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Successfully created ${successCount} reviews`);
    if (errorCount > 0) {
        console.log(`❌ Failed to create ${errorCount} reviews`);
    }
    console.log('='.repeat(60) + '\n');

    // Verify results
    const totalReviews = db.prepare('SELECT COUNT(*) as count FROM reviews').get();
    console.log(`📊 Total reviews in database: ${totalReviews.count}`);

    // Show rating distribution
    const distribution = db.prepare(`
        SELECT rating, COUNT(*) as count
        FROM reviews
        GROUP BY rating
        ORDER BY rating DESC
    `).all();

    console.log('\n📈 Rating Distribution:');
    distribution.forEach(d => {
        const stars = '⭐'.repeat(d.rating);
        const bar = '█'.repeat(Math.floor(d.count / 2));
        console.log(`  ${stars} (${d.rating}): ${bar} ${d.count}`);
    });
}

// Run the script
createReviews()
    .then(() => {
        db.close();
        console.log('\n✅ Script completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script failed:', error);
        db.close();
        process.exit(1);
    });
