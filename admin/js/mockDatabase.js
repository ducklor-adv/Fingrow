// Mock Database สำหรับ Fingrow V3
class MockDatabase {
    constructor() {
        this.userCounter = 10; // Start from 11 for next user
        this.initializeData();
    }

    // Helper function to normalize users data to ensure it's always an Array
    normalizeUsers(raw) {
        // Add debug logging for development
        if (typeof window !== 'undefined' && window.console) {
            console.debug('[MockDatabase] normalizeUsers input:', { raw, type: typeof raw, isArray: Array.isArray(raw) });
        }

        try {
            // If it's already an array, return as-is
            if (Array.isArray(raw)) {
                return raw;
            }

            // If it's a string, try to parse as JSON
            if (typeof raw === 'string') {
                const parsed = JSON.parse(raw);
                return this.normalizeUsers(parsed); // Recursive call to handle nested cases
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
                console.warn('[MockDatabase] normalizeUsers fallback to empty array for:', raw);
            }
            return [];
        } catch (error) {
            if (typeof window !== 'undefined' && window.console) {
                console.error('[MockDatabase] normalizeUsers error:', error, 'input:', raw);
            }
            return [];
        }
    }

    initializeData() {
        // Try to load from localStorage first
        const savedUsers = localStorage.getItem('fingrow_users');
        const savedProducts = localStorage.getItem('fingrow_products');
        const savedOrders = localStorage.getItem('fingrow_orders');
        const savedReferrals = localStorage.getItem('fingrow_referrals');

        if (savedUsers) {
            try {
                this.users = this.normalizeUsers(JSON.parse(savedUsers));
            } catch (error) {
                console.warn('[MockDatabase] Failed to parse saved users, creating defaults:', error);
                this.createDefaultUsers();
            }
        } else {
            this.createDefaultUsers();
        }

        if (savedProducts) {
            this.products = JSON.parse(savedProducts);
        } else {
            this.createDefaultProducts();
        }

        if (savedOrders) {
            this.orders = JSON.parse(savedOrders);
        } else {
            this.createDefaultOrders();
        }

        // Load or initialize referrals
        if (savedReferrals !== null) {
            this.referrals = JSON.parse(savedReferrals);
            console.log('[MockDatabase] Loaded referrals from localStorage:', this.referrals.length);
        } else {
            this.createDefaultReferrals();
        }

        // Initialize reviews
        this.initializeReviews();
    }

    // Helper function to format full address
    formatFullAddress(user) {
        if (!user.address_number) return user.shipping_address || '';

        const parts = [
            user.address_number,
            user.address_street,
            user.address_subdistrict ? `แขวง${user.address_subdistrict}` : '',
            user.address_district ? `เขต${user.address_district}` : '',
            user.address_province,
            user.address_postal_code
        ].filter(part => part); // Remove empty parts

        return parts.join(' ');
    }

    // Helper function to parse address string into fields
    parseAddress(fullAddress) {
        // This is a simple parser - in production you'd want more sophisticated parsing
        const parts = fullAddress.split(' ');
        return {
            address_number: parts[0] || '',
            address_street: parts[1] || '',
            address_subdistrict: parts.find(p => p.startsWith('ตำบล'))?.replace('ตำบล', '') || '',
            address_district: parts.find(p => p.startsWith('อำเภอ'))?.replace('อำเภอ', '') || '',
            address_province: parts[parts.length - 2] || '',
            address_postal_code: parts[parts.length - 1] || ''
        };
    }

