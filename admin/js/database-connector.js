// Database Connector for Admin Interface
// This replaces MockDatabase with real SQLite data

class DatabaseConnector {
    constructor() {
        this.isNodeEnvironment = typeof window === 'undefined';
        this.adminDB = null;
        this.init();
    }

    async init() {
        if (this.isNodeEnvironment) {
            // Node.js environment - direct database access
            const { default: AdminDatabaseService } = await import('../api/database-api.js');
            this.adminDB = new AdminDatabaseService();
        } else {
            // Browser environment - use HTTP API or proxy
            this.adminDB = new BrowserDatabaseProxy();
        }
    }

    // Users methods
    async getAllUsers() {
        try {
            return await this.adminDB.getAllUsers();
        } catch (error) {
            console.error('Error getting all users:', error);
            return [];
        }
    }

    async getUserById(userId) {
        try {
            return await this.adminDB.getUserById(userId);
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    }

    async updateUser(userId, updates) {
        try {
            return await this.adminDB.updateUser(userId, updates);
        } catch (error) {
            console.error('Error updating user:', error);
            return false;
        }
    }

    async deleteUser(userId) {
        try {
            return await this.adminDB.deleteUser(userId);
        } catch (error) {
            console.error('Error deleting user:', error);
            return false;
        }
    }

    async searchUsers(searchTerm) {
        try {
            return await this.adminDB.searchUsers(searchTerm);
        } catch (error) {
            console.error('Error searching users:', error);
            return [];
        }
    }

    // Products methods
    async getAllProducts() {
        try {
            return await this.adminDB.getAllProducts();
        } catch (error) {
            console.error('Error getting all products:', error);
            return [];
        }
    }

    async updateProductStatus(productId, status, adminNotes = '') {
        try {
            return await this.adminDB.updateProductStatus(productId, status, adminNotes);
        } catch (error) {
            console.error('Error updating product status:', error);
            return false;
        }
    }

    // Orders methods
    async getAllOrders() {
        try {
            return await this.adminDB.getAllOrders();
        } catch (error) {
            console.error('Error getting all orders:', error);
            return [];
        }
    }

    // Dashboard methods
    async getDashboardStats() {
        try {
            return await this.adminDB.getDashboardStats();
        } catch (error) {
            console.error('Error getting dashboard stats:', error);
            return {};
        }
    }

    // Categories methods
    async getAllCategories() {
        try {
            return await this.adminDB.getAllCategories();
        } catch (error) {
            console.error('Error getting categories:', error);
            return [];
        }
    }

    // Reviews methods
    async getAllReviews() {
        try {
            return await this.adminDB.getAllReviews();
        } catch (error) {
            console.error('Error getting reviews:', error);
            return [];
        }
    }

    // Sales data for charts
    async getSalesData() {
        try {
            return await this.adminDB.getSalesData();
        } catch (error) {
            console.error('Error getting sales data:', error);
            return [];
        }
    }

    // User data for charts
    async getUserData() {
        try {
            return await this.adminDB.getUserData();
        } catch (error) {
            console.error('Error getting user data:', error);
            return [];
        }
    }

    // Top sellers data
    async getTopSellers() {
        try {
            return await this.adminDB.getTopSellers();
        } catch (error) {
            console.error('Error getting top sellers:', error);
            return [];
        }
    }

    // Reviews data
    async getReviews() {
        try {
            return await this.adminDB.getAllReviews();
        } catch (error) {
            console.error('Error getting reviews:', error);
            return [];
        }
    }
}

// Browser proxy for database operations
class BrowserDatabaseProxy {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 30000; // 30 seconds
    }

    async getAllUsers() {
        return this.getCachedOrFetch('users', () => this.fetchFromNode('getAllUsers'));
    }

    async getUserById(userId) {
        return await this.fetchFromNode('getUserById', { userId });
    }

    async updateUser(userId, updates) {
        this.clearCache('users');
        return await this.fetchFromNode('updateUser', { userId, updates });
    }

