// Calculate and update amount_fee for all products
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);
const dbPath = join(projectRoot, 'data', 'fingrow.db');

const db = new Database(dbPath);

try {
    console.log('Calculating amount_fee for all products...\n');

    // Get all products
    const products = db.prepare('SELECT id, title, price_local, fin_fee_percent FROM products').all();

    console.log(`Found ${products.length} products to update\n`);

    let updatedCount = 0;

    // Update each product
    const updateStmt = db.prepare('UPDATE products SET amount_fee = ? WHERE id = ?');

    for (const product of products) {
        const amountFee = Math.round(product.price_local * (product.fin_fee_percent / 100));
        updateStmt.run(amountFee, product.id);
        updatedCount++;

        if (updatedCount <= 10) {
            console.log(`${product.title.substring(0, 40)}...`);
            console.log(`  Price: ฿${product.price_local.toLocaleString()}`);
            console.log(`  Fee Percent: ${product.fin_fee_percent}%`);
            console.log(`  Amount Fee: ${amountFee} FP\n`);
        }
    }

    console.log(`\n✓ Updated ${updatedCount} products with calculated amount_fee values`);

} catch (error) {
    console.error('Error:', error);
} finally {
    db.close();
}
