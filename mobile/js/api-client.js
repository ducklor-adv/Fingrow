// API Client for connecting to real database
class ApiClient {
    constructor(baseUrl = 'https://fingrow-g0db.onrender.com/api') {
        this.baseUrl = baseUrl;
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
            console.error(`API request failed:`, error);
            throw error;
        }
    }

    // User registration
    async register(userData) {
        return await this.request('/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    // User login
    async login(credentials) {
        return await this.request('/login', {
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
            this.cachedUsers = response.data || [];
        }
        return this.cachedUsers;
    }

    // Initialize cached data for mobile app compatibility
    async initialize() {
        try {
            // Cache users for mobile app compatibility
            this.users = await this.getUsers();
            console.log('✅ ApiClient initialized with', this.users.length, 'users');
        } catch (error) {
            console.error('❌ Failed to initialize ApiClient:', error);
            this.users = []; // fallback to empty array
        }
    }
}