    createDefaultUsers() {
        // Users Table - 10 users with profile images, ratings and provinces
        this.users = [
            {
                id: 1, auto_user_id: '24ABC000001', username: 'alice_smith', email: 'alice@example.com', password: '123456',
                full_name: 'Alice Smith', phone: '081-234-5671', wallet_balance: 15420.50, wld_balance: 45.2,
                referral_code: 'ALI001', referred_by: null, created_at: '2024-01-15', last_login: '2024-09-18',
                status: 'active', profile_image: 'https://images.unsplash.com/photo-1494790108755-2616b612b647?w=100&h=100&fit=crop&crop=face',
                seller_rating: 4.8, total_sales: 23, province: 'กรุงเทพมหานคร',
                // Address fields
                address_number: '123/45',
                address_street: 'ซอยสุขุมวิท 21',
                address_subdistrict: 'คลองเตยเหนือ',
                address_district: 'วัฒนา',
                address_province: 'กรุงเทพมหานคร',
                address_postal_code: '10110',
                // Legacy field for backward compatibility
                shipping_address: '123/45 ซอยสุขุมวิท 21 แขวงคลองเตยเหนือ เขตวัฒนา กรุงเทพมหานคร 10110'
            },
            {
                id: 2, auto_user_id: '24DEF000002', username: 'bob_jones', email: 'bob@example.com', password: '123456',
                full_name: 'Bob Jones', phone: '081-234-5672', wallet_balance: 8750.00, wld_balance: 23.8,
                referral_code: 'BOB002', referred_by: null, created_at: '2024-01-20', last_login: '2024-09-17',
                status: 'active', profile_image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
                seller_rating: 4.3, total_sales: 15, province: 'เชียงใหม่',
                address_number: '567/89',
                address_street: 'หมู่บ้านดอยสุเทพ',
                address_subdistrict: 'สุเทพ',
                address_district: 'เมืองเชียงใหม่',
                address_province: 'เชียงใหม่',
                address_postal_code: '50200',
                shipping_address: '567/89 หมู่บ้านดอยสุเทพ ตำบลสุเทพ อำเภอเมืองเชียงใหม่ เชียงใหม่ 50200'
            },
            {
                id: 3, auto_user_id: '24GHI000003', username: 'charlie_wilson', email: 'charlie@example.com', password: '123456',
                full_name: 'Charlie Wilson', phone: '081-234-5673', wallet_balance: 32150.75, wld_balance: 89.5,
                referral_code: 'CHA003', referred_by: 1, created_at: '2024-02-01', last_login: '2024-09-19',
                status: 'active', profile_image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
                seller_rating: 4.9, total_sales: 34, province: 'ภูเก็ต',
                address_number: '321/12',
                address_street: 'หาดป่าตอง',
                address_subdistrict: 'ป่าตอง',
                address_district: 'กะทู้',
                address_province: 'ภูเก็ต',
                address_postal_code: '83150',
                shipping_address: '321/12 หาดป่าตอง แขวงป่าตอง เขตกะทู้ ภูเก็ต 83150'
            },
            {
                id: 4, auto_user_id: '24JKL000004', username: 'diana_taylor', email: 'diana@example.com', password: '123456',
                full_name: 'Diana Taylor', phone: '081-234-5674', wallet_balance: 19500.25, wld_balance: 67.3,
                referral_code: 'DIA004', referred_by: 1, created_at: '2024-02-10', last_login: '2024-09-16',
                status: 'active', profile_image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
                seller_rating: 4.7, total_sales: 19, province: 'ขอนแก่น',
                // Address fields
                address_number: '456/78',
                address_street: 'หมู่ 5',
                address_subdistrict: 'ในเมือง',
                address_district: 'เมืองขอนแก่น',
                address_province: 'ขอนแก่น',
                address_postal_code: '40000',
                // Legacy field for backward compatibility
                shipping_address: '456/78 หมู่ 5 ตำบลในเมือง อำเภอเมืองขอนแก่น ขอนแก่น 40000'
            },
            {
                id: 5, auto_user_id: '24MNO000005', username: 'edward_brown', email: 'edward@example.com', password: '123456',
                full_name: 'Edward Brown', phone: '081-234-5675', wallet_balance: 5420.00, wld_balance: 12.7,
                referral_code: 'EDW005', referred_by: 3, created_at: '2024-02-20', last_login: '2024-09-15',
                status: 'active', profile_image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
                seller_rating: 4.1, total_sales: 8, province: 'นครราชสีมา',
                // Address fields
                address_number: '789/23',
                address_street: 'ซอยมิตรภาพ',
                address_subdistrict: 'ในเมือง',
                address_district: 'เมืองนครราชสีมา',
                address_province: 'นครราชสีมา',
                address_postal_code: '30000',
                // Legacy field for backward compatibility
                shipping_address: '789/23 ซอยมิตรภาพ ตำบลในเมือง อำเภอเมืองนครราชสีมา นครราชสีมา 30000'
            },
            {
                id: 6, auto_user_id: '24PQR000006', username: 'fiona_green', email: 'fiona@example.com', password: '123456',
                full_name: 'Fiona Green', phone: '081-234-5676', wallet_balance: 12340.80, wld_balance: 34.6,
                referral_code: 'FIO006', referred_by: 2, created_at: '2024-03-01', last_login: '2024-09-18',
                status: 'active', profile_image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face',
                seller_rating: 4.6, total_sales: 12, province: 'สงขลา',
                // Address fields
                address_number: '234/56',
                address_street: 'หาดใหญ่',
                address_subdistrict: 'หาดใหญ่',
                address_district: 'หาดใหญ่',
                address_province: 'สงขลา',
                address_postal_code: '90110',
                // Legacy field for backward compatibility
                shipping_address: '234/56 หาดใหญ่ ตำบลหาดใหญ่ อำเภอหาดใหญ่ สงขลา 90110'
            },
            {
                id: 7, auto_user_id: '24STU000007', username: 'george_white', email: 'george@example.com', password: '123456',
                full_name: 'George White', phone: '081-234-5677', wallet_balance: 7890.50, wld_balance: 18.9,
                referral_code: 'GEO007', referred_by: 3, created_at: '2024-03-15', last_login: '2024-09-14',
                status: 'inactive', profile_image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=100&h=100&fit=crop&crop=face',
                seller_rating: 3.9, total_sales: 5, province: 'ระยอง',
                // Address fields
                address_number: '654/32',
                address_street: 'หาดแม่รำพึง',
                address_subdistrict: 'เพ',
                address_district: 'เมืองระยอง',
                address_province: 'ระยอง',
                address_postal_code: '21000',
                // Legacy field for backward compatibility
                shipping_address: '654/32 หาดแม่รำพึง ตำบลเพ อำเภอเมืองระยอง ระยอง 21000'
            },
            {
                id: 8, auto_user_id: '24VWX000008', username: 'helen_black', email: 'helen@example.com', password: '123456',
                full_name: 'Helen Black', phone: '081-234-5678', wallet_balance: 25670.90, wld_balance: 72.1,
                referral_code: 'HEL008', referred_by: 4, created_at: '2024-04-01', last_login: '2024-09-19',
                status: 'active', profile_image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face',
                seller_rating: 4.8, total_sales: 27, province: 'สุราษฎร์ธานี',
                // Address fields
                address_number: '987/65',
                address_street: 'เกาะสมุย',
                address_subdistrict: 'บ่อผุด',
                address_district: 'เกาะสมุย',
                address_province: 'สุราษฎร์ธานี',
                address_postal_code: '84320',
                // Legacy field for backward compatibility
                shipping_address: '987/65 เกาะสมุย ตำบลบ่อผุด อำเภอเกาะสมุย สุราษฎร์ธานی 84320'
            },
            {
                id: 9, auto_user_id: '24YZA000009', username: 'ivan_red', email: 'ivan@example.com', password: '123456',
                full_name: 'Ivan Red', phone: '081-234-5679', wallet_balance: 3450.25, wld_balance: 8.4,
                referral_code: 'IVA009', referred_by: 5, created_at: '2024-04-20', last_login: '2024-09-13',
                status: 'active', profile_image: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop&crop=face',
                seller_rating: 4.2, total_sales: 11, province: 'อุดรธานี',
                // Address fields
                address_number: '147/89',
                address_street: 'หนองประจักษ์',
                address_subdistrict: 'หมากแข้ง',
                address_district: 'เมืองอุดรธานี',
                address_province: 'อุดรธานี',
                address_postal_code: '41000',
                // Legacy field for backward compatibility
                shipping_address: '147/89 หนองประจักษ์ ตำบลหมากแข้ง อำเภอเมืองอุดรธานี อุดรธานี 41000'
            },
            {
                id: 10, auto_user_id: '24BCD000010', username: 'jane_blue', email: 'jane@example.com', password: '123456',
                full_name: 'Jane Blue', phone: '081-234-5680', wallet_balance: 18950.60, wld_balance: 51.8,
                referral_code: 'JAN010', referred_by: 6, created_at: '2024-05-01', last_login: '2024-09-18',
                status: 'active', profile_image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&h=100&fit=crop&crop=face',
                seller_rating: 4.5, total_sales: 16, province: 'เชียงราย',
                // Address fields
                address_number: '369/74',
                address_street: 'แม่สาย',
                address_subdistrict: 'เวียง',
                address_district: 'แม่สาย',
                address_province: 'เชียงราย',
                address_postal_code: '57130',
                // Legacy field for backward compatibility
                shipping_address: '369/74 แม่สาย ตำบลเวียง อำเภอแม่สาย เชียงราย 57130'
            }
        ];

        // Save to localStorage
        localStorage.setItem('fingrow_users', JSON.stringify(this.users));
    }

