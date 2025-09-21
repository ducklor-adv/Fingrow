// Mock migration script for testing
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Mock database structure
let mockDB = {
    users: [
        {
            id: 'user-001',
            username: 'seller1',
            email: 'seller1@example.com',
            trust_score: 4.5
        },
        {
            id: 'user-002',
            username: 'seller2',
            email: 'seller2@example.com',
            trust_score: 4.2
        }
    ],
    products: [
        {
            id: 'prod-001',
            title: 'iPhone 14 Pro',
            seller_id: 'user-001',
            price_local: 35000,
            currency_code: 'THB'
        },
        {
            id: 'prod-002',
            title: 'MacBook Pro M2',
            seller_id: 'user-001',
            price_local: 65000,
            currency_code: 'THB'
        },
        {
            id: 'prod-003',
            title: 'iPad Air',
            seller_id: 'user-002',
            price_local: 25000,
            currency_code: 'THB'
        },
        {
            id: 'prod-004',
            title: 'Samsung Galaxy S23',
            seller_id: 'user-002',
            price_local: 28000,
            currency_code: 'THB'
        }
    ]
};

async function migrateProductsToDucklord() {
    console.log('🦆 Starting mock migration to ducklord...');

    try {
        // 1. Find or create ducklord user
        let ducklordUser = mockDB.users.find(u => u.username === 'ducklord');

        if (!ducklordUser) {
            console.log('❌ ducklord user not found, creating one...');
            ducklordUser = {
                id: 'ducklord-001',
                username: 'ducklord',
                email: 'ducklord@fingrow.com',
                full_name: 'Duck Lord',
                bio: 'The supreme duck ruler of all products',
                trust_score: 5.0,
                is_verified: true,
                referral_code: 'DUCKLORD2024',
                currency_code: 'THB'
            };
            mockDB.users.push(ducklordUser);
            console.log('✅ Created ducklord user:', ducklordUser);
        } else {
            console.log('✅ Found ducklord user:', ducklordUser);
        }

        // 2. Get all current products not owned by ducklord
        const productsToMigrate = mockDB.products.filter(p => p.seller_id !== ducklordUser.id);
        console.log(`📊 Found ${productsToMigrate.length} products to migrate`);

        if (productsToMigrate.length === 0) {
            console.log('ℹ️ No products to migrate (all already belong to ducklord)');
            return;
        }

        // 3. Show products before migration
        console.log('\n📦 Products before migration:');
        mockDB.products.forEach(product => {
            const seller = mockDB.users.find(u => u.id === product.seller_id);
            console.log(`  - ${product.title} (Owner: ${seller?.username || 'Unknown'})`);
        });

        // 4. Update all products to belong to ducklord
        console.log('\n🔄 Updating product ownership...');
        let migratedCount = 0;

        mockDB.products.forEach(product => {
            if (product.seller_id !== ducklordUser.id) {
                product.seller_id = ducklordUser.id;
                product.updated_at = new Date().toISOString();
                migratedCount++;
            }
        });

        console.log(`✅ Successfully migrated ${migratedCount} products to ducklord!`);

        // 5. Show products after migration
        console.log('\n📦 Products after migration:');
        mockDB.products.forEach(product => {
            const seller = mockDB.users.find(u => u.id === product.seller_id);
            console.log(`  - ${product.title} (Owner: ${seller?.username || 'Unknown'})`);
        });

        // 6. Display summary
        console.log('\n📈 Migration Summary:');
        console.log(`👑 New Owner: ${ducklordUser.username} (${ducklordUser.id})`);
        console.log(`📦 Products migrated: ${migratedCount}`);
        console.log('🎉 Mock migration completed successfully!');

        // 7. Save mock data to file
        const mockDataPath = join(__dirname, '..', 'data', 'mock-database.json');
        try {
            writeFileSync(mockDataPath, JSON.stringify(mockDB, null, 2));
            console.log(`💾 Mock data saved to: ${mockDataPath}`);
        } catch (error) {
            console.log('⚠️ Could not save mock data file (directory may not exist)');
        }

    } catch (error) {
        console.error('💥 Mock migration failed:', error);
    }
}

// Run migration if called directly
console.log('Script started...');
migrateProductsToDucklord();

export default migrateProductsToDucklord;