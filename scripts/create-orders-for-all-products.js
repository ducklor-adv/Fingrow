import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to database
const dbPath = path.join(__dirname, '..', 'data', 'fingrow.db');
const db = new Database(dbPath);

console.log('🛒 Creating orders for all products...\n');

try {
    // Get all products
    const products = db.prepare(`
        SELECT id, seller_id, title, price_local, fin_fee_percent, amount_fee, status
        FROM products
        WHERE status = 'active'
        ORDER BY created_at ASC
    `).all();

    console.log(`Found ${products.length} active products\n`);

    // Get all users except the seller themselves
    const allUsers = db.prepare(`
        SELECT id, username, full_name
        FROM users
        ORDER BY created_at ASC
    `).all();

    console.log(`Found ${allUsers.length} total users\n`);

    if (products.length === 0 || allUsers.length < 2) {
        console.log('❌ Not enough products or users to create orders');
        process.exit(1);
    }

    // Fixed price for all orders
    const orderPrice = 300;

    // WLD exchange rate (mock rate)
    const wldRate = 50; // 1 WLD = 50 THB

    // Prepare insert statements
    const insertOrder = db.prepare(`
        INSERT INTO orders (
            id,
            order_number,
            buyer_id,
            seller_id,
            subtotal,
            shipping_cost,
            tax_amount,
            community_fee,
            total_amount,
            currency_code,
            wld_rate,
            total_wld,
            shipping_address,
            status,
            payment_status,
            order_date,
            confirmed_at,
            completed_at,
            created_at,
            updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    const insertOrderItem = db.prepare(`
        INSERT INTO order_items (
            id,
            order_id,
            product_id,
            quantity,
            unit_price,
            total_price,
            product_title,
            product_condition,
            product_image,
            created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    const updateProductStatus = db.prepare(`
        UPDATE products
        SET status = 'sold', updated_at = datetime('now')
        WHERE id = ?
    `);

    let successCount = 0;
    let errorCount = 0;
    let userIndex = 0;

    // Create orders for each product
    products.forEach((product, index) => {
        try {
            // Find a buyer (not the seller)
            let buyer = null;
            let attempts = 0;

            while (!buyer && attempts < allUsers.length) {
                const potentialBuyer = allUsers[userIndex % allUsers.length];
                if (potentialBuyer.id !== product.seller_id) {
                    buyer = potentialBuyer;
                }
                userIndex++;
                attempts++;
            }

            if (!buyer) {
                console.log(`⚠️  No suitable buyer found for product ${product.id}`);
                errorCount++;
                return;
            }

            // Calculate fees
            const subtotal = orderPrice;
            const shippingCost = 0;
            const taxAmount = 0;
            const finFeePercent = product.fin_fee_percent || 7;
            const communityFee = (orderPrice * finFeePercent) / 100; // Fin Fee
            const totalAmount = subtotal + shippingCost + taxAmount;
            const totalWld = totalAmount / wldRate;

            // Generate IDs
            const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const orderNumber = `ORD${String(successCount + 1).padStart(6, '0')}`;
            const orderItemId = `ITEM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Mock shipping address
            const shippingAddress = JSON.stringify({
                recipient_name: buyer.full_name || buyer.username,
                phone: '0812345678',
                address_line1: '123 Test Street',
                city: 'Bangkok',
                postal_code: '10100',
                country: 'TH'
            });

            // Parse product images
            let productImage = null;
            try {
                const images = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
                if (Array.isArray(images) && images.length > 0) {
                    productImage = images[0];
                }
            } catch (e) {
                // Use null for image
            }

            // Create order date (vary dates for realism)
            const daysAgo = Math.floor(Math.random() * 30); // Random date within last 30 days
            const orderDate = new Date();
            orderDate.setDate(orderDate.getDate() - daysAgo);
            const orderDateStr = orderDate.toISOString();

            const confirmedDate = new Date(orderDate);
            confirmedDate.setHours(confirmedDate.getHours() + 2);
            const confirmedDateStr = confirmedDate.toISOString();

            const completedDate = new Date(confirmedDate);
            completedDate.setDate(completedDate.getDate() + 3);
            const completedDateStr = completedDate.toISOString();

            // Randomize order status (80% completed, 20% other statuses)
            const statusRandom = Math.random();
            let orderStatus, paymentStatus, confirmedAt, completedAt;

            if (statusRandom < 0.8) {
                orderStatus = 'completed';
                paymentStatus = 'paid';
                confirmedAt = confirmedDateStr;
                completedAt = completedDateStr;
            } else if (statusRandom < 0.9) {
                orderStatus = 'shipped';
                paymentStatus = 'paid';
                confirmedAt = confirmedDateStr;
                completedAt = null;
            } else {
                orderStatus = 'confirmed';
                paymentStatus = 'paid';
                confirmedAt = confirmedDateStr;
                completedAt = null;
            }

            // Get seller info
            const seller = allUsers.find(u => u.id === product.seller_id);
            const sellerName = seller ? (seller.full_name || seller.username) : 'Unknown';

            // Insert order
            insertOrder.run(
                orderId,
                orderNumber,
                buyer.id,
                product.seller_id,
                subtotal,
                shippingCost,
                taxAmount,
                communityFee,
                totalAmount,
                'THB',
                wldRate,
                totalWld,
                shippingAddress,
                orderStatus,
                paymentStatus,
                orderDateStr,
                confirmedAt,
                completedAt
            );

            // Insert order item
            insertOrderItem.run(
                orderItemId,
                orderId,
                product.id,
                1, // quantity
                orderPrice,
                orderPrice,
                product.title,
                product.condition || 'ดีมาก',
                productImage
            );

            // Update product status to sold
            updateProductStatus.run(product.id);

            console.log(`✅ Order ${orderNumber} created`);
            console.log(`   Buyer: ${buyer.username} (${buyer.full_name})`);
            console.log(`   Seller: ${sellerName}`);
            console.log(`   Product: ${product.title}`);
            console.log(`   Price: ${orderPrice} THB`);
            console.log(`   Fin Fee: ${finFeePercent}% (${communityFee} THB)`);
            console.log(`   Status: ${orderStatus}`);
            console.log(`   Date: ${orderDate.toLocaleDateString('th-TH')}\n`);

            successCount++;

        } catch (error) {
            console.error(`❌ Error creating order for product ${product.id}:`, error.message);
            errorCount++;
        }
    });

    console.log('\n' + '='.repeat(70));
    console.log('📊 Summary:');
    console.log(`   Total products: ${products.length}`);
    console.log(`   ✅ Orders created: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   💰 Order price: ${orderPrice} THB`);
    console.log(`   💳 Average Fin Fee: 7%`);
    console.log('='.repeat(70));

    // Show statistics
    console.log('\n📈 Statistics:');
    const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get();
    const totalRevenue = db.prepare('SELECT SUM(total_amount) as total FROM orders WHERE status = "completed"').get();
    const totalFees = db.prepare('SELECT SUM(community_fee) as total FROM orders WHERE status = "completed"').get();

    console.log(`   Total orders in system: ${totalOrders.count}`);
    console.log(`   Total completed revenue: ${totalRevenue.total?.toLocaleString() || 0} THB`);
    console.log(`   Total Fin Fees collected: ${totalFees.total?.toLocaleString() || 0} THB`);

} catch (error) {
    console.error('❌ Fatal error:', error);
} finally {
    db.close();
}