    createDefaultProducts() {
        // Products Table - 10 products with realistic product images
        this.products = [
            { id: 1, seller_id: 3, title: 'iPhone 14 Pro 128GB', description: 'สีดำ ใช้งานปกติ แบตเตอรี่ 89%', price: 28500, price_currency: 'THB', wld_price: 89.5, conversion_rate: 0.003140, rate_locked_at: '2024-08-15 10:30:00', category: 'electronics', condition: 'good', status: 'active', images: ['https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1695048071774-83f82d76d1a9?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1678911820864-e2c567c655d7?w=400&h=400&fit=crop'], created_at: '2024-08-15', views: 245 },
            { id: 2, seller_id: 2, title: 'PlayStation 5 Digital', description: 'กล่องครบ รับประกัน 6 เดือน', price: 18500, price_currency: 'THB', wld_price: 58.1, conversion_rate: 0.003140, rate_locked_at: '2024-08-20 14:15:00', category: 'gaming', condition: 'excellent', status: 'active', images: ['https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1622297845775-5ff3fef71d13?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1615680022647-99c397cbcaea?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=400&h=400&fit=crop'], created_at: '2024-08-20', views: 189 },
            { id: 3, seller_id: 4, title: 'MacBook Air M1 256GB', description: 'สีเงิน ใช้งานเบา cycle count 150', price: 32900, price_currency: 'THB', wld_price: 103.2, conversion_rate: 0.003140, rate_locked_at: '2024-09-01 09:45:00', category: 'electronics', condition: 'excellent', status: 'active', images: ['https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop'], created_at: '2024-09-01', views: 156 },
            { id: 4, seller_id: 1, title: 'Canon EOS R5 Body', description: 'กล่องครบ shutter count 5000', price: 89000, price_currency: 'THB', wld_price: 279.3, conversion_rate: 0.003140, rate_locked_at: '2024-09-05 16:20:00', category: 'camera', condition: 'excellent', status: 'active', images: ['https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=400&fit=crop'], created_at: '2024-09-05', views: 98 },
            { id: 5, seller_id: 8, title: 'Nike Air Jordan 1 US9', description: 'ของแท้ 100% สภาพใหม่', price: 5800, price_currency: 'THB', wld_price: 18.2, conversion_rate: 0.003140, rate_locked_at: '2024-09-10 11:30:00', category: 'fashion', condition: 'new', status: 'active', images: ['https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1584735175315-9d5df23860e6?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=400&h=400&fit=crop'], created_at: '2024-09-10', views: 234 },
            { id: 6, seller_id: 6, title: 'iPad Pro 11" 256GB', description: 'Wi-Fi + Cellular พร้อม Apple Pencil', price: 24900, price_currency: 'THB', wld_price: 78.1, conversion_rate: 0.003140, rate_locked_at: '2024-09-12 13:45:00', category: 'electronics', condition: 'good', status: 'active', images: ['https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1587033411391-5d9e51cce126?w=400&h=400&fit=crop'], created_at: '2024-09-12', views: 167 },
            { id: 7, seller_id: 10, title: 'Louis Vuitton Wallet', description: 'ของแท้ มี authentication card', price: 450.5, price_currency: 'WLD', wld_price: 450.5, conversion_rate: 1.0, rate_locked_at: '2024-08-25 15:20:00', category: 'fashion', condition: 'good', status: 'sold', images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1591561954557-26941169b49e?w=400&h=400&fit=crop'], created_at: '2024-08-25', views: 445 },
            { id: 8, seller_id: 5, title: 'Samsung Galaxy S23 Ultra', description: '256GB สีดำ ใส่เคสตลอด', price: 26800, price_currency: 'THB', wld_price: 84.1, conversion_rate: 0.003140, rate_locked_at: '2024-09-08 12:10:00', category: 'electronics', condition: 'excellent', status: 'active', images: ['https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1588256695933-4ba7b5aba4e7?w=400&h=400&fit=crop'], created_at: '2024-09-08', views: 123 },
            { id: 9, seller_id: 9, title: 'Yamaha Guitar FG830', description: 'กีตาร์โปร่ง เสียงดี มือสอง', price: 8900, price_currency: 'THB', wld_price: 27.9, conversion_rate: 0.003140, rate_locked_at: '2024-09-14 10:00:00', category: 'music', condition: 'good', status: 'active', images: ['https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1564186763535-ebb21ef5277f?w=400&h=400&fit=crop'], created_at: '2024-09-14', views: 89 },
            { id: 10, seller_id: 7, title: 'Apple Watch Series 8 45mm', description: 'GPS + Cellular สีดำ', price: 11500, price_currency: 'THB', wld_price: 36.1, conversion_rate: 0.003140, rate_locked_at: '2024-09-16 14:30:00', category: 'electronics', condition: 'good', status: 'active', images: ['https://images.unsplash.com/photo-1551816230-ef5deaed4a26?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1579586337278-3f436f25d4d6?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop'], created_at: '2024-09-16', views: 178 }
        ];

        // Save to localStorage
        localStorage.setItem('fingrow_products', JSON.stringify(this.products));
    }

    createDefaultOrders() {
        // Orders Table - 10 orders
        this.orders = [
            { id: 1, buyer_id: 1, seller_id: 3, product_id: 1, quantity: 1, total_amount: 28500, commission_rate: 0.05, commission_amount: 1425, status: 'completed', payment_method: 'wallet', created_at: '2024-09-18 14:30:00', completed_at: '2024-09-18 15:45:00' },
            { id: 2, buyer_id: 2, seller_id: 2, product_id: 2, quantity: 1, total_amount: 18500, commission_rate: 0.05, commission_amount: 925, status: 'completed', payment_method: 'wallet', created_at: '2024-09-18 10:15:00', completed_at: '2024-09-18 11:30:00' },
            { id: 3, buyer_id: 5, seller_id: 4, product_id: 3, quantity: 1, total_amount: 32900, commission_rate: 0.05, commission_amount: 1645, status: 'pending', payment_method: 'wld', created_at: '2024-09-19 09:20:00', completed_at: null },
            { id: 4, buyer_id: 6, seller_id: 1, product_id: 4, quantity: 1, total_amount: 89000, commission_rate: 0.05, commission_amount: 4450, status: 'shipped', payment_method: 'wallet', created_at: '2024-09-17 16:45:00', completed_at: null },
            { id: 5, buyer_id: 4, seller_id: 8, product_id: 5, quantity: 1, total_amount: 5800, commission_rate: 0.05, commission_amount: 290, status: 'completed', payment_method: 'wallet', created_at: '2024-09-16 13:20:00', completed_at: '2024-09-17 08:30:00' },
            { id: 6, buyer_id: 9, seller_id: 6, product_id: 6, quantity: 1, total_amount: 24900, commission_rate: 0.05, commission_amount: 1245, status: 'processing', payment_method: 'wld', created_at: '2024-09-19 11:10:00', completed_at: null },
            { id: 7, buyer_id: 3, seller_id: 10, product_id: 7, quantity: 1, total_amount: 12500, commission_rate: 0.05, commission_amount: 625, status: 'completed', payment_method: 'wallet', created_at: '2024-09-15 14:20:00', completed_at: '2024-09-15 16:45:00' },
            { id: 8, buyer_id: 8, seller_id: 5, product_id: 8, quantity: 1, total_amount: 26800, commission_rate: 0.05, commission_amount: 1340, status: 'cancelled', payment_method: 'wallet', created_at: '2024-09-14 10:30:00', completed_at: null },
            { id: 9, buyer_id: 10, seller_id: 9, product_id: 9, quantity: 1, total_amount: 8900, commission_rate: 0.05, commission_amount: 445, status: 'completed', payment_method: 'wallet', created_at: '2024-09-18 08:45:00', completed_at: '2024-09-18 12:20:00' },
            { id: 10, buyer_id: 7, seller_id: 7, product_id: 10, quantity: 1, total_amount: 11500, commission_rate: 0.05, commission_amount: 575, status: 'refunded', payment_method: 'wld', created_at: '2024-09-17 15:30:00', completed_at: null }
        ];

        // Save to localStorage
        localStorage.setItem('fingrow_orders', JSON.stringify(this.orders));
    }

    createDefaultReferrals() {
        // Initialize empty referrals array - no hardcoded data
        this.referrals = [];

        // Save to localStorage
        localStorage.setItem('fingrow_referrals', JSON.stringify(this.referrals));
        console.log('[MockDatabase] Created empty referrals array:', this.referrals.length);
    }

    initializeReviews() {
        // Reviews Table - 10 reviews
        this.reviews = [
            { id: 1, order_id: 1, reviewer_id: 1, reviewee_id: 3, rating: 5, comment: 'สินค้าดีมาก ตรงตามที่โฆษณา ผู้ขายใจดี', type: 'seller', created_at: '2024-09-18 16:00:00' },
            { id: 2, order_id: 1, reviewer_id: 3, reviewee_id: 1, rating: 5, comment: 'ผู้ซื้อน่ารัก จ่ายเงินรวดเร็ว', type: 'buyer', created_at: '2024-09-18 16:15:00' },
            { id: 3, order_id: 2, reviewer_id: 2, reviewee_id: 2, rating: 4, comment: 'PS5 ทำงานปกติดี แต่กล่องมีรอยขีดข่วนเล็กน้อย', type: 'seller', created_at: '2024-09-18 12:00:00' },
            { id: 4, order_id: 5, reviewer_id: 4, reviewee_id: 8, rating: 5, comment: 'รองเท้าสวยมาก ของแท้ 100% แนะนำเลย', type: 'seller', created_at: '2024-09-17 09:00:00' },
            { id: 5, order_id: 5, reviewer_id: 8, reviewee_id: 4, rating: 5, comment: 'ผู้ซื้อดี มารับของตรงเวลา', type: 'buyer', created_at: '2024-09-17 09:30:00' },
            { id: 6, order_id: 7, reviewer_id: 3, reviewee_id: 10, rating: 4, comment: 'กระเป๋าสภาพดี แต่ส่งมาช้ากว่านัด', type: 'seller', created_at: '2024-09-15 17:00:00' },
            { id: 7, order_id: 9, reviewer_id: 10, reviewee_id: 9, rating: 5, comment: 'กีตาร์เสียงดีมาก คุ้มค่าเงิน', type: 'seller', created_at: '2024-09-18 13:00:00' },
            { id: 8, order_id: 9, reviewer_id: 9, reviewee_id: 10, rating: 4, comment: 'ผู้ซื้อดี แต่ต่อรองราคาหนักไป', type: 'buyer', created_at: '2024-09-18 13:15:00' },
            { id: 9, order_id: 4, reviewer_id: 6, reviewee_id: 1, rating: 5, comment: 'กล้องสภาพดีเยี่ยม ทุกอย่างครบ', type: 'seller', created_at: '2024-09-17 17:30:00' },
            { id: 10, order_id: 2, reviewer_id: 2, reviewee_id: 2, rating: 5, comment: 'ขายของรวดเร็ว บริการดี', type: 'seller', created_at: '2024-09-18 12:30:00' }
        ];

        // Earnings Table - 10 earnings records
        this.earnings = [
            { id: 1, user_id: 3, type: 'sale', amount: 27075.00, source_order_id: 1, referral_id: null, created_at: '2024-09-18 15:45:00' },
            { id: 2, user_id: 1, type: 'referral', amount: 1425.00, source_order_id: 1, referral_id: 1, created_at: '2024-09-18 15:45:00' },
            { id: 3, user_id: 2, type: 'sale', amount: 17575.00, source_order_id: 2, referral_id: null, created_at: '2024-09-18 11:30:00' },
            { id: 4, user_id: 8, type: 'sale', amount: 5510.00, source_order_id: 5, referral_id: null, created_at: '2024-09-17 08:30:00' },
            { id: 5, user_id: 4, type: 'referral', amount: 290.00, source_order_id: 5, referral_id: 6, created_at: '2024-09-17 08:30:00' },
            { id: 6, user_id: 10, type: 'sale', amount: 11875.00, source_order_id: 7, referral_id: null, created_at: '2024-09-15 16:45:00' },
            { id: 7, user_id: 3, type: 'referral', amount: 625.00, source_order_id: 7, referral_id: 3, created_at: '2024-09-15 16:45:00' },
            { id: 8, user_id: 9, type: 'sale', amount: 8455.00, source_order_id: 9, referral_id: null, created_at: '2024-09-18 12:20:00' },
            { id: 9, user_id: 5, type: 'referral', amount: 445.00, source_order_id: 9, referral_id: 7, created_at: '2024-09-18 12:20:00' },
            { id: 10, user_id: 1, type: 'commission', amount: 4450.00, source_order_id: 4, referral_id: null, created_at: '2024-09-17 16:45:00' }
        ];

        // Chat Messages Table - 10 messages
        this.chat_messages = [
            { id: 1, sender_id: 1, receiver_id: 3, product_id: 1, message: 'สินค้ายังมีไหมครับ', type: 'text', created_at: '2024-09-18 14:00:00', read_at: '2024-09-18 14:05:00' },
            { id: 2, sender_id: 3, receiver_id: 1, product_id: 1, message: 'ยังมีครับ สนใจไหมครับ', type: 'text', created_at: '2024-09-18 14:05:00', read_at: '2024-09-18 14:10:00' },
            { id: 3, sender_id: 1, receiver_id: 3, product_id: 1, message: 'ลดได้ไหมครับ', type: 'text', created_at: '2024-09-18 14:10:00', read_at: '2024-09-18 14:15:00' },
            { id: 4, sender_id: 3, receiver_id: 1, product_id: 1, message: 'ราคานี้แล้วครับ พอดีได้', type: 'text', created_at: '2024-09-18 14:15:00', read_at: '2024-09-18 14:20:00' },
            { id: 5, sender_id: 2, receiver_id: 2, product_id: 2, message: 'PS5 มีจอย 2 ตัวไหมครับ', type: 'text', created_at: '2024-09-18 09:30:00', read_at: '2024-09-18 09:45:00' },
            { id: 6, sender_id: 4, receiver_id: 8, product_id: 5, message: 'รองเท้าใส่ได้แล้วไหม', type: 'text', created_at: '2024-09-16 12:00:00', read_at: '2024-09-16 12:30:00' },
            { id: 7, sender_id: 8, receiver_id: 4, product_id: 5, message: 'ใส่ได้เลยค่ะ สภาพดี', type: 'text', created_at: '2024-09-16 12:30:00', read_at: '2024-09-16 13:00:00' },
            { id: 8, sender_id: 6, receiver_id: 1, product_id: 4, message: 'กล้องนี้ถ่ายวิดีโอ 8K ได้ไหม', type: 'text', created_at: '2024-09-17 15:00:00', read_at: '2024-09-17 15:30:00' },
            { id: 9, sender_id: 9, receiver_id: 6, product_id: 6, message: 'iPad รองรับ Apple Pencil รุ่นไหน', type: 'text', created_at: '2024-09-19 10:30:00', read_at: null },
            { id: 10, sender_id: 10, receiver_id: 9, product_id: 9, message: 'กีตาร์นี้เหมาะกับมือใหม่ไหม', type: 'text', created_at: '2024-09-18 07:30:00', read_at: '2024-09-18 08:00:00' }
        ];

        // Notifications Table - 10 notifications
        this.notifications = [
            { id: 1, user_id: 1, type: 'order_completed', title: 'คำสั่งซื้อสำเร็จ', message: 'คำสั่งซื้อ iPhone 14 Pro ของคุณสำเร็จแล้ว', data: { order_id: 1 }, read_at: '2024-09-18 16:00:00', created_at: '2024-09-18 15:45:00' },
            { id: 2, user_id: 3, type: 'sale_completed', title: 'ขายสินค้าสำเร็จ', message: 'iPhone 14 Pro ของคุณขายได้แล้ว', data: { order_id: 1 }, read_at: '2024-09-18 16:05:00', created_at: '2024-09-18 15:45:00' },
            { id: 3, user_id: 2, type: 'new_message', title: 'ข้อความใหม่', message: 'PS5 มีจอย 2 ตัวไหมครับ', data: { message_id: 5 }, read_at: null, created_at: '2024-09-18 09:30:00' },
            { id: 4, user_id: 4, type: 'referral_earning', title: 'รายได้จาก Referral', message: 'คุณได้รับคอมมิชชั่น 290 บาทจาก referral', data: { earning_id: 5 }, read_at: '2024-09-17 09:00:00', created_at: '2024-09-17 08:30:00' },
            { id: 5, user_id: 8, type: 'product_viewed', title: 'มีคนดูสินค้า', message: 'Nike Air Jordan 1 ของคุณมีคนดู 234 ครั้งแล้ว', data: { product_id: 5 }, read_at: null, created_at: '2024-09-19 08:00:00' },
            { id: 6, user_id: 6, type: 'order_shipped', title: 'สินค้าจัดส่งแล้ว', message: 'Canon EOS R5 ถูกจัดส่งแล้ว', data: { order_id: 4 }, read_at: '2024-09-17 17:00:00', created_at: '2024-09-17 16:45:00' },
            { id: 7, user_id: 9, type: 'new_review', title: 'รีวิวใหม่', message: 'คุณได้รับรีวิว 4 ดาว', data: { review_id: 8 }, read_at: '2024-09-18 14:00:00', created_at: '2024-09-18 13:15:00' },
            { id: 8, user_id: 5, type: 'wld_received', title: 'ได้รับ WLD', message: 'คุณได้รับ 12.7 WLD จากการขาย', data: { amount: 12.7 }, read_at: null, created_at: '2024-09-18 12:20:00' },
            { id: 9, user_id: 10, type: 'product_sold', title: 'สินค้าขายหมดแล้ว', message: 'Louis Vuitton Wallet ขายหมดแล้ว', data: { product_id: 7 }, read_at: '2024-09-15 17:30:00', created_at: '2024-09-15 16:45:00' },
            { id: 10, user_id: 7, type: 'order_cancelled', title: 'คำสั่งซื้อถูกยกเลิก', message: 'Samsung Galaxy S23 Ultra ถูกยกเลิก', data: { order_id: 8 }, read_at: null, created_at: '2024-09-14 10:30:00' }
        ];

        // Favorites Table - 10 favorites
        this.favorites = [
            { id: 1, user_id: 1, product_id: 3, created_at: '2024-09-01' },
            { id: 2, user_id: 1, product_id: 6, created_at: '2024-09-12' },
            { id: 3, user_id: 2, product_id: 4, created_at: '2024-09-05' },
            { id: 4, user_id: 3, product_id: 8, created_at: '2024-09-08' },
            { id: 5, user_id: 4, product_id: 2, created_at: '2024-08-20' },
            { id: 6, user_id: 5, product_id: 9, created_at: '2024-09-14' },
            { id: 7, user_id: 6, product_id: 1, created_at: '2024-08-15' },
            { id: 8, user_id: 7, product_id: 5, created_at: '2024-09-10' },
            { id: 9, user_id: 8, product_id: 10, created_at: '2024-09-16' },
            { id: 10, user_id: 9, product_id: 7, created_at: '2024-08-25' }
        ];
    }

    // Get all users (for admin purposes)
    async getAllUsers() {
        const normalizedUsers = this.normalizeUsers(this.users || []);
        return {
            data: normalizedUsers,
            total: normalizedUsers.length,
            page: 1,
            totalPages: 1
        };
    }

    // API Methods
    async getUsers(page = 1, limit = 50, search = '') {
        const normalizedUsers = this.normalizeUsers(this.users || []);
        console.debug('[MockDatabase] getUsers:', {
            originalLength: this.users?.length || 0,
            normalizedLength: normalizedUsers.length,
            sampleIds: normalizedUsers.slice(0, 3).map(u => ({ id: u.id, username: u.username }))
        });

        let filtered = normalizedUsers;
        if (search) {
            filtered = normalizedUsers.filter(user =>
                user.username.toLowerCase().includes(search.toLowerCase()) ||
                user.email.toLowerCase().includes(search.toLowerCase()) ||
                user.full_name.toLowerCase().includes(search.toLowerCase())
            );
        }

        const start = (page - 1) * limit;
        const end = start + limit;

        return {
            data: filtered.slice(start, end),
            total: filtered.length,
            page: page,
            totalPages: Math.ceil(filtered.length / limit)
        };
    }

    async updateUser(userId, updatedData) {
        // Normalize users first
        const normalizedUsers = this.normalizeUsers(this.users || []);
        const userIndex = normalizedUsers.findIndex(user => user.id == userId);
        if (userIndex === -1) {
            console.warn('[MockDatabase] User not found for update:', userId);
            throw new Error('User not found');
        }

        // Merge updated data with existing user data
        normalizedUsers[userIndex] = {
            ...normalizedUsers[userIndex],
            ...updatedData
        };

        // Update the main users array and save
        this.users = normalizedUsers;
        localStorage.setItem('fingrow_users', JSON.stringify(this.users));

        return this.users[userIndex];
    }

    async deleteUser(userId) {
        // Normalize users first
        const normalizedUsers = this.normalizeUsers(this.users || []);
        const userIndex = normalizedUsers.findIndex(user => user.id == userId);
        if (userIndex === -1) {
            console.warn('[MockDatabase] User not found for deletion:', userId);
            throw new Error('User not found');
        }

        const deletedUser = normalizedUsers[userIndex];

        // Check if user has related data (orders, products, referrals)
        const userOrders = this.orders.filter(order =>
            order.buyer_id == userId || order.seller_id == userId
        );
        const userProducts = this.products.filter(product =>
            product.seller_id == userId
        );

        // Find related referral records
        const userReferrals = this.referrals.filter(referral =>
            referral.referrer_id == userId || referral.referred_id == userId
        );

        console.debug('[MockDatabase] Deleting user:', {
            userId,
            username: deletedUser.username,
            relatedOrders: userOrders.length,
            relatedProducts: userProducts.length,
            relatedReferrals: userReferrals.length
        });

        // Remove user from array
        normalizedUsers.splice(userIndex, 1);

        // Remove related referral records
        if (userReferrals.length > 0) {
            this.referrals = this.referrals.filter(referral =>
                referral.referrer_id != userId && referral.referred_id != userId
            );
            localStorage.setItem('fingrow_referrals', JSON.stringify(this.referrals));
            console.log(`[MockDatabase] Deleted ${userReferrals.length} referral records for user ${userId}`);
        }

        // Update the main users array and save
        this.users = normalizedUsers;
        localStorage.setItem('fingrow_users', JSON.stringify(this.users));

        // Note: In production, you might want to soft delete or handle related data
        console.log('[MockDatabase] User deleted successfully:', deletedUser.username);

        return {
            success: true,
            deletedUser,
            relatedData: {
                orders: userOrders.length,
                products: userProducts.length,
                referrals: userReferrals.length
            }
        };
    }

    // Authentication methods
    async login(username, password) {
        const normalizedUsers = this.normalizeUsers(this.users || []);
        console.debug('[MockDatabase] Login attempt:', { username, usersCount: normalizedUsers.length });

        const user = normalizedUsers.find(u => {
            const usernameMatch = u.username === username || u.email === username;
            const passwordMatch = u.password === password;
            console.debug('[MockDatabase] Checking user:', {
                username: u.username,
                email: u.email,
                status: u.status,
                usernameMatch,
                passwordMatch
            });
            return usernameMatch && passwordMatch;
        });

        if (user && user.status === 'active') {
            // Update last login
            user.last_login = new Date().toISOString().split('T')[0];
            this.updateUser(user.id, { last_login: user.last_login });
            console.debug('[MockDatabase] Login successful for user:', user.username);
            return { success: true, user: user };
        }

        console.debug('[MockDatabase] Login failed:', { user: !!user, status: user?.status });
        return { success: false, message: 'Invalid credentials or inactive account' };
    }

    async register(userData) {
        // Check if username exists
        const normalizedUsers = this.normalizeUsers(this.users || []);
        const existingUsername = normalizedUsers.find(u => u.username === userData.username);
        if (existingUsername) {
            return { success: false, message: 'Username already exists' };
        }

        // Check if email exists
        const existingEmail = normalizedUsers.find(u => u.email === userData.email);
        if (existingEmail) {
            return { success: false, message: 'Email already exists' };
        }

        // Generate new user ID and auto_user_id
        const normalizedForId = this.normalizeUsers(this.users || []);
        const newUserId = normalizedForId.length > 0 ? Math.max(...normalizedForId.map(u => u.id || 0)) + 1 : 1;
        const currentYear = new Date().getFullYear().toString().slice(-2);
        const randomChars = Math.random().toString(36).substring(2, 5).toUpperCase();
        const autoUserId = `${currentYear}${randomChars}${String(newUserId).padStart(6, '0')}`;

        // Generate referral code based on username
        const baseCode = this.createSafeReferralCode(userData.username);
        const referralCode = baseCode;

        // Check if referred_by code exists (รหัสของผู้แนะนำที่ใส่เข้ามา)
        let referredBy = null;
        if (userData.referral_code) {
            console.log('[MockDatabase] Checking referral code:', userData.referral_code);
            const referrer = normalizedUsers.find(u => u.referral_code === userData.referral_code);
            if (referrer) {
                referredBy = referrer.id;
                console.log('[MockDatabase] Found referrer:', referrer.username, 'ID:', referrer.id);
            } else {
                console.warn('[MockDatabase] Referral code not found:', userData.referral_code);
            }
        }

        const newUser = {
            id: newUserId,
            auto_user_id: autoUserId,
            username: userData.username,
            email: userData.email,
            password: userData.password,
            full_name: userData.full_name,
            phone: userData.phone || '',
            wallet_balance: 0.00,
            wld_balance: 0.0,
            referral_code: referralCode,
            referred_by: referredBy,
            created_at: new Date().toISOString().split('T')[0],
            last_login: new Date().toISOString().split('T')[0],
            status: 'active',
            profile_image: '',
            seller_rating: 5.0,
            total_sales: 0,
            province: userData.province || '',
            // Address fields (structured)
            address_number: userData.address_number || '',
            address_street: userData.address_street || '',
            address_subdistrict: userData.address_subdistrict || '',
            address_district: userData.address_district || '',
            address_province: userData.address_province || userData.province || '',
            address_postal_code: userData.address_postal_code || '',
            // Legacy field for backward compatibility
            shipping_address: userData.shipping_address || ''
        };

        // Ensure users is normalized array before pushing
        const currentUsers = this.normalizeUsers(this.users || []);
        currentUsers.push(newUser);
        this.users = currentUsers;
        localStorage.setItem('fingrow_users', JSON.stringify(this.users));

        // Create referral record if user was referred by someone
        if (referredBy) {
            console.log('[MockDatabase] Creating referral record - referrer:', referredBy, 'referred:', newUserId);
            console.log('[MockDatabase] Current referrals array length:', this.referrals ? this.referrals.length : 'undefined');

            // Ensure referrals array exists
            if (!this.referrals || !Array.isArray(this.referrals)) {
                console.warn('[MockDatabase] Referrals array not initialized, creating empty array');
                this.referrals = [];
            }

            const referralRecord = {
                id: this.referrals.length + 1,
                referrer_id: referredBy,
                referred_id: newUserId,
                level: 1,
                commission_rate: 0.02,
                total_earnings: 0.00,
                status: 'active',
                created_at: new Date().toISOString().split('T')[0]
            };

            this.referrals.push(referralRecord);
            localStorage.setItem('fingrow_referrals', JSON.stringify(this.referrals));
            console.log('[MockDatabase] Created referral record:', referralRecord);
            console.log('[MockDatabase] Updated referrals array length:', this.referrals.length);
        } else {
            console.log('[MockDatabase] No referral code provided or referrer not found');
        }

        return { success: true, user: newUser };
    }

    // Get user by ID
    getUser(userId) {
        const normalizedUsers = this.normalizeUsers(this.users || []);
        return normalizedUsers.find(user => user.id === userId) || null;
    }

    // Method to reset all data (for testing purposes)
    resetData() {
        localStorage.removeItem('fingrow_users');
        localStorage.removeItem('fingrow_products');
        localStorage.removeItem('fingrow_orders');
        this.initializeData();
        console.log('Database has been reset to default values');
    }

    async getProducts(page = 1, limit = 10, category = '', status = '') {
        let filtered = this.products;
        if (category) filtered = filtered.filter(p => p.category === category);
        if (status) filtered = filtered.filter(p => p.status === status);

        const start = (page - 1) * limit;
        const end = start + limit;

        return {
            data: filtered.slice(start, end).map(product => ({
                ...product,
                seller: this.normalizeUsers(this.users || []).find(u => u.id === product.seller_id)
            })),
            total: filtered.length,
            page: page,
            totalPages: Math.ceil(filtered.length / limit)
        };
    }

    async getOrders(page = 1, limit = 10, status = '') {
        let filtered = this.orders;
        if (status) filtered = filtered.filter(o => o.status === status);

        const start = (page - 1) * limit;
        const end = start + limit;

        return {
            data: filtered.slice(start, end).map(order => ({
                ...order,
                buyer: this.normalizeUsers(this.users || []).find(u => u.id === order.buyer_id),
                seller: this.normalizeUsers(this.users || []).find(u => u.id === order.seller_id),
                product: this.products.find(p => p.id === order.product_id)
            })),
            total: filtered.length,
            page: page,
            totalPages: Math.ceil(filtered.length / limit)
        };
    }

    async getReviews(page = 1, limit = 10) {
        const start = (page - 1) * limit;
        const end = start + limit;

        return {
            data: this.reviews.slice(start, end).map(review => ({
                ...review,
                reviewer: this.normalizeUsers(this.users || []).find(u => u.id === review.reviewer_id),
                reviewee: this.normalizeUsers(this.users || []).find(u => u.id === review.reviewee_id),
                order: this.orders.find(o => o.id === review.order_id)
            })),
            total: this.reviews.length,
            page: page,
            totalPages: Math.ceil(this.reviews.length / limit)
        };
    }

    async getDashboardStats() {
        const totalUsers = this.users.length;
        const activeUsers = this.users.filter(u => u.status === 'active').length;
        const totalProducts = this.products.length;
        const activeProducts = this.products.filter(p => p.status === 'active').length;
        const totalOrders = this.orders.length;
        const completedOrders = this.orders.filter(o => o.status === 'completed').length;
        const totalSales = this.orders
            .filter(o => o.status === 'completed')
            .reduce((sum, o) => sum + o.total_amount, 0);
        const totalCommissions = this.orders
            .reduce((sum, o) => sum + o.commission_amount, 0);
        const totalWLD = this.users
            .reduce((sum, u) => sum + u.wld_balance, 0);

        return {
            totalUsers: totalUsers,
            activeUsers: activeUsers,
            totalProducts: totalProducts,
            activeProducts: activeProducts,
            totalOrders: totalOrders,
            completedOrders: completedOrders,
            totalSales: totalSales,
            totalCommissions: totalCommissions,
            totalWLD: totalWLD
        };
    }

    async getSalesData() {
        // Generate monthly sales data
        const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.'];
        const values = [45000000, 52000000, 48000000, 65000000, 71000000, 58000000, 62000000, 89000000, 95000000];

        return { labels: months, values: values };
    }

    async getUserData() {
        // Generate monthly user growth data
        const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.'];
        const values = [245, 389, 456, 678, 892, 1034, 1156, 1247, 1398];

        return { labels: months, values: values };
    }

    async getRecentOrders(limit = 5) {
        return this.orders
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, limit)
            .map(order => ({
                ...order,
                buyer: this.users.find(u => u.id === order.buyer_id),
                seller: this.users.find(u => u.id === order.seller_id),
                product: this.products.find(p => p.id === order.product_id)
            }));
    }

