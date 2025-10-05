// Smart API Client that auto-detects environment
// Falls back to production URL by default

class SmartApiClient {
    constructor() {
        this.baseUrl = this.getApiUrl();
        console.log(`🌐 API Client initialized with: ${this.baseUrl}`);
    }

    getApiUrl() {
        // Auto-detect environment
        const hostname = window.location.hostname;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            // Development environment
            return 'http://localhost:5050/api';
        } else {
            // Production environment (Render.com or any other domain)
            return 'https://fingrow-g0db.onrender.com/api';
        }
    }

    async request(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API request failed to ${this.baseUrl}${endpoint}:`, error);
            throw error;
        }
    }

    // User registration
    async register(userData) {
        return await this.request('/users/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    // User login
    async login(credentials) {
        return await this.request('/users/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    }

    // Get all users
    async getAllUsers() {
        return await this.request('/users');
    }

    // Delete user
    async deleteUser(userId) {
        return await this.request(`/users/${userId}`, {
            method: 'DELETE'
        });
    }

    // Update user
    async updateUser(userId, userData) {
        return await this.request(`/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    }

    // Get products from API
    async getProducts(page = 1, limit = 50) {
        return await this.request('/products');
    }

    // Get users from API and cache them
    async getUsers() {
        if (!this.cachedUsers) {
            const response = await this.request('/users');
            this.cachedUsers = response.users || response.data || [];
        }
        return this.cachedUsers;
    }

    // Initialize cached data for mobile app compatibility
    async initialize() {
        try {
            // Test API connectivity first
            const healthResponse = await fetch(`${this.baseUrl.replace('/api', '')}/api/health`);
            
            if (healthResponse.ok) {
                console.log('✅ API server is healthy');
            } else {
                console.warn('⚠️ API server health check failed');
            }

            // Cache users for mobile app compatibility
            this.users = await this.getUsers();
            console.log('✅ SmartApiClient initialized with', this.users.length, 'users');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize SmartApiClient:', error);
            console.error('🔧 Check if API server is running at:', this.baseUrl);
            this.users = []; // fallback to empty array
            return false;
        }
    }

    // Health check method
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseUrl.replace('/api', '')}/api/health`);
            return await response.json();
        } catch (error) {
            console.error('Health check failed:', error);
            return { success: false, error: error.message };
        }
    }
}