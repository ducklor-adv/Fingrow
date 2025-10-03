import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'data', 'fingrow.db');
const db = new Database(dbPath);

console.log('=== Sample Orders with Buyer and Seller ===\n');

const orders = db.prepare(`
    SELECT
        o.order_number,
        o.total_amount,
        o.community_fee,
        o.status,
        buyer.username as buyer_name,
        seller.username as seller_name,
        p.title
    FROM orders o
    LEFT JOIN users buyer ON o.buyer_id = buyer.id
    LEFT JOIN users seller ON o.seller_id = seller.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN products p ON oi.product_id = p.id
    LIMIT 10
`).all();

orders.forEach(o => {
    console.log(`Order: ${o.order_number}`);
    console.log(`  Buyer: ${o.buyer_name}`);
    console.log(`  Seller: ${o.seller_name}`);
    console.log(`  Product: ${o.title}`);
    console.log(`  Amount: ${o.total_amount} THB`);
    console.log(`  Fin Fee: ${o.community_fee} THB`);
    console.log(`  Status: ${o.status}\n`);
});

console.log('=== Statistics by User ===\n');

// Sales by user
const sales = db.prepare(`
    SELECT
        u.username,
        u.full_name,
        COUNT(o.id) as sale_count,
        SUM(o.total_amount) as total_sales,
        SUM(o.community_fee) as total_fees
    FROM users u
    LEFT JOIN orders o ON u.id = o.seller_id
    WHERE o.status = 'completed'
    GROUP BY u.id
    HAVING sale_count > 0
    ORDER BY total_sales DESC
    LIMIT 5
`).all();

console.log('Top 5 Sellers:');
sales.forEach(s => {
    console.log(`  ${s.username}: ${s.sale_count} orders, ${s.total_sales} THB revenue, ${s.total_fees} THB fees`);
});

console.log('\n');

// Purchases by user
const purchases = db.prepare(`
    SELECT
        u.username,
        u.full_name,
        COUNT(o.id) as purchase_count,
        SUM(o.total_amount) as total_spent
    FROM users u
    LEFT JOIN orders o ON u.id = o.buyer_id
    WHERE o.status = 'completed'
    GROUP BY u.id
    HAVING purchase_count > 0
    ORDER BY total_spent DESC
    LIMIT 5
`).all();

console.log('Top 5 Buyers:');
purchases.forEach(p => {
    console.log(`  ${p.username}: ${p.purchase_count} orders, ${p.total_spent} THB spent`);
});

db.close();