    async getTopSellers(limit = 5) {
        const sellerStats = {};

        // Calculate seller statistics
        this.orders.filter(o => o.status === 'completed').forEach(order => {
            if (!sellerStats[order.seller_id]) {
                sellerStats[order.seller_id] = {
                    totalSales: 0,
                    totalAmount: 0,
                    orders: 0
                };
            }
            sellerStats[order.seller_id].totalSales += order.total_amount;
            sellerStats[order.seller_id].totalAmount += order.total_amount;
            sellerStats[order.seller_id].orders += 1;
        });

        // Calculate average ratings
        Object.keys(sellerStats).forEach(sellerId => {
            const sellerReviews = this.reviews.filter(r => r.reviewee_id === parseInt(sellerId) && r.type === 'seller');
            const avgRating = sellerReviews.length > 0
                ? sellerReviews.reduce((sum, r) => sum + r.rating, 0) / sellerReviews.length
                : 0;
            sellerStats[sellerId].rating = avgRating;
        });

        // Sort by total sales and get top sellers
        const topSellers = Object.entries(sellerStats)
            .sort(([, a], [, b]) => b.totalSales - a.totalSales)
            .slice(0, limit)
            .map(([sellerId, stats]) => ({
                ...this.normalizeUsers(this.users || []).find(u => u.id === parseInt(sellerId)),
                ...stats
            }));

        return topSellers;
    }

