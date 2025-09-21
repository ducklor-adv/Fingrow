import { initDatabase, TABLES, dbHelpers } from './lib/database.js';
import { productService } from './services/databaseService.js';

async function testIntegration() {
  try {
    console.log('🧪 Testing integrated system...');
    await initDatabase();

    // Test 1: Check if products are loaded correctly
    console.log('\n📦 Test 1: Loading products like the app does...');
    const { data: products, error: productsError } = await productService.getProducts();

    if (productsError) {
      console.error('❌ Error loading products:', productsError);
    } else {
      console.log('✅ Products loaded successfully:');
      products.forEach((product, index) => {
        console.log(`  ${index + 1}. ${product.title} - ${product.price_local} THB (${product.community_percentage}% community)`);
        console.log(`     Seller: @${product.seller?.username || 'Unknown'}`);
      });
    }

    // Test 2: Check user's products
    console.log('\n👤 Test 2: Loading user listings...');
    const { data: userProducts, error: userError } = await productService.getUserProducts('user-user');

    if (userError) {
      console.error('❌ Error loading user products:', userError);
    } else {
      console.log('✅ User products loaded successfully:');
      userProducts.forEach((product, index) => {
        console.log(`  ${index + 1}. ${product.title} - ${product.price_local} THB`);
        console.log(`     Status: ${product.status}, Available: ${product.is_available ? 'Yes' : 'No'}`);
      });
    }

    // Test 3: Create a new product (like the form would do)
    console.log('\n➕ Test 3: Creating new product...');
    const newProductData = {
      seller_id: 'user-user',
      category_id: 'cat-general',
      title: 'Test Product Integration',
      description: 'This is a test product created by integration test',
      condition: 'ดีมาก',
      price_local: 2500,
      currency_code: 'THB',
      location: JSON.stringify({ city: 'Bangkok', district: 'Test' }),
      images: JSON.stringify(['https://via.placeholder.com/150']),
      community_percentage: 4
    };

    const { data: newProduct, error: createError } = await productService.createProduct(newProductData);

    if (createError) {
      console.error('❌ Error creating product:', createError);
    } else {
      console.log('✅ Product created successfully:', newProduct.title);

      // Verify it appears in user's products
      const { data: updatedUserProducts } = await productService.getUserProducts('user-user');
      console.log(`   User now has ${updatedUserProducts?.length || 0} products`);
    }

    // Test 4: Get product detail
    if (products && products.length > 0) {
      console.log('\n🔍 Test 4: Getting product detail...');
      const { data: productDetail, error: detailError } = await productService.getProduct(products[0].id);

      if (detailError) {
        console.error('❌ Error getting product detail:', detailError);
      } else {
        console.log('✅ Product detail loaded:');
        console.log(`   Title: ${productDetail.title}`);
        console.log(`   Seller: @${productDetail.seller?.username || 'Unknown'}`);
        console.log(`   Category: ${productDetail.category?.name_th || 'Unknown'}`);
        console.log(`   Images: ${productDetail.images?.length || 0} items`);
      }
    }

    console.log('\n🎉 Integration test completed successfully!');
    console.log('\n📊 Final stats:');

    const { data: allUsers } = await dbHelpers.select(TABLES.USERS, '*');
    const { data: allProducts } = await dbHelpers.select(TABLES.PRODUCTS, '*');
    const { data: allCategories } = await dbHelpers.select(TABLES.CATEGORIES, '*');

    console.log(`   👤 Total users: ${allUsers?.length || 0}`);
    console.log(`   📦 Total products: ${allProducts?.length || 0}`);
    console.log(`   📂 Total categories: ${allCategories?.length || 0}`);

  } catch (error) {
    console.error('❌ Integration test failed:', error);
  }
}

testIntegration();