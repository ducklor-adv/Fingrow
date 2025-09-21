// API Client for connecting to real database
class ApiClient {
    constructor(baseUrl = 'http://localhost:3001/api') {
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

    // Get products - placeholder for now
    async getProducts(page = 1, limit = 50) {
        // For now, return mock data since we haven't implemented products API yet
        return {
            success: true,
            data: [
                {
                    id: 1,
                    title: 'Sample Product',
                    description: 'This is a sample product',
                    price_local: 100,
                    status: 'active',
                    seller_username: 'test'
                }
            ],
            total: 1
        };
    }
}