    // Generate auto user ID: YY + ABC + 000001
    generateAutoUserId() {
        const currentYear = new Date().getFullYear().toString().slice(-2); // Get last 2 digits of year

        // Generate 3 random letters A-Z
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let letterPart = '';
        for (let i = 0; i < 3; i++) {
            letterPart += letters.charAt(Math.floor(Math.random() * letters.length));
        }

        // Get next counter and pad with zeros to 6 digits
        this.userCounter++;
        const numberPart = this.userCounter.toString().padStart(6, '0');

        return `${currentYear}${letterPart}${numberPart}`;
    }

    async getUserStats(userId) {
        // Calculate purchase statistics (as buyer)
        const purchases = this.orders.filter(o => o.buyer_id === userId);
        const completedPurchases = purchases.filter(o => o.status === 'completed');
        const purchaseCount = completedPurchases.length;
        const totalPurchaseAmount = completedPurchases.reduce((sum, o) => sum + o.total_amount, 0);

        // Calculate sales statistics (as seller)
        const sales = this.orders.filter(o => o.seller_id === userId);
        const completedSales = sales.filter(o => o.status === 'completed');
        const salesCount = completedSales.length;
        const totalSalesAmount = completedSales.reduce((sum, o) => sum + o.total_amount, 0);

        // Calculate net amount (after commission deduction)
        const salesNetAmount = completedSales.reduce((sum, o) => sum + (o.total_amount - o.commission_amount), 0);

        // Calculate referral earnings
        const referralEarnings = this.earnings
            .filter(e => e.user_id === userId && e.type === 'referral')
            .reduce((sum, e) => sum + e.amount, 0);

        // Calculate commission earnings (if user is admin/has commission role)
        const commissionEarnings = this.earnings
            .filter(e => e.user_id === userId && e.type === 'commission')
            .reduce((sum, e) => sum + e.amount, 0);

        // Calculate total referrals (people they referred) - use loose equality for type safety
        const userReferralRecords = this.referrals.filter(r => r.referrer_id == userId);
        const totalReferrals = userReferralRecords.length;
        const activeReferrals = this.referrals.filter(r => r.referrer_id == userId && r.status === 'active').length;

        // Debug logging for userId 14 (DuckLord)
        if (userId == 14) {
            console.log(`[DEBUG] getUserStats for userId ${userId}:`, {
                allReferrals: this.referrals.length,
                userReferralRecords: userReferralRecords,
                totalReferrals: totalReferrals,
                activeReferrals: activeReferrals
            });
        }

        // Calculate total earnings from all sources
        const totalEarnings = salesNetAmount + referralEarnings + commissionEarnings;

        return {
            userId: userId,
            purchases: {
                count: purchaseCount,
                totalAmount: totalPurchaseAmount,
                pendingCount: purchases.filter(o => o.status === 'pending').length,
                cancelledCount: purchases.filter(o => o.status === 'cancelled').length
            },
            sales: {
                count: salesCount,
                totalAmount: totalSalesAmount,
                netAmount: salesNetAmount,
                pendingCount: sales.filter(o => o.status === 'pending').length,
                processingCount: sales.filter(o => o.status === 'processing').length,
                shippedCount: sales.filter(o => o.status === 'shipped').length
            },
            earnings: {
                total: totalEarnings,
                fromSales: salesNetAmount,
                fromReferrals: referralEarnings,
                fromCommissions: commissionEarnings
            },
            referrals: {
                total: totalReferrals,
                active: activeReferrals,
                earnings: referralEarnings
            }
        };
    }

