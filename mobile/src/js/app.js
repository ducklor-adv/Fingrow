// Wrap app.js in IIFE to avoid duplicate declarations
(function() {
        // Initialize Database (using API Client instead of MockDatabase)
        let database = null;
        let allProducts = [];
        let filteredProducts = [];
        let currentFilters = {
            search: '',
            category: '',
            condition: '',
            sort: 'newest',
            currency: 'THB',
            minPrice: null,
            maxPrice: null
        };

        // Global users cache
        let globalUsersCache = [];
        let globalUsersCacheTimestamp = 0;
        const GLOBAL_CACHE_DURATION = 60000; // 1 minute

        // Function to load users from API
        async function loadUsersFromAPI() {
            const now = Date.now();
            if (globalUsersCache.length === 0 || (now - globalUsersCacheTimestamp) > GLOBAL_CACHE_DURATION) {
                try {
                    const apiClient = new ApiClient();
                    const response = await apiClient.request('/users');
                    if (response.success && response.data) {
                        globalUsersCache = response.data;
                        globalUsersCacheTimestamp = now;
                        // Also update database.users for backward compatibility
                        if (database) {
                            database.users = response.data;
                        }
                    }
                } catch (error) {
                    console.error('Failed to load users from API:', error);
                }
            }
            return globalUsersCache;
        }

        // Helper function to normalize users data to ensure it's always an Array
        function normalizeUsers(raw) {
            // Add debug logging for development
            if (typeof window !== 'undefined' && window.console) {
                console.debug('[Mobile] normalizeUsers input:', { raw, type: typeof raw, isArray: Array.isArray(raw) });
            }

            try {
                // If it's already an array, return as-is
                if (Array.isArray(raw)) {
                    return raw;
                }

                // If it's a string, try to parse as JSON
                if (typeof raw === 'string') {
                    const parsed = JSON.parse(raw);
                    return normalizeUsers(parsed); // Recursive call to handle nested cases
                }

                // If it's an object with users property, use that
                if (raw && typeof raw === 'object' && Array.isArray(raw.users)) {
                    return raw.users;
                }

                // If it's an object map, convert to array of values
                if (raw && typeof raw === 'object') {
                    const values = Object.values(raw);
                    // Check if values look like user objects
                    if (values.length > 0 && values[0] && typeof values[0] === 'object' && 'username' in values[0]) {
                        return values;
                    }
                }

                // Fallback: return empty array
                if (typeof window !== 'undefined' && window.console) {
                    console.warn('[Mobile] normalizeUsers fallback to empty array for:', raw);
                }
                return [];
            } catch (error) {
                if (typeof window !== 'undefined' && window.console) {
                    console.error('[Mobile] normalizeUsers error:', error, 'input:', raw);
                }
                return [];
            }
        }

        // Initialize database and load products
        async function initializeMarketplace() {
            try {
                // Initialize API Client
                database = new ApiClient();
                await database.initialize(); // Initialize and cache users
                console.log('✅ API Client initialized successfully');

                await loadProducts();
                console.log('✅ Marketplace initialized with', allProducts.length, 'products');
            } catch (error) {
                console.error('❌ Failed to initialize marketplace:', error);
                showError('ไม่สามารถโหลดข้อมูลสินค้าได้');
            }
        }

        // Product filter state
        let productFilterMode = 'available'; // 'available' or 'all'

        // Toggle product filter
        function toggleProductFilter(mode) {
            productFilterMode = mode;

            // Update button styles
            const availableBtn = document.getElementById('filterAvailable');
            const allBtn = document.getElementById('filterAll');

            if (mode === 'available') {
                availableBtn.style.background = '#10b981';
                availableBtn.style.color = 'white';
                allBtn.style.background = 'rgba(30, 41, 59, 0.8)';
                allBtn.style.color = '#a1a1aa';
            } else {
                availableBtn.style.background = 'rgba(30, 41, 59, 0.8)';
                availableBtn.style.color = '#a1a1aa';
                allBtn.style.background = '#10b981';
                allBtn.style.color = 'white';
            }

            // Re-render products with new filter
            loadProducts();
        }

        // Load products from database
        async function loadProducts() {
            try {
                // Load from API if not already loaded
                if (allProducts.length === 0) {
                    const response = await fetch('/api/products');
                    const data = await response.json();

                    if (data.success) {
                        allProducts = data.data || [];
                    }
                }

                // Filter based on current filter mode
                if (productFilterMode === 'available') {
                    filteredProducts = allProducts.filter(product => product.status === 'active');
                } else {
                    filteredProducts = [...allProducts]; // Show all products including sold ones
                }

                await renderProducts();
                updateProductsCount();
            } catch (error) {
                console.error('Failed to load products:', error);
                showError('เกิดข้อผิดพลาดในการโหลดสินค้า');
            }
        }

        // Render products to the grid
        async function renderProducts() {
            const productGrid = document.getElementById('productGrid');

            if (filteredProducts.length === 0) {
                productGrid.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #a1a1aa;">
                        <div style="font-size: 24px; margin-bottom: 8px;">🔍</div>
                        <div>ไม่พบสินค้าที่ตรงกับเงื่อนไขการค้นหา</div>
                    </div>
                `;
                return;
            }

            // Load users from API
            await loadUsersFromAPI();

            productGrid.innerHTML = filteredProducts.map(product => {
                const seller = globalUsersCache.find(user => user.id === product.seller_id) || { username: 'unknown', seller_rating: 0 };
                const categoryIcon = getCategoryIcon(product.category);
                const conditionText = getConditionText(product.condition);
                const priceDisplay = formatPrice(product);

                // Parse images
                let images = [];
                try {
                    if (typeof product.images === 'string') {
                        images = JSON.parse(product.images);
                    } else if (Array.isArray(product.images)) {
                        images = product.images;
                    }
                } catch (e) {
                    images = [];
                }

                const hasImages = images && images.length > 0;
                const firstImage = hasImages ? images[0] : null;

                const isSold = product.status === 'sold';

                return `
                    <div class="product-card" onclick="viewProduct('${product.id}')" style="${isSold ? 'opacity: 0.7;' : ''}">
                        <div class="product-image" style="position: relative;">
                            ${firstImage
                                ? `<img
                                    src="${firstImage}"
                                    alt="${product.title}"
                                    style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; ${isSold ? 'filter: grayscale(0.3);' : ''}"
                                    onerror="this.style.display='none'; this.parentElement.textContent='${categoryIcon} ${product.title.split(' ')[0]}'"
                                />`
                                : `<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #10b981; font-size: 24px;">${categoryIcon}</div>`
                            }
                            ${isSold ? `
                                <div style="position: absolute; top: 8px; right: 8px; background: rgba(239, 68, 68, 0.95); color: white; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                                    ขายแล้ว
                                </div>
                            ` : ''}
                        </div>
                        <div class="product-title" style="${isSold ? 'color: #9ca3af;' : ''}">${product.title}</div>
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px;">
                            <div class="product-price">${priceDisplay}</div>
                            <div style="display: flex; align-items: center; gap: 4px; font-size: 16px; color: #fbbf24;">
                                <span>💰</span>
                                <span style="font-weight: 600;">${product.amount_fee || 0} FP</span>
                            </div>
                        </div>
                        <div class="product-seller">
                            <div style="display: flex; align-items: center; justify-content: space-between;">
                                <span>@${seller?.username || 'unknown'}</span>
                                <div style="display: flex; align-items: center; font-size: 12px;">
                                    <span style="color: #fbbf24; margin-right: 2px;">${generateStarRating(seller?.seller_rating || 0)}</span>
                                    <span style="color: #6b7280;">(${(seller?.seller_rating || 0).toFixed(1)})</span>
                                </div>
                            </div>
                        </div>
                        <div class="product-stats">
                            <span>${conditionText}</span>
                            <button class="favorite-btn" onclick="toggleFavorite(event, ${product.id})">♡</button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Format price display (card view)
        function formatPrice(product) {
            const currencySymbol = getCurrencySymbol(product.price_currency || 'THB');
            const price = product.price || 0;
            return `${currencySymbol}${price.toLocaleString()}`;
        }

        // Format price for popup (with dual currency display)
        function formatPriceForPopup(product) {
            const currencySymbol = getCurrencySymbol(product.price_currency || 'THB');
            const price = product.price || 0;
            return `${currencySymbol}${price.toLocaleString()}`;
        }


        // Generate star rating display
        function generateStarRating(rating) {
            const fullStars = Math.floor(rating);
            const hasHalfStar = rating % 1 >= 0.5;
            const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

            let starsHTML = '';

            // Full stars
            for (let i = 0; i < fullStars; i++) {
                starsHTML += '<span class="star">★</span>';
            }

            // Half star
            if (hasHalfStar) {
                starsHTML += '<span class="star">☆</span>';
            }

            // Empty stars
            for (let i = 0; i < emptyStars; i++) {
                starsHTML += '<span class="star empty">☆</span>';
            }

            return starsHTML;
        }

        // Get currency symbol
        function getCurrencySymbol(currency) {
            const symbols = {
                'THB': '฿',
                'USD': '$',
                'EUR': '€',
                'JPY': '¥',
                'GBP': '£',
                'CNY': '¥',
                'KRW': '₩'
            };
            return symbols[currency] || currency + ' ';
        }

        // Get category icon
        function getCategoryIcon(category) {
            const icons = {
                'electronics': '📱',
                'gaming': '🎮',
                'camera': '📷',
                'fashion': '👕',
                'music': '🎵',
                'books': '📚',
                'home': '🏠',
                'sports': '⚽',
                'automotive': '🚗',
                'toys': '🎲',
                'beauty': '💄',
                'collectibles': '💎',
                'business': '💼'
            };
            return icons[category] || '📦';
        }

        // Get condition text
        function getConditionText(condition) {
            const conditions = {
                'new': 'ใหม่',
                'like-new': 'เหมือนใหม่',
                'excellent': 'ดีมาก',
                'good': 'ดี',
                'fair': 'ปานกลาง',
                'poor': 'เก่า'
            };
            return conditions[condition] || condition;
        }

        // Update products count
        function updateProductsCount() {
            const countElement = document.getElementById('productsCount');
            countElement.textContent = `${filteredProducts.length} รายการ`;
        }

        // Handle search
        function handleSearch() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            currentFilters.search = searchTerm;
            filterProducts();
        }

        // Filter products
        function filterProducts() {
            let filtered = [...allProducts];

            // Apply search filter
            if (currentFilters.search) {
                filtered = filtered.filter(product =>
                    product.title.toLowerCase().includes(currentFilters.search) ||
                    product.description.toLowerCase().includes(currentFilters.search)
                );
            }

            // Apply category filter
            if (currentFilters.category) {
                filtered = filtered.filter(product => product.category === currentFilters.category);
            }

            // Apply condition filter
            if (currentFilters.condition) {
                filtered = filtered.filter(product => product.condition === currentFilters.condition);
            }

            // Update filters from form
            currentFilters.category = document.getElementById('categoryFilter').value;
            currentFilters.condition = document.getElementById('conditionFilter').value;
            currentFilters.sort = document.getElementById('sortFilter').value;
            currentFilters.currency = document.getElementById('currencyFilter').value;

            // Update price filters from form
            const minPrice = parseFloat(document.getElementById('minPriceFilter').value);
            const maxPrice = parseFloat(document.getElementById('maxPriceFilter').value);
            currentFilters.minPrice = isNaN(minPrice) ? null : minPrice;
            currentFilters.maxPrice = isNaN(maxPrice) ? null : maxPrice;

            // Apply price range filter based on selected currency
            if (currentFilters.minPrice !== null || currentFilters.maxPrice !== null) {
                filtered = filtered.filter(product => {
                    // Use THB price for filtering
                    let productPrice = product.price || 0;

                    let passesMin = currentFilters.minPrice === null || productPrice >= currentFilters.minPrice;
                    let passesMax = currentFilters.maxPrice === null || productPrice <= currentFilters.maxPrice;

                    return passesMin && passesMax;
                });
            }

            // Apply sorting
            switch (currentFilters.sort) {
                case 'price-low':
                    filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
                    break;
                case 'price-high':
                    filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
                    break;
                case 'popular':
                    filtered.sort((a, b) => b.views - a.views);
                    break;
                case 'newest':
                default:
                    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                    break;
            }

            filteredProducts = filtered;
            renderProducts();
            updateProductsCount();
            updateSectionTitle();
        }

        // Format price number for display
        function formatPriceNumber(price) {
            if (currentFilters.currency === 'THB') {
                return parseFloat(price).toLocaleString('th-TH');
            } else {
                return parseFloat(price).toFixed(2);
            }
        }

        // Clear price filter
        function clearPriceFilter() {
            document.getElementById('minPriceFilter').value = '';
            document.getElementById('maxPriceFilter').value = '';
            document.getElementById('currencyFilter').value = 'THB';
            currentFilters.minPrice = null;
            currentFilters.maxPrice = null;
            currentFilters.currency = 'THB';
            filterProducts();
        }

        // Update section title based on filters
        function updateSectionTitle() {
            let title = 'สินค้าทั้งหมด';
            let titleParts = [];

            if (currentFilters.search) {
                title = `ผลการค้นหา: "${currentFilters.search}"`;
            } else if (currentFilters.category) {
                const categoryName = document.getElementById('categoryFilter').options[document.getElementById('categoryFilter').selectedIndex].text.split(' ')[1];
                titleParts.push(`หมวดหมู่: ${categoryName}`);
            }

            // Add price range to title
            if (currentFilters.minPrice !== null || currentFilters.maxPrice !== null) {
                const currencySymbol = currentFilters.currency === 'THB' ? '฿' : currentFilters.currency;
                let priceRange = '';

                if (currentFilters.minPrice !== null && currentFilters.maxPrice !== null) {
                    priceRange = `ราคา: ${formatPriceNumber(currentFilters.minPrice)}-${formatPriceNumber(currentFilters.maxPrice)} ${currencySymbol}`;
                } else if (currentFilters.minPrice !== null) {
                    priceRange = `ราคา: ${formatPriceNumber(currentFilters.minPrice)}+ ${currencySymbol}`;
                } else if (currentFilters.maxPrice !== null) {
                    priceRange = `ราคา: ≤${formatPriceNumber(currentFilters.maxPrice)} ${currencySymbol}`;
                }
                titleParts.push(priceRange);
            }

            if (titleParts.length > 0 && !currentFilters.search) {
                title = titleParts.join(' • ');
            }

            document.getElementById('productsSectionTitle').textContent = title;
        }

        // View product details (moved to product details section below)

        // Toggle favorite
        function toggleFavorite(event, productId) {
            event.stopPropagation();
            const btn = event.target;
            btn.classList.toggle('active');
            btn.textContent = btn.classList.contains('active') ? '♥' : '♡';
            console.log('Toggle favorite for product:', productId);
        }

        // Show error message
        function showError(message) {
            const productGrid = document.getElementById('productGrid');
            productGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #ef4444;">
                    <div style="font-size: 24px; margin-bottom: 8px;">⚠️</div>
                    <div>${message}</div>
                </div>
            `;
        }

        // Listings Tab Management
        function showListingsTab(tabName) {
            // Hide all tab contents
            document.getElementById('sellTabContent').style.display = 'none';
            document.getElementById('myProductsTabContent').style.display = 'none';
            document.getElementById('ordersTabContent').style.display = 'none';
            document.getElementById('notificationsTabContent').style.display = 'none';

            // Remove active class from all tab buttons
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.style.color = '#9ca3af';
                btn.style.borderBottom = 'none';
            });

            // Show selected tab content and activate button
            if (tabName === 'myProducts') {
                document.getElementById('myProductsTabContent').style.display = 'block';
                document.getElementById('myProductsTab').style.color = '#10b981';
                document.getElementById('myProductsTab').style.borderBottom = '2px solid #10b981';
                loadMyProducts();
            } else if (tabName === 'orders') {
                document.getElementById('ordersTabContent').style.display = 'block';
                document.getElementById('ordersTab').style.color = '#10b981';
                document.getElementById('ordersTab').style.borderBottom = '2px solid #10b981';
                loadMyOrders();
            } else if (tabName === 'notifications') {
                document.getElementById('notificationsTabContent').style.display = 'block';
                document.getElementById('notificationsTab').style.color = '#10b981';
                document.getElementById('notificationsTab').style.borderBottom = '2px solid #10b981';
                loadFullNotifications();
            }
        }

        // Show/hide create product form
        function showCreateProductForm() {
            document.getElementById('createProductForm').style.display = 'block';
            document.getElementById('myProductsList').style.display = 'none';
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function hideCreateProductForm() {
            document.getElementById('createProductForm').style.display = 'none';
            document.getElementById('myProductsList').style.display = 'block';
            // Reset form
            document.getElementById('createListingFormInProducts').reset();
            document.getElementById('imagePreview2').innerHTML = '';
        }

        async function loadMyProducts() {
            const content = document.getElementById('myProductsList');
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

            if (!currentUser.id) {
                content.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #9ca3af;">
                        <div style="font-size: 48px; margin-bottom: 16px;">🔒</div>
                        <div>กรุณาเข้าสู่ระบบเพื่อดูสินค้าของคุณ</div>
                    </div>
                `;
                return;
            }

            try {
                // Get products from API
                await loadProducts();
                const myProducts = allProducts.filter(product => product.seller_id === currentUser.id);

                if (myProducts.length === 0) {
                    content.innerHTML = `
                        <div style="text-align: center; padding: 40px; color: #9ca3af;">
                            <div style="font-size: 48px; margin-bottom: 16px;">📦</div>
                            <div>คุณยังไม่มีสินค้าลงขาย</div>
                            <div style="margin-top: 16px; color: #6b7280;">กดปุ่ม "➕ ลงขายสินค้า" เพื่อเริ่มขายสินค้า</div>
                        </div>
                    `;
                } else {
                    let productsHTML = '';
                    myProducts.forEach(product => {
                        const categoryIcon = getCategoryIcon(product.category);
                        const conditionText = getConditionText(product.condition);
                        const priceDisplay = formatPrice(product);
                        const viewCount = product.view_count || 0;

                        // Parse images
                        let images = [];
                        try {
                            if (typeof product.images === 'string') {
                                images = JSON.parse(product.images);
                            } else if (Array.isArray(product.images)) {
                                images = product.images;
                            }
                        } catch (e) {
                            images = [];
                        }

                        const hasImages = images && images.length > 0;
                        const firstImage = hasImages ? images[0] : null;

                        const isSold = product.status === 'sold';
                        const isActive = product.status === 'active';

                        productsHTML += `
                            <div class="product-card" onclick="viewProduct('${product.id}')" style="${isSold ? 'opacity: 0.7;' : ''}">
                                <div class="product-image" style="position: relative;">
                                    ${firstImage
                                        ? `<img
                                            src="${firstImage}"
                                            alt="${product.title}"
                                            style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; ${isSold ? 'filter: grayscale(0.3);' : ''}"
                                            onerror="this.style.display='none'; this.parentElement.textContent='${categoryIcon} ${product.title.split(' ')[0]}'"
                                        />`
                                        : `<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #10b981; font-size: 24px;">${categoryIcon}</div>`
                                    }
                                    ${isSold ? `
                                        <div style="position: absolute; top: 8px; right: 8px; background: rgba(239, 68, 68, 0.95); color: white; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                                            ขายแล้ว
                                        </div>
                                    ` : isActive ? `
                                        <div style="position: absolute; top: 8px; right: 8px; background: rgba(16, 185, 129, 0.95); color: white; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                                            กำลังขาย
                                        </div>
                                    ` : `
                                        <div style="position: absolute; top: 8px; right: 8px; background: rgba(156, 163, 175, 0.95); color: white; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                                            หยุดขาย
                                        </div>
                                    `}
                                    ${viewCount > 0 ? `
                                        <div style="position: absolute; top: 8px; left: 8px; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                                            👁️ ${viewCount}
                                        </div>
                                    ` : ''}
                                </div>
                                <div class="product-title" style="${isSold ? 'color: #9ca3af;' : ''}">${product.title}</div>
                                <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px;">
                                    <div class="product-price">${priceDisplay}</div>
                                    <div style="display: flex; align-items: center; gap: 4px; font-size: 16px; color: #fbbf24;">
                                        <span>💰</span>
                                        <span style="font-weight: 600;">${product.amount_fee || 0} FP</span>
                                    </div>
                                </div>
                                <div class="product-seller">ขายโดยคุณ</div>
                                <div class="product-stats">
                                    <span>${conditionText}</span>
                                    <button class="favorite-btn" onclick="editProduct(event, '${product.id}')" style="background: #3b82f6; color: white; border: none; border-radius: 4px; padding: 4px 12px; font-size: 12px; font-weight: 500;">✏️ แก้ไข</button>
                                </div>
                            </div>
                        `;
                    });

                    content.innerHTML = `
                        <div style="margin-bottom: 16px; padding: 12px; background: #f3f4f6; border-radius: 8px; border-left: 4px solid #10b981;">
                            <div style="font-weight: 600; color: #374151;">สินค้าของฉัน (${myProducts.length} รายการ)</div>
                        </div>
                        <div class="product-grid">
                            ${productsHTML}
                        </div>
                    `;
                }
            } catch (error) {
                console.error('Error loading my products:', error);
                content.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #ef4444;">
                        <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
                        <div>เกิดข้อผิดพลาดในการโหลดสินค้า</div>
                    </div>
                `;
            }
        }

        async function loadMyOrders() {
            const content = document.getElementById('ordersTabContent');
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

            if (!currentUser.id) {
                content.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #9ca3af;">
                        <div style="font-size: 48px; margin-bottom: 16px;">🔒</div>
                        <div>กรุณาเข้าสู่ระบบเพื่อดูคำสั่งซื้อของคุณ</div>
                    </div>
                `;
                return;
            }

            try {
                // Fetch orders from API
                const response = await fetch('/api/orders');
                const data = await response.json();

                if (!data.success || !data.data) {
                    throw new Error('Failed to load orders');
                }

                // Filter orders where current user is buyer or seller
                const myOrders = data.data.filter(order =>
                    order.buyer_id === currentUser.id || order.seller_id === currentUser.id
                );

                if (myOrders.length === 0) {
                    content.innerHTML = `
                        <div style="text-align: center; padding: 40px; color: #9ca3af;">
                            <div style="font-size: 48px; margin-bottom: 16px;">📦</div>
                            <div>คุณยังไม่มีคำสั่งซื้อ</div>
                            <div style="margin-top: 16px; color: #6b7280;">ไปที่ตลาดเพื่อเริ่มซื้อสินค้า</div>
                        </div>
                    `;
                    return;
                }

                // Render orders
                let ordersHTML = myOrders.map(order => {
                    const isBuyer = order.buyer_id === currentUser.id;
                    const otherParty = isBuyer ? order.seller_username : order.buyer_username;
                    const statusColors = {
                        pending: '#f59e0b',
                        completed: '#10b981',
                        cancelled: '#ef4444'
                    };
                    const statusText = {
                        pending: 'รอดำเนินการ',
                        completed: 'เสร็จสิ้น',
                        cancelled: 'ยกเลิก'
                    };

                    // Border color: Red for buyer, Green for seller
                    const borderColor = isBuyer ? '#ef4444' : '#10b981';
                    const borderShadow = isBuyer ? 'rgba(239, 68, 68, 0.5)' : 'rgba(16, 185, 129, 0.5)';

                    return `
                        <div style="background: white; border-radius: 8px; padding: 16px; margin-bottom: 12px; border: 3px solid ${borderColor}; box-shadow: 0 0 15px ${borderShadow};">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <div style="font-weight: 600; color: #374151;">${order.product_title || 'สินค้า'}</div>
                                <div style="background: ${statusColors[order.status] || '#6b7280'}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                                    ${statusText[order.status] || order.status}
                                </div>
                            </div>
                            <div style="color: #6b7280; font-size: 14px; margin-bottom: 4px;">
                                ${isBuyer ? '🛒 ซื้อจาก' : '💰 ขายให้'}: @${otherParty || 'ไม่ทราบ'}
                            </div>
                            <div style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">
                                📅 ${new Date(order.order_date || order.created_at).toLocaleDateString('th-TH', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                                <div style="font-weight: 600; color: #10b981; font-size: 16px;">
                                    ${order.total_price ? `฿${order.total_price.toLocaleString()}` : 'N/A'}
                                </div>
                                <div style="color: #6b7280; font-size: 12px;">
                                    Order #${order.id.slice(-8)}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');

                content.innerHTML = `
                    <div style="margin-bottom: 16px; padding: 12px; background: #f3f4f6; border-radius: 8px; border-left: 4px solid #10b981;">
                        <div style="font-weight: 600; color: #374151;">คำสั่งซื้อของฉัน (${myOrders.length} รายการ)</div>
                    </div>
                    ${ordersHTML}
                `;

            } catch (error) {
                console.error('Error loading orders:', error);
                content.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #ef4444;">
                        <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
                        <div>เกิดข้อผิดพลาดในการโหลดคำสั่งซื้อ</div>
                    </div>
                `;
            }
        }

        function showPage(pageId) {
            // Authentication guard - redirect to login if not authenticated
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
            const authPages = ['login', 'register'];

            if (!currentUser && !authPages.includes(pageId)) {
                // User not logged in and trying to access protected page
                showPage('login');
                return;
            }

            // Hide all pages
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
            });

            // Remove active from all nav items
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });

            // Show selected page
            const targetPage = document.getElementById(pageId);
            if (targetPage) {
                targetPage.classList.add('active');
            } else {
                console.error('Page not found:', pageId);
                return;
            }

            // Show/hide bottom navigation based on page
            const bottomNav = document.querySelector('.bottom-nav');
            if (authPages.includes(pageId)) {
                // Hide bottom nav on login/register pages
                bottomNav.style.display = 'none';
            } else {
                // Show bottom nav on other pages
                bottomNav.style.display = 'flex';
            }

            // Notification bell is always visible, no need to hide

            // Special handling for listings page
            if (pageId === 'listings') {
                // Always show notifications tab by default
                setTimeout(() => showListingsTab('notifications'), 10);
            }

            // Special handling for referrals/network page
            if (pageId === 'referrals') {
                loadReferralsData();
            }

            // Special handling for register page - check for invite code in URL
            if (pageId === 'register') {
                setTimeout(async () => {
                    const urlParams = new URLSearchParams(window.location.search);
                    const inviteCode = urlParams.get('invite') || urlParams.get('ref');

                    if (inviteCode) {
                        console.log('[Register] Detected invite code from URL:', inviteCode);
                        await verifyAndShowReferrer(inviteCode);
                    } else {
                        // Check sessionStorage for referral code
                        const storedCode = sessionStorage.getItem('referralCode');
                        if (storedCode) {
                            console.log('[Register] Using stored invite code:', storedCode);
                            await verifyAndShowReferrer(storedCode);
                            sessionStorage.removeItem('referralCode');
                        } else {
                            showReferralState('none');
                        }
                    }
                }, 100);
            }

            // Legacy redirect handling
            if (pageId === 'create' || pageId === 'orders') {
                // Redirect old pages to new listings page
                showPage('listings');
                return;
            }

            // Add active to clicked nav item
            if (event && event.target) {
                const navItem = event.target.closest('.nav-item');
                if (navItem) {
                    navItem.classList.add('active');
                }
            }

            // Load data for marketplace page
            if (pageId === 'marketplace' && allProducts.length === 0) {
                loadProducts();
            }
            // Load data for chats list page
            if (pageId === 'chatsList') {
                loadChatsList();
            }
            // Load data for profile page
            if (pageId === 'profile') {
                loadProfileData();
            }
            // Load data for earnings page
            if (pageId === 'earnings') {
                loadEarningsData();
            }
        }

        // Handle favorite buttons
        document.querySelectorAll('.favorite-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                this.classList.toggle('active');
                this.textContent = this.classList.contains('active') ? '♥' : '♡';
            });
        });

        // Initial load and periodic updates
        loadExchangeRates();
        setInterval(loadExchangeRates, 300000); // Update exchange rates every 5 minutes

        // Initialize exchange rate section
        setTimeout(() => {
            const initialCurrency = document.getElementById('priceCurrency').value;
            updateExchangeRateSection(initialCurrency);
        }, 100);

        // Exchange Rates (will be updated from API)
        let exchangeRates = {
            THB: { rate: 1, name: 'บาทไทย' },
            USD: { rate: 0.029, name: 'ดอลลาร์สหรัฐ' },
            EUR: { rate: 0.027, name: 'ยูโร' },
            JPY: { rate: 4.2, name: 'เยน' },
            GBP: { rate: 0.023, name: 'ปอนด์' },
            CNY: { rate: 0.21, name: 'หยวน' },
            KRW: { rate: 39, name: 'วอน' }
        };

        // Rate lock state
        let lockedRate = null;
        let lockedCurrency = null;
        let rateLockedAt = null;

        // Update currency labels
        function updateCurrencyLabel() {
            const selectedCurrency = document.getElementById('priceCurrency').value;
            document.getElementById('currencyLabel').textContent = selectedCurrency;
            document.getElementById('auctionStartCurrencyLabel').textContent = selectedCurrency;
            document.getElementById('auctionBuyNowCurrencyLabel').textContent = selectedCurrency;
            document.getElementById('shippingCurrencyLabel').textContent = selectedCurrency;

            // Update exchange rate section
            updateExchangeRateSection(selectedCurrency);

            // Update fin fee calculation
            updateFinFeeCalculation();
        }

        // Update exchange rate section
        function updateExchangeRateSection(currency) {
            const exchangeRateSection = document.getElementById('exchangeRateSection');
            const currentCurrencyEl = document.getElementById('currentCurrency');
            const currentRateEl = document.getElementById('currentRate');

            if (!exchangeRateSection) return;

            exchangeRateSection.style.display = 'block';
            if (currentCurrencyEl) currentCurrencyEl.textContent = currency;

            const currentRate = lockedRate && lockedCurrency === currency ? lockedRate : exchangeRates[currency]?.rate;
            if (currentRateEl) currentRateEl.textContent = currentRate ? currentRate.toFixed(6) : '0.000000';

            // Update status
            updateRateStatus();
        }

        // Update rate status display
        function updateRateStatus() {
            const statusEl = document.getElementById('exchangeRateStatus');
            const currency = document.getElementById('priceCurrency').value;

            if (lockedRate && lockedCurrency === currency) {
                statusEl.textContent = `ล็อคแล้ว (${new Date(rateLockedAt).toLocaleTimeString('th-TH')})`;
                statusEl.style.color = '#10b981';
                document.getElementById('rateLockedInfo').style.display = 'block';
                document.getElementById('lockRateBtn').textContent = '🔓 ยกเลิกล็อค';
            } else {
                statusEl.textContent = 'อัตราปัจจุบัน';
                statusEl.style.color = '#a1a1aa';
                document.getElementById('rateLockedInfo').style.display = 'none';
                document.getElementById('lockRateBtn').textContent = '🔒 ล็อคอัตราแลกเปลี่ยน';
            }
        }


        // Update Fin Fee Calculation
        function updateFinFeeCalculation() {
            const price = parseFloat(document.getElementById('productPrice').value) || 0;
            const currency = document.getElementById('priceCurrency').value;
            const feePercent = parseFloat(document.getElementById('finFeePercent').value) || 2.0;

            // Calculate fee amount
            const feeAmount = price * (feePercent / 100);
            const sellerReceive = price - feeAmount;

            // Update display
            document.getElementById('finFeePercentDisplay').textContent = feePercent.toFixed(1) + '%';
            document.getElementById('feePercentText').textContent = feePercent.toFixed(1);
            document.getElementById('priceValue').textContent = price.toFixed(2);
            document.getElementById('feeValue').textContent = feeAmount.toFixed(2);
            document.getElementById('receiveValue').textContent = sellerReceive.toFixed(2);

            // Update currency labels
            document.getElementById('priceCurrencyDisplay').textContent = currency;
            document.getElementById('feeCurrencyDisplay').textContent = currency;
            document.getElementById('receiveCurrencyDisplay').textContent = currency;

            // Store values in hidden inputs
            document.getElementById('finFeePercentValue').value = feePercent;
            document.getElementById('amountFeeValue').value = feeAmount.toFixed(2);
        }

        // Update Fin Fee Calculation for form 2
        function updateFinFeeCalculation2() {
            const price = parseFloat(document.getElementById('productPrice2').value) || 0;
            const currency = document.getElementById('priceCurrency2').value;
            const feePercent = parseFloat(document.getElementById('finFeePercent2').value) || 2.0;

            // Calculate fee amount
            const feeAmount = price * (feePercent / 100);
            const sellerReceive = price - feeAmount;

            // Update display
            document.getElementById('finFeePercentDisplay2').textContent = feePercent.toFixed(1) + '%';
            document.getElementById('feePercentText2').textContent = feePercent.toFixed(1);
            document.getElementById('priceValue2').textContent = price.toFixed(2);
            document.getElementById('feeValue2').textContent = feeAmount.toFixed(2);
            document.getElementById('receiveValue2').textContent = sellerReceive.toFixed(2);

            // Update currency labels
            document.getElementById('priceCurrencyDisplay2').textContent = currency;
            document.getElementById('feeCurrencyDisplay2').textContent = currency;
            document.getElementById('receiveCurrencyDisplay2').textContent = currency;

            // Store values in hidden inputs
            document.getElementById('finFeePercentValue2').value = feePercent;
            document.getElementById('amountFeeValue2').value = feeAmount.toFixed(2);
        }

        // Helper functions for form 2
        function updateSubCategories2() {
            const category = document.getElementById('productCategory2').value;
            const subCategorySelect = document.getElementById('productSubCategory2');

            // Clear existing options
            subCategorySelect.innerHTML = '<option value="">เลือกหมวดหมู่ย่อย</option>';

            const subCategories = {
                electronics: [
                    { value: 'smartphones', text: 'โทรศัพท์มือถือ' },
                    { value: 'laptops', text: 'แล็ปท็อป' },
                    { value: 'tablets', text: 'แท็บเล็ต' },
                    { value: 'cameras', text: 'กล้องถ่ายรูป' },
                    { value: 'audio', text: 'อุปกรณ์เสียง' },
                    { value: 'gaming', text: 'เกมมิ่ง' },
                    { value: 'smart-home', text: 'Smart Home' },
                    { value: 'accessories', text: 'อุปกรณ์เสริม' }
                ],
                fashion: [
                    { value: 'mens-clothing', text: 'เสื้อผ้าผู้ชาย' },
                    { value: 'womens-clothing', text: 'เสื้อผ้าผู้หญิง' },
                    { value: 'shoes', text: 'รองเท้า' },
                    { value: 'bags', text: 'กระเป๋า' },
                    { value: 'watches', text: 'นาฬิกา' },
                    { value: 'jewelry', text: 'เครื่องประดับ' },
                    { value: 'kids-clothing', text: 'เสื้อผ้าเด็ก' }
                ],
                home: [
                    { value: 'furniture', text: 'เฟอร์นิเจอร์' },
                    { value: 'appliances', text: 'เครื่องใช้ไฟฟ้า' },
                    { value: 'kitchenware', text: 'อุปกรณ์ครัว' },
                    { value: 'bedding', text: 'ที่นอนและเครื่องนอน' },
                    { value: 'decor', text: 'ของตกแต่ง' },
                    { value: 'garden', text: 'สวนและระเบียง' }
                ],
                sports: [
                    { value: 'fitness', text: 'ออกกำลังกาย' },
                    { value: 'outdoor', text: 'กิจกรรมกลางแจ้ง' },
                    { value: 'team-sports', text: 'กีฬาประเภททีม' },
                    { value: 'water-sports', text: 'กีฬาทางน้ำ' },
                    { value: 'winter-sports', text: 'กีฬาฤดูหนาว' }
                ],
                automotive: [
                    { value: 'car-parts', text: 'อะไหล่รถยนต์' },
                    { value: 'motorcycle-parts', text: 'อะไหล่มอเตอร์ไซค์' },
                    { value: 'car-accessories', text: 'อุปกรณ์เสริมรถยนต์' },
                    { value: 'tools', text: 'เครื่องมือซ่อม' }
                ],
                books: [
                    { value: 'textbooks', text: 'หนังสือเรียน' },
                    { value: 'fiction', text: 'นิยาย' },
                    { value: 'non-fiction', text: 'สารคดี' },
                    { value: 'comics', text: 'การ์ตูน/มังงะ' },
                    { value: 'magazines', text: 'นิตยสาร' }
                ],
                toys: [
                    { value: 'action-figures', text: 'ฟิกเกอร์/โมเดล' },
                    { value: 'board-games', text: 'เกมกระดาน' },
                    { value: 'educational', text: 'ของเล่นเพื่อการศึกษา' },
                    { value: 'stuffed-animals', text: 'ตุ๊กตา' },
                    { value: 'puzzles', text: 'จิ๊กซอว์' }
                ],
                beauty: [
                    { value: 'skincare', text: 'ผลิตภัณฑ์บำรุงผิว' },
                    { value: 'makeup', text: 'เครื่องสำอาง' },
                    { value: 'fragrances', text: 'น้ำหอม' },
                    { value: 'hair-care', text: 'บำรุงเส้นผม' },
                    { value: 'health', text: 'สุขภาพ' }
                ],
                collectibles: [
                    { value: 'coins', text: 'เหรียญสะสม' },
                    { value: 'stamps', text: 'แสตมป์' },
                    { value: 'vintage', text: 'ของโบราณ' },
                    { value: 'art', text: 'งานศิลปะ' },
                    { value: 'memorabilia', text: 'ของที่ระลึก' }
                ],
                business: [
                    { value: 'office-supplies', text: 'อุปกรณ์สำนักงาน' },
                    { value: 'machinery', text: 'เครื่องจักร' },
                    { value: 'restaurant', text: 'อุปกรณ์ร้านอาหาร' },
                    { value: 'retail', text: 'อุปกรณ์ค้าปลีก' }
                ]
            };

            if (subCategories[category]) {
                subCategories[category].forEach(sub => {
                    const option = document.createElement('option');
                    option.value = sub.value;
                    option.textContent = sub.text;
                    subCategorySelect.appendChild(option);
                });
            }
        }

        function toggleAuctionFields2() {
            const listingType = document.getElementById('listingType2').value;
            const auctionFields = document.getElementById('auctionFields2');

            if (listingType === 'auction' || listingType === 'both') {
                auctionFields.style.display = 'block';
            } else {
                auctionFields.style.display = 'none';
            }
        }

        function toggleShippingPrice2() {
            const shippingType = document.getElementById('shippingType2').value;
            const shippingPriceGroup = document.getElementById('shippingPriceGroup2');

            if (shippingType === 'flat' || shippingType === 'calculated') {
                shippingPriceGroup.style.display = 'block';
            } else {
                shippingPriceGroup.style.display = 'none';
            }
        }

        function updateCurrencyLabel2() {
            const selectedCurrency = document.getElementById('priceCurrency2').value;
            document.getElementById('currencyLabel2').textContent = selectedCurrency;
            document.getElementById('auctionStartCurrencyLabel2').textContent = selectedCurrency;
            document.getElementById('auctionBuyNowCurrencyLabel2').textContent = selectedCurrency;
            document.getElementById('shippingCurrencyLabel2').textContent = selectedCurrency;

            // Update fin fee calculation
            updateFinFeeCalculation2();
        }

        // Load exchange rates from API
        async function loadExchangeRates() {
            try {
                // Get exchange rates relative to THB
                const response = await fetch('https://api.exchangerate-api.com/v4/latest/THB', {
                    signal: AbortSignal.timeout(10000)
                });

                if (response.ok) {
                    const data = await response.json();
                    const rates = data.rates;

                    if (rates) {
                        // Update exchange rates
                        exchangeRates = {
                            THB: { rate: 1, name: 'บาทไทย' },
                            USD: { rate: rates.USD || 0.029, name: 'ดอลลาร์สหรัฐ' },
                            EUR: { rate: rates.EUR || 0.027, name: 'ยูโร' },
                            JPY: { rate: rates.JPY || 4.2, name: 'เยน' },
                            GBP: { rate: rates.GBP || 0.023, name: 'ปอนด์' },
                            CNY: { rate: rates.CNY || 0.21, name: 'หยวน' },
                            KRW: { rate: rates.KRW || 39, name: 'วอน' }
                        };
                        console.log('Exchange rates updated:', exchangeRates);

                        // Update display if not locked
                        const currency = document.getElementById('priceCurrency')?.value;
                        if (currency && (!lockedCurrency || lockedCurrency !== currency)) {
                            updateExchangeRateSection(currency);
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to load exchange rates:', error);
                // Use default rates if API fails
            }
        }

        // Lock current exchange rate
        function lockExchangeRate() {
            const currency = document.getElementById('priceCurrency').value;

            if (lockedRate && lockedCurrency === currency) {
                // Unlock rate
                lockedRate = null;
                lockedCurrency = null;
                rateLockedAt = null;
                console.log('Exchange rate unlocked');
            } else {
                // Lock current rate
                lockedRate = exchangeRates[currency]?.rate;
                lockedCurrency = currency;
                rateLockedAt = new Date().toISOString();
                console.log(`Exchange rate locked: 1 ${currency} = ${lockedRate.toFixed(6)}`);
            }

            updateRateStatus();
        }

        // Refresh exchange rate (force update)
        async function refreshExchangeRate() {
            const statusEl = document.getElementById('exchangeRateStatus');
            if (statusEl) {
                statusEl.textContent = 'กำลังอัพเดท...';
                statusEl.style.color = '#fbbf24';
            }

            await loadExchangeRates();

            const currency = document.getElementById('priceCurrency').value;
            updateExchangeRateSection(currency);
        }

        // Create Listing Form Functions
        function updateSubCategories() {
            const category = document.getElementById('productCategory').value;
            const subCategorySelect = document.getElementById('productSubCategory');

            // Clear existing options
            subCategorySelect.innerHTML = '<option value="">เลือกหมวดหมู่ย่อย</option>';

            const subCategories = {
                electronics: [
                    { value: 'smartphones', text: 'โทรศัพท์มือถือ' },
                    { value: 'laptops', text: 'แล็ปท็อป' },
                    { value: 'tablets', text: 'แท็บเล็ต' },
                    { value: 'cameras', text: 'กล้องถ่ายรูป' },
                    { value: 'audio', text: 'อุปกรณ์เสียง' },
                    { value: 'gaming', text: 'เกมมิ่ง' },
                    { value: 'smart-home', text: 'Smart Home' },
                    { value: 'accessories', text: 'อุปกรณ์เสริม' }
                ],
                fashion: [
                    { value: 'mens-clothing', text: 'เสื้อผ้าผู้ชาย' },
                    { value: 'womens-clothing', text: 'เสื้อผ้าผู้หญิง' },
                    { value: 'shoes', text: 'รองเท้า' },
                    { value: 'bags', text: 'กระเป๋า' },
                    { value: 'watches', text: 'นาฬิกา' },
                    { value: 'jewelry', text: 'เครื่องประดับ' },
                    { value: 'kids-clothing', text: 'เสื้อผ้าเด็ก' }
                ],
                home: [
                    { value: 'furniture', text: 'เฟอร์นิเจอร์' },
                    { value: 'appliances', text: 'เครื่องใช้ไฟฟ้า' },
                    { value: 'kitchenware', text: 'อุปกรณ์ครัว' },
                    { value: 'bedding', text: 'ที่นอนและเครื่องนอน' },
                    { value: 'decor', text: 'ของตกแต่ง' },
                    { value: 'garden', text: 'สวนและระเบียง' }
                ],
                sports: [
                    { value: 'fitness', text: 'ออกกำลังกาย' },
                    { value: 'outdoor', text: 'กิจกรรมกลางแจ้ง' },
                    { value: 'team-sports', text: 'กีฬาประเภททีม' },
                    { value: 'water-sports', text: 'กีฬาทางน้ำ' },
                    { value: 'winter-sports', text: 'กีฬาฤดูหนาว' }
                ],
                automotive: [
                    { value: 'car-parts', text: 'อะไหล่รถยนต์' },
                    { value: 'motorcycle-parts', text: 'อะไหล่มอเตอร์ไซค์' },
                    { value: 'car-accessories', text: 'อุปกรณ์เสริมรถยนต์' },
                    { value: 'tools', text: 'เครื่องมือซ่อม' }
                ],
                books: [
                    { value: 'textbooks', text: 'หนังสือเรียน' },
                    { value: 'fiction', text: 'นิยาย' },
                    { value: 'non-fiction', text: 'สารคดี' },
                    { value: 'comics', text: 'การ์ตูน/มังงะ' },
                    { value: 'magazines', text: 'นิตยสาร' }
                ],
                toys: [
                    { value: 'action-figures', text: 'ฟิกเกอร์/โมเดล' },
                    { value: 'board-games', text: 'เกมกระดาน' },
                    { value: 'educational', text: 'ของเล่นเพื่อการศึกษา' },
                    { value: 'stuffed-animals', text: 'ตุ๊กตา' },
                    { value: 'puzzles', text: 'จิ๊กซอว์' }
                ],
                beauty: [
                    { value: 'skincare', text: 'ผลิตภัณฑ์บำรุงผิว' },
                    { value: 'makeup', text: 'เครื่องสำอาง' },
                    { value: 'fragrances', text: 'น้ำหอม' },
                    { value: 'hair-care', text: 'บำรุงเส้นผม' },
                    { value: 'health', text: 'สุขภาพ' }
                ],
                collectibles: [
                    { value: 'coins', text: 'เหรียญสะสม' },
                    { value: 'stamps', text: 'แสตมป์' },
                    { value: 'vintage', text: 'ของโบราณ' },
                    { value: 'art', text: 'งานศิลปะ' },
                    { value: 'memorabilia', text: 'ของที่ระลึก' }
                ],
                business: [
                    { value: 'office-supplies', text: 'อุปกรณ์สำนักงาน' },
                    { value: 'machinery', text: 'เครื่องจักร' },
                    { value: 'restaurant', text: 'อุปกรณ์ร้านอาหาร' },
                    { value: 'retail', text: 'อุปกรณ์ค้าปลีก' }
                ]
            };

            if (subCategories[category]) {
                subCategories[category].forEach(sub => {
                    const option = document.createElement('option');
                    option.value = sub.value;
                    option.textContent = sub.text;
                    subCategorySelect.appendChild(option);
                });
            }
        }

        function toggleAuctionFields() {
            const listingType = document.getElementById('listingType').value;
            const auctionFields = document.getElementById('auctionFields');

            if (listingType === 'auction' || listingType === 'both') {
                auctionFields.style.display = 'block';
            } else {
                auctionFields.style.display = 'none';
            }
        }

        function toggleShippingPrice() {
            const shippingType = document.getElementById('shippingType').value;
            const shippingPriceGroup = document.getElementById('shippingPriceGroup');

            if (shippingType === 'flat' || shippingType === 'calculated') {
                shippingPriceGroup.style.display = 'block';
            } else {
                shippingPriceGroup.style.display = 'none';
            }
        }

        // Image handling
        let primaryImageIndex = 0; // Track which image is the primary

        document.getElementById('productImages').addEventListener('change', function(e) {
            const files = Array.from(e.target.files);
            const previewContainer = document.getElementById('imagePreview');

            files.forEach((file, index) => {
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const imagePreview = document.createElement('div');
                        const currentImageIndex = previewContainer.children.length;
                        imagePreview.className = 'image-preview';
                        imagePreview.dataset.imageIndex = currentImageIndex;

                        const isPrimary = currentImageIndex === primaryImageIndex;
                        imagePreview.innerHTML = `
                            <img src="${e.target.result}" alt="Product image ${currentImageIndex + 1}">
                            <button type="button" class="image-preview-remove" onclick="removeImage(this)">×</button>
                            <button type="button" class="image-preview-primary ${isPrimary ? 'active' : ''}"
                                    onclick="setPrimaryImage(${currentImageIndex})"
                                    title="ตั้งเป็นรูปหลัก">
                                ${isPrimary ? '⭐' : '☆'}
                            </button>
                            ${isPrimary ? '<div class="primary-badge">รูปหลัก</div>' : ''}
                        `;
                        previewContainer.appendChild(imagePreview);
                    };
                    reader.readAsDataURL(file);
                }
            });
        });

        function setPrimaryImage(imageIndex) {
            primaryImageIndex = imageIndex;

            // Update all image previews to show correct primary status
            const previews = document.querySelectorAll('.image-preview');
            previews.forEach((preview, index) => {
                const primaryButton = preview.querySelector('.image-preview-primary');
                const badge = preview.querySelector('.primary-badge');

                if (index === imageIndex) {
                    // Set as primary
                    primaryButton.classList.add('active');
                    primaryButton.innerHTML = '⭐';
                    if (!badge) {
                        const badgeElement = document.createElement('div');
                        badgeElement.className = 'primary-badge';
                        badgeElement.textContent = 'รูปหลัก';
                        preview.appendChild(badgeElement);
                    }
                } else {
                    // Remove primary status
                    primaryButton.classList.remove('active');
                    primaryButton.innerHTML = '☆';
                    if (badge) {
                        badge.remove();
                    }
                }
            });
        }

        function removeImage(button) {
            const imagePreview = button.parentElement;
            const imageIndex = parseInt(imagePreview.dataset.imageIndex);

            // If removing primary image, set first image as primary
            if (imageIndex === primaryImageIndex && document.querySelectorAll('.image-preview').length > 1) {
                primaryImageIndex = 0;
                // Re-index after removal
                setTimeout(() => {
                    const previews = document.querySelectorAll('.image-preview');
                    previews.forEach((preview, index) => {
                        preview.dataset.imageIndex = index;
                    });
                    if (previews.length > 0) {
                        setPrimaryImage(0);
                    }
                }, 10);
            }

            imagePreview.remove();
        }

        function saveDraft() {
            console.log('Saving draft...');
            const formData = {
                title: document.getElementById('productTitle').value,
                category: document.getElementById('productCategory').value,
                price: document.getElementById('productPrice').value,
                description: document.getElementById('productDescription').value
            };
            localStorage.setItem('product_draft', JSON.stringify(formData));
            alert('✅ บันทึกแบบร่างเรียบร้อยแล้ว!');
        }

        function updateEditSubCategories() {
            const category = document.getElementById('editProductCategory').value;
            const subCategorySelect = document.getElementById('editProductSubCategory');

            // Use the same subcategories data as create form
            const subcategories = {
                'electronics': ['โทรศัพท์', 'คอมพิวเตอร์', 'กล้อง', 'เสียง', 'อุปกรณ์เสริม'],
                'fashion': ['เสื้อผ้า', 'รองเท้า', 'กระเป๋า', 'เครื่องประดับ', 'นาฬิกา'],
                'home': ['เฟอร์นิเจอร์', 'ของตกแต่ง', 'ครัว', 'ห้องนอน', 'ห้องน้ำ'],
                'sports': ['ฟิตเนส', 'กีฬากลางแจ้ง', 'จักรยาน', 'กีฬาทีม', 'อุปกรณ์'],
                'automotive': ['รถยนต์', 'มอเตอร์ไซค์', 'อะไหล่', 'อุปกรณ์แต่ง', 'น้ำมัน'],
                'books': ['นิยาย', 'การศึกษา', 'ธุรกิจ', 'เด็ก', 'นิตยสาร'],
                'toys': ['ตุ๊กตา', 'เกมกระดาน', 'LEGO', 'โมเดล', 'ของเล่นการศึกษา'],
                'beauty': ['เครื่องสำอาง', 'ผลิตภัณฑ์ดูแลผิว', 'น้ำหอม', 'ดูแลเส้นผม', 'เครื่องมือ'],
                'collectibles': ['แสตมป์', 'เหรียญ', 'ของโบราณ', 'ศิลปะ', 'ของสะสมพิเศษ'],
                'business': ['อุปกรณ์สำนักงาน', 'เฟอร์นิเจอร์สำนักงาน', 'อุปกรณ์นำเสนอ', 'การพิมพ์', 'จัดเก็บ'],
                'other': ['อื่นๆ']
            };

            subCategorySelect.innerHTML = '<option value="">เลือกหมวดหมู่ย่อย</option>';

            if (category && subcategories[category]) {
                subcategories[category].forEach(sub => {
                    const option = document.createElement('option');
                    option.value = sub;
                    option.textContent = sub;
                    subCategorySelect.appendChild(option);
                });
            }
        }

        function toggleEditShippingPrice() {
            const shippingType = document.getElementById('editShippingType').value;
            const priceGroup = document.getElementById('editShippingPriceGroup');

            if (shippingType === 'flat' || shippingType === 'calculated') {
                priceGroup.style.display = 'block';
            } else {
                priceGroup.style.display = 'none';
            }
        }

        function editProduct(event, productId) {
            event.stopPropagation();
            event.preventDefault();

            console.log('Editing product:', productId);

            // Find product
            const product = allProducts.find(p => p.id === productId);
            if (!product) {
                alert('❌ ไม่พบสินค้า');
                return;
            }

            // Fill basic form data
            document.getElementById('editProductId').value = product.id;
            document.getElementById('editProductTitle').value = product.title || '';

            // Set category first
            const categorySelect = document.getElementById('editProductCategory');
            categorySelect.value = product.category_id || '';
            console.log('Setting category:', product.category_id, 'Selected:', categorySelect.value);

            // Update subcategories based on selected category
            updateEditSubCategories();

            // Set subcategory value after options are populated (use setTimeout to ensure DOM update)
            const savedSubCategory = product.sub_category || '';
            setTimeout(() => {
                const subCategorySelect = document.getElementById('editProductSubCategory');
                if (subCategorySelect && savedSubCategory) {
                    subCategorySelect.value = savedSubCategory;
                    console.log('Setting subcategory:', savedSubCategory, 'Selected:', subCategorySelect.value);
                } else {
                    console.log('No subcategory or select not found. SubCategory:', savedSubCategory);
                }
            }, 10);

            document.getElementById('editProductPrice').value = product.price_local || product.price || 0;
            document.getElementById('editProductCurrency').value = product.currency_code || 'THB';
            document.getElementById('editProductDescription').value = product.description || '';
            document.getElementById('editProductCondition').value = product.condition || '';
            document.getElementById('editProductBrand').value = product.brand || '';
            document.getElementById('editProductModel').value = product.model || '';
            document.getElementById('editProductQuantity').value = product.quantity || 1;
            document.getElementById('editProductLocation').value = product.location || '';

            // Set fin fee percent - important: set the slider value
            const finFeePercentSlider = document.getElementById('editFinFeePercent');
            const feePercent = product.fin_fee_percent || 2.0;
            finFeePercentSlider.value = feePercent;

            // Update the display label for fee percent
            document.getElementById('editFinFeePercentDisplay').textContent = feePercent.toFixed(1) + '%';

            document.getElementById('editAmountFee').value = product.amount_fee || 0;

            // Fill additional fields
            document.getElementById('editProductColor').value = product.color || '';
            document.getElementById('editProductSize').value = product.size || '';
            document.getElementById('editProductWeight').value = product.weight || '';

            // Parse shipping options
            let shippingOptions = { type: 'free', price: 0 };
            try {
                if (typeof product.shipping_options === 'string') {
                    shippingOptions = JSON.parse(product.shipping_options);
                } else if (product.shipping_options) {
                    shippingOptions = product.shipping_options;
                }
            } catch (e) {
                console.error('Error parsing shipping options:', e);
            }

            document.getElementById('editShippingType').value = shippingOptions.type || 'free';
            document.getElementById('editShippingPrice').value = shippingOptions.price || 0;
            toggleEditShippingPrice();

            // Update currency labels
            document.getElementById('editCurrencyLabel').textContent = product.currency_code || 'THB';
            document.getElementById('editShippingCurrencyLabel').textContent = product.currency_code || 'THB';

            // Update fee calculation display
            updateEditFinFeeCalculation();

            // Load existing images
            loadEditProductImages(product);

            // Show popup
            document.getElementById('editProductPopup').classList.add('show');
        }

        function updateEditCurrencyDisplay() {
            const currency = document.getElementById('editProductCurrency').value;
            document.getElementById('editCurrencyLabel').textContent = currency;
            updateEditFinFeeCalculation();
        }

        function updateEditFinFeeCalculation() {
            const price = parseFloat(document.getElementById('editProductPrice').value) || 0;
            const percent = parseFloat(document.getElementById('editFinFeePercent').value) || 2.0;
            const currency = document.getElementById('editProductCurrency').value || 'THB';

            const amountFee = Math.round(price * (percent / 100));
            const sellerReceive = price - amountFee;

            // Update hidden input
            document.getElementById('editAmountFee').value = amountFee;

            // Update displays
            document.getElementById('editFinFeePercentDisplay').textContent = percent.toFixed(1) + '%';
            document.getElementById('editFeePercentText').textContent = percent.toFixed(1);

            document.getElementById('editPriceValue').textContent = price.toFixed(2);
            document.getElementById('editPriceCurrencyDisplay').textContent = currency;

            document.getElementById('editFeeValue').textContent = amountFee.toFixed(2);
            document.getElementById('editFeeCurrencyDisplay').textContent = currency;

            document.getElementById('editReceiveValue').textContent = sellerReceive.toFixed(2);
            document.getElementById('editReceiveCurrencyDisplay').textContent = currency;
        }

        function closeEditProductPopup() {
            document.getElementById('editProductPopup').classList.remove('show');
        }

        // Edit form image handling
        let editPrimaryImageIndex = 0;
        let editProductImages = []; // Will store File objects
        let editProductImageFiles = []; // Store actual File objects for upload
        let editExistingImages = [];

        function setEditPrimaryImage(imageIndex) {
            editPrimaryImageIndex = imageIndex;

            const previews = document.querySelectorAll('#editImagePreview .image-preview');
            previews.forEach((preview, index) => {
                const primaryButton = preview.querySelector('.image-preview-primary');
                const badge = preview.querySelector('.primary-badge');

                if (index === imageIndex) {
                    primaryButton.classList.add('active');
                    primaryButton.innerHTML = '⭐';
                    if (!badge) {
                        const badgeElement = document.createElement('div');
                        badgeElement.className = 'primary-badge';
                        badgeElement.textContent = 'รูปหลัก';
                        preview.appendChild(badgeElement);
                    }
                } else {
                    primaryButton.classList.remove('active');
                    primaryButton.innerHTML = '☆';
                    if (badge) {
                        badge.remove();
                    }
                }
            });
        }

        function removeEditImage(button) {
            const imagePreview = button.parentElement;
            const imageIndex = parseInt(imagePreview.dataset.imageIndex);

            // Remove from array
            if (imagePreview.dataset.isNew === 'true') {
                editProductImages.splice(imageIndex, 1);
            } else {
                editExistingImages.splice(imageIndex, 1);
            }

            imagePreview.remove();

            // Re-index
            const previews = document.querySelectorAll('#editImagePreview .image-preview');
            previews.forEach((preview, index) => {
                preview.dataset.imageIndex = index;
            });

            if (imageIndex === editPrimaryImageIndex && previews.length > 0) {
                setEditPrimaryImage(0);
            }
        }

        function loadEditProductImages(product) {
            const previewContainer = document.getElementById('editImagePreview');
            previewContainer.innerHTML = '';
            editProductImages = [];
            editProductImageFiles = [];
            editExistingImages = [];
            editPrimaryImageIndex = 0;

            let images = [];
            try {
                if (typeof product.images === 'string') {
                    images = JSON.parse(product.images);
                } else if (Array.isArray(product.images)) {
                    images = product.images;
                }
            } catch (e) {
                images = [];
            }

            editExistingImages = [...images];

            images.forEach((imageUrl, index) => {
                const imagePreview = document.createElement('div');
                imagePreview.className = 'image-preview';
                imagePreview.dataset.imageIndex = index;
                imagePreview.dataset.isNew = 'false';

                const isPrimary = index === 0;
                imagePreview.innerHTML = `
                    <img src="${imageUrl}" alt="Product image ${index + 1}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%22%23ddd%22 width=%22200%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22%3ENo Image%3C/text%3E%3C/svg%3E'">
                    <button type="button" class="image-preview-remove" onclick="removeEditImage(this)">×</button>
                    <button type="button" class="image-preview-primary ${isPrimary ? 'active' : ''}"
                            onclick="setEditPrimaryImage(${index})"
                            title="ตั้งเป็นรูปหลัก">
                        ${isPrimary ? '⭐' : '☆'}
                    </button>
                    ${isPrimary ? '<div class="primary-badge">รูปหลัก</div>' : ''}
                `;
                previewContainer.appendChild(imagePreview);
            });
        }

        // Handle edit form submission
        document.addEventListener('DOMContentLoaded', function() {
            const editForm = document.getElementById('editProductForm');
            if (editForm) {
                editForm.addEventListener('submit', async function(e) {
                    e.preventDefault();

                    const productId = document.getElementById('editProductId').value;
                    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

                    if (!currentUser.id) {
                        alert('กรุณาเข้าสู่ระบบก่อนแก้ไขสินค้า');
                        return;
                    }

                    // Upload new images first if any
                    let uploadedImagePaths = [];
                    if (editProductImageFiles.length > 0) {
                        const formData = new FormData();
                        editProductImageFiles.forEach(file => {
                            formData.append('productImages', file);
                        });

                        try {
                            const uploadResponse = await fetch('/api/upload-product-images', {
                                method: 'POST',
                                body: formData
                            });

                            const uploadResult = await uploadResponse.json();
                            if (uploadResult.success) {
                                uploadedImagePaths = uploadResult.data.images.map(img => img.path);
                            } else {
                                alert('❌ เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ: ' + uploadResult.message);
                                return;
                            }
                        } catch (error) {
                            console.error('Error uploading images:', error);
                            alert('❌ เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
                            return;
                        }
                    }

                    // Combine existing and newly uploaded images
                    const allImages = [...editExistingImages, ...uploadedImagePaths];

                    // Reorder to put primary image first
                    if (editPrimaryImageIndex > 0 && editPrimaryImageIndex < allImages.length) {
                        const primaryImage = allImages.splice(editPrimaryImageIndex, 1)[0];
                        allImages.unshift(primaryImage);
                    }

                    // Validate required fields
                    const title = document.getElementById('editProductTitle').value.trim();
                    const category = document.getElementById('editProductCategory').value;
                    const price = parseFloat(document.getElementById('editProductPrice').value);
                    const condition = document.getElementById('editProductCondition').value;
                    const location = document.getElementById('editProductLocation').value;

                    if (!title) {
                        alert('❌ กรุณากรอกชื่อสินค้า');
                        return;
                    }

                    if (!category) {
                        alert('❌ กรุณาเลือกหมวดหมู่');
                        return;
                    }

                    if (!price || price <= 0) {
                        alert('❌ กรุณากรอกราคาที่ถูกต้อง');
                        return;
                    }

                    if (!condition) {
                        alert('❌ กรุณาเลือกสภาพสินค้า');
                        return;
                    }

                    if (!location) {
                        alert('❌ กรุณาเลือกจังหวัด');
                        return;
                    }

                    const productData = {
                        id: productId,
                        title: title,
                        category_id: category,
                        sub_category: document.getElementById('editProductSubCategory').value || null,
                        price_local: price,
                        currency_code: document.getElementById('editProductCurrency').value || 'THB',
                        description: document.getElementById('editProductDescription').value || '',
                        condition: condition,
                        brand: document.getElementById('editProductBrand').value || null,
                        model: document.getElementById('editProductModel').value || null,
                        quantity: parseInt(document.getElementById('editProductQuantity').value) || 1,
                        location: location,
                        fin_fee_percent: parseFloat(document.getElementById('editFinFeePercent').value) || 2.0,
                        amount_fee: parseFloat(document.getElementById('editAmountFee').value) || 0,
                        color: document.getElementById('editProductColor').value || null,
                        size: document.getElementById('editProductSize').value || null,
                        weight: document.getElementById('editProductWeight').value ? parseFloat(document.getElementById('editProductWeight').value) : null,
                        images: JSON.stringify(allImages.length > 0 ? allImages : []),
                        shipping_options: JSON.stringify({
                            type: document.getElementById('editShippingType').value || 'free',
                            price: parseFloat(document.getElementById('editShippingPrice').value) || 0,
                            currency: document.getElementById('editProductCurrency').value || 'THB'
                        })
                    };

                    console.log('Update product data:', productData);

                    try {
                        const response = await fetch(`/api/products/${productId}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(productData)
                        });

                        const result = await response.json();

                        if (result.success) {
                            alert('✅ แก้ไขสินค้าเรียบร้อยแล้ว!');
                            closeEditProductPopup();

                            // Reload products
                            allProducts = [];
                            await loadProducts();
                            await loadMyProducts();
                        } else {
                            alert('❌ เกิดข้อผิดพลาด: ' + (result.error || 'ไม่สามารถแก้ไขสินค้าได้'));
                        }
                    } catch (error) {
                        console.error('Error updating product:', error);
                        alert('❌ เกิดข้อผิดพลาดในการแก้ไขสินค้า');
                    }
                });
            }

            // Auto-calculate amount_fee when price or percent changes
            const editPriceInput = document.getElementById('editProductPrice');
            const editFeePercentInput = document.getElementById('editFinFeePercent');

            if (editPriceInput && editFeePercentInput) {
                editPriceInput.addEventListener('input', updateEditFinFeeCalculation);
                editFeePercentInput.addEventListener('input', updateEditFinFeeCalculation);
            }

            // Edit product images event listener
            const editProductImagesInput = document.getElementById('editProductImages');
            if (editProductImagesInput) {
                editProductImagesInput.addEventListener('change', function(e) {
                    const files = Array.from(e.target.files);
                    const previewContainer = document.getElementById('editImagePreview');

                    files.forEach((file, index) => {
                        if (file.type.startsWith('image/')) {
                            // Store the actual File object for upload
                            editProductImageFiles.push(file);

                            const reader = new FileReader();
                            reader.onload = function(e) {
                                const imagePreview = document.createElement('div');
                                const currentImageIndex = previewContainer.children.length;
                                imagePreview.className = 'image-preview';
                                imagePreview.dataset.imageIndex = currentImageIndex;
                                imagePreview.dataset.isNew = 'true';

                                const isPrimary = currentImageIndex === editPrimaryImageIndex;
                                imagePreview.innerHTML = `
                                    <img src="${e.target.result}" alt="Product image ${currentImageIndex + 1}">
                                    <button type="button" class="image-preview-remove" onclick="removeEditImage(this)">×</button>
                                    <button type="button" class="image-preview-primary ${isPrimary ? 'active' : ''}"
                                            onclick="setEditPrimaryImage(${currentImageIndex})"
                                            title="ตั้งเป็นรูปหลัก">
                                        ${isPrimary ? '⭐' : '☆'}
                                    </button>
                                    ${isPrimary ? '<div class="primary-badge">รูปหลัก</div>' : ''}
                                `;
                                previewContainer.appendChild(imagePreview);

                                // Store preview data URL for display
                                editProductImages.push(e.target.result);
                            };
                            reader.readAsDataURL(file);
                        }
                    });
                });
            }
        });

        function previewListing() {
            const title = document.getElementById('productTitle').value;
            const price = document.getElementById('productPrice').value;
            const currency = document.getElementById('priceCurrency').value;
            const description = document.getElementById('productDescription').value;
            const condition = document.getElementById('productCondition').value;
            const location = document.getElementById('productLocation').value;

            if (!title || !price) {
                alert('⚠️ กรุณากรอกชื่อสินค้าและราคาก่อนดูตัวอย่าง');
                return;
            }

            // Create preview product object
            const previewProduct = {
                id: 'preview',
                title: title,
                price: parseFloat(price),
                price_currency: currency,
                description: description,
                condition: condition,
                location: location,
                seller_id: 'preview_user',
                amount_fee: parseFloat(document.getElementById('amountFeeValue').value) || 0
            };

            // Show in product detail popup
            currentProduct = previewProduct;
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const seller = {
                id: currentUser.id,
                username: currentUser.username,
                seller_rating: currentUser.trust_score || 0,
                profile_image: currentUser.profile_image
            };

            // Open popup
            viewProduct('preview', false, seller);
        }

        // Exchange rate lock buttons
        const lockRateBtn = document.getElementById('lockRateBtn');
        const refreshRateBtn = document.getElementById('refreshRateBtn');
        if (lockRateBtn) lockRateBtn.addEventListener('click', lockExchangeRate);
        if (refreshRateBtn) refreshRateBtn.addEventListener('click', refreshExchangeRate);

        // Image handling for form 2
        document.getElementById('productImages2').addEventListener('change', function(e) {
            const files = Array.from(e.target.files);
            const previewContainer = document.getElementById('imagePreview2');

            files.forEach((file, index) => {
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const imagePreview = document.createElement('div');
                        const currentImageIndex = previewContainer.children.length;
                        imagePreview.className = 'image-preview';
                        imagePreview.dataset.imageIndex = currentImageIndex;

                        const isPrimary = currentImageIndex === primaryImageIndex;
                        imagePreview.innerHTML = `
                            <img src="${e.target.result}" alt="Product image ${currentImageIndex + 1}">
                            <button type="button" class="image-preview-remove" onclick="removeImage(this)">×</button>
                            <button type="button" class="image-preview-primary ${isPrimary ? 'active' : ''}"
                                    onclick="setPrimaryImage(${currentImageIndex})"
                                    title="ตั้งเป็นรูปหลัก">
                                ${isPrimary ? '⭐' : '☆'}
                            </button>
                            ${isPrimary ? '<div class="primary-badge">รูปหลัก</div>' : ''}
                        `;
                        previewContainer.appendChild(imagePreview);
                    };
                    reader.readAsDataURL(file);
                }
            });
        });

        // Form submission for form 2 (in My Products tab)
        document.getElementById('createListingFormInProducts').addEventListener('submit', async function(e) {
            e.preventDefault();

            // Collect form data from form 2
            const selectedCurrency = document.getElementById('priceCurrency2').value;
            const price = parseFloat(document.getElementById('productPrice2').value);

            const formData = {
                title: document.getElementById('productTitle2').value,
                category: document.getElementById('productCategory2').value,
                subCategory: document.getElementById('productSubCategory2').value,
                brand: document.getElementById('productBrand2').value,
                model: document.getElementById('productModel2').value,
                condition: document.getElementById('productCondition2').value,
                description: document.getElementById('productDescription2').value,
                color: document.getElementById('productColor2').value,
                size: document.getElementById('productSize2').value,
                weight: document.getElementById('productWeight2').value,
                listingType: document.getElementById('listingType2').value,
                price: price,
                priceCurrency: selectedCurrency,
                // Fin Fee data
                fin_fee_percent: parseFloat(document.getElementById('finFeePercentValue2').value) || 2.0,
                amount_fee: parseFloat(document.getElementById('amountFeeValue2').value) || 0,
                quantity: document.getElementById('productQuantity2').value,
                shippingType: document.getElementById('shippingType2').value,
                shippingPrice: document.getElementById('shippingPrice2').value,
                shippingCurrency: selectedCurrency,
                location: document.getElementById('productLocation2').value,
                returnPolicy: document.getElementById('returnPolicy2').value,
                handlingTime: document.getElementById('handlingTime2').value,
                immediatePayment: document.getElementById('immediatePayment2').checked,
                bestOffer: document.getElementById('bestOffer2').checked,
                privateAuction: document.getElementById('privateAuction2').checked
            };

            // If auction type, get auction-specific data
            if (formData.listingType === 'auction' || formData.listingType === 'both') {
                const startingPrice = parseFloat(document.getElementById('startingPrice2').value) || 0;
                const buyItNowPrice = parseFloat(document.getElementById('buyItNowPrice2').value) || 0;

                formData.startingPrice = startingPrice;
                formData.buyItNowPrice = buyItNowPrice;
                formData.auctionDuration = document.getElementById('auctionDuration2').value;
            }

            console.log('Creating listing with data:', formData);

            // Get current user
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if (!currentUser.id) {
                alert('กรุณาเข้าสู่ระบบก่อนลงขายสินค้า');
                return;
            }

            try {
                // Prepare product data for API
                const productData = {
                    seller_id: currentUser.id,
                    category_id: formData.category,
                    title: formData.title,
                    description: formData.description,
                    condition: formData.condition,
                    price_local: formData.price,
                    currency_code: formData.priceCurrency,
                    location: formData.location,
                    brand: formData.brand,
                    model: formData.model,
                    quantity: parseInt(formData.quantity) || 1,
                    fin_fee_percent: formData.fin_fee_percent,
                    amount_fee: formData.amount_fee,
                    shipping_options: JSON.stringify({
                        type: formData.shippingType,
                        price: formData.shippingPrice,
                        currency: formData.shippingCurrency
                    }),
                    images: JSON.stringify([]), // TODO: Handle image upload
                    status: 'active'
                };

                console.log('Submitting product:', productData);

                // Submit to API
                const response = await fetch('/api/products', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(productData)
                });

                const result = await response.json();

                if (result.success) {
                    alert('✅ ลงขายสินค้าเรียบร้อยแล้ว!');

                    // Reset form and hide it
                    hideCreateProductForm();

                    // Reload products
                    allProducts = [];
                    await loadProducts();
                    await loadMyProducts();
                } else {
                    alert('❌ เกิดข้อผิดพลาด: ' + (result.error || 'ไม่สามารถลงขายสินค้าได้'));
                }
            } catch (error) {
                console.error('Error creating listing:', error);
                alert('❌ เกิดข้อผิดพลาดในการลงขายสินค้า');
            }
        });

        // Form submission
        document.getElementById('createListingForm').addEventListener('submit', async function(e) {
            e.preventDefault();

            // Collect form data
            const selectedCurrency = document.getElementById('priceCurrency').value;
            const price = parseFloat(document.getElementById('productPrice').value);

            // Get conversion rate used for this transaction
            const usedConversionRate = lockedRate && lockedCurrency === selectedCurrency ? lockedRate : exchangeRates[selectedCurrency]?.rate;

            const formData = {
                title: document.getElementById('productTitle').value,
                category: document.getElementById('productCategory').value,
                subCategory: document.getElementById('productSubCategory').value,
                brand: document.getElementById('productBrand').value,
                model: document.getElementById('productModel').value,
                condition: document.getElementById('productCondition').value,
                description: document.getElementById('productDescription').value,
                color: document.getElementById('productColor').value,
                size: document.getElementById('productSize').value,
                weight: document.getElementById('productWeight').value,
                listingType: document.getElementById('listingType').value,
                price: price,
                priceCurrency: selectedCurrency,
                // Transaction conversion rate data
                conversionRate: usedConversionRate,
                rateLockedAt: lockedRate && lockedCurrency === selectedCurrency ? rateLockedAt : new Date().toISOString(),
                rateSource: lockedRate && lockedCurrency === selectedCurrency ? 'locked' : 'current',
                // Fin Fee data
                fin_fee_percent: parseFloat(document.getElementById('finFeePercentValue').value) || 2.0,
                amount_fee: parseFloat(document.getElementById('amountFeeValue').value) || 0,
                quantity: document.getElementById('productQuantity').value,
                shippingType: document.getElementById('shippingType').value,
                shippingPrice: document.getElementById('shippingPrice').value,
                shippingCurrency: selectedCurrency,
                location: document.getElementById('productLocation').value,
                returnPolicy: document.getElementById('returnPolicy').value,
                handlingTime: document.getElementById('handlingTime').value,
                immediatePayment: document.getElementById('immediatePayment').checked,
                bestOffer: document.getElementById('bestOffer').checked,
                privateAuction: document.getElementById('privateAuction').checked
            };

            // If auction type, get auction-specific data
            if (formData.listingType === 'auction' || formData.listingType === 'both') {
                const startingPrice = parseFloat(document.getElementById('startingPrice').value) || 0;
                const buyItNowPrice = parseFloat(document.getElementById('buyItNowPrice').value) || 0;

                formData.startingPrice = startingPrice;
                formData.buyItNowPrice = buyItNowPrice;
                formData.auctionDuration = document.getElementById('auctionDuration').value;
            }

            console.log('Creating listing with data:', formData);

            // Get current user
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if (!currentUser.id) {
                alert('กรุณาเข้าสู่ระบบก่อนลงขายสินค้า');
                return;
            }

            try {
                // Prepare product data for API
                const productData = {
                    seller_id: currentUser.id,
                    category_id: formData.category,
                    title: formData.title,
                    description: formData.description,
                    condition: formData.condition,
                    price_local: formData.price,
                    currency_code: formData.priceCurrency,
                    location: formData.location,
                    brand: formData.brand,
                    model: formData.model,
                    quantity: parseInt(formData.quantity) || 1,
                    fin_fee_percent: formData.fin_fee_percent,
                    amount_fee: formData.amount_fee,
                    shipping_options: JSON.stringify({
                        type: formData.shippingType,
                        price: formData.shippingPrice,
                        currency: formData.shippingCurrency
                    }),
                    images: JSON.stringify([]), // TODO: Handle image upload
                    status: 'active'
                };

                console.log('Submitting product:', productData);

                // Submit to API
                const response = await fetch('/api/products', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(productData)
                });

                const result = await response.json();

                if (result.success) {
                    alert('✅ ลงขายสินค้าเรียบร้อยแล้ว!');

                    // Reset form
                    document.getElementById('createListingForm').reset();
                    document.getElementById('imagePreview').innerHTML = '';

                    // Reload products
                    allProducts = [];
                    await loadProducts();

                    // Switch to my products tab
                    showListingsTab('myProducts');
                } else {
                    alert('❌ เกิดข้อผิดพลาด: ' + (result.error || 'ไม่สามารถลงขายสินค้าได้'));
                }
            } catch (error) {
                console.error('Error creating listing:', error);
                alert('❌ เกิดข้อผิดพลาดในการลงขายสินค้า');
            }
        });

        console.log('🌱 Fingrow Mobile App Loaded');
        console.log('📱 Features: Marketplace, Create Listing, Orders, Referrals, Profile');
        console.log('🎯 Status: Demo Version - Ready for Development');
        console.log('✨ Enhanced Create Listing Form with eBay-style fields');
        console.log('💱 Multi-Currency Support: THB, USD, EUR, JPY, GBP, CNY, KRW');
        console.log('🔒 Exchange Rate Lock Feature with Transaction Rate Recording');

        // Initialize app with authentication check
        async function initializeApp() {
            try {
                await initializeMarketplace();

                // Check for referral code in URL
                const urlParams = new URLSearchParams(window.location.search);
                const hashParams = new URLSearchParams(window.location.hash.substring(window.location.hash.indexOf('?') + 1));
                const referralCode = urlParams.get('invite') || urlParams.get('ref') || hashParams.get('invite') || hashParams.get('ref');

                if (referralCode) {
                    console.log('🔗 Referral code detected:', referralCode);
                    // Store referral code for registration
                    sessionStorage.setItem('referralCode', referralCode);
                    // Show register page if not logged in
                    if (!checkAuthStatus()) {
                        showPage('register');
                        // Pre-fill referral code and check referrer info
                        setTimeout(async () => {
                            const referralInput = document.getElementById('registerReferralCode');
                            if (referralInput) {
                                referralInput.value = referralCode;
                                await checkReferralCode(referralCode);
                            }
                        }, 100);
                        return;
                    }
                }

                // Check if user is already logged in
                if (!checkAuthStatus()) {
                    showPage('login');
                } else {
                    showPage('marketplace');
                }
            } catch (error) {
                console.error('Failed to initialize app:', error);
                showPage('login');
            }
        }

        // Initialize app when page loads
        initializeApp();

        // Product popup functions
        let currentProductImages = [];
        let currentImageIndex = 0;
        let currentProduct = null;

        async function viewProduct(productId) {
            currentProduct = allProducts.find(p => p.id === productId);
            if (!currentProduct) return;

            // Load users from API if needed
            await loadUsersFromAPI();
            const seller = globalUsersCache.find(user => user.id === currentProduct.seller_id);

            // Set product details
            document.getElementById('productDetailTitle').textContent = currentProduct.title;
            document.getElementById('productDetailPrice').innerHTML = formatPriceForPopup(currentProduct);
            document.getElementById('productDetailFinPoint').innerHTML = `<span>💰</span><span style="font-weight: 600;">${currentProduct.amount_fee || 0} FP</span>`;
            document.getElementById('sellerProvince').textContent = seller?.province || 'ไม่ระบุจังหวัด';

            document.getElementById('productDetailDescription').textContent = currentProduct.description || 'ไม่มีคำอธิบาย';
            document.getElementById('productDetailCondition').textContent = getConditionText(currentProduct.condition);
            document.getElementById('productDetailCategory').textContent = getCategoryText(currentProduct.category);
            document.getElementById('productDetailViews').textContent = `${currentProduct.view_count || currentProduct.views || 0} ครั้ง`;

            // Additional details
            if (currentProduct.brand) {
                document.getElementById('productDetailBrand').textContent = currentProduct.brand;
                document.getElementById('productDetailBrand').parentElement.style.display = 'block';
            } else {
                document.getElementById('productDetailBrand').parentElement.style.display = 'none';
            }

            if (currentProduct.model) {
                document.getElementById('productDetailModel').textContent = currentProduct.model;
                document.getElementById('productDetailModel').parentElement.style.display = 'block';
            } else {
                document.getElementById('productDetailModel').parentElement.style.display = 'none';
            }

            document.getElementById('productDetailQuantity').textContent = currentProduct.quantity || 1;

            // Shipping options
            try {
                const shipping = typeof currentProduct.shipping_options === 'string'
                    ? JSON.parse(currentProduct.shipping_options)
                    : currentProduct.shipping_options;

                if (shipping && shipping.type) {
                    document.getElementById('productDetailShipping').textContent =
                        shipping.type === 'free' ? 'ฟรีค่าจัดส่ง' :
                        shipping.type === 'paid' ? `฿${shipping.price} (${shipping.currency || 'THB'})` :
                        'ติดต่อผู้ขาย';
                } else {
                    document.getElementById('productDetailShipping').textContent = 'ติดต่อผู้ขาย';
                }
            } catch (e) {
                document.getElementById('productDetailShipping').textContent = 'ติดต่อผู้ขาย';
            }

            // Set seller info
            document.getElementById('sellerProfileImage').src = seller?.profile_image || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face';
            document.getElementById('sellerName').textContent = `@${seller?.username || 'unknown'}`;

            // Set seller rating
            const rating = seller?.seller_rating || 0;
            document.getElementById('sellerRatingStars').innerHTML = generateStarRating(rating);
            document.getElementById('sellerRatingText').textContent = rating.toFixed(1);
            document.getElementById('sellerSalesCount').textContent = seller?.total_sales || 0;

            document.getElementById('sellerJoinDate').textContent = seller?.created_at || 'ไม่ทราบ';
            document.getElementById('sellerStatus').textContent = seller?.status === 'active' ? 'ออนไลน์' : 'ออฟไลน์';

            // Set up image gallery
            try {
                if (typeof currentProduct.images === 'string') {
                    currentProductImages = JSON.parse(currentProduct.images);
                } else if (Array.isArray(currentProduct.images)) {
                    currentProductImages = currentProduct.images;
                } else {
                    currentProductImages = [];
                }
            } catch (e) {
                console.error('Error parsing images:', e);
                currentProductImages = [];
            }
            currentImageIndex = 0;
            setupImageGallery();

            // Show popup
            document.getElementById('productPopup').classList.add('show');
        }

        function closeProductPopup() {
            document.getElementById('productPopup').classList.remove('show');
            currentProduct = null;
            currentProductImages = [];
            currentImageIndex = 0;
        }

        function setupImageGallery() {
            const mainImage = document.getElementById('productMainImage');
            const indicators = document.getElementById('imageIndicators');
            const prevBtn = document.getElementById('imagePrevBtn');
            const nextBtn = document.getElementById('imageNextBtn');

            if (currentProductImages.length === 0) {
                // Show placeholder if no images
                mainImage.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iIzFmMjkzNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjY0IiBmaWxsPSIjNjRiNWY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+8J+TpiDguYTguKHguYjguKHguLXguKPguLnguJo8L3RleHQ+PC9zdmc+';
                mainImage.alt = 'ไม่มีรูปภาพ';
                prevBtn.style.display = 'none';
                nextBtn.style.display = 'none';
                indicators.innerHTML = '';
                return;
            }

            // Set main image
            mainImage.src = currentProductImages[currentImageIndex];

            // Create indicators
            indicators.innerHTML = currentProductImages.map((_, index) =>
                `<div class="image-dot ${index === currentImageIndex ? 'active' : ''}"
                      onclick="changeProductImage(${index})"></div>`
            ).join('');

            // Update navigation buttons
            if (currentProductImages.length <= 1) {
                prevBtn.style.display = 'none';
                nextBtn.style.display = 'none';
            } else {
                prevBtn.style.display = 'flex';
                nextBtn.style.display = 'flex';

                // Disable/enable buttons based on current index
                prevBtn.classList.toggle('disabled', currentImageIndex === 0);
                nextBtn.classList.toggle('disabled', currentImageIndex === currentProductImages.length - 1);
            }
        }

        function changeProductImage(index) {
            if (index < 0 || index >= currentProductImages.length) return;
            currentImageIndex = index;
            setupImageGallery();
        }

        function prevProductImage() {
            if (currentImageIndex > 0) {
                currentImageIndex--;
                setupImageGallery();
            }
        }

        function nextProductImage() {
            if (currentImageIndex < currentProductImages.length - 1) {
                currentImageIndex++;
                setupImageGallery();
            }
        }

        // Chat global variables
        let currentChatProduct = null;
        let currentChatSeller = null;
        let chatMessages = [];

        async function contactSeller() {
            if (!currentProduct) {
                alert('ไม่มีข้อมูลสินค้า');
                return;
            }

            await loadUsersFromAPI();
            const seller = globalUsersCache.find(user => user.id === currentProduct.seller_id);
            if (!seller) {
                alert('ไม่พบข้อมูลผู้ขาย');
                return;
            }

            // Set current chat data
            currentChatProduct = currentProduct;
            currentChatSeller = seller;

            // Close product detail popup
            closeProductPopup();

            // Load chat messages
            loadChatMessages();

            // Show chat page
            showPage('chat');
        }

        async function loadChatMessages() {
            if (!currentChatProduct || !currentChatSeller) return;

            // Get messages between current user and seller for this product
            const currentUserId = 'user_1738066789135_qwer7890'; // In real app, get from auth

            try {
                // Fetch messages from API
                const response = await fetch(`/api/messages?product_id=${currentChatProduct.id}&user1=${currentUserId}&user2=${currentChatSeller.id}`);
                const data = await response.json();

                if (data.success) {
                    chatMessages = data.data || [];
                } else {
                    chatMessages = [];
                }
            } catch (error) {
                console.error('Error loading chat messages:', error);
                chatMessages = [];
            }

            // Sort messages by created_at
            chatMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

            // Update chat header
            document.getElementById('chatSellerAvatar').src = currentChatSeller.profile_image || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentChatSeller.username);
            document.getElementById('chatSellerName').textContent = `@${currentChatSeller.username}`;
            document.getElementById('chatProductName').textContent = currentChatProduct.title;

            // Render messages
            renderChatMessages();
        }

        function renderChatMessages() {
            const chatMessagesContainer = document.getElementById('chatMessages');
            const currentUserId = 1; // In real app, get from auth

            chatMessagesContainer.innerHTML = '';

            chatMessages.forEach(msg => {
                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${msg.sender_id === currentUserId ? 'sent' : 'received'}`;

                const bubbleDiv = document.createElement('div');
                bubbleDiv.className = 'message-bubble';
                bubbleDiv.textContent = msg.message;

                const timeDiv = document.createElement('div');
                timeDiv.className = 'message-time';
                timeDiv.textContent = formatMessageTime(msg.created_at);

                messageDiv.appendChild(bubbleDiv);
                messageDiv.appendChild(timeDiv);
                chatMessagesContainer.appendChild(messageDiv);
            });

            // Scroll to bottom
            setTimeout(() => {
                chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
            }, 100);
        }

        function formatMessageTime(dateString) {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffMins < 1) return 'เมื่อกี้';
            if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
            if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
            if (diffDays < 7) return `${diffDays} วันที่แล้ว`;

            return date.toLocaleDateString('th-TH', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        async function sendMessage() {
            const messageInput = document.getElementById('chatMessageInput');
            const messageText = messageInput.value.trim();

            if (!messageText || !currentChatProduct || !currentChatSeller) return;

            const currentUserId = 'user_1738066789135_qwer7890'; // In real app, get from auth

            try {
                // Send message to API
                const response = await fetch('/api/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        sender_id: currentUserId,
                        receiver_id: currentChatSeller.id,
                        product_id: currentChatProduct.id,
                        message: messageText,
                        type: 'text'
                    })
                });

                const data = await response.json();

                if (data.success) {
                    // Reload messages to show the new one
                    await loadChatMessages();

                    // Clear input
                    messageInput.value = '';

                    // Scroll to bottom
                    const chatMessagesContainer = document.getElementById('chatMessages');
                    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
                } else {
                    console.error('Failed to send message:', data.error);
                }
            } catch (error) {
                console.error('Error sending message:', error);
            }
        }

        function goBackFromChat() {
            // Clear chat data
            currentChatProduct = null;
            currentChatSeller = null;
            chatMessages = [];

            // Go back to chat list
            showPage('chatsList');
        }

        // Chat List Functions
        async function loadChatsList() {
            const currentUserId = 'user_1738066789135_qwer7890'; // In real app, get from auth
            const chatsContainer = document.getElementById('chatsListContainer');

            // Load users and products from API
            await loadUsersFromAPI();
            await loadProducts();

            try {
                // Fetch all messages for current user
                const response = await fetch(`/api/messages/user/${currentUserId}`);
                const data = await response.json();

                if (!data.success || !data.data) {
                    chatsContainer.innerHTML = '<div class="no-chats">ยังไม่มีแชท</div>';
                    return;
                }

                const messages = data.data;

                console.log('[loadChatsList] Messages:', messages.length);
                console.log('[loadChatsList] allProducts:', allProducts.length);
                console.log('[loadChatsList] globalUsersCache:', globalUsersCache.length);

                // Get all unique chat conversations for current user
                const userChats = new Map();

                messages.forEach(msg => {
                    let otherUserId, product;

                    if (msg.sender_id === currentUserId) {
                        otherUserId = msg.receiver_id;
                    } else if (msg.receiver_id === currentUserId) {
                        otherUserId = msg.sender_id;
                    } else {
                        return; // Message not involving current user
                    }

                    product = allProducts.find(p => p.id === msg.product_id);
                    const otherUser = globalUsersCache.find(u => u.id === otherUserId);

                    console.log('[loadChatsList] Processing msg:', msg.id, 'product:', product?.id, 'otherUser:', otherUser?.id);

                    if (!otherUser || !product) {
                        console.log('[loadChatsList] Skipping - missing data. product:', !!product, 'otherUser:', !!otherUser);
                        return;
                    }

                    const chatKey = `${msg.product_id}_${otherUserId}`;

                    if (!userChats.has(chatKey) || new Date(msg.created_at) > new Date(userChats.get(chatKey).lastMessage.created_at)) {
                        userChats.set(chatKey, {
                            otherUser,
                            product,
                            lastMessage: msg,
                            unreadCount: 0 // TODO: Calculate actual unread count
                        });
                    }
                });

                // Convert to array and sort by latest message
                const chatsList = Array.from(userChats.values()).sort((a, b) =>
                    new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at)
                );

                // Render chat list
                if (chatsList.length === 0) {
                    chatsContainer.innerHTML = `
                        <div style="text-align: center; padding: 40px; color: #a1a1aa;">
                            <div style="font-size: 64px; margin-bottom: 16px;">💬</div>
                            <h3>ยังไม่มีแชท</h3>
                            <p>เริ่มสนทนากับผู้ขายในหน้าสินค้า</p>
                        </div>
                    `;
                } else {
                    chatsContainer.innerHTML = chatsList.map(chat => `
                        <div class="chat-list-item" onclick="openChatFromList('${chat.product.id}', '${chat.otherUser.id}')">
                            <img class="chat-list-avatar" src="${chat.otherUser.profile_image || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(chat.otherUser.username)}" alt="Profile">
                            <div class="chat-list-info">
                                <div class="chat-list-header">
                                    <div class="chat-list-name">@${chat.otherUser.username}</div>
                                    <div class="chat-list-time">${formatMessageTime(chat.lastMessage.created_at)}</div>
                                    ${chat.unreadCount > 0 ? `<div class="unread-badge">${chat.unreadCount}</div>` : ''}
                                </div>
                                <div class="chat-list-preview">${chat.lastMessage.message}</div>
                                <div class="chat-list-product">เรื่อง: ${chat.product.title}</div>
                            </div>
                        </div>
                    `).join('');
                }
            } catch (error) {
                console.error('Error loading chats list:', error);
                chatsContainer.innerHTML = '<div class="no-chats">เกิดข้อผิดพลาดในการโหลดแชท</div>';
            }
        }

        async function openChatFromList(productId, sellerId) {
            // Find product and seller
            await loadProducts();
            await loadUsersFromAPI();

            currentChatProduct = allProducts.find(p => p.id == productId);
            currentChatSeller = globalUsersCache.find(u => u.id == sellerId);

            if (!currentChatProduct || !currentChatSeller) {
                alert('ไม่พบข้อมูลแชท');
                return;
            }

            // Load chat messages
            await loadChatMessages();

            // Show chat page
            showPage('chat');
        }

        // Add Enter key support for sending messages
        document.addEventListener('DOMContentLoaded', function() {
            const chatInput = document.getElementById('chatMessageInput');
            if (chatInput) {
                chatInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                    }
                });
            }
        });

        async function buyProduct() {
            if (!currentProduct) return;
            if (!currentUser) {
                alert('กรุณาเข้าสู่ระบบก่อนสั่งซื้อ');
                return;
            }

            // Get seller's payment methods
            try {
                const response = await fetch(`/api/payment-methods/${currentProduct.seller_id}`);
                const result = await response.json();

                if (!result.success || result.data.length === 0) {
                    alert('ผู้ขายยังไม่ได้ตั้งค่าบัญชีรับเงิน กรุณาติดต่อผู้ขายโดยตรง');
                    return;
                }

                // Find default payment method
                const defaultPayment = result.data.find(m => m.is_default === 1) || result.data[0];

                // Show order confirmation
                showOrderConfirmation(defaultPayment);
            } catch (error) {
                console.error('Error loading payment methods:', error);
                alert('เกิดข้อผิดพลาดในการโหลดข้อมูลการชำระเงิน');
            }
        }

        function showOrderConfirmation(paymentMethod) {
            // Get shipping fee from product or default to 0
            const shippingFee = currentProduct.shipping_fee || 0;
            const total = currentProduct.price + shippingFee;

            // Get seller name from global users cache
            let sellerName = 'ไม่ระบุ';
            if (currentProduct.seller_id && globalUsersCache) {
                const seller = globalUsersCache.find(u => u.id === currentProduct.seller_id);
                if (seller) {
                    sellerName = seller.full_name || seller.username || 'ไม่ระบุ';
                }
            }

            const icon = paymentMethod.type === 'bank' ? '🏦' :
                        paymentMethod.type === 'crypto' ? '₿' :
                        paymentMethod.type === 'promptpay' ? '📱' : '📋';

            const displayName = paymentMethod.type === 'bank' ?
                `${paymentMethod.bank_name} - ${paymentMethod.account_number}` :
                paymentMethod.type === 'crypto' ?
                `${paymentMethod.network} - ${paymentMethod.wallet_address}` :
                paymentMethod.account_name;

            let qrSection = '';
            if (paymentMethod.qr_code_path) {
                qrSection = `
                    <div style="text-align: center; margin-top: 16px;">
                        <img src="${paymentMethod.qr_code_path}" style="max-width: 250px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2);">
                        <p style="color: #9ca3af; font-size: 12px; margin-top: 8px;">สแกนเพื่อชำระเงิน</p>
                    </div>
                `;
            }

            // Get user's shipping address
            const defaultAddress = currentUser.shipping_address || '';

            const confirmHtml = `
                <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;" id="orderConfirmPopup">
                    <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 24px; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto;">
                        <h2 style="color: white; margin-bottom: 20px; font-size: 24px;">📋 ยืนยันการสั่งซื้อ</h2>

                        <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                            <h3 style="color: white; font-size: 16px; margin-bottom: 8px;">${currentProduct.title}</h3>
                            <p style="color: #9ca3af; font-size: 14px;">ผู้ขาย: ${sellerName}</p>
                        </div>

                        <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span style="color: #9ca3af;">ราคาสินค้า</span>
                                <span style="color: white;">฿${currentProduct.price.toLocaleString()}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span style="color: #9ca3af;">ค่าจัดส่ง</span>
                                <span style="color: white;">${shippingFee > 0 ? '฿' + shippingFee.toLocaleString() : 'ฟรี'}</span>
                            </div>
                            <div style="border-top: 1px solid rgba(255,255,255,0.1); margin: 12px 0; padding-top: 12px;">
                                <div style="display: flex; justify-content: space-between;">
                                    <span style="color: white; font-weight: 600; font-size: 18px;">รวมทั้งสิ้น</span>
                                    <span style="color: #10b981; font-weight: 600; font-size: 18px;">฿${total.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                            <h3 style="color: white; font-size: 16px; margin-bottom: 12px;">💳 ช่องทางชำระเงิน</h3>
                            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                                <span style="font-size: 24px; margin-right: 8px;">${icon}</span>
                                <div>
                                    <div style="color: white; font-weight: 600;">${paymentMethod.account_name}</div>
                                    <div style="color: #9ca3af; font-size: 14px;">${displayName}</div>
                                </div>
                            </div>
                            ${qrSection}
                        </div>

                        <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                            <label style="color: white; font-size: 14px; margin-bottom: 8px; display: block;">ที่อยู่จัดส่ง</label>
                            <textarea id="shippingAddress" style="width: 100%; min-height: 80px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 12px; color: white; font-size: 14px;" placeholder="กรุณากรอกที่อยู่จัดส่ง" onkeyup="checkAddressConfirmed()">${defaultAddress}</textarea>
                            ${!defaultAddress ? '<p style="color: #f59e0b; font-size: 12px; margin-top: 8px;">💡 คุณสามารถตั้งค่าที่อยู่เริ่มต้นได้ในหน้าโปรไฟล์</p>' : ''}
                            <button id="confirmAddressBtn" onclick="confirmAddress()" style="width: 100%; margin-top: 12px; padding: 10px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 600;">📍 ยืนยันที่อยู่จัดส่ง</button>
                            <div id="addressConfirmed" style="display: none; margin-top: 12px; padding: 12px; background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; border-radius: 8px; color: #10b981; font-size: 14px;">
                                ✅ ที่อยู่ได้รับการยืนยันแล้ว
                            </div>
                        </div>

                        <div id="buyerNotesSection" style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; margin-bottom: 16px; display: none;">
                            <label style="color: white; font-size: 14px; margin-bottom: 8px; display: block;">หมายเหตุ (ถ้ามี)</label>
                            <textarea id="buyerNotes" style="width: 100%; min-height: 60px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 12px; color: white; font-size: 14px;" placeholder="ข้อความถึงผู้ขาย"></textarea>
                        </div>

                        <div style="display: flex; gap: 12px;">
                            <button onclick="closeOrderConfirm()" style="flex: 1; padding: 12px; background: rgba(255,255,255,0.1); color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer;">ยกเลิก</button>
                            <button id="confirmOrderBtn" onclick="confirmOrder()" disabled style="flex: 1; padding: 12px; background: rgba(128,128,128,0.5); color: rgba(255,255,255,0.5); border: none; border-radius: 8px; font-size: 16px; cursor: not-allowed; font-weight: 600;">✅ ยืนยันการสั่งซื้อ</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', confirmHtml);
        }

        function confirmAddress() {
            const address = document.getElementById('shippingAddress').value.trim();
            if (!address) {
                alert('กรุณากรอกที่อยู่จัดส่ง');
                return;
            }

            // Hide confirm button, show confirmed status
            document.getElementById('confirmAddressBtn').style.display = 'none';
            document.getElementById('addressConfirmed').style.display = 'block';

            // Make address readonly
            document.getElementById('shippingAddress').readOnly = true;
            document.getElementById('shippingAddress').style.background = 'rgba(0,0,0,0.2)';

            // Show buyer notes section
            document.getElementById('buyerNotesSection').style.display = 'block';

            // Enable confirm order button
            const confirmBtn = document.getElementById('confirmOrderBtn');
            confirmBtn.disabled = false;
            confirmBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
            confirmBtn.style.color = 'white';
            confirmBtn.style.cursor = 'pointer';
        }

        function checkAddressConfirmed() {
            // If user edits address after confirming, reset confirmation
            const addressConfirmed = document.getElementById('addressConfirmed');
            if (addressConfirmed && addressConfirmed.style.display === 'block') {
                addressConfirmed.style.display = 'none';
                document.getElementById('confirmAddressBtn').style.display = 'block';
                document.getElementById('shippingAddress').readOnly = false;
                document.getElementById('shippingAddress').style.background = 'rgba(0,0,0,0.3)';
                document.getElementById('buyerNotesSection').style.display = 'none';

                const confirmBtn = document.getElementById('confirmOrderBtn');
                confirmBtn.disabled = true;
                confirmBtn.style.background = 'rgba(128,128,128,0.5)';
                confirmBtn.style.color = 'rgba(255,255,255,0.5)';
                confirmBtn.style.cursor = 'not-allowed';
            }
        }

        function closeOrderConfirm() {
            const popup = document.getElementById('orderConfirmPopup');
            if (popup) popup.remove();
        }

        async function confirmOrder() {
            const shippingAddress = document.getElementById('shippingAddress').value.trim();
            if (!shippingAddress) {
                alert('กรุณากรอกที่อยู่จัดส่ง');
                return;
            }

            const buyerNotes = document.getElementById('buyerNotes').value.trim();
            const shippingFee = currentProduct.shipping_fee || 0;
            const total = currentProduct.price + shippingFee;

            const orderData = {
                buyer_id: currentUser.id,
                seller_id: currentProduct.seller_id,
                product_id: currentProduct.id,
                subtotal: currentProduct.price,
                community_fee: shippingFee, // Using community_fee field for shipping fee
                total_amount: total,
                shipping_address: shippingAddress,
                buyer_notes: buyerNotes
            };

            try {
                // Update user's shipping address if different from saved one
                if (shippingAddress !== currentUser.shipping_address) {
                    await fetch(`/api/users/${currentUser.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ shipping_address: shippingAddress })
                    });
                    currentUser.shipping_address = shippingAddress;
                }

                const response = await fetch('/api/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orderData)
                });

                const result = await response.json();

                if (result.success) {
                    closeOrderConfirm();
                    closeProductPopup();
                    alert('✅ สั่งซื้อสำเร็จ!\n\nเลขที่คำสั่งซื้อ: ' + result.data.order_number + '\n\nกรุณาชำระเงินตามช่องทางที่แสดง\nและรอผู้ขายยืนยันคำสั่งซื้อ');
                    showPage('orders');
                    loadOrders();
                } else {
                    alert('❌ เกิดข้อผิดพลาด: ' + result.message);
                }
            } catch (error) {
                console.error('Error creating order:', error);
                alert('❌ เกิดข้อผิดพลาดในการสั่งซื้อ');
            }
        }

        // ==================== Orders Management ====================
        function showOrderType(type) {
            const buyBtn = document.getElementById('buyOrdersBtn');
            const sellBtn = document.getElementById('sellOrdersBtn');
            const buyContainer = document.getElementById('buyOrdersContainer');
            const sellContainer = document.getElementById('sellOrdersContainer');

            if (type === 'buy') {
                buyBtn.style.color = '#10b981';
                buyBtn.style.borderBottom = '2px solid #10b981';
                sellBtn.style.color = '#9ca3af';
                sellBtn.style.borderBottom = 'none';
                buyContainer.style.display = 'block';
                sellContainer.style.display = 'none';
            } else {
                sellBtn.style.color = '#10b981';
                sellBtn.style.borderBottom = '2px solid #10b981';
                buyBtn.style.color = '#9ca3af';
                buyBtn.style.borderBottom = 'none';
                sellContainer.style.display = 'block';
                buyContainer.style.display = 'none';
            }
        }

        async function loadOrders() {
            if (!currentUser) return;

            try {
                // Load buy orders
                const buyResponse = await fetch(`/api/orders/buyer/${currentUser.id}`);
                const buyResult = await buyResponse.json();

                const buyContainer = document.getElementById('buyOrdersContainer');

                if (buyContainer && buyResult.success && buyResult.data.length > 0) {
                    buyContainer.innerHTML = buyResult.data.map(order => {
                        const item = order.items[0]; // First item
                        const statusInfo = getOrderStatusInfo(order.status);

                        return `
                            <div style="background: rgba(15, 23, 42, 0.8); border-radius: 12px; padding: 16px; margin-bottom: 16px; border: 3px solid #ef4444; box-shadow: 0 0 15px rgba(239, 68, 68, 0.5);">
                                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                                    <div>
                                        <div style="color: white; font-weight: 600; font-size: 14px;">เลขที่: ${order.order_number}</div>
                                        <div style="color: #9ca3af; font-size: 12px; margin-top: 4px;">${new Date(order.created_at).toLocaleDateString('th-TH')}</div>
                                    </div>
                                    <div style="background: ${statusInfo.color}; color: white; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600;">
                                        ${statusInfo.icon} ${statusInfo.text}
                                    </div>
                                </div>

                                ${item ? `
                                    <div style="display: flex; gap: 12px; margin-bottom: 12px;">
                                        <img src="${item.product_image || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'80\' height=\'80\'%3E%3Crect fill=\'%23374151\' width=\'80\' height=\'80\'/%3E%3Ctext fill=\'%239ca3af\' font-family=\'Arial\' font-size=\'14\' x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\'%3ENo Image%3C/text%3E%3C/svg%3E'}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">
                                        <div style="flex: 1;">
                                            <div style="color: white; font-weight: 600; margin-bottom: 4px;">${item.product_title}</div>
                                            <div style="color: #9ca3af; font-size: 14px;">จำนวน: ${item.quantity}</div>
                                            <div style="color: #10b981; font-weight: 600; margin-top: 4px;">฿${order.total_amount.toLocaleString()}</div>
                                        </div>
                                    </div>
                                ` : ''}

                                <div style="display: flex; gap: 8px; margin-top: 12px;">
                                    <button onclick="viewOrderDetail('${order.id}')" style="flex: 1; padding: 10px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 600;">
                                        📋 ดูรายละเอียด
                                    </button>
                                    ${getOrderActionButton(order)}
                                </div>
                            </div>
                        `;
                    }).join('');
                } else if (buyContainer) {
                    buyContainer.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 40px 20px;">ยังไม่มีคำสั่งซื้อ</p>';
                }

                // Load sell orders
                const sellResponse = await fetch(`/api/orders/seller/${currentUser.id}`);
                const sellResult = await sellResponse.json();

                const sellContainer = document.getElementById('sellOrdersContainer');

                if (sellContainer && sellResult.success && sellResult.data.length > 0) {
                    sellContainer.innerHTML = sellResult.data.map(order => {
                        const item = order.items[0]; // First item
                        const statusInfo = getOrderStatusInfo(order.status);

                        return `
                            <div style="background: rgba(15, 23, 42, 0.8); border-radius: 12px; padding: 16px; margin-bottom: 16px; border: 3px solid #10b981; box-shadow: 0 0 15px rgba(16, 185, 129, 0.5);">
                                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                                    <div>
                                        <div style="color: white; font-weight: 600; font-size: 14px;">เลขที่: ${order.order_number}</div>
                                        <div style="color: #9ca3af; font-size: 12px; margin-top: 4px;">${new Date(order.created_at).toLocaleDateString('th-TH')}</div>
                                        <div style="color: #10b981; font-size: 12px; margin-top: 4px;">ผู้ซื้อ: ${order.buyer_name || 'ไม่ระบุ'}</div>
                                    </div>
                                    <div style="background: ${statusInfo.color}; color: white; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600;">
                                        ${statusInfo.icon} ${statusInfo.text}
                                    </div>
                                </div>

                                ${item ? `
                                    <div style="display: flex; gap: 12px; margin-bottom: 12px;">
                                        <img src="${item.product_image || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'80\' height=\'80\'%3E%3Crect fill=\'%23374151\' width=\'80\' height=\'80\'/%3E%3Ctext fill=\'%239ca3af\' font-family=\'Arial\' font-size=\'14\' x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\'%3ENo Image%3C/text%3E%3C/svg%3E'}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">
                                        <div style="flex: 1;">
                                            <div style="color: white; font-weight: 600; margin-bottom: 4px;">${item.product_title}</div>
                                            <div style="color: #9ca3af; font-size: 14px;">จำนวน: ${item.quantity}</div>
                                            <div style="color: #10b981; font-weight: 600; margin-top: 4px;">฿${order.total_amount.toLocaleString()}</div>
                                        </div>
                                    </div>
                                ` : ''}

                                <div style="display: flex; gap: 8px; margin-top: 12px;">
                                    <button onclick="viewOrderDetail('${order.id}')" style="flex: 1; padding: 10px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 600;">
                                        📋 ดูรายละเอียด
                                    </button>
                                    ${getSellerOrderActionButton(order)}
                                </div>
                            </div>
                        `;
                    }).join('');
                } else if (sellContainer) {
                    sellContainer.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 40px 20px;">ยังไม่มีคำสั่งขาย</p>';
                }
            } catch (error) {
                console.error('Error loading orders:', error);
            }
        }

        function getOrderStatusInfo(status) {
            const statusMap = {
                'pending': { text: 'รอผู้ขายตอบรับ', color: '#f59e0b', icon: '⏳' },
                'confirmed': { text: 'รอโอนเงิน', color: '#3b82f6', icon: '💳' },
                'paid': { text: 'รอตรวจสอบการชำระเงิน', color: '#8b5cf6', icon: '🔍' },
                'payment_verified': { text: 'รอจัดส่ง', color: '#06b6d4', icon: '📦' },
                'shipped': { text: 'กำลังจัดส่ง', color: '#14b8a6', icon: '🚚' },
                'delivered': { text: 'รอยืนยันรับสินค้า', color: '#10b981', icon: '✅' },
                'completed': { text: 'เสร็จสิ้น', color: '#22c55e', icon: '✔️' },
                'cancelled': { text: 'ยกเลิก', color: '#ef4444', icon: '❌' },
                'refunded': { text: 'คืนเงินแล้ว', color: '#6b7280', icon: '↩️' }
            };
            return statusMap[status] || { text: status, color: '#6b7280', icon: '📄' };
        }

        function getOrderActionButton(order) {
            if (order.status === 'confirmed') {
                return `<button onclick="uploadPaymentSlip('${order.id}')" style="flex: 1; padding: 10px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 600;">💳 แนบสลิปโอนเงิน</button>`;
            } else if (order.status === 'delivered') {
                return `<button onclick="confirmDelivery('${order.id}')" style="flex: 1; padding: 10px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 600;">✅ ยืนยันรับสินค้า</button>`;
            } else if (order.status === 'completed' && !order.reviewed) {
                return `<button onclick="reviewOrder('${order.id}')" style="flex: 1; padding: 10px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 600;">⭐ รีวิวสินค้า</button>`;
            }
            return '';
        }

        function getSellerOrderActionButton(order) {
            if (order.status === 'pending') {
                return `<button onclick="confirmSellerOrder('${order.id}')" style="flex: 1; padding: 10px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 600;">✅ ยืนยันการรับคำสั่งซื้อ</button>`;
            } else if (order.status === 'paid') {
                return `<button onclick="verifyPayment('${order.id}')" style="flex: 1; padding: 10px; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 600;">✅ ยืนยันการชำระเงิน</button>`;
            } else if (order.status === 'payment_verified') {
                return `<button onclick="shipOrder('${order.id}')" style="flex: 1; padding: 10px; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 600;">🚚 จัดส่งสินค้า</button>`;
            }
            return '';
        }

        async function viewOrderDetail(orderId) {
            console.log('📦 Opening order detail:', orderId);
            try {
                //Fetch order details
                const response = await fetch(`/api/orders/${orderId}`);
                const result = await response.json();
                console.log('📦 Order data:', result);

                if (!result.success) {
                    alert('❌ ไม่พบข้อมูลคำสั่งซื้อ');
                    return;
                }

                const order = result.data;
                const item = order.items && order.items[0];
                const statusInfo = getOrderStatusInfo(order.status);
                const isBuyer = order.buyer_id === currentUser.id;
                const isSeller = order.seller_id === currentUser.id;

                // Create popup HTML
                const popupHTML = `
                    <div id="orderDetailPopup" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.8); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px;" onclick="closeOrderDetail(event)">
                        <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto; border: 2px solid rgba(16, 185, 129, 0.3);" onclick="event.stopPropagation()">
                            <!-- Header -->
                            <div style="padding: 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                                <div style="display: flex; justify-content: space-between; align-items: start;">
                                    <div>
                                        <div style="color: white; font-size: 18px; font-weight: bold; margin-bottom: 8px;">📦 รายละเอียดคำสั่งซื้อ</div>
                                        <div style="color: #10b981; font-size: 14px; font-weight: 600;">เลขที่: ${order.order_number}</div>
                                    </div>
                                    <button onclick="closeOrderDetail()" style="background: rgba(255, 255, 255, 0.1); border: none; color: white; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; font-size: 18px;">×</button>
                                </div>
                                <div style="margin-top: 12px; display: inline-block; background: ${statusInfo.color}; color: white; padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 600;">
                                    ${statusInfo.icon} ${statusInfo.text}
                                </div>
                            </div>

                            <!-- Product Info -->
                            ${item ? `
                                <div style="padding: 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                                    <div style="color: #9ca3af; font-size: 12px; margin-bottom: 8px;">สินค้า</div>
                                    <div style="display: flex; gap: 12px;">
                                        <img src="${item.product_image || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'80\' height=\'80\'%3E%3Crect fill=\'%23374151\' width=\'80\' height=\'80\'/%3E%3Ctext fill=\'%239ca3af\' font-family=\'Arial\' font-size=\'14\' x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\'%3ENo Image%3C/text%3E%3C/svg%3E'}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">
                                        <div style="flex: 1;">
                                            <div style="color: white; font-weight: 600; margin-bottom: 4px;">${item.product_title}</div>
                                            <div style="color: #9ca3af; font-size: 14px; margin-bottom: 4px;">สภาพ: ${item.product_condition}</div>
                                            <div style="color: #9ca3af; font-size: 14px;">จำนวน: ${item.quantity}</div>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}

                            <!-- Order Info -->
                            <div style="padding: 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                                <div style="color: #9ca3af; font-size: 12px; margin-bottom: 12px;">ข้อมูลคำสั่งซื้อ</div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                    <span style="color: #9ca3af; font-size: 14px;">${isBuyer ? 'ผู้ขาย' : 'ผู้ซื้อ'}:</span>
                                    <span style="color: white; font-size: 14px; font-weight: 600;">${isBuyer ? (order.seller_name || 'ไม่ระบุ') : (order.buyer_name || 'ไม่ระบุ')}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding-top: 8px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                                    <span style="color: #10b981; font-size: 16px; font-weight: bold;">ราคาสินค้า:</span>
                                    <span style="color: #10b981; font-size: 16px; font-weight: bold;">฿${order.total_amount.toLocaleString()}</span>
                                </div>
                                ${order.shipping_address ? `
                                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                                        <div style="color: #9ca3af; font-size: 12px; margin-bottom: 4px;">ที่อยู่จัดส่ง:</div>
                                        <div style="color: white; font-size: 14px;">${order.shipping_address}</div>
                                    </div>
                                ` : ''}
                                ${order.tracking_number ? `
                                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                                        <div style="color: #9ca3af; font-size: 12px; margin-bottom: 4px;">เลขพัสดุ:</div>
                                        <div style="color: #10b981; font-size: 16px; font-weight: 600;">${order.tracking_number}</div>
                                    </div>
                                ` : ''}
                                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                                    <div style="color: #9ca3af; font-size: 12px;">วันที่สั่งซื้อ: ${new Date(order.created_at).toLocaleString('th-TH')}</div>
                                </div>
                            </div>

                            <!-- Action Buttons -->
                            <div style="padding: 20px;">
                                <div id="orderActionButtons" style="display: flex; flex-direction: column; gap: 12px;">
                                    ${getOrderDetailActionButtons(order, isBuyer, isSeller)}
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                // Add popup to page
                document.body.insertAdjacentHTML('beforeend', popupHTML);
            } catch (error) {
                console.error('Error loading order detail:', error);
                alert('❌ เกิดข้อผิดพลาดในการโหลดข้อมูล');
            }
        }

        function closeOrderDetail(event) {
            if (!event || event.target.id === 'orderDetailPopup') {
                const popup = document.getElementById('orderDetailPopup');
                if (popup) popup.remove();
            }
        }

        function getOrderDetailActionButtons(order, isBuyer, isSeller) {
            let buttons = '';

            if (isSeller) {
                if (order.status === 'pending') {
                    buttons += `<button onclick="confirmSellerOrderFromPopup('${order.id}')" style="width: 100%; padding: 14px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; border-radius: 10px; font-size: 16px; cursor: pointer; font-weight: 600;">✅ ยืนยันการรับคำสั่งซื้อ</button>`;
                } else if (order.status === 'paid') {
                    buttons += `<button onclick="verifyPaymentFromPopup('${order.id}')" style="width: 100%; padding: 14px; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; border: none; border-radius: 10px; font-size: 16px; cursor: pointer; font-weight: 600;">✅ ยืนยันการชำระเงิน</button>`;
                } else if (order.status === 'payment_verified') {
                    buttons += `<button onclick="shipOrderFromPopup('${order.id}')" style="width: 100%; padding: 14px; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: white; border: none; border-radius: 10px; font-size: 16px; cursor: pointer; font-weight: 600;">🚚 จัดส่งสินค้า</button>`;
                }
            }

            if (isBuyer) {
                if (order.status === 'confirmed') {
                    buttons += `<button onclick="uploadPaymentSlipFromPopup('${order.id}')" style="width: 100%; padding: 14px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; border-radius: 10px; font-size: 16px; cursor: pointer; font-weight: 600;">💳 แนบสลิปโอนเงิน</button>`;
                } else if (order.status === 'shipped') {
                    buttons += `<button onclick="confirmDeliveryFromPopup('${order.id}')" style="width: 100%; padding: 14px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; border-radius: 10px; font-size: 16px; cursor: pointer; font-weight: 600;">✅ ยืนยันรับสินค้า</button>`;
                } else if (order.status === 'delivered') {
                    buttons += `<button onclick="confirmDeliveryFromPopup('${order.id}')" style="width: 100%; padding: 14px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; border-radius: 10px; font-size: 16px; cursor: pointer; font-weight: 600;">✅ ยืนยันรับสินค้า</button>`;
                } else if (order.status === 'completed' && !order.reviewed) {
                    buttons += `<button onclick="reviewOrderFromPopup('${order.id}')" style="width: 100%; padding: 14px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; border: none; border-radius: 10px; font-size: 16px; cursor: pointer; font-weight: 600;">⭐ รีวิวสินค้า</button>`;
                }
            }

            if (!buttons) {
                buttons = '<div style="text-align: center; color: #9ca3af; padding: 12px;">ไม่มีการดำเนินการที่ต้องทำในขณะนี้</div>';
            }

            return buttons;
        }

        async function uploadPaymentSlip(orderId) {
            if (!confirm('ยืนยันว่าคุณได้โอนเงินแล้วใช่หรือไม่?\n\n(ระบบจะแจ้งให้ผู้ขายตรวจสอบ)')) return;

            try {
                const response = await fetch(`/api/orders/${orderId}/mark-paid`, {
                    method: 'POST'
                });

                const result = await response.json();

                if (result.success) {
                    alert('✅ ยืนยันการโอนเงินสำเร็จ!\n\nรอผู้ขายตรวจสอบและยืนยัน');
                    loadOrders();
                } else {
                    alert('❌ เกิดข้อผิดพลาด: ' + result.message);
                }
            } catch (error) {
                console.error('Error uploading payment slip:', error);
                alert('❌ เกิดข้อผิดพลาด');
            }
        }

        async function confirmDelivery(orderId) {
            if (!confirm('ยืนยันว่าคุณได้รับสินค้าแล้วใช่หรือไม่?')) return;

            try {
                const response = await fetch(`/api/orders/${orderId}/complete`, {
                    method: 'POST'
                });

                const result = await response.json();

                if (result.success) {
                    alert('✅ ยืนยันรับสินค้าสำเร็จ!');
                    loadOrders();
                } else {
                    alert('❌ เกิดข้อผิดพลาด: ' + result.message);
                }
            } catch (error) {
                console.error('Error confirming delivery:', error);
                alert('❌ เกิดข้อผิดพลาด');
            }
        }

        async function reviewOrder(orderId) {
            try {
                // Get order details to show product info
                const response = await fetch(`/api/orders/${orderId}`);
                const result = await response.json();

                if (!result.success) {
                    alert('❌ ไม่พบข้อมูลคำสั่งซื้อ');
                    return;
                }

                const order = result.data;
                const item = order.items && order.items[0];

                // Create review popup
                const popupHTML = `
                    <div id="reviewPopup" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;">
                        <div style="background: white; border-radius: 20px; padding: 30px; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                                <h3 style="margin: 0; font-size: 20px; color: #1f2937;">⭐ รีวิวสินค้า</h3>
                                <button onclick="closeReviewPopup()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #999;">×</button>
                            </div>

                            ${item && item.image_url ? `<img src="${item.image_url}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 10px; margin-bottom: 15px;">` : ''}

                            <div style="margin-bottom: 20px;">
                                <h4 style="margin: 0 0 5px 0; font-size: 16px; color: #1f2937;">${item ? item.product_title : 'สินค้า'}</h4>
                                <p style="margin: 0; color: #666; font-size: 14px;">คำสั่งซื้อ: ${orderId.substring(0, 20)}...</p>
                            </div>

                            <div style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 10px; font-weight: 600; color: #1f2937;">⭐ ให้คะแนน</label>
                                <div id="ratingStars" style="display: flex; gap: 10px; font-size: 36px; cursor: pointer; user-select: none; color: #d1d5db;">
                                    <span onclick="selectRating(1)" data-rating="1">☆</span>
                                    <span onclick="selectRating(2)" data-rating="2">☆</span>
                                    <span onclick="selectRating(3)" data-rating="3">☆</span>
                                    <span onclick="selectRating(4)" data-rating="4">☆</span>
                                    <span onclick="selectRating(5)" data-rating="5">☆</span>
                                </div>
                            </div>

                            <div style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 10px; font-weight: 600; color: #1f2937;">💬 แสดงความคิดเห็น</label>
                                <textarea id="reviewComment" placeholder="แบ่งปันประสบการณ์ของคุณกับสินค้านี้..." style="width: 100%; min-height: 120px; padding: 12px; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 14px; resize: vertical; color: #1f2937;"></textarea>
                            </div>

                            <button onclick="submitReview('${orderId}')" style="width: 100%; padding: 14px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; border: none; border-radius: 10px; font-size: 16px; cursor: pointer; font-weight: 600;">
                                ส่งรีวิว
                            </button>
                        </div>
                    </div>
                `;

                document.body.insertAdjacentHTML('beforeend', popupHTML);

            } catch (error) {
                console.error('Error showing review form:', error);
                alert('❌ เกิดข้อผิดพลาด');
            }
        }

        let selectedRating = 0;

        function selectRating(rating) {
            selectedRating = rating;
            const stars = document.querySelectorAll('#ratingStars span');
            stars.forEach((star, index) => {
                if (index < rating) {
                    star.textContent = '★';
                    star.style.color = '#f59e0b';
                } else {
                    star.textContent = '☆';
                    star.style.color = '#d1d5db';
                }
            });
        }

        function closeReviewPopup() {
            const popup = document.getElementById('reviewPopup');
            if (popup) popup.remove();
            selectedRating = 0;
        }

        async function submitReview(orderId) {
            if (selectedRating === 0) {
                alert('⚠️ กรุณาให้คะแนนสินค้า');
                return;
            }

            const comment = document.getElementById('reviewComment').value.trim();

            if (!comment) {
                alert('⚠️ กรุณาแสดงความคิดเห็น');
                return;
            }

            try {
                const response = await fetch(`/api/orders/${orderId}/review`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        rating: selectedRating,
                        comment: comment
                    })
                });

                const result = await response.json();

                if (result.success) {
                    alert('✅ ส่งรีวิวสำเร็จ!\n\nขอบคุณสำหรับรีวิวของคุณ');
                    closeReviewPopup();
                    loadOrders();
                } else {
                    alert('❌ เกิดข้อผิดพลาด: ' + result.message);
                }
            } catch (error) {
                console.error('Error submitting review:', error);
                alert('❌ เกิดข้อผิดพลาด');
            }
        }

        async function viewReviewDetail(orderId) {
            console.log('⭐ Opening review detail:', orderId);
            try {
                // Get order details
                const orderResponse = await fetch(`/api/orders/${orderId}`);
                const orderResult = await orderResponse.json();
                console.log('Order result:', orderResult);

                if (!orderResult.success) {
                    alert('❌ ไม่พบข้อมูลคำสั่งซื้อ');
                    return;
                }

                const order = orderResult.data;
                const item = order.items && order.items[0];

                // Get review details
                const reviewResponse = await fetch(`/api/orders/${orderId}/review`);
                const reviewResult = await reviewResponse.json();
                console.log('Review result:', reviewResult);

                if (!reviewResult.success || !reviewResult.data) {
                    alert('❌ ไม่พบรีวิว');
                    return;
                }

                const review = reviewResult.data;
                console.log('Review data:', review);

                // Create stars display
                let starsHTML = '';
                for (let i = 1; i <= 5; i++) {
                    if (i <= review.rating) {
                        starsHTML += '<span style="color: #f59e0b;">★</span>';
                    } else {
                        starsHTML += '<span style="color: #d1d5db;">☆</span>';
                    }
                }

                // Create review popup (read-only)
                const popupHTML = `
                    <div id="reviewDetailPopup" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;">
                        <div style="background: white; border-radius: 20px; padding: 30px; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                                <h3 style="margin: 0; font-size: 20px; color: #1f2937;">⭐ รีวิวจากลูกค้า</h3>
                                <button onclick="closeReviewDetailPopup()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #999;">×</button>
                            </div>

                            ${item && item.image_url ? `<img src="${item.image_url}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 10px; margin-bottom: 15px;">` : ''}

                            <div style="margin-bottom: 20px;">
                                <h4 style="margin: 0 0 5px 0; font-size: 16px; color: #1f2937;">${item ? item.product_title : 'สินค้า'}</h4>
                                <p style="margin: 0; color: #666; font-size: 14px;">คำสั่งซื้อ: ${orderId.substring(0, 20)}...</p>
                            </div>

                            <div style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 10px; font-weight: 600; color: #1f2937;">⭐ คะแนน</label>
                                <div style="font-size: 36px;">
                                    ${starsHTML}
                                </div>
                            </div>

                            <div style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 10px; font-weight: 600; color: #1f2937;">💬 ความคิดเห็น</label>
                                <div style="padding: 12px; background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 14px; color: #1f2937; min-height: 80px;">
                                    ${review.comment}
                                </div>
                            </div>

                            <div style="padding: 12px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 10px; color: #166534; font-size: 14px; margin-bottom: 15px;">
                                <strong>👤 รีวิวโดย:</strong> ${order.buyer_name || 'ผู้ซื้อ'}
                            </div>

                            <button onclick="closeReviewDetailPopup()" style="width: 100%; padding: 14px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; border-radius: 10px; font-size: 16px; cursor: pointer; font-weight: 600;">
                                ปิด
                            </button>
                        </div>
                    </div>
                `;

                document.body.insertAdjacentHTML('beforeend', popupHTML);

            } catch (error) {
                console.error('Error showing review detail:', error);
                alert('❌ เกิดข้อผิดพลาด');
            }
        }

        function closeReviewDetailPopup() {
            const popup = document.getElementById('reviewDetailPopup');
            if (popup) popup.remove();
        }

        async function confirmSellerOrder(orderId) {
            if (!confirm('ยืนยันรับคำสั่งซื้อนี้ใช่หรือไม่?')) return;

            try {
                const response = await fetch(`/api/orders/${orderId}/confirm`, {
                    method: 'POST'
                });

                const result = await response.json();

                if (result.success) {
                    alert('✅ ยืนยันคำสั่งซื้อสำเร็จ!\n\nรอผู้ซื้อโอนเงิน');
                    loadOrders();
                } else {
                    alert('❌ เกิดข้อผิดพลาด: ' + result.message);
                }
            } catch (error) {
                console.error('Error confirming order:', error);
                alert('❌ เกิดข้อผิดพลาด');
            }
        }

        async function verifyPayment(orderId) {
            if (!confirm('ยืนยันว่าได้รับเงินแล้วใช่หรือไม่?')) return;

            try {
                const response = await fetch(`/api/orders/${orderId}/verify-payment`, {
                    method: 'POST'
                });

                const result = await response.json();

                if (result.success) {
                    alert('✅ ยืนยันการชำระเงินสำเร็จ!\n\nกรุณาจัดส่งสินค้า');
                    loadOrders();
                } else {
                    alert('❌ เกิดข้อผิดพลาด: ' + result.message);
                }
            } catch (error) {
                console.error('Error verifying payment:', error);
                alert('❌ เกิดข้อผิดพลาด');
            }
        }

        async function shipOrder(orderId) {
            // Ask for shipping provider
            const shippingProviders = ['ไปรษณีย์ไทย', 'Kerry Express', 'Flash Express', 'J&T Express', 'DHL', 'FedEx', 'Lalamove', 'Grab Express', 'Ninja Van', 'Best Express', 'อื่นๆ'];
            let providerList = 'เลือกผู้ขนส่ง:\n\n';
            shippingProviders.forEach((provider, index) => {
                providerList += `${index + 1}. ${provider}\n`;
            });

            const providerChoice = prompt(providerList + '\nกรุณาใส่หมายเลข (1-11):');
            if (!providerChoice) return;

            const providerIndex = parseInt(providerChoice) - 1;
            if (providerIndex < 0 || providerIndex >= shippingProviders.length) {
                alert('❌ กรุณาเลือกหมายเลข 1-11');
                return;
            }

            let shippingProvider = shippingProviders[providerIndex];

            // If "อื่นๆ" is selected, ask for custom name
            if (shippingProvider === 'อื่นๆ') {
                const customProvider = prompt('กรุณาระบุชื่อผู้ขนส่ง:');
                if (!customProvider) return;
                shippingProvider = customProvider;
            }

            const trackingNumber = prompt(`ผู้ขนส่ง: ${shippingProvider}\n\nกรุณาใส่เลขพัสดุ:`);
            if (!trackingNumber) return;

            try {
                const response = await fetch(`/api/orders/${orderId}/ship`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tracking_number: trackingNumber,
                        shipping_provider: shippingProvider
                    })
                });

                const result = await response.json();

                if (result.success) {
                    alert('✅ จัดส่งสินค้าสำเร็จ!\n\nเลขพัสดุ: ' + trackingNumber);
                    loadOrders();
                } else {
                    alert('❌ เกิดข้อผิดพลาด: ' + result.message);
                }
            } catch (error) {
                console.error('Error shipping order:', error);
                alert('❌ เกิดข้อผิดพลาด');
            }
        }

        // Functions called from popup
        async function confirmSellerOrderFromPopup(orderId) {
            await confirmSellerOrder(orderId);
            closeOrderDetail();
            await loadOrders();
            // Reopen popup with updated data
            setTimeout(() => viewOrderDetail(orderId), 500);
        }

        async function verifyPaymentFromPopup(orderId) {
            await verifyPayment(orderId);
            closeOrderDetail();
            await loadOrders();
            // Reopen popup with updated data
            setTimeout(() => viewOrderDetail(orderId), 500);
        }

        async function shipOrderFromPopup(orderId) {
            await shipOrder(orderId);
            closeOrderDetail();
            await loadOrders();
            // Reopen popup with updated data
            setTimeout(() => viewOrderDetail(orderId), 500);
        }

        async function uploadPaymentSlipFromPopup(orderId) {
            await uploadPaymentSlip(orderId);
            closeOrderDetail();
            await loadOrders();
            // Reopen popup with updated data
            setTimeout(() => viewOrderDetail(orderId), 500);
        }

        async function confirmDeliveryFromPopup(orderId) {
            await confirmDelivery(orderId);
            closeOrderDetail();
            await loadOrders();
            // Reopen popup with updated data
            setTimeout(() => viewOrderDetail(orderId), 500);
        }

        async function reviewOrderFromPopup(orderId) {
            await reviewOrder(orderId);
            closeOrderDetail();
            await loadOrders();
        }

        // ==================== Notifications System ====================
        let notifications = [];

        // Navigate to notifications page when bell is clicked
        function goToNotifications() {
            showPage('listings');
            showListingsTab('notifications');
        }

        // Update notification badge count
        async function updateNotificationBadge() {
            if (!currentUser) return;

            try {
                const response = await fetch(`/api/notifications/${currentUser.id}`);
                const result = await response.json();

                if (result.success) {
                    notifications = result.data;

                    // Count unread notifications
                    const unreadCount = notifications.filter(n => !n.is_read).length;

                    // Update badge
                    const badge = document.getElementById('notificationBadge');
                    if (badge) {
                        if (unreadCount > 0) {
                            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                            badge.style.display = 'flex';
                        } else {
                            badge.style.display = 'none';
                        }
                    }
                }
            } catch (error) {
                console.error('Error updating notification badge:', error);
            }
        }

        // Start periodic badge updates when user logs in
        function startNotificationUpdates() {
            if (currentUser) {
                updateNotificationBadge(); // Update immediately
                setInterval(updateNotificationBadge, 30000); // Update every 30 seconds
            }
        }

        function getTimeAgo(dateString) {
            const now = new Date();
            const date = new Date(dateString);
            const seconds = Math.floor((now - date) / 1000);

            if (seconds < 60) return 'เมื่อสักครู่';
            if (seconds < 3600) return `${Math.floor(seconds / 60)} นาทีที่แล้ว`;
            if (seconds < 86400) return `${Math.floor(seconds / 3600)} ชั่วโมงที่แล้ว`;
            if (seconds < 604800) return `${Math.floor(seconds / 86400)} วันที่แล้ว`;

            return date.toLocaleDateString('th-TH');
        }

        async function handleNotificationClick(notifId, type, referenceId) {
            console.log('🔔 Notification clicked:', { notifId, type, referenceId });

            // Mark as read
            await markNotificationAsRead(notifId);

            // Navigate based on notification type
            if (type === 'new_order' || type === 'order_confirmed' || type === 'order_paid' || type === 'order_payment_verified' || type === 'order_shipped' || type === 'order_delivered' || type === 'order_completed') {
                // Navigate to Orders page and show order detail popup
                showPage('listings');
                showListingsTab('orders');
                if (referenceId) {
                    setTimeout(() => viewOrderDetail(referenceId), 300);
                }
            } else if (type === 'review_received') {
                console.log('📝 Handling review_received notification, referenceId:', referenceId);
                // Show review detail popup
                if (referenceId) {
                    setTimeout(() => viewReviewDetail(referenceId), 300);
                } else {
                    console.error('❌ No referenceId for review notification');
                }
            } else if (type === 'new_referral') {
                // Navigate to referrals page for new referral notification
                showPage('referrals');
            }

            // Close panel
            document.getElementById('notificationPanel').classList.remove('show');
        }

        async function markNotificationAsRead(notifId) {
            try {
                await fetch(`/api/notifications/${notifId}/read`, {
                    method: 'POST'
                });

                // Update local state
                const notif = notifications.find(n => n.id === notifId);
                if (notif) {
                    notif.is_read = true;
                    renderNotifications();
                    updateNotificationBadge();
                }
            } catch (error) {
                console.error('Error marking notification as read:', error);
            }
        }

        async function markAllAsRead() {
            if (!currentUser) return;

            try {
                await fetch(`/api/notifications/${currentUser.id}/read-all`, {
                    method: 'POST'
                });

                notifications.forEach(n => n.is_read = true);
                renderNotifications();
                updateNotificationBadge();
            } catch (error) {
                console.error('Error marking all as read:', error);
            }
        }

        // Load notifications on page load
        if (currentUser) {
            loadNotifications();
            // Refresh every 30 seconds
            setInterval(loadNotifications, 30000);
        }

        async function loadFullNotifications() {
            if (!currentUser) return;

            const container = document.getElementById('fullNotificationsList');
            container.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 40px 20px;">กำลังโหลด...</p>';

            try {
                const response = await fetch(`/api/notifications/${currentUser.id}`);
                const result = await response.json();

                if (result.success && result.data.length > 0) {
                    container.innerHTML = result.data.map(notif => {
                        const timeAgo = getTimeAgo(notif.created_at);
                        // Parse data JSON to get icon and referenceId
                        let icon = '📬';
                        let referenceId = '';
                        try {
                            if (notif.data) {
                                const data = JSON.parse(notif.data);
                                icon = data.icon || icon;
                                referenceId = data.referenceId || '';
                            }
                        } catch (e) {}

                        return `
                            <div style="background: ${notif.is_read ? 'rgba(15, 23, 42, 0.5)' : 'rgba(16, 185, 129, 0.1)'}; border-radius: 12px; padding: 16px; margin-bottom: 12px; border: 1px solid ${notif.is_read ? 'rgba(255, 255, 255, 0.1)' : 'rgba(16, 185, 129, 0.3)'}; cursor: pointer;" onclick="handleFullNotificationClick('${notif.id}', '${notif.type}', '${referenceId}')">
                                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                                    <div style="color: white; font-weight: 600; font-size: 16px;">${icon} ${notif.title}</div>
                                    ${!notif.is_read ? '<div style="width: 10px; height: 10px; background: #ef4444; border-radius: 50%;"></div>' : ''}
                                </div>
                                <div style="color: #9ca3af; font-size: 14px; margin-bottom: 8px;">${notif.body || notif.message || ''}</div>
                                <div style="color: #6b7280; font-size: 12px;">${timeAgo}</div>
                            </div>
                        `;
                    }).join('');
                } else {
                    container.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 40px 20px;">ไม่มีการแจ้งเตือน</p>';
                }
            } catch (error) {
                console.error('Error loading full notifications:', error);
                container.innerHTML = '<p style="text-align: center; color: #ef4444; padding: 40px 20px;">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
            }
        }

        async function handleFullNotificationClick(notifId, type, referenceId) {
            console.log('🔔 Full notification clicked:', { notifId, type, referenceId });
            await markNotificationAsRead(notifId);

            if (type === 'new_order' || type === 'order_confirmed' || type === 'order_paid' || type === 'order_payment_verified' || type === 'order_shipped' || type === 'order_delivered' || type === 'order_completed') {
                showListingsTab('orders');
                if (referenceId) {
                    setTimeout(() => viewOrderDetail(referenceId), 300);
                }
            } else if (type === 'review_received') {
                console.log('📝 Handling review_received in full notifications, referenceId:', referenceId);
                // Show review detail popup
                if (referenceId) {
                    setTimeout(() => viewReviewDetail(referenceId), 300);
                } else {
                    console.error('❌ No referenceId for review notification');
                }
            } else if (type === 'new_referral') {
                // Navigate to referrals page for new referral notification
                showPage('referrals');
            }
        }

        function getCategoryText(category) {
            const categoryMap = {
                'electronics': '🔌 อิเล็กทรอนิกส์',
                'gaming': '🎮 เกมมิ่ง',
                'fashion': '👕 แฟชั่น',
                'camera': '📷 กล้อง',
                'music': '🎵 ดนตรี'
            };
            return categoryMap[category] || category;
        }

        // Close popup when clicking outside
        const productPopup = document.getElementById('productPopup');
        if (productPopup) {
            productPopup.addEventListener('click', function(e) {
                if (e.target === this) {
                    closeProductPopup();
                }
            });
        }

        // Keyboard navigation for image gallery
        document.addEventListener('keydown', function(e) {
            if (document.getElementById('productPopup').classList.contains('show')) {
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    prevProductImage();
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    nextProductImage();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    closeProductPopup();
                }
            }
        });

        // Touch/swipe support for image gallery
        let touchStartX = 0;
        let touchEndX = 0;

        const productMainImage = document.getElementById('productMainImage');
        if (productMainImage) {
            productMainImage.addEventListener('touchstart', function(e) {
                touchStartX = e.changedTouches[0].screenX;
            });

            productMainImage.addEventListener('touchend', function(e) {
                touchEndX = e.changedTouches[0].screenX;
                handleSwipe();
            });
        }

        function handleSwipe() {
            const swipeThreshold = 50; // Minimum swipe distance
            const swipeDistance = touchEndX - touchStartX;

            if (Math.abs(swipeDistance) > swipeThreshold) {
                if (swipeDistance > 0) {
                    // Swipe right - show previous image
                    prevProductImage();
                } else {
                    // Swipe left - show next image
                    nextProductImage();
                }
            }
        }

        // Profile Management Functions
        var currentUser = null;

        // Check if user is already logged in on page load
        (function() {
            const savedUser = localStorage.getItem('currentUser');
            if (savedUser) {
                try {
                    currentUser = JSON.parse(savedUser);
                    if (currentUser && currentUser.id) {
                        // Show notification bell
                        const bell = document.querySelector('.notification-bell');
                        if (bell) bell.classList.add('show');
                        console.log('✅ User already logged in:', currentUser.username);

                        // Start notification updates
                        startNotificationUpdates();
                    }
                } catch (e) {
                    console.error('Error loading saved user:', e);
                }
            }
        })();

        // Helper function to format user address from structured fields
        function formatUserAddress(user) {
            console.log('formatUserAddress called with user:', user);

            if (!user.address_number && !user.address_street) {
                console.log('No structured address fields, using shipping_address:', user.shipping_address);
                return user.shipping_address || '';
            }

            const parts = [
                user.address_number,
                user.address_street,
                user.address_subdistrict ? `แขวง${user.address_subdistrict}` : '',
                user.address_district ? `เขต${user.address_district}` : '',
                user.address_province,
                user.address_postal_code
            ].filter(part => part && part.trim()); // Remove empty parts

            const result = parts.join(' ');
            console.log('Formatted address parts:', parts);
            console.log('Final formatted address:', result);
            return result;
        }

        // ฟังก์ชันอัพเดทข้อมูลผู้ใช้ในฐานข้อมูล
        async function updateUserInDatabase(user) {
            try {
                console.log('Updating user in database:', user);

                // Use API to update user data
                const apiClient = new ApiClient();
                const response = await apiClient.updateUser(user.id, user);

                if (response.success) {
                    console.log('✅ User updated successfully via API');
                    // Update localStorage with the returned user data
                    if (response.user) {
                        currentUser = response.user;
                        localStorage.setItem('currentUser', JSON.stringify(response.user));
                    } else {
                        localStorage.setItem('currentUser', JSON.stringify(user));
                    }
                } else {
                    console.error('❌ API update failed:', response.message);
                    // Fallback to database.updateUser if API fails
                    if (database && database.updateUser) {
                        database.updateUser(user.id, user);
                        localStorage.setItem('currentUser', JSON.stringify(user));
                    }
                }
            } catch (error) {
                console.error('Error updating user:', error);
                // Fallback to database.updateUser if API fails
                try {
                    if (database && database.updateUser) {
                        database.updateUser(user.id, user);
                        localStorage.setItem('currentUser', JSON.stringify(user));
                        console.log('✅ User updated via fallback method');
                    }
                } catch (fallbackError) {
                    console.error('Fallback update also failed:', fallbackError);
                    alert('❌ เกิดข้อผิดพลาดในการบันทึกข้อมูล');
                }
            }
        }

        // ฟังก์ชันอัปโหลดรูปโปรไฟล์ไปเซิร์ฟเวอร์
        async function uploadProfileImageToServer(file, userId) {
            try {
                // สร้าง FormData สำหรับส่งไฟล์
                const formData = new FormData();
                formData.append('profileImage', file);
                formData.append('userId', userId);

                console.log('Uploading profile image to server...');

                // ส่งคำขออัปโหลดไฟล์
                const response = await fetch('/api/upload-profile-image', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (result.success) {
                    console.log('Profile image uploaded successfully:', result.data);

                    // อัปเดตรูปโปรไฟล์ในหน้าเว็บ
                    const imageUrl = result.data.path;
                    document.getElementById('profileImage').innerHTML =
                        '<img src="' + imageUrl + '" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">';

                    // อัปเดตข้อมูลผู้ใช้ใน localStorage
                    if (currentUser) {
                        currentUser.profile_image = imageUrl;
                        currentUser.avatar_url = imageUrl;
                        currentUser.profile_image_filename = result.data.filename;
                        localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    }

                    alert('✅ เปลี่ยนรูปโปรไฟล์สำเร็จ!\n\nชื่อไฟล์: ' + result.data.filename + '\nขนาดไฟล์: ' + Math.round(file.size / 1024) + ' KB');
                } else {
                    console.error('Upload failed:', result.message);
                    alert('❌ อัปโหลดรูปโปรไฟล์ไม่สำเร็จ\n' + result.message);
                }
            } catch (error) {
                console.error('Error uploading profile image:', error);
                alert('❌ เกิดข้อผิดพลาดในการอัปโหลดรูปโปรไฟล์\nกรุณาลองใหม่');
            }
        }

        // Authentication Functions
        async function handleLogin() {
            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value.trim();

            if (!username || !password) {
                alert('❌ กรุณากรอก username และรหัสผ่าน');
                return;
            }


            // Clear any old localStorage data that might interfere
            console.log('[Debug] Clearing localStorage...');
            localStorage.clear();

            // Ensure database is initialized
            if (!database) {
                database = new ApiClient();
                await database.initialize(); // Initialize users cache
                console.log('⚠️ Database initialized in handleLogin');
            }

            console.log('[Debug] Login data:', { username, password: '***' });

            try {
                const result = await database.login({ username, password });

                if (result.success) {
                    // Load users from API and populate global cache
                    await loadUsersFromAPI();

                    // Ensure user has all structured address fields from database
                    if (globalUsersCache && globalUsersCache.length > 0) {
                        try {
                            const normalizedUsers = normalizeUsers(globalUsersCache || []);
                            const fullUser = normalizedUsers.find(u => u.id === result.user.id);
                            if (fullUser) {
                                // Check if structured fields exist, if not migrate from shipping_address
                                if (!fullUser.address_number && fullUser.shipping_address) {
                                    console.log('🔄 Migrating legacy address to structured fields for user:', fullUser.username);
                                    // Parse legacy address for fallback
                                    const address = fullUser.shipping_address;
                                    const parts = address.split(' ');
                                    fullUser.address_number = parts[0] || '';
                                    fullUser.address_street = parts.slice(1, 3).join(' ') || '';
                                    fullUser.address_subdistrict = parts.find(p => p.includes('แขวง'))?.replace('แขวง', '') || '';
                                    fullUser.address_district = parts.find(p => p.includes('เขต'))?.replace('เขต', '') || '';
                                    fullUser.address_province = parts.find(p => ['กรุงเทพมหานคร', 'ภูเก็ต', 'เชียงใหม่', 'เชียงราย'].includes(p)) || '';
                                    fullUser.address_postal_code = parts.find(p => /^\d{5}$/.test(p)) || '';
                                    // Update database with structured fields
                                    database.updateUser(fullUser.id, fullUser);
                                }

                                currentUser = fullUser;
                                localStorage.setItem('currentUser', JSON.stringify(fullUser));
                                console.log('🔍 Login - Full user data loaded:', currentUser);
                            } else {
                                currentUser = result.user;
                                localStorage.setItem('currentUser', JSON.stringify(result.user));
                            }
                        } catch (error) {
                            console.error('Error loading full user data:', error);
                            currentUser = result.user;
                            localStorage.setItem('currentUser', JSON.stringify(result.user));
                        }
                    } else {
                        currentUser = result.user;
                        localStorage.setItem('currentUser', JSON.stringify(result.user));
                    }

                    alert(`✅ เข้าสู่ระบบสำเร็จ!\nยินดีต้อนรับ ${result.user.full_name}`);

                    // Show notification bell
                    document.querySelector('.notification-bell').classList.add('show');

                    // Start notification updates
                    startNotificationUpdates();

                    // Redirect to marketplace
                    showPage('marketplace');
                } else {
                    console.log('❌ Login failed:', result.message);
                    alert(`❌ เข้าสู่ระบบไม่สำเร็จ\n${result.message}`);
                }
            } catch (error) {
                console.error('❌ Login error:', error);
                alert('❌ เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
            }
        }

        // New Referral Card System
        let currentReferrerData = null;

        function showReferralState(state) {
            // Hide all states first
            document.getElementById('referrerInfoCard').style.display = 'none';
            document.getElementById('manualReferralInput').style.display = 'none';
            document.getElementById('noReferrerCard').style.display = 'none';
            document.getElementById('referrerLoadingCard').style.display = 'none';
            document.getElementById('referrerErrorCard').style.display = 'none';

            // Show requested state
            if (state === 'info') {
                document.getElementById('referrerInfoCard').style.display = 'block';
            } else if (state === 'manual') {
                document.getElementById('manualReferralInput').style.display = 'block';
            } else if (state === 'none') {
                document.getElementById('noReferrerCard').style.display = 'block';
            } else if (state === 'loading') {
                document.getElementById('referrerLoadingCard').style.display = 'block';
            } else if (state === 'error') {
                document.getElementById('referrerErrorCard').style.display = 'block';
            }
        }

        async function verifyAndShowReferrer(inviteCode) {
            if (!inviteCode || inviteCode.trim() === '') {
                showReferralState('none');
                return false;
            }

            showReferralState('loading');

            try {
                console.log('[Referral] Verifying invite code:', inviteCode);
                const response = await database.getUsers();
                console.log('[Referral] API response:', response);
                const usersData = response.data || response || [];
                const referrer = usersData.find(u => u.invite_code === inviteCode.trim());

                if (referrer) {
                    console.log('[Referral] Found referrer:', referrer);
                    currentReferrerData = referrer;

                    // Update card with referrer info
                    document.getElementById('referrerDisplayName').textContent = `@${referrer.username}`;
                    document.getElementById('referrerCodeDisplay').textContent = referrer.invite_code;
                    document.getElementById('referrerAvatar').textContent = referrer.username.charAt(0).toUpperCase();

                    // Handle profile image
                    const profileImg = document.getElementById('referrerProfileImage');
                    const avatarFallback = document.getElementById('referrerAvatarFallback');
                    if (referrer.profile_image) {
                        profileImg.src = referrer.profile_image;
                        profileImg.style.display = 'block';
                        avatarFallback.style.display = 'none';
                    } else {
                        profileImg.style.display = 'none';
                        avatarFallback.style.display = 'flex';
                    }

                    // Store confirmed invite code
                    document.getElementById('confirmedInviteCode').value = referrer.invite_code;

                    showReferralState('info');
                    return true;
                } else {
                    console.log('[Referral] Invite code not found');
                    document.getElementById('errorReferralCode').textContent = inviteCode;
                    showReferralState('error');
                    return false;
                }
            } catch (error) {
                console.error('[Referral] Error verifying invite code:', error);
                document.getElementById('errorReferralCode').textContent = inviteCode;
                showReferralState('error');
                return false;
            }
        }

        // Function to get random active user for auto-assign
        async function getRandomInvitor() {
            try {
                const users = await database.getUsers(1, 1000);
                const activeUsers = users.data.filter(u => u.is_active && u.invite_code);
                if (activeUsers.length > 0) {
                    const randomIndex = Math.floor(Math.random() * activeUsers.length);
                    return activeUsers[randomIndex];
                }
                return null;
            } catch (error) {
                console.error('[Mobile] Error getting random invitor:', error);
                return null;
            }
        }

        // Function to show referrer information
        function showReferrerInfo(referrer) {
            const referrerInfo = document.getElementById('referrerInfo');
            const referrerDisplayName = document.getElementById('referrerDisplayName');
            const referrerAvatar = document.getElementById('referrerAvatar');
            const referrerProfileImage = document.getElementById('referrerProfileImage');
            const referrerAvatarFallback = document.getElementById('referrerAvatarFallback');
            const referralInput = document.getElementById('registerReferralCode');

            if (referrerInfo && referrerDisplayName && referrerAvatar) {
                referrerDisplayName.textContent = `@${referrer.username}`;
                referrerAvatar.textContent = referrer.username.charAt(0).toUpperCase();

                // Show profile image if available, otherwise show fallback
                if (referrer.profile_image && referrerProfileImage && referrerAvatarFallback) {
                    referrerProfileImage.src = referrer.profile_image;
                    referrerProfileImage.style.display = 'block';
                    referrerAvatarFallback.style.display = 'none';
                } else if (referrerAvatarFallback) {
                    referrerAvatarFallback.style.display = 'flex';
                    if (referrerProfileImage) referrerProfileImage.style.display = 'none';
                }

                referrerInfo.style.display = 'block';

                // Make referral code input readonly and hide confirm button
                if (referralInput) {
                    referralInput.readOnly = true;
                    referralInput.style.backgroundColor = 'rgba(15, 23, 42, 0.5)';
                    referralInput.style.cursor = 'not-allowed';
                }

                hideConfirmButton();
            }
        }

        // Function to hide all referral-related elements
        function hideAllReferralElements() {
            const referrerInfo = document.getElementById('referrerInfo');
            const editReferralConfirm = document.getElementById('editReferralConfirm');
            const noReferrerOptions = document.getElementById('noReferrerOptions');

            if (referrerInfo) referrerInfo.style.display = 'none';
            if (editReferralConfirm) editReferralConfirm.style.display = 'none';
            if (noReferrerOptions) noReferrerOptions.style.display = 'none';
        }

        // Function to show edit confirmation
        function showEditConfirmation() {
            hideAllReferralElements();
            const editReferralConfirm = document.getElementById('editReferralConfirm');
            if (editReferralConfirm) {
                editReferralConfirm.style.display = 'block';
            }
        }

        // Function to show no referrer options
        function showNoReferrerOptions(invalidCode) {
            const noReferrerOptions = document.getElementById('noReferrerOptions');
            const invalidReferralCode = document.getElementById('invalidReferralCode');

            if (noReferrerOptions) {
                noReferrerOptions.style.display = 'block';
            }

            if (invalidReferralCode) {
                invalidReferralCode.textContent = invalidCode;
            }
        }

        // Function to enable referral input editing
        function enableReferralEdit() {
            const referralInput = document.getElementById('registerReferralCode');
            const confirmReferralBtn = document.getElementById('confirmReferralBtn');

            if (referralInput) {
                referralInput.readOnly = false;
                referralInput.style.backgroundColor = '';
                referralInput.style.cursor = '';
                referralInput.focus();
                referralInput.select();
            }

            // Show confirm button
            if (confirmReferralBtn) {
                confirmReferralBtn.style.display = 'block';
            }
        }

        // Function to hide confirm button
        function hideConfirmButton() {
            const confirmReferralBtn = document.getElementById('confirmReferralBtn');
            if (confirmReferralBtn) {
                confirmReferralBtn.style.display = 'none';
            }
        }

        // Initialize referral code checking on input change
        document.addEventListener('DOMContentLoaded', function() {
            // New Referral Card System Event Listeners
            const changeReferrerBtn = document.getElementById('changeReferrerBtn');
            const addReferrerBtn = document.getElementById('addReferrerBtn');
            const verifyReferralBtn = document.getElementById('verifyReferralBtn');
            const retryReferralBtn = document.getElementById('retryReferralBtn');
            const skipReferralBtn = document.getElementById('skipReferralBtn');
            const manualReferralCode = document.getElementById('manualReferralCode');

            // Button: Change Referrer
            if (changeReferrerBtn) {
                changeReferrerBtn.addEventListener('click', function() {
                    showReferralState('manual');
                    if (manualReferralCode) {
                        manualReferralCode.value = '';
                        manualReferralCode.focus();
                    }
                });
            }

            // Button: Add Referrer
            if (addReferrerBtn) {
                addReferrerBtn.addEventListener('click', function() {
                    showReferralState('manual');
                    if (manualReferralCode) {
                        manualReferralCode.focus();
                    }
                });
            }

            // Button: Verify Referral Code
            if (verifyReferralBtn) {
                verifyReferralBtn.addEventListener('click', async function() {
                    const code = manualReferralCode ? manualReferralCode.value.trim() : '';
                    if (code) {
                        await verifyAndShowReferrer(code);
                    } else {
                        alert('❌ กรุณากรอกรหัสแนะนำ');
                    }
                });
            }

            // Button: Retry (from error state)
            if (retryReferralBtn) {
                retryReferralBtn.addEventListener('click', function() {
                    showReferralState('manual');
                    if (manualReferralCode) {
                        manualReferralCode.value = '';
                        manualReferralCode.focus();
                    }
                });
            }

            // Button: Skip (from error state)
            if (skipReferralBtn) {
                skipReferralBtn.addEventListener('click', function() {
                    document.getElementById('confirmedInviteCode').value = '';
                    showReferralState('none');
                });
            }

            // Button: Register Without Referrer (NIC)
            const registerWithoutReferrerBtn = document.getElementById('registerWithoutReferrerBtn');
            if (registerWithoutReferrerBtn) {
                registerWithoutReferrerBtn.addEventListener('click', async function() {
                    // Set Anatta999 as invitor for NIC registration
                    const anatta999Code = '25AAA0001';
                    await verifyAndShowReferrer(anatta999Code);
                });
            }

            // Allow Enter key to verify
            if (manualReferralCode) {
                manualReferralCode.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        if (verifyReferralBtn) {
                            verifyReferralBtn.click();
                        }
                    }
                });
            }
        });

        async function handleRegister() {
            const fullName = document.getElementById('registerFullName').value.trim();
            const username = document.getElementById('registerUsername').value.trim();
            const email = document.getElementById('registerEmail').value.trim();
            const password = document.getElementById('registerPassword').value.trim();
            const phone = document.getElementById('registerPhone').value.trim();
            const province = document.getElementById('registerProvince').value;
            const confirmedInviteCode = document.getElementById('confirmedInviteCode').value.trim();

            // Validation
            if (!fullName || !username || !email || !password) {
                alert('❌ กรุณากรอกข้อมูลที่จำเป็น (มี * )');
                return;
            }

            if (password.length < 6) {
                alert('❌ รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
                return;
            }

            if (!email.includes('@')) {
                alert('❌ รูปแบบอีเมลไม่ถูกต้อง');
                return;
            }

            // Confirmation popup before registration
            let confirmMessage = '';
            let registrationType = 'NIC'; // Default

            if (confirmedInviteCode && confirmedInviteCode !== '') {
                // BIC Registration - Has invitor
                const referrerInfo = currentReferrerData;
                const referrerName = referrerInfo ? (referrerInfo.full_name || referrerInfo.username) : 'ไม่ทราบ';

                confirmMessage = `ยืนยันการสมัครสมาชิก\n\n` +
                                `📝 ชื่อ: ${fullName}\n` +
                                `👤 Username: ${username}\n` +
                                `📧 Email: ${email}\n` +
                                `👥 ผู้แนะนำ: ${referrerName}\n` +
                                `🔗 รหัส: ${confirmedInviteCode}\n\n` +
                                `คุณต้องการสมัครสมาชิกใช่หรือไม่?`;
                registrationType = 'BIC';
            } else {
                // NIC Registration - No invitor (will auto-assign to Anatta999)
                confirmMessage = `ยืนยันการสมัครสมาชิก\n\n` +
                                `📝 ชื่อ: ${fullName}\n` +
                                `👤 Username: ${username}\n` +
                                `📧 Email: ${email}\n\n` +
                                `⚠️ คุณสมัครโดยไม่มีผู้แนะนำ\n` +
                                `ระบบจะจัดเชื่อมต่อทีมให้อัตโนมัติ\n\n` +
                                `คุณต้องการดำเนินการต่อใช่หรือไม่?`;
                registrationType = 'NIC';
            }

            // Show confirmation dialog
            if (!confirm(confirmMessage)) {
                return; // User cancelled
            }

            const userData = {
                full_name: fullName,
                username: username,
                email: email,
                password: password,
                phone: phone,
                province: province,
                invite_code: confirmedInviteCode,
                registration_type: registrationType
            };

            // Debug logging
            console.log('[Mobile] Registering user with data:', userData);
            console.log('[Mobile] Invite code being sent:', confirmedInviteCode);

            // Ensure database is initialized
            if (!database) {
                database = new ApiClient();
                console.log('⚠️ Database initialized in handleRegister');
            }

            try {
                const result = await database.register(userData);

                if (result.success) {
                    alert(`✅ สมัครสมาชิกสำเร็จ!\nยินดีต้อนรับ ${result.user.full_name}\nรหัสแนะนำของคุณ: ${result.user.invite_code}`);

                    // Auto login after registration
                    localStorage.setItem('currentUser', JSON.stringify(result.user));
                    currentUser = result.user;
                    showPage('marketplace');
                } else {
                    alert(`❌ สมัครสมาชิกไม่สำเร็จ\n${result.message}`);
                }
            } catch (error) {
                console.error('Registration error:', error);
                alert('❌ เกิดข้อผิดพลาดในการสมัครสมาชิก');
            }
        }

        function quickLogin(username, password) {
            document.getElementById('loginUsername').value = username;
            document.getElementById('loginPassword').value = password;
            handleLogin();
        }

        // Earnings Page Functions
        async function loadEarningsData() {
            if (!currentUser) return;

            try {
                // Fetch all users and find current user (to get network stats)
                const response = await fetch(`/api/users`);
                const result = await response.json();

                if (!result.success) {
                    throw new Error('Failed to load earnings data');
                }

                const users = result.data || [];
                const user = users.find(u => u.id === currentUser.id);

                if (!user) {
                    throw new Error('User data not found');
                }

                const stats = user.stats || {};

                // Extract all stats
                const followerCount = user.follower_count || 0;
                const childCount = user.child_count || 0;
                const networkSize = user.network_size || 0;
                const networkFees = user.network_fees || 0;
                const loyaltyFee = user.loyalty_fee || 0;
                const networkSales = user.network_sales || 0;

                // Update UI - Top Cards
                document.getElementById('loyaltyFee').textContent = loyaltyFee.toFixed(2);
                document.getElementById('networkFees').textContent = networkFees.toFixed(2);
                document.getElementById('networkSales').textContent = networkSales.toFixed(2);

                // Update UI - เครือข่าย Section
                document.getElementById('followerCount').textContent = followerCount;
                document.getElementById('childCount').textContent = childCount;
                document.getElementById('networkSize').textContent = networkSize;
            } catch (error) {
                console.error('Error loading earnings data:', error);
            }
        }

        function handleWithdraw() {
            const amount = parseFloat(document.getElementById('withdrawAmount').value);

            if (!amount || amount <= 0) {
                alert('❌ กรุณากรอกจำนวนเงินที่ต้องการถอน');
                return;
            }

            if (amount < 100) {
                alert('❌ จำนวนเงินขั้นต่ำในการถอนคือ 100 THB');
                return;
            }

            const totalEarnings = parseFloat(document.getElementById('totalEarnings').textContent);
            if (amount > totalEarnings) {
                alert('❌ ยอดเงินไม่เพียงพอ');
                return;
            }

            // TODO: Process withdrawal with API
            alert(`✅ กำลังดำเนินการถอนเงิน ${amount.toFixed(2)} THB\n\nกรุณารอการอนุมัติจากระบบ`);
            document.getElementById('withdrawAmount').value = '';
        }

        function logout() {
            if (confirm('ต้องการออกจากระบบหรือไม่?')) {
                localStorage.removeItem('currentUser');
                currentUser = null;

                // Hide notification bell
                const bell = document.querySelector('.notification-bell');
                if (bell) bell.classList.remove('show');

                showPage('login');
                alert('✅ ออกจากระบบเรียบร้อยแล้ว');
            }
        }

        // Session Management
        function checkAuthStatus() {
            const savedUser = localStorage.getItem('currentUser');
            if (savedUser) {
                const parsedUser = JSON.parse(savedUser);
                // Refresh user data from database to get latest structured fields
                if (database && typeof database.getUsers === 'function') {
                    try {
                        const rawUsers = database.getUsers();
                        const users = normalizeUsers(rawUsers);
                        const fullUser = users.find(u => u.id === parsedUser.id);
                        if (fullUser) {
                            // Check if structured fields exist, if not migrate from shipping_address
                            if (!fullUser.address_number && fullUser.shipping_address) {
                                console.log('🔄 Migrating legacy address to structured fields for user:', fullUser.username);
                                // Parse legacy address for fallback
                                const address = fullUser.shipping_address;
                                const parts = address.split(' ');
                                fullUser.address_number = parts[0] || '';
                                fullUser.address_street = parts.slice(1, 3).join(' ') || '';
                                fullUser.address_subdistrict = parts.find(p => p.includes('แขวง'))?.replace('แขวง', '') || '';
                                fullUser.address_district = parts.find(p => p.includes('เขต'))?.replace('เขต', '') || '';
                                fullUser.address_province = parts.find(p => ['กรุงเทพมหานคร', 'ภูเก็ต', 'เชียงใหม่', 'เชียงราย'].includes(p)) || '';
                                fullUser.address_postal_code = parts.find(p => /^\d{5}$/.test(p)) || '';
                                // Update database with structured fields
                                database.updateUser(fullUser.id, fullUser);
                            }

                            currentUser = fullUser;
                            localStorage.setItem('currentUser', JSON.stringify(fullUser));
                            console.log('🔍 Refreshed user data from database:', currentUser);
                        } else {
                            currentUser = parsedUser;
                        }
                    } catch (error) {
                        console.error('Error refreshing user data:', error);
                        currentUser = parsedUser;
                    }
                } else {
                    currentUser = parsedUser;
                }
                return true;
            }
            return false;
        }

        function requireAuth() {
            if (!checkAuthStatus()) {
                showPage('login');
                return false;
            }
            return true;
        }

        async function loadProfileData() {
            // Use current logged in user
            if (!currentUser) {
                console.error('❌ No user logged in!');
                return;
            }

            // Fetch latest user data from API to ensure we have current address info
            try {
                const apiClient = new ApiClient();
                const response = await apiClient.request(`/users/${currentUser.id}`);
                if (response.success && response.data) {
                    // Update currentUser with fresh data from API
                    currentUser = { ...currentUser, ...response.data };
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    console.log('✅ Loaded fresh user data from API:', currentUser);
                }
            } catch (error) {
                console.error('⚠️ Could not fetch latest user data, using cached data:', error);
            }

            console.log('🔍 Debug currentUser:', currentUser);
            console.log('🔍 Profile image:', currentUser.profile_image);
            console.log('🔍 Address fields debug:', {
                address_number: currentUser.address_number,
                address_street: currentUser.address_street,
                address_subdistrict: currentUser.address_subdistrict,
                address_district: currentUser.address_district,
                address_province: currentUser.address_province,
                address_postal_code: currentUser.address_postal_code,
                shipping_address: currentUser.shipping_address
            });

            if (currentUser) {
                // Update profile image
                const profileImage = document.getElementById('profileImage');
                if (currentUser.profile_image) {
                    profileImage.innerHTML = `<img src="${currentUser.profile_image}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
                }

                // Update basic profile info
                const profileUsername = document.getElementById('profileUsername');
                if (profileUsername) {
                    profileUsername.textContent = `@${currentUser.username}`;
                }
                const profileFullName = document.getElementById('profileFullName');
                if (profileFullName) {
                    profileFullName.textContent = currentUser.full_name;
                }
                const profileRating = document.getElementById('profileRating');
                if (profileRating) {
                    profileRating.textContent = `⭐ ${currentUser.seller_rating} คะแนน`;
                }

                // Update account information
                const profileUserId = document.getElementById('profileUserId');
                if (profileUserId) {
                    profileUserId.textContent = currentUser.auto_user_id;
                }
                const profileEmail = document.getElementById('profileEmail');
                if (profileEmail) {
                    profileEmail.textContent = currentUser.email;
                }
                const profilePhone = document.getElementById('profilePhone');
                if (profilePhone) {
                    profilePhone.textContent = currentUser.phone;
                }
                const profileShippingAddress = document.getElementById('profileShippingAddress');
                if (profileShippingAddress) {
                    // Use formatted full address from structured fields or fallback to legacy field
                    const fullAddress = formatUserAddress(currentUser);
                    profileShippingAddress.textContent = fullAddress || 'ยังไม่ได้ระบุ';
                }
                const profileCreatedAt = document.getElementById('profileCreatedAt');
                if (profileCreatedAt) {
                    profileCreatedAt.textContent = formatThaiDate(currentUser.created_at);
                }
                const profileLastLogin = document.getElementById('profileLastLogin');
                if (profileLastLogin) {
                    profileLastLogin.textContent = formatThaiDate(currentUser.last_login);
                }

                // Update wallet information
                const profileThbBalance = document.getElementById('profileThbBalance');
                if (profileThbBalance) {
                    const balance = currentUser.wallet_balance || 0;
                    profileThbBalance.textContent = `฿${Number(balance).toLocaleString()}`;
                }

                // Update sales statistics
                const profileTotalSales = document.getElementById('profileTotalSales');
                if (profileTotalSales) {
                    profileTotalSales.textContent = currentUser.total_sales;
                }
                const profileSellerRating = document.getElementById('profileSellerRating');
                if (profileSellerRating) {
                    profileSellerRating.textContent = currentUser.seller_rating;
                }

                // Update referral information
                const profileReferralCode = document.getElementById('profileReferralCode');
                if (profileReferralCode) {
                    profileReferralCode.textContent = currentUser.invite_code;
                }

                // Load referrer information
                loadReferrerInfo(currentUser);

                // Calculate referral stats
                const referralStats = calculateReferralStats(currentUser.id);
                const referralStatValue = document.querySelector('.referral-stat-value');
                if (referralStatValue) {
                    referralStatValue.textContent = referralStats.referredUsers;
                }
                const referralStatValues = document.querySelectorAll('.referral-stat-value');
                if (referralStatValues.length > 1) {
                    referralStatValues[1].textContent = `฿${referralStats.totalBonus.toLocaleString()}`;
                }
            }
        }

        function formatThaiDate(dateString) {
            const thaiMonths = [
                'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
                'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
            ];

            const date = new Date(dateString);
            const day = date.getDate();
            const month = thaiMonths[date.getMonth()];
            const year = date.getFullYear() + 543; // Convert to Buddhist Era

            return `${day} ${month} ${year}`;
        }

        function calculateReferralStats(userId) {
            const referredUsers = globalUsersCache.filter(user => user.referred_by === userId).length;
            const totalBonus = referredUsers * 200; // Assume 200 THB per referral

            return {
                referredUsers,
                totalBonus
            };
        }

        function copyReferralCode() {
            if (currentUser) {
                navigator.clipboard.writeText(currentUser.invite_code).then(() => {
                    // Show success message
                    const copyBtn = document.querySelector('.copy-btn');
                    const originalText = copyBtn.textContent;
                    copyBtn.textContent = '✅';
                    copyBtn.style.background = '#10b981';

                    setTimeout(() => {
                        copyBtn.textContent = originalText;
                        copyBtn.style.background = '#3b82f6';
                    }, 2000);
                });
            }
        }

        // User settings storage
        let userSettings = {
            language: 'ไทย',
            currency: 'THB',
            notifications: true,
            security: true
        };

        function editFullName() {
            var currentName = document.getElementById('profileFullName').textContent;
            var newName = prompt('แก้ไขชื่อ-นามสกุล:', currentName);

            if (newName && newName !== currentName && newName.trim()) {
                // อัพเดทใน UI
                document.getElementById('profileFullName').textContent = newName;

                // อัพเดทในฐานข้อมูล
                if (currentUser) {
                    currentUser.full_name = newName;
                    updateUserInDatabase(currentUser);
                }

                alert('✅ บันทึกชื่อสำเร็จ!');
            }
        }

        function editEmail() {
            var currentEmail = document.getElementById('profileEmail').textContent;
            var newEmail = prompt('แก้ไขอีเมล:', currentEmail);

            if (newEmail && newEmail !== currentEmail && newEmail.trim()) {
                if (newEmail.includes('@')) {
                    // อัพเดทใน UI
                    document.getElementById('profileEmail').textContent = newEmail;

                    // อัพเดทในฐานข้อมูล
                    if (currentUser) {
                        currentUser.email = newEmail;
                        updateUserInDatabase(currentUser);
                    }

                    alert('✅ บันทึกอีเมลสำเร็จ!');
                } else {
                    alert('❌ รูปแบบอีเมลไม่ถูกต้อง');
                }
            }
        }

        function editPhone() {
            var currentPhone = document.getElementById('profilePhone').textContent;
            var newPhone = prompt('แก้ไขเบอร์โทร (081-234-5678):', currentPhone);

            if (newPhone && newPhone !== currentPhone && newPhone.trim()) {
                // อัพเดทใน UI
                document.getElementById('profilePhone').textContent = newPhone;

                // อัพเดทในฐานข้อมูล
                if (currentUser) {
                    currentUser.phone = newPhone;
                    updateUserInDatabase(currentUser);
                }

                alert('✅ บันทึกเบอร์โทรสำเร็จ!');
            }
        }

        function editShippingAddress() {
            console.log('editShippingAddress called');
            console.log('currentUser:', currentUser);

            // Remove any existing address modal first
            const existingModal = document.querySelector('.address-edit-modal');
            if (existingModal) {
                console.log('Removing existing modal');
                existingModal.remove();
            }

            if (!currentUser) {
                alert('❌ ไม่พบข้อมูลผู้ใช้');
                return;
            }

            // Create a detailed address form instead of simple prompt
            const modal = document.createElement('div');
            modal.className = 'address-edit-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                padding: 20px;
            `;
            modal.innerHTML = `
                <div style="background-color: white; border-radius: 8px; padding: 24px; width: 100%; max-width: 400px; max-height: 500px; overflow-y: auto; position: relative;">
                    <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 16px; color: #374151;">แก้ไขที่อยู่</h3>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <div>
                            <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 4px;">บ้านเลขที่/หมู่ที่</label>
                            <input type="text" id="addressNumber" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;" value="${currentUser.address_number || ''}">
                        </div>
                        <div>
                            <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 4px;">ถนน/ซอย</label>
                            <input type="text" id="addressStreet" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;" value="${currentUser.address_street || ''}">
                        </div>
                        <div>
                            <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 4px;">ตำบล/แขวง</label>
                            <input type="text" id="addressSubdistrict" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;" value="${currentUser.address_subdistrict || ''}">
                        </div>
                        <div>
                            <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 4px;">อำเภอ/เขต</label>
                            <input type="text" id="addressDistrict" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;" value="${currentUser.address_district || ''}">
                        </div>
                        <div>
                            <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 4px;">จังหวัด</label>
                            <select id="addressProvince" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                                <option value="">เลือกจังหวัด</option>
                                <option value="กรุงเทพมหานคร" ${currentUser.address_province === 'กรุงเทพมหานคร' ? 'selected' : ''}>กรุงเทพมหานคร</option>
                                <option value="กระบี่" ${currentUser.address_province === 'กระบี่' ? 'selected' : ''}>กระบี่</option>
                                <option value="กาญจนบุรี" ${currentUser.address_province === 'กาญจนบุรี' ? 'selected' : ''}>กาญจนบุรี</option>
                                <option value="กาฬสินธุ์" ${currentUser.address_province === 'กาฬสินธุ์' ? 'selected' : ''}>กาฬสินธุ์</option>
                                <option value="กำแพงเพชร" ${currentUser.address_province === 'กำแพงเพชร' ? 'selected' : ''}>กำแพงเพชร</option>
                                <option value="ขอนแก่น" ${currentUser.address_province === 'ขอนแก่น' ? 'selected' : ''}>ขอนแก่น</option>
                                <option value="จันทบุรี" ${currentUser.address_province === 'จันทบุรี' ? 'selected' : ''}>จันทบุรี</option>
                                <option value="ฉะเชิงเทรา" ${currentUser.address_province === 'ฉะเชิงเทรา' ? 'selected' : ''}>ฉะเชิงเทรา</option>
                                <option value="ชลบุรี" ${currentUser.address_province === 'ชลบุรี' ? 'selected' : ''}>ชลบุรี</option>
                                <option value="ชัยนาท" ${currentUser.address_province === 'ชัยนาท' ? 'selected' : ''}>ชัยนาท</option>
                                <option value="ชัยภูมิ" ${currentUser.address_province === 'ชัยภูมิ' ? 'selected' : ''}>ชัยภูมิ</option>
                                <option value="ชุมพร" ${currentUser.address_province === 'ชุมพร' ? 'selected' : ''}>ชุมพร</option>
                                <option value="เชียงราย" ${currentUser.address_province === 'เชียงราย' ? 'selected' : ''}>เชียงราย</option>
                                <option value="เชียงใหม่" ${currentUser.address_province === 'เชียงใหม่' ? 'selected' : ''}>เชียงใหม่</option>
                                <option value="ตรัง" ${currentUser.address_province === 'ตรัง' ? 'selected' : ''}>ตรัง</option>
                                <option value="ตราด" ${currentUser.address_province === 'ตราด' ? 'selected' : ''}>ตราด</option>
                                <option value="ตาก" ${currentUser.address_province === 'ตาก' ? 'selected' : ''}>ตาก</option>
                                <option value="นครนายก" ${currentUser.address_province === 'นครนายก' ? 'selected' : ''}>นครนายก</option>
                                <option value="นครปฐม" ${currentUser.address_province === 'นครปฐม' ? 'selected' : ''}>นครปฐม</option>
                                <option value="นครพนม" ${currentUser.address_province === 'นครพนม' ? 'selected' : ''}>นครพนม</option>
                                <option value="นครราชสีมา" ${currentUser.address_province === 'นครราชสีมา' ? 'selected' : ''}>นครราชสีมา</option>
                                <option value="นครศรีธรรมราช" ${currentUser.address_province === 'นครศรีธรรมราช' ? 'selected' : ''}>นครศรีธรรมราช</option>
                                <option value="นครสวรรค์" ${currentUser.address_province === 'นครสวรรค์' ? 'selected' : ''}>นครสวรรค์</option>
                                <option value="นนทบุรี" ${currentUser.address_province === 'นนทบุรี' ? 'selected' : ''}>นนทบุรี</option>
                                <option value="นราธิวาส" ${currentUser.address_province === 'นราธิวาส' ? 'selected' : ''}>นราธิวาส</option>
                                <option value="น่าน" ${currentUser.address_province === 'น่าน' ? 'selected' : ''}>น่าน</option>
                                <option value="บุรีรัมย์" ${currentUser.address_province === 'บุรีรัมย์' ? 'selected' : ''}>บุรีรัมย์</option>
                                <option value="ปทุมธานี" ${currentUser.address_province === 'ปทุมธานี' ? 'selected' : ''}>ปทุมธานี</option>
                                <option value="ประจวบคีรีขันธ์" ${currentUser.address_province === 'ประจวบคีรีขันธ์' ? 'selected' : ''}>ประจวบคีรีขันธ์</option>
                                <option value="ปราจีนบุรี" ${currentUser.address_province === 'ปราจีนบุรี' ? 'selected' : ''}>ปราจีนบุรี</option>
                                <option value="ปัตตานี" ${currentUser.address_province === 'ปัตตานี' ? 'selected' : ''}>ปัตตานี</option>
                                <option value="พระนครศรีอยุธยา" ${currentUser.address_province === 'พระนครศรีอยุธยา' ? 'selected' : ''}>พระนครศรีอยุธยา</option>
                                <option value="พะเยา" ${currentUser.address_province === 'พะเยา' ? 'selected' : ''}>พะเยา</option>
                                <option value="พังงา" ${currentUser.address_province === 'พังงา' ? 'selected' : ''}>พังงา</option>
                                <option value="พัทลุง" ${currentUser.address_province === 'พัทลุง' ? 'selected' : ''}>พัทลุง</option>
                                <option value="พิจิตร" ${currentUser.address_province === 'พิจิตร' ? 'selected' : ''}>พิจิตร</option>
                                <option value="พิษณุโลก" ${currentUser.address_province === 'พิษณุโลก' ? 'selected' : ''}>พิษณุโลก</option>
                                <option value="เพชรบุรี" ${currentUser.address_province === 'เพชรบุรี' ? 'selected' : ''}>เพชรบุรี</option>
                                <option value="เพชรบูรณ์" ${currentUser.address_province === 'เพชรบูรณ์' ? 'selected' : ''}>เพชรบูรณ์</option>
                                <option value="แพร่" ${currentUser.address_province === 'แพร่' ? 'selected' : ''}>แพร่</option>
                                <option value="ภูเก็ต" ${currentUser.address_province === 'ภูเก็ต' ? 'selected' : ''}>ภูเก็ต</option>
                                <option value="มหาสารคาม" ${currentUser.address_province === 'มหาสารคาม' ? 'selected' : ''}>มหาสารคาม</option>
                                <option value="มุกดาหาร" ${currentUser.address_province === 'มุกดาหาร' ? 'selected' : ''}>มุกดาหาร</option>
                                <option value="แม่ฮ่องสอน" ${currentUser.address_province === 'แม่ฮ่องสอน' ? 'selected' : ''}>แม่ฮ่องสอน</option>
                                <option value="ยโซธร" ${currentUser.address_province === 'ยโซธร' ? 'selected' : ''}>ยโซธร</option>
                                <option value="ยะลา" ${currentUser.address_province === 'ยะลา' ? 'selected' : ''}>ยะลา</option>
                                <option value="ร้อยเอ็ด" ${currentUser.address_province === 'ร้อยเอ็ด' ? 'selected' : ''}>ร้อยเอ็ด</option>
                                <option value="ระนอง" ${currentUser.address_province === 'ระนอง' ? 'selected' : ''}>ระนอง</option>
                                <option value="ระยอง" ${currentUser.address_province === 'ระยอง' ? 'selected' : ''}>ระยอง</option>
                                <option value="ราชบุรี" ${currentUser.address_province === 'ราชบุรี' ? 'selected' : ''}>ราชบุรี</option>
                                <option value="ลพบุรี" ${currentUser.address_province === 'ลพบุรี' ? 'selected' : ''}>ลพบุรี</option>
                                <option value="ลำปาง" ${currentUser.address_province === 'ลำปาง' ? 'selected' : ''}>ลำปาง</option>
                                <option value="ลำพูน" ${currentUser.address_province === 'ลำพูน' ? 'selected' : ''}>ลำพูน</option>
                                <option value="เลย" ${currentUser.address_province === 'เลย' ? 'selected' : ''}>เลย</option>
                                <option value="ศรีสะเกษ" ${currentUser.address_province === 'ศรีสะเกษ' ? 'selected' : ''}>ศรีสะเกษ</option>
                                <option value="สกลนคร" ${currentUser.address_province === 'สกลนคร' ? 'selected' : ''}>สกลนคร</option>
                                <option value="สงขลา" ${currentUser.address_province === 'สงขลา' ? 'selected' : ''}>สงขลา</option>
                                <option value="สตูล" ${currentUser.address_province === 'สตูล' ? 'selected' : ''}>สตูล</option>
                                <option value="สมุทรปราการ" ${currentUser.address_province === 'สมุทรปราการ' ? 'selected' : ''}>สมุทรปราการ</option>
                                <option value="สมุทรสงคราม" ${currentUser.address_province === 'สมุทรสงคราม' ? 'selected' : ''}>สมุทรสงคราม</option>
                                <option value="สมุทรสาคร" ${currentUser.address_province === 'สมุทรสาคร' ? 'selected' : ''}>สมุทรสาคร</option>
                                <option value="สระแก้ว" ${currentUser.address_province === 'สระแก้ว' ? 'selected' : ''}>สระแก้ว</option>
                                <option value="สระบุรี" ${currentUser.address_province === 'สระบุรี' ? 'selected' : ''}>สระบุรี</option>
                                <option value="สิงห์บุรี" ${currentUser.address_province === 'สิงห์บุรี' ? 'selected' : ''}>สิงห์บุรี</option>
                                <option value="สุโขทัย" ${currentUser.address_province === 'สุโขทัย' ? 'selected' : ''}>สุโขทัย</option>
                                <option value="สุพรรณบุรี" ${currentUser.address_province === 'สุพรรณบุรี' ? 'selected' : ''}>สุพรรณบุรี</option>
                                <option value="สุราษฎร์ธานี" ${currentUser.address_province === 'สุราษฎร์ธานี' ? 'selected' : ''}>สุราษฎร์ธานี</option>
                                <option value="สุรินทร์" ${currentUser.address_province === 'สุรินทร์' ? 'selected' : ''}>สุรินทร์</option>
                                <option value="หนองคาย" ${currentUser.address_province === 'หนองคาย' ? 'selected' : ''}>หนองคาย</option>
                                <option value="หนองบัวลำภู" ${currentUser.address_province === 'หนองบัวลำภู' ? 'selected' : ''}>หนองบัวลำภู</option>
                                <option value="อ่างทอง" ${currentUser.address_province === 'อ่างทอง' ? 'selected' : ''}>อ่างทอง</option>
                                <option value="อำนาจเจริญ" ${currentUser.address_province === 'อำนาจเจริญ' ? 'selected' : ''}>อำนาจเจริญ</option>
                                <option value="อุดรธานี" ${currentUser.address_province === 'อุดรธานี' ? 'selected' : ''}>อุดรธานี</option>
                                <option value="อุตรดิตถ์" ${currentUser.address_province === 'อุตรดิตถ์' ? 'selected' : ''}>อุตรดิตถ์</option>
                                <option value="อุทัยธานี" ${currentUser.address_province === 'อุทัยธานี' ? 'selected' : ''}>อุทัยธานี</option>
                                <option value="อุบลราชธานี" ${currentUser.address_province === 'อุบลราชธานี' ? 'selected' : ''}>อุบลราชธานี</option>
                            </select>
                        </div>
                        <div>
                            <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 4px;">รหัสไปรษณีย์</label>
                            <input type="text" id="addressPostalCode" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;" value="${currentUser.address_postal_code || ''}">
                        </div>
                    </div>
                    <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px;">
                        <button onclick="closeAddressModal()" style="padding: 8px 16px; background-color: #d1d5db; color: #374151; border: none; border-radius: 4px; cursor: pointer;">ยกเลิก</button>
                        <button onclick="saveAddress()" style="padding: 8px 16px; background-color: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">บันทึก</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Add modal functions to global scope
            window.closeAddressModal = function() {
                document.body.removeChild(modal);
                delete window.closeAddressModal;
                delete window.saveAddress;
            };

            window.saveAddress = async function() {
                console.log('saveAddress called');
                const addressNumber = document.getElementById('addressNumber').value.trim();
                const addressStreet = document.getElementById('addressStreet').value.trim();
                const addressSubdistrict = document.getElementById('addressSubdistrict').value.trim();
                const addressDistrict = document.getElementById('addressDistrict').value.trim();
                const addressProvince = document.getElementById('addressProvince').value;
                const addressPostalCode = document.getElementById('addressPostalCode').value.trim();

                console.log('Address data:', {
                    addressNumber, addressStreet, addressSubdistrict,
                    addressDistrict, addressProvince, addressPostalCode
                });

                // Update user data with structured fields
                if (currentUser) {
                    currentUser.address_number = addressNumber;
                    currentUser.address_street = addressStreet;
                    currentUser.address_subdistrict = addressSubdistrict;
                    currentUser.address_district = addressDistrict;
                    currentUser.address_province = addressProvince;
                    currentUser.address_postal_code = addressPostalCode;

                    // Also update legacy field for backward compatibility
                    const fullAddress = formatUserAddress(currentUser);
                    currentUser.shipping_address = fullAddress;

                    // Update in database (now async)
                    await updateUserInDatabase(currentUser);

                    // Update UI display
                    document.getElementById('profileShippingAddress').textContent = fullAddress || 'ยังไม่ได้ระบุ';

                    closeAddressModal();
                    alert('✅ บันทึกที่อยู่สำเร็จ!');
                } else {
                    closeAddressModal();
                    alert('❌ ไม่พบข้อมูลผู้ใช้');
                }
            };
        }

        function editProfileImage() {
            // สร้าง input element สำหรับเลือกไฟล์
            var input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';

            input.onchange = function(e) {
                var file = e.target.files[0];

                if (file) {
                    // ตรวจสอบประเภทไฟล์
                    if (!file.type.startsWith('image/')) {
                        alert('❌ กรุณาเลือกไฟล์รูปภาพเท่านั้น');
                        return;
                    }

                    // ตรวจสอบขนาดไฟล์ (จำกัดที่ 5MB)
                    if (file.size > 5 * 1024 * 1024) {
                        alert('❌ ไฟล์รูปภาพใหญ่เกินไป\nขนาดสูงสุด: 5MB');
                        return;
                    }

                    // สร้างชื่อไฟล์ไม่ซ้ำกัน
                    const timestamp = Date.now();
                    const randomId = Math.random().toString(36).substring(2, 15);
                    const fileExtension = file.name.split('.').pop().toLowerCase();
                    const uniqueFileName = `profile_${currentUser.id}_${timestamp}_${randomId}.${fileExtension}`;

                    console.log('Uploading profile image:', uniqueFileName);

                    // อัปโหลดไฟล์ไปเซิร์ฟเวอร์
                    uploadProfileImageToServer(file, currentUser.id);
                }
            };

            // เปิด dialog เลือกไฟล์
            input.click();
        }

        function editFullName() {
            var currentFullName = document.getElementById('profileFullName').textContent;
            var newFullName = prompt('แก้ไขชื่อจริง:', currentFullName);

            if (newFullName && newFullName !== currentFullName) {
                // อัพเดทใน UI
                document.getElementById('profileFullName').textContent = newFullName;

                // อัพเดทในฐานข้อมูล
                if (currentUser) {
                    currentUser.full_name = newFullName;
                    updateUserInDatabase(currentUser);
                }

                alert('✅ บันทึกชื่อจริงสำเร็จ!');
            }
        }

        // Display my inviter function
        function displayMyInviter(inviter) {
            const container = document.getElementById('myInviterInfo');

            if (!inviter) {
                container.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 24px;">ไม่มีผู้แนะนำ</div>';
                return;
            }

            const initials = (inviter.full_name || inviter.username || 'U').charAt(0).toUpperCase();
            const joinDate = inviter.created_at ? new Date(inviter.created_at).toLocaleDateString('th-TH') : 'ไม่ทราบ';
            const displayName = inviter.full_name || inviter.username || 'ไม่ระบุ';

            // Check if inviter has profile image
            const hasProfileImage = inviter.profile_image || inviter.avatar_url;
            const avatarContent = hasProfileImage
                ? `<img src="${inviter.profile_image || inviter.avatar_url}" alt="${displayName}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;">`
                : initials;

            container.innerHTML = `
                <div class="invited-user-card">
                    <div class="invited-user-avatar">${avatarContent}</div>
                    <div class="invited-user-info">
                        <div class="invited-user-name">👑 ${displayName}</div>
                        <div class="invited-user-date">ผู้แนะนำของคุณ • เข้าร่วม: ${joinDate}</div>
                    </div>
                </div>
            `;
        }

        // Display invited users function
        function displayInvitedUsers(invitees) {
            const listContainer = document.getElementById('invitedUsersList');

            if (!invitees || invitees.length === 0) {
                listContainer.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 24px; grid-column: 1 / -1;">ยังไม่มีคนที่คุณชวนมา</div>';
                return;
            }

            // Sort by created_at (most recent first)
            const sortedInvitees = [...invitees].sort((a, b) => {
                const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                return dateB - dateA; // Most recent first
            });

            listContainer.innerHTML = sortedInvitees.map(user => {
                const initials = (user.full_name || user.username || 'U').charAt(0).toUpperCase();
                const joinDate = user.created_at ? new Date(user.created_at).toLocaleDateString('th-TH') : 'ไม่ทราบ';
                const displayName = user.full_name || user.username || 'ไม่ระบุ';

                // Check if user has profile image
                const hasProfileImage = user.profile_image || user.avatar_url;
                const avatarContent = hasProfileImage
                    ? `<img src="${user.profile_image || user.avatar_url}" alt="${displayName}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">`
                    : initials;

                // Get stats from user data
                const followerCount = user.follower_count || 0;
                const childCount = user.child_count || 0;
                const loyaltyFee = user.loyalty_fee || 0;
                const networkFees = user.network_fees || 0;

                return `
                    <div class="invited-user-card">
                        <div class="invited-user-avatar">${avatarContent}</div>
                        <div class="invited-user-info">
                            <div class="invited-user-name">${displayName}</div>
                            <div class="invited-user-date">${joinDate}</div>
                        </div>
                        <div class="invited-user-stats">
                            <div class="invited-user-stat">
                                <span class="stat-label-small">Follower</span>
                                <span class="stat-value-small">${followerCount}</span>
                            </div>
                            <div class="invited-user-stat">
                                <span class="stat-label-small">Child</span>
                                <span class="stat-value-small">${childCount}</span>
                            </div>
                            <div class="invited-user-stat">
                                <span class="stat-label-small">Loyalty Fee</span>
                                <span class="stat-value-small">${loyaltyFee.toFixed(2)}</span>
                            </div>
                            <div class="invited-user-stat">
                                <span class="stat-label-small">Network Fee</span>
                                <span class="stat-value-small">${networkFees.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }


        // Network/Referral Functions
        function copyMyReferralCode() {
            var code = document.getElementById('myReferralCode').value;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(code).then(() => {
                    var btn = document.querySelector('.copy-code-btn');
                    var original = btn.textContent;
                    btn.textContent = '✅';
                    btn.style.background = '#10b981';
                    setTimeout(() => {
                        btn.textContent = original;
                        btn.style.background = '#3b82f6';
                    }, 2000);
                    alert('✅ คัดลอกรหัสแนะนำสำเร็จ!\n\n' + code);
                });
            } else {
                alert('รหัสแนะนำของคุณ: ' + code);
            }
        }

        function copyMyReferralLink() {
            var link = document.getElementById('myReferralLink').value;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(link).then(() => {
                    var btn = document.querySelector('.copy-link-btn');
                    var original = btn.textContent;
                    btn.textContent = '✅';
                    btn.style.background = '#10b981';
                    setTimeout(() => {
                        btn.textContent = original;
                        btn.style.background = '#3b82f6';
                    }, 2000);
                    alert('✅ คัดลอกลิงค์แนะนำสำเร็จ!');
                });
            } else {
                alert('ลิงค์แนะนำของคุณ:\n\n' + link);
            }
        }

        // Load referrals data from database
        async function loadReferralsData() {
            console.log('Loading referrals data...');

            if (!currentUser) {
                console.log('No current user, skipping referrals load');
                return;
            }

            try {
                // Debug current user data
                console.log('Current user data:', currentUser);
                console.log('Current user invitor_id:', currentUser.invitor_id);
                console.log('Current user invited_by:', currentUser.invited_by);

                // Set invite code and referral link
                const inviteCode = currentUser.invite_code || '';
                const referralLink = inviteCode ? `${window.location.origin}/mobile/?invite=${inviteCode}` : '';

                document.getElementById('myReferralCode').value = inviteCode;
                document.getElementById('myReferralLink').value = referralLink;

                // Count users who were invited by this user
                await loadUsersFromAPI();
                const invitedUsers = { data: globalUsersCache };
                console.log('All users for filtering:', invitedUsers.data?.map(u => ({
                    id: u.id,
                    username: u.username,
                    invitor_id: u.invitor_id,
                    invited_by: u.invited_by
                })));

                const myInvitees = invitedUsers.data ?
                    invitedUsers.data.filter(user => {
                        const userInvitor = user.invited_by || user.invitor_id;
                        // Check both ID and username for compatibility
                        return userInvitor === currentUser.id || userInvitor === currentUser.username;
                    }) : [];

                console.log('Current user ID:', currentUser.id);
                console.log('Found invitees:', myInvitees.map(u => ({id: u.id, username: u.username})));

                // Get network stats from currentUser (loaded from API)
                const followerCount = currentUser.follower_count || 0;
                const childCount = currentUser.child_count || 0;
                const networkSize = currentUser.network_size || 0;

                // Update network stats
                const followerEl = document.getElementById('networkFollowerCount');
                const childEl = document.getElementById('networkChildCount');
                const networkEl = document.getElementById('networkNetworkSize');

                if (followerEl) followerEl.textContent = followerCount;
                if (childEl) childEl.textContent = childCount;
                if (networkEl) networkEl.textContent = networkSize;

                console.log('Network stats updated:', { followerCount, childCount, networkSize });

                // Find and display who invited current user
                const inviterID = currentUser.invited_by || currentUser.invitor_id;
                console.log('Looking for inviter with ID:', inviterID);
                console.log('Available users:', invitedUsers.data?.map(u => ({id: u.id, username: u.username})));

                let myInviter = null;
                if (inviterID) {
                    myInviter = invitedUsers.data ?
                        invitedUsers.data.find(user => user.id === inviterID) : null;
                }
                console.log('Found inviter:', myInviter);
                if (myInviter) {
                    console.log('Inviter profile_image:', myInviter.profile_image);
                    console.log('Inviter avatar_url:', myInviter.avatar_url);
                }
                displayMyInviter(myInviter);

                // Display invited users
                displayInvitedUsers(myInvitees);

                console.log(`Loaded referrals data: ${myInvitees.length} real invitees, ${mockFinpoint} FP (mock)`);
                console.log('My inviter:', myInviter);

            } catch (error) {
                console.error('Error loading referrals data:', error);

                // Fallback to showing basic data
                const inviteCode = currentUser.invite_code || '';
                const referralLink = inviteCode ? `${window.location.origin}/mobile/?invite=${inviteCode}` : '';

                document.getElementById('myReferralCode').value = inviteCode;
                document.getElementById('myReferralLink').value = referralLink;
            }
        }

        function generateReferralLink(code) {
            return `${window.location.origin}/mobile/?invite=${code}`;
        }

        function generateQRCode() {
            var link = document.getElementById('myReferralLink').value;
            alert('📱 สร้าง QR Code\n\nลิงค์: ' + link + '\n\n[ในแอปจริงจะแสดง QR Code]');
        }

        function shareReferralLink() {
            var code = document.getElementById('myReferralCode').value;
            var link = document.getElementById('myReferralLink').value;

            var message = '🌱 มาร่วมกับ Fingrow V3 กันเถอะ!\n\n' +
                         '💰 ตลาดซื้อขายสินค้ามือสอง\n' +
                         '🎁 ใช้รหัสแนะนำ: ' + code + '\n' +
                         '🔗 ' + link + '\n\n' +
                         '✅ รับโบนัสทันทีเมื่อสมัคร!';

            if (navigator.share) {
                navigator.share({
                    title: 'Fingrow V3 - ตลาดซื้อขายสินค้ามือสอง',
                    text: message,
                    url: link
                });
            } else {
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(message);
                    alert('✅ คัดลอกข้อความแชร์สำเร็จ!\n\nนำไปแชร์ในแอปอื่นได้เลย');
                } else {
                    alert('ข้อความแชร์:\n\n' + message);
                }
            }
        }

        function showReferralDetails() {
            alert('📊 รายละเอียดการแนะนำ\n\n' +
                  '👥 คนที่แนะนำ: 23 คน\n' +
                  '💰 รายได้รวม: ฿11,540\n\n' +
                  '🔥 ระดับปัจจุบัน: Silver\n' +
                  '🎯 เป้าหมาย Gold: อีก 7 คน');
        }

        async function showWalletDetails() {
            showPage('walletManagement');
            await loadPaymentMethods();
        }

        async function loadPaymentMethods() {
            if (!currentUser) return;

            try {
                const response = await fetch(`/api/payment-methods/${currentUser.id}`);
                const result = await response.json();

                const container = document.getElementById('paymentMethodsList');

                if (result.success && result.data.length > 0) {
                    container.innerHTML = result.data.map(method => {
                        const icon = method.type === 'bank' ? '🏦' :
                                   method.type === 'crypto' ? '₿' :
                                   method.type === 'promptpay' ? '📱' : '📋';

                        const displayName = method.type === 'bank' ?
                            `${method.bank_name} - ${method.account_number}` :
                            method.type === 'crypto' ?
                            `${method.network} - ${method.wallet_address.substring(0, 10)}...` :
                            method.account_name;

                        return `
                            <div style="background: rgba(15, 23, 42, 0.5); border-radius: 12px; padding: 16px; margin-bottom: 12px; border: ${method.is_default ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)'};">
                                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                                    <div style="flex: 1;">
                                        <div style="display: flex; align-items: center; margin-bottom: 8px;">
                                            <span style="font-size: 24px; margin-right: 8px;">${icon}</span>
                                            <div>
                                                <div style="color: white; font-weight: 600;">${method.account_name}</div>
                                                <div style="color: #9ca3af; font-size: 14px;">${displayName}</div>
                                            </div>
                                        </div>
                                        ${method.is_default ? '<span style="background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">บัญชีหลัก</span>' : ''}
                                    </div>
                                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                        <button onclick="editPaymentMethod('${method.id}')" class="btn-secondary" style="padding: 8px 12px; font-size: 12px;">✏️ แก้ไข</button>
                                        ${!method.is_default ? `<button onclick="setDefaultPaymentMethod('${method.id}')" class="btn-secondary" style="padding: 8px 12px; font-size: 12px;">ตั้งเป็นหลัก</button>` : ''}
                                        <button onclick="deletePaymentMethod('${method.id}')" class="btn-danger" style="padding: 8px 12px; font-size: 12px;">ลบ</button>
                                    </div>
                                </div>
                                ${method.qr_code_path ? `
                                    <div style="margin-top: 12px; text-align: center;">
                                        <img src="${method.qr_code_path}" style="max-width: 200px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2);">
                                        <p style="color: #9ca3af; font-size: 12px; margin-top: 4px;">QR Code รับเงิน</p>
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('');
                } else {
                    container.innerHTML = '<p class="text-gray-400 text-center py-8">ยังไม่มีบัญชี/Wallet<br>กดปุ่มด้านล่างเพื่อเพิ่ม</p>';
                }
            } catch (error) {
                console.error('Error loading payment methods:', error);
                document.getElementById('paymentMethodsList').innerHTML = '<p class="text-red-400 text-center py-8">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
            }
        }

        function showAddPaymentMethodForm() {
            window.editingPaymentMethodId = null;
            showPage('addPaymentMethodForm');
            document.getElementById('formTitle').textContent = '➕ เพิ่มบัญชี/Wallet ใหม่';
            document.getElementById('saveButton').textContent = '💾 บันทึก';
            // Reset form
            document.getElementById('paymentType').value = 'bank';
            document.getElementById('accountName').value = '';
            document.getElementById('accountNumber').value = '';
            document.getElementById('bankName').value = '';
            document.getElementById('cryptoName').value = '';
            document.getElementById('walletAddress').value = '';
            document.getElementById('cryptoNetwork').value = '';
            document.getElementById('setAsDefault').checked = false;
            // Reset QR code
            document.getElementById('qrCodeFile').value = '';
            document.getElementById('qrPreview').style.display = 'none';
            document.getElementById('qrPreviewImage').src = '';
            updatePaymentFormFields();
        }

        async function editPaymentMethod(id) {
            try {
                const response = await fetch(`/api/payment-methods/${currentUser.id}`);
                const result = await response.json();
                const method = result.data.find(m => m.id === id);

                if (!method) {
                    alert('ไม่พบข้อมูล');
                    return;
                }

                window.editingPaymentMethodId = id;
                showPage('addPaymentMethodForm');
                document.getElementById('formTitle').textContent = '✏️ แก้ไขบัญชี/Wallet';
                document.getElementById('saveButton').textContent = '💾 บันทึกการแก้ไข';

                document.getElementById('paymentType').value = method.type;

                if (method.type === 'crypto') {
                    document.getElementById('cryptoName').value = method.account_name;
                    document.getElementById('walletAddress').value = method.wallet_address;
                    document.getElementById('cryptoNetwork').value = method.network;
                } else {
                    document.getElementById('accountName').value = method.account_name;
                    document.getElementById('accountNumber').value = method.account_number || '';
                    document.getElementById('bankName').value = method.bank_name || '';
                }

                document.getElementById('setAsDefault').checked = method.is_default === 1;

                // Show QR code preview if exists
                if (method.qr_code_path) {
                    document.getElementById('qrPreview').style.display = 'block';
                    document.getElementById('qrPreviewImage').src = method.qr_code_path;
                } else {
                    document.getElementById('qrPreview').style.display = 'none';
                }

                updatePaymentFormFields();
            } catch (error) {
                console.error('Error loading payment method:', error);
                alert('❌ เกิดข้อผิดพลาดในการโหลดข้อมูล');
            }
        }

        function updatePaymentFormFields() {
            const type = document.getElementById('paymentType').value;
            const bankFields = document.getElementById('bankFields');
            const cryptoFields = document.getElementById('cryptoFields');

            if (type === 'crypto') {
                bankFields.style.display = 'none';
                cryptoFields.style.display = 'block';
            } else {
                bankFields.style.display = 'block';
                cryptoFields.style.display = 'none';
            }
        }

        async function savePaymentMethod() {
            if (!currentUser) return;

            const type = document.getElementById('paymentType').value;
            const setAsDefault = document.getElementById('setAsDefault').checked;

            let data = {
                user_id: currentUser.id,
                type: type,
                is_default: setAsDefault
            };

            if (type === 'crypto') {
                data.account_name = document.getElementById('cryptoName').value;
                data.wallet_address = document.getElementById('walletAddress').value;
                data.network = document.getElementById('cryptoNetwork').value;

                if (!data.account_name || !data.wallet_address || !data.network) {
                    alert('กรุณากรอกข้อมูลให้ครบถ้วน');
                    return;
                }
            } else {
                data.account_name = document.getElementById('accountName').value;
                data.bank_name = document.getElementById('bankName').value;
                data.account_number = document.getElementById('accountNumber').value;

                if (!data.account_name || (type === 'bank' && (!data.bank_name || !data.account_number))) {
                    alert('กรุณากรอกข้อมูลให้ครบถ้วน');
                    return;
                }
            }

            try {
                // Upload QR code if selected
                const qrFile = document.getElementById('qrCodeFile').files[0];
                if (qrFile) {
                    const formData = new FormData();
                    formData.append('qrCode', qrFile);

                    const uploadResponse = await fetch('/api/upload-qr', {
                        method: 'POST',
                        body: formData
                    });

                    const uploadResult = await uploadResponse.json();
                    if (uploadResult.success) {
                        data.qr_code_path = uploadResult.path;
                    }
                }

                const isEditing = window.editingPaymentMethodId;
                const url = isEditing ? `/api/payment-methods/${window.editingPaymentMethodId}` : '/api/payment-methods';
                const method = isEditing ? 'PUT' : 'POST';

                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    alert('✅ บันทึกสำเร็จ!');
                    showPage('walletManagement');
                    await loadPaymentMethods();
                } else {
                    alert('❌ เกิดข้อผิดพลาด: ' + result.message);
                }
            } catch (error) {
                console.error('Error saving payment method:', error);
                alert('❌ เกิดข้อผิดพลาดในการบันทึก');
            }
        }

        function previewQRCode(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('qrPreview').style.display = 'block';
                    document.getElementById('qrPreviewImage').src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        }

        async function setDefaultPaymentMethod(id) {
            try {
                const response = await fetch(`/api/payment-methods/${id}/set-default`, {
                    method: 'POST'
                });

                const result = await response.json();

                if (result.success) {
                    await loadPaymentMethods();
                } else {
                    alert('❌ เกิดข้อผิดพลาด: ' + result.message);
                }
            } catch (error) {
                console.error('Error setting default:', error);
                alert('❌ เกิดข้อผิดพลาด');
            }
        }

        async function deletePaymentMethod(id) {
            if (!confirm('ต้องการลบบัญชี/Wallet นี้หรือไม่?')) return;

            try {
                const response = await fetch(`/api/payment-methods/${id}`, {
                    method: 'DELETE'
                });

                const result = await response.json();

                if (result.success) {
                    await loadPaymentMethods();
                } else {
                    alert('❌ เกิดข้อผิดพลาด: ' + result.message);
                }
            } catch (error) {
                console.error('Error deleting payment method:', error);
                alert('❌ เกิดข้อผิดพลาด');
            }
        }

        function showSettings() {
            const settingsMenu = `⚙️ ตั้งค่าระบบ\n\n1. 🔔 การแจ้งเตือน: ${userSettings.notifications ? 'เปิด' : 'ปิด'}\n2. 🌍 ภาษา: ${userSettings.language}\n3. 💱 สกุลเงินหลัก: ${userSettings.currency}\n4. 🔒 ความปลอดภัย: ${userSettings.security ? 'เปิด' : 'ปิด'}\n5. 📊 ข้อมูลส่วนตัว\n6. 🔄 ซิงค์ข้อมูล\n7. 🎨 ธีม\n\nกรุณาเลือกหมายเลข 1-7 หรือพิมพ์ 'ยกเลิก'`;

            const choice = prompt(settingsMenu);

            switch(choice) {
                case '1':
                    toggleNotifications();
                    break;
                case '2':
                    changeLanguage();
                    break;
                case '3':
                    changeCurrency();
                    break;
                case '4':
                    toggleSecurity();
                    break;
                case '5':
                    alert('📊 ข้อมูลส่วนตัว\n\n• การรักษาความเป็นส่วนตัว: เข้มงวด\n• การแชร์ข้อมูล: ปิด\n• การติดตาม: ปิด');
                    break;
                case '6':
                    alert('🔄 กำลังซิงค์ข้อมูล...\n\n✅ ข้อมูลโปรไฟล์: อัพเดทแล้ว\n✅ ข้อมูลกระเป๋าเงิน: อัพเดทแล้ว\n✅ ประวัติการซื้อขาย: อัพเดทแล้ว');
                    break;
                case '7':
                    const themes = prompt('🎨 เลือกธีม:\n\n1. Dark (ปัจจุบัน)\n2. Light\n3. Auto\n\nเลือก 1-3:');
                    if (themes) {
                        const themeNames = ['', 'Dark', 'Light', 'Auto'];
                        alert(`✅ เปลี่ยนธีมเป็น: ${themeNames[themes]} สำเร็จ!`);
                    }
                    break;
            }
        }

        function contactSupport() {
            const contactOptions = `📞 ติดต่อเรา\n\n1. 💬 แชทออนไลน์ (24/7)\n2. 📧 อีเมล: support@fingrow.com\n3. 📱 Line: @fingrow\n4. ☎️ โทร: 02-123-4567\n5. 🏢 สำนักงาน: กรุงเทพฯ\n\n⏰ เวลาทำการ: จ-ศ 9:00-18:00\n\nเลือก 1-5 หรือพิมพ์ 'ยกเลิก'`;

            const choice = prompt(contactOptions);

            switch(choice) {
                case '1':
                    alert('💬 กำลังเชื่อมต่อแชทออนไลน์...\n\n👋 สวัสดีครับ! ทีม Fingrow ยินดีให้บริการ\n🕐 เวลาตอบ: โดยเฉลี่ย < 2 นาที\n\n[ในแอปจริงจะเปิดหน้าแชท]');
                    break;
                case '2':
                    if (navigator.clipboard) {
                        navigator.clipboard.writeText('support@fingrow.com');
                        alert('📧 คัดลอกอีเมลเรียบร้อย!\n\nsupport@fingrow.com\n\n💡 เราจะตอบกลับภายใน 24 ชั่วโมง');
                    } else {
                        alert('📧 support@fingrow.com\n\n💡 เราจะตอบกลับภายใน 24 ชั่วโมง');
                    }
                    break;
                case '3':
                    alert('📱 Line Official Account\n\n🆔 @fingrow\n\n🔍 ค้นหาได้ใน Line App\n💬 แอดเป็นเพื่อนเพื่อรับข่าวสารและโปรโมชัน');
                    break;
                case '4':
                    alert('☎️ โทรศัพท์\n\n📞 02-123-4567\n⏰ จ-ศ 9:00-18:00\n\n💰 อัตราค่าบริการตามแพ็กเกจโทรศัพท์ของคุณ');
                    break;
                case '5':
                    alert('🏢 สำนักงานใหญ่\n\n📍 999/9 อาคาร Fingrow Tower\n    ถ.พหลโยธิน แขวงจตุจักร\n    เขตจตุจักร กรุงเทพฯ 10900\n\n🚇 BTS หมอชิต (ออกทางออกที่ 3)\n🚌 รถเมล์: 3, 39, 59\n\n⏰ เปิดให้บริการ: จ-ศ 9:00-17:00');
                    break;
            }
        }

        function changeLanguage() {
            const languages = ['ไทย', 'English', '中文', '日本語', 'Español'];
            const currentIndex = languages.indexOf(userSettings.language);
            const languageList = languages.map((lang, index) =>
                `${index + 1}. ${lang}${index === currentIndex ? ' (ปัจจุบัน)' : ''}`
            ).join('\n');

            const choice = prompt(`🌍 เลือกภาษา:\n\n${languageList}\n\nพิมพ์หมายเลข 1-${languages.length}:`);

            if (choice && choice >= 1 && choice <= languages.length) {
                userSettings.language = languages[choice - 1];
                document.getElementById('languageSetting').textContent = userSettings.language;
                alert(`✅ เปลี่ยนภาษาเป็น: ${userSettings.language} สำเร็จ!`);

                // In a real app, this would trigger language change
                if (userSettings.language !== 'ไทย') {
                    alert(`🔄 กำลังโหลดภาษา ${userSettings.language}...\n\n(ในเวอร์ชันจริงจะเปลี่ยนภาษาทั้งแอป)`);
                }
            }
        }

        function changeCurrency() {
            const currencies = [
                { code: 'THB', name: 'บาทไทย', symbol: '฿' },
                { code: 'USD', name: 'US Dollar', symbol: '$' },
                { code: 'EUR', name: 'Euro', symbol: '€' },
                { code: 'BTC', name: 'Bitcoin', symbol: '₿' }
            ];

            const currentCurrency = currencies.find(c => c.code === userSettings.currency);
            const currencyList = currencies.map((curr, index) =>
                `${index + 1}. ${curr.code} - ${curr.name} (${curr.symbol})${curr.code === userSettings.currency ? ' (ปัจจุบัน)' : ''}`
            ).join('\n');

            const choice = prompt(`💱 เลือกสกุลเงินหลัก:\n\n${currencyList}\n\nพิมพ์หมายเลข 1-${currencies.length}:`);

            if (choice && choice >= 1 && choice <= currencies.length) {
                const selectedCurrency = currencies[choice - 1];
                userSettings.currency = selectedCurrency.code;
                document.getElementById('currencySetting').textContent = selectedCurrency.code;

                alert(`✅ เปลี่ยนสกุลเงินหลักเป็น: ${selectedCurrency.code} (${selectedCurrency.name}) สำเร็จ!\n\n💡 ราคาสินค้าจะแสดงเป็น ${selectedCurrency.symbol} เป็นหลัก`);

                // Update wallet display based on selected currency
                updateWalletDisplay();
            }
        }

        function toggleNotifications() {
            userSettings.notifications = !userSettings.notifications;
            const toggleElement = document.getElementById('notificationToggle');
            if (toggleElement) {
                toggleElement.textContent = userSettings.notifications ? 'เปิด' : 'ปิด';
                toggleElement.classList.toggle('inactive', !userSettings.notifications);
            }
            alert(`🔔 ${userSettings.notifications ? 'เปิด' : 'ปิด'}การแจ้งเตือนเรียบร้อยแล้ว!`);
        }

        function toggleSecurity() {
            userSettings.security = !userSettings.security;
            const toggleElement = document.getElementById('securityToggle');
            if (toggleElement) {
                toggleElement.textContent = userSettings.security ? 'เปิด' : 'ปิด';
                toggleElement.classList.toggle('inactive', !userSettings.security);
            }
            alert(`🔒 ${userSettings.security ? 'เปิด' : 'ปิด'}การรักษาความปลอดภัยเรียบร้อยแล้ว!`);
        }

        function updateWalletDisplay() {
            if (currentUser && userSettings.currency !== 'THB') {
                // Mock conversion rates
                const rates = {
                    'USD': 0.028,
                    'EUR': 0.026,
                    'BTC': 0.0000012
                };

                if (rates[userSettings.currency]) {
                    const convertedAmount = (currentUser.wallet_balance * rates[userSettings.currency]).toFixed(2);
                    const symbols = { 'USD': '$', 'EUR': '€', 'BTC': '₿' };
                    const symbol = symbols[userSettings.currency] || '';

                    document.getElementById('profileThbBalance').textContent =
                        `${symbol}${convertedAmount}`;
                }
            } else if (currentUser) {
                document.getElementById('profileThbBalance').textContent = `฿${currentUser.wallet_balance.toLocaleString()}`;
            }
        }


        function loadReferrerInfo(user) {
            const referralSection = document.getElementById('referralSection');

            // Check if user has a referrer
            if (!user.referred_by) {
                referralSection.style.display = 'none';
                return;
            }

            try {
                // Get all users to find the referrer
                const users = JSON.parse(localStorage.getItem('fingrow_users') || '[]');
                const referrer = users.find(u => parseInt(u.id) === parseInt(user.referred_by));

                if (referrer) {
                    // Show referral section
                    referralSection.style.display = 'block';

                    // Update referrer image
                    const referrerImage = document.getElementById('referrerImage');
                    if (referrerImage) {
                        referrerImage.src = referrer.profile_image || 'https://images.unsplash.com/photo-1494790108755-2616b612b647?w=60&h=60&fit=crop&crop=face';
                    }

                    // Update referrer name
                    const referrerName = document.getElementById('referrerName');
                    if (referrerName) {
                        referrerName.textContent = referrer.full_name || referrer.username;
                    }

                    // Update referrer code
                    const referrerCode = document.getElementById('referrerCode');
                    if (referrerCode) {
                        referrerCode.textContent = `รหัส: ${referrer.invite_code}`;
                    }

                    // Update referrer date
                    const referrerDate = document.getElementById('referrerDate');
                    if (referrerDate) {
                        const joinDate = new Date(user.created_at).toLocaleDateString('th-TH');
                        referrerDate.textContent = `แนะนำเมื่อ: ${joinDate}`;
                    }

                    console.log('✅ Referrer info loaded:', referrer.username);
                } else {
                    console.warn('⚠️ Referrer not found for user:', user.username);
                    referralSection.style.display = 'none';
                }
            } catch (error) {
                console.error('❌ Error loading referrer info:', error);
                referralSection.style.display = 'none';
            }
        }
})();