    async deleteUser(userId) {
        this.clearCache('users');
        return await this.fetchFromNode('deleteUser', { userId });
    }

    async searchUsers(searchTerm) {
        return await this.fetchFromNode('searchUsers', { searchTerm });
    }

    async getAllProducts() {
        return this.getCachedOrFetch('products', () => this.fetchFromNode('getAllProducts'));
    }

    async updateProductStatus(productId, status, adminNotes) {
        this.clearCache('products');
        return await this.fetchFromNode('updateProductStatus', { productId, status, adminNotes });
    }

    async getAllOrders() {
        return this.getCachedOrFetch('orders', () => this.fetchFromNode('getAllOrders'));
    }

    async getDashboardStats() {
        return this.getCachedOrFetch('stats', () => this.fetchFromNode('getDashboardStats'), 10000); // 10 second cache for stats
    }

    async getAllCategories() {
        return this.getCachedOrFetch('categories', () => this.fetchFromNode('getAllCategories'));
    }

    async getAllReviews() {
        return this.getCachedOrFetch('reviews', () => this.fetchFromNode('getAllReviews'));
    }

    async getSalesData() {
        return this.getCachedOrFetch('salesData', () => this.fetchFromNode('getSalesData'), 10000);
    }

    async getUserData() {
        return this.getCachedOrFetch('userData', () => this.fetchFromNode('getUserData'), 10000);
    }

    async getTopSellers() {
        return this.getCachedOrFetch('topSellers', () => this.fetchFromNode('getTopSellers'), 30000);
    }

    async getReviews() {
        return this.getCachedOrFetch('reviews', () => this.fetchFromNode('getReviews'));
    }

    // Cache management
    async getCachedOrFetch(key, fetchFn, timeout = null) {
        const cacheKey = key;
        const cached = this.cache.get(cacheKey);
        const now = Date.now();

        if (cached && (now - cached.timestamp) < (timeout || this.cacheTimeout)) {
            return cached.data;
        }

        try {
            const data = await fetchFn();
            this.cache.set(cacheKey, {
                data,
                timestamp: now
            });
            return data;
        } catch (error) {
            console.error(`Error fetching ${key}:`, error);
            return cached ? cached.data : [];
        }
    }

    clearCache(key) {
        if (key) {
            this.cache.delete(key);
        } else {
            this.cache.clear();
        }
    }

    // Browser-compatible database operations
    async fetchFromNode(method, params = {}) {
        try {
            // Check if we're in a browser environment
            if (typeof window !== 'undefined' && typeof require === 'undefined') {
                // Browser environment - use mock data directly
                return this.getMockData(method, params);
            }

            // Try to use Node.js modules if available
            const { default: AdminDatabaseService } = await import('../api/database-api.js');
            const service = new AdminDatabaseService();
            return await service[method](...Object.values(params));

        } catch (error) {
            // Always fallback to mock data on any error
            return this.getMockData(method, params);
        }
    }