    async getUsersWithStats() {
        const users = await this.getUsers(1, 100); // Get all users
        const usersWithStats = await Promise.all(
            users.data.map(async (user) => {
                const stats = await this.getUserStats(user.id);
                return {
                    ...user,
                    stats: stats
                };
            })
        );

        return {
            data: usersWithStats,
            total: users.total,
            page: users.page,
            totalPages: users.totalPages
        };
    }

    // Create new user with auto-generated ID
    async createUser(userData) {
        const newUser = {
            id: this.userCounter + 1,
            auto_user_id: this.generateAutoUserId(),
            ...userData,
            created_at: new Date().toISOString().split('T')[0],
            last_login: null,
            status: 'active'
        };

        this.users.push(newUser);
        return newUser;
    }

    createSafeReferralCode(username) {
        // Function to convert Thai/other languages to safe ASCII
        const thaiToEnglishMap = {
            'ก': 'k', 'ข': 'kh', 'ค': 'kh', 'ง': 'ng',
            'จ': 'j', 'ฉ': 'ch', 'ช': 'ch', 'ซ': 's',
            'ญ': 'y', 'ด': 'd', 'ต': 't', 'ถ': 'th',
            'ท': 'th', 'ธ': 'th', 'น': 'n', 'บ': 'b',
            'ป': 'p', 'ผ': 'ph', 'ฝ': 'f', 'พ': 'ph',
            'ฟ': 'f', 'ภ': 'ph', 'ม': 'm', 'ย': 'y',
            'ร': 'r', 'ล': 'l', 'ว': 'w', 'ศ': 's',
            'ษ': 's', 'ส': 's', 'ห': 'h', 'ฬ': 'l',
            'อ': 'o', 'ฮ': 'h'
        };

        let safeName = '';
        for (let char of username.toLowerCase()) {
            if (thaiToEnglishMap[char]) {
                safeName += thaiToEnglishMap[char];
            } else if (/[a-z0-9]/.test(char)) {
                safeName += char;
            }
            // Skip other characters (symbols, spaces, etc.)
        }

        // If no valid characters found, use 'user'
        if (!safeName) {
            safeName = 'user';
        }

        // Take first 8 characters and add random number to avoid duplicates
        const baseCode = safeName.substring(0, 8);
        const randomNum = Math.floor(Math.random() * 100);

        return baseCode + randomNum;
    }
}

// Export for use in admin panel
window.MockDatabase = MockDatabase;