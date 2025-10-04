#!/usr/bin/env node

/**
 * Check Products Data
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);
const dbPath = join(projectRoot, 'data', 'fingrow.db');

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

console.log('🔍 Checking Products Data\n');

// Check products table structure
const columns = db.prepare('PRAGMA table_info(products)').all();
console.log('📋 Products Table Columns:');
columns.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`);
});

console.log('\n' + '─'.repeat(80) + '\n');

// Get sample products with seller info
const sampleProducts = db.prepare(`
    SELECT
        p.id,
        p.title,
        p.seller_id,
        u.username as seller_username,
        p.price_local,
        p.currency_code,
        p.fin_fee_percent,
        p.amount_fee,
        p.condition,
        p.status
    FROM products p
    LEFT JOIN users u ON p.seller_id = u.id
    LIMIT 10
`).all();

console.log(`📦 Sample Products (${sampleProducts.length} shown):\n`);

sampleProducts.forEach((product, index) => {
    console.log(`${index + 1}. ${product.title}`);
    console.log(`   Seller: ${product.seller_username || 'Unknown'} (${product.seller_id})`);
    console.log(`   Price: ${product.price_local} ${product.currency_code}`);
    console.log(`   Fin Fee: ${product.fin_fee_percent}% = ${product.amount_fee} ${product.currency_code}`);
    console.log(`   Condition: ${product.condition || 'N/A'}`);
    console.log(`   Status: ${product.status}`);
    console.log('');
});

// Check for missing data
console.log('─'.repeat(80) + '\n');
console.log('🔍 Data Quality Check:\n');

const missingData = db.prepare(`
    SELECT
        COUNT(*) as total,
        SUM(CASE WHEN seller_id IS NULL THEN 1 ELSE 0 END) as missing_seller,
        SUM(CASE WHEN price_local IS NULL THEN 1 ELSE 0 END) as missing_price,
        SUM(CASE WHEN fin_fee_percent IS NULL THEN 1 ELSE 0 END) as missing_fee_percent,
        SUM(CASE WHEN amount_fee IS NULL THEN 1 ELSE 0 END) as missing_fee_amount
    FROM products
`).get();

console.log(`Total Products: ${missingData.total}`);
console.log(`Missing Seller: ${missingData.missing_seller} (${((missingData.missing_seller / missingData.total) * 100).toFixed(1)}%)`);
console.log(`Missing Price: ${missingData.missing_price} (${((missingData.missing_price / missingData.total) * 100).toFixed(1)}%)`);
console.log(`Missing Fin Fee %: ${missingData.missing_fee_percent} (${((missingData.missing_fee_percent / missingData.total) * 100).toFixed(1)}%)`);
console.log(`Missing Fin Fee Amount: ${missingData.missing_fee_amount} (${((missingData.missing_fee_amount / missingData.total) * 100).toFixed(1)}%)`);

console.log('\n✅ Check complete');

db.close();