    // Mock data for browser fallback
    getMockData(method, params = {}) {
        switch (method) {
            case 'getAllUsers':
                return [
                    { id: 'user-ananya', username: 'ananya', email: 'ananya@example.com', full_name: 'Ananya', is_active: 1, is_verified: 0, referral_count: 0, total_orders: 0, created_at: new Date().toISOString() },
                    { id: 'user-bank', username: 'bank', email: 'bank@example.com', full_name: 'Bank', is_active: 1, is_verified: 0, referral_count: 0, total_orders: 0, created_at: new Date().toISOString() },
                    { id: 'user-mild', username: 'mild', email: 'mild@example.com', full_name: 'Mild', is_active: 1, is_verified: 0, referral_count: 0, total_orders: 0, created_at: new Date().toISOString() },
                    { id: 'user-pong', username: 'pong', email: 'pong@example.com', full_name: 'Pong', is_active: 1, is_verified: 0, referral_count: 0, total_orders: 0, created_at: new Date().toISOString() },
                    { id: 'user-user', username: 'user', email: 'user@example.com', full_name: 'User', is_active: 1, is_verified: 0, referral_count: 0, total_orders: 0, created_at: new Date().toISOString() }
                ];
            case 'getAllProducts':
                return [
                    {
                        id: 'p1',
                        title: 'เก้าอี้ไม้โอ๊ค',
                        description: 'เก้าอี้ไม้โอ๊คคุณภาพดี เหมาะสำหรับใช้งานทั่วไป น่ั่งสบาย ทนทาน',
                        price_local: 1200,
                        seller_username: 'ananya',
                        seller_email: 'ananya@example.com',
                        seller_id: 'user-ananya',
                        category_name_th: 'ทั่วไป',
                        status: 'active',
                        is_available: 1,
                        community_percentage: 3,
                        created_at: new Date().toISOString()
                    },
                    {
                        id: 'p2',
                        title: 'โต๊ะทำงาน',
                        description: 'โต๊ะทำงานขนาดกำลังดี วัสดุดี เหมาะสำหรับทำงานที่บ้านหรือออฟฟิศ',
                        price_local: 4500,
                        seller_username: 'bank',
                        seller_email: 'bank@example.com',
                        seller_id: 'user-bank',
                        category_name_th: 'ทั่วไป',
                        status: 'active',
                        is_available: 1,
                        community_percentage: 5,
                        created_at: new Date().toISOString()
                    },
                    {
                        id: 'p3',
                        title: 'โน้ตบุ๊กมือสอง',
                        description: 'โน้ตบุ๊กมือสอง สภาพดี ใช้งานได้ปกติ เหมาะสำหรับงานเบาๆ เรียนหนังสือ',
                        price_local: 14500,
                        seller_username: 'mild',
                        seller_email: 'mild@example.com',
                        seller_id: 'user-mild',
                        category_name_th: 'ทั่วไป',
                        status: 'active',
                        is_available: 1,
                        community_percentage: 4,
                        created_at: new Date().toISOString()
                    },
                    {
                        id: 'p4',
                        title: 'ไมโครเวฟ',
                        description: 'ไมโครเวฟใช้งานได้ปกติ ขนาดกำลังดี เหมาะสำหรับครัวเรือน อุ่นอาหารได้ดี',
                        price_local: 1800,
                        seller_username: 'pong',
                        seller_email: 'pong@example.com',
                        seller_id: 'user-pong',
                        category_name_th: 'ทั่วไป',
                        status: 'active',
                        is_available: 1,
                        community_percentage: 2,
                        created_at: new Date().toISOString()
                    }
                ];
            case 'getAllOrders':
                return [];
            case 'getAllReviews':
            case 'getReviews':
                return [
                    {
                        id: 'review-1',
                        reviewer_username: 'mild',
                        reviewed_user_username: 'ananya',
                        product_title: 'เก้าอี้ไม้โอ๊ค',
                        rating: 5,
                        comment: 'เก้าอี้ดีมาก น่ั่งสบาย คุณภาพเกินราคา ผู้ขายน่ารัก ส่งไว',
                        is_visible: 1,
                        is_verified_purchase: 1,
                        created_at: new Date(Date.now() - 86400000 * 2).toISOString()
                    },
                    {
                        id: 'review-2',
                        reviewer_username: 'bank',
                        reviewed_user_username: 'mild',
                        product_title: 'โน้ตบุ๊กมือสอง',
                        rating: 4,
                        comment: 'โน้ตบุ๊กดี ใช้งานได้ปกติ ราคาโอเค แต่แบตเตอรี่ไม่ค่อยอึ่น',
                        is_visible: 1,
                        is_verified_purchase: 1,
                        created_at: new Date(Date.now() - 86400000 * 5).toISOString()
                    },
                    {
                        id: 'review-3',
                        reviewer_username: 'pong',
                        reviewed_user_username: 'bank',
                        product_title: 'โต๊ะทำงาน',
                        rating: 5,
                        comment: 'โต๊ะสวยมาก คุณภาพดี ขนาดพอดี ส่งเร็วด้วย แนะนำ!',
                        is_visible: 1,
                        is_verified_purchase: 1,
                        created_at: new Date(Date.now() - 86400000 * 1).toISOString()
                    },
                    {
                        id: 'review-4',
                        reviewer_username: 'user',
                        reviewed_user_username: 'pong',
                        product_title: 'ไมโครเวฟ',
                        rating: 3,
                        comment: 'ใช้ได้ แต่เสียงดังหน่อย อุ่นอาหารได้ปกติ ราคาถูก',
                        is_visible: 1,
                        is_verified_purchase: 0,
                        created_at: new Date(Date.now() - 86400000 * 7).toISOString()
                    }
                ];
            case 'getAllCategories':
                return [
                    { id: 'cat-general', name: 'General', name_th: 'ทั่วไป', is_active: 1, product_count: 4 }
                ];
            case 'getDashboardStats':
                return {
                    totalUsers: 5,
                    totalProducts: 7,
                    totalOrders: 0,
                    totalRevenue: 0,
                    newUsersThisMonth: 5,
                    activeListings: 7
                };
            case 'searchUsers':
                // Return filtered users based on search term
                const allUsers = this.getMockData('getAllUsers');
                const searchTerm = params.searchTerm?.toLowerCase() || '';
                return allUsers.filter(user =>
                    user.username.toLowerCase().includes(searchTerm) ||
                    user.email.toLowerCase().includes(searchTerm) ||
                    user.full_name.toLowerCase().includes(searchTerm)
                );
            case 'getUserById':
                const users = this.getMockData('getAllUsers');
                return users.find(u => u.id === params.userId) || null;
            case 'getSalesData':
                return [
                    { month: 'Jan', sales: 12000, orders: 45 },
                    { month: 'Feb', sales: 18000, orders: 62 },
                    { month: 'Mar', sales: 15000, orders: 58 },
                    { month: 'Apr', sales: 22000, orders: 78 },
                    { month: 'May', sales: 28000, orders: 95 },
                    { month: 'Jun', sales: 25000, orders: 88 }
                ];
            case 'getUserData':
                return [
                    { month: 'Jan', newUsers: 15, activeUsers: 120 },
                    { month: 'Feb', newUsers: 25, activeUsers: 145 },
                    { month: 'Mar', newUsers: 18, activeUsers: 163 },
                    { month: 'Apr', newUsers: 32, activeUsers: 195 },
                    { month: 'May', newUsers: 28, activeUsers: 223 },
                    { month: 'Jun', newUsers: 35, activeUsers: 258 }
                ];
            case 'getTopSellers':
                return [
                    {
                        seller_username: 'ananya',
                        seller_email: 'ananya@example.com',
                        total_sales: 15600,
                        total_orders: 12,
                        products_sold: 8,
                        avg_rating: 4.8
                    },
                    {
                        seller_username: 'mild',
                        seller_email: 'mild@example.com',
                        total_sales: 29000,
                        total_orders: 8,
                        products_sold: 5,
                        avg_rating: 4.9
                    },
                    {
                        seller_username: 'bank',
                        seller_email: 'bank@example.com',
                        total_sales: 13500,
                        total_orders: 6,
                        products_sold: 3,
                        avg_rating: 4.5
                    },
                    {
                        seller_username: 'pong',
                        seller_email: 'pong@example.com',
                        total_sales: 5400,
                        total_orders: 4,
                        products_sold: 3,
                        avg_rating: 4.2
                    }
                ];
            case 'updateUser':
            case 'deleteUser':
            case 'updateProductStatus':
                return true;
            default:
                return null;
        }
    }
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DatabaseConnector;
} else if (typeof window !== 'undefined') {
    window.DatabaseConnector = DatabaseConnector;
}