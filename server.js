import express from 'express';
import cors from 'cors';
import path from 'path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Error handling middleware for JSON parsing
app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
        console.error('[API] JSON Syntax Error on', req.method, req.url, ':', error.message);
        console.error('[API] Request headers:', req.headers);
        return res.status(400).json({
            success: false,
            message: 'Invalid JSON in request body',
            error: error.message
        });
    }
    next();
});

// Initialize database
const dbPath = path.join(__dirname, 'data', 'fingrow.db');
let db = null;

try {
    db = new Database(dbPath);

    // Disable foreign key constraints globally for this connection
    db.exec('PRAGMA foreign_keys = OFF');

    console.log('✅ Database connected:', dbPath);
} catch (error) {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
}

// Helper function to generate referral code
function generateReferralCode(username) {
    const cleanUsername = username.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const randomSuffix = Math.random().toString(36).substr(2, 3).toUpperCase();
    return `${cleanUsername}${randomSuffix}`;
}

// Helper function to generate new format User ID: [ปีค.ศ 2 หลัก][AAA][0000]
function generateUserId() {
    const currentYear = new Date().getFullYear();
    const yearSuffix = currentYear.toString().slice(-2); // เอา 2 หลักท้าย เช่น 2025 -> 25

    // หา User ID ล่าสุดในปีนี้
    const latestUser = db.prepare(`
        SELECT id FROM users
        WHERE id LIKE '${yearSuffix}%'
        ORDER BY id DESC
        LIMIT 1
    `).get();

    let nextSequence = 'AAA0000'; // เริ่มต้น

    if (latestUser) {
        const currentId = latestUser.id;
        const sequence = currentId.substring(2); // เอาส่วนหลัง yearSuffix

        // แยก letters และ numbers
        const letters = sequence.substring(0, 3);
        const numbers = parseInt(sequence.substring(3));

        if (numbers < 9999) {
            // เพิ่มตัวเลข
            const newNumbers = (numbers + 1).toString().padStart(4, '0');
            nextSequence = letters + newNumbers;
        } else {
            // เพิ่มตัวอักษร และ reset ตัวเลข
            const newLetters = incrementLetters(letters);
            nextSequence = newLetters + '0000';
        }
    }

    return yearSuffix + nextSequence;
}

// Helper function to increment letters (AAA -> AAB -> ... -> ZZZ)
function incrementLetters(letters) {
    let result = letters.split('');
    let carry = true;

    for (let i = result.length - 1; i >= 0 && carry; i--) {
        if (result[i] === 'Z') {
            result[i] = 'A';
        } else {
            result[i] = String.fromCharCode(result[i].charCodeAt(0) + 1);
            carry = false;
        }
    }

    return result.join('');
}

// API Routes

// Get all users
app.get('/api/users', async (req, res) => {
    try {
        const query = `
            SELECT
                id, username, email, full_name, phone,
                referral_code, referrer_id as referred_by,
                created_at, last_login, is_active, avatar_url as profile_image,
                trust_score as seller_rating, total_sales, location as province
            FROM users
            ORDER BY created_at DESC
        `;

        const users = db.prepare(query).all();

        res.json({
            success: true,
            data: users,
            total: users.length
        });
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get users',
            error: error.message
        });
    }
});

// Register new user
app.post('/api/register', async (req, res) => {
    try {
        const userData = req.body;

        // Check if username exists
        const existingUsername = db.prepare('SELECT id FROM users WHERE username = ?').get(userData.username);
        if (existingUsername) {
            return res.json({ success: false, message: 'Username already exists' });
        }

        // Check if email exists
        const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(userData.email);
        if (existingEmail) {
            return res.json({ success: false, message: 'Email already exists' });
        }

        // Generate referral code
        const referralCode = generateReferralCode(userData.username);

        // Check if referred_by code exists
        let referredBy = null;
        if (userData.referral_code) {
            const referrer = db.prepare('SELECT id FROM users WHERE referral_code = ?').get(userData.referral_code);
            if (referrer) {
                referredBy = referrer.id;
            }
        }

        // Insert new user
        const insertUser = db.prepare(`
            INSERT INTO users (
                id, username, email, full_name, phone,
                referral_code, referrer_id,
                created_at, last_login, location
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const userId = generateUserId();
        const result = insertUser.run(
            userId,
            userData.username,
            userData.email,
            userData.full_name,
            userData.phone || '',
            referralCode,
            referredBy,
            new Date().toISOString(),
            new Date().toISOString(),
            userData.province || ''
        );

        // Get the created user
        const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

        res.json({
            success: true,
            user: newUser
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        });
    }
});

// Login user
app.post('/api/login', async (req, res) => {
    try {
        console.log('[API] Raw request body:', req.body);
        const { username, password } = req.body;
        console.log('[API] Login attempt:', { username, hasPassword: !!password });

        if (!username) {
            return res.status(400).json({
                success: false,
                message: 'Username is required'
            });
        }

        // Find user by username or email
        const user = db.prepare(`
            SELECT * FROM users
            WHERE (LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)) AND is_active = 1
        `).get(username, username);

        if (!user) {
            console.log('[API] Login failed - user not found');
            return res.json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if user has password_hash
        if (!user.password_hash) {
            console.log('[API] Login failed - no password set for user:', user.username);
            return res.json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Verify password
        const passwordValid = bcrypt.compareSync(password, user.password_hash);

        if (!passwordValid) {
            console.log('[API] Login failed - invalid password for user:', user.username);
            return res.json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Update last login
        db.prepare('UPDATE users SET last_login = ? WHERE id = ?')
          .run(new Date().toISOString(), user.id);

        console.log('[API] Login successful for:', user.username);

        // Remove password_hash from response for security
        const { password_hash, ...userResponse } = user;

        res.json({
            success: true,
            user: userResponse
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: error.message
        });
    }
});

// Update user
app.put('/api/users/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const updates = req.body;

        // Build dynamic update query
        const updateFields = Object.keys(updates);
        const setClause = updateFields.map(field => `${field} = ?`).join(', ');
        const values = Object.values(updates);

        const result = db.prepare(`UPDATE users SET ${setClause} WHERE id = ?`).run(...values, userId);

        if (result.changes > 0) {
            // Get updated user
            const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
            res.json({
                success: true,
                user: updatedUser
            });
        } else {
            res.json({ success: false, message: 'User not found or no changes made' });
        }
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user',
            error: error.message
        });
    }
});

// Delete user
app.delete('/api/users/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        // Get user info before deletion
        const user = db.prepare('SELECT username FROM users WHERE id = ?').get(userId);
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }

        // Delete user (foreign keys are disabled globally)
        const result = db.prepare('DELETE FROM users WHERE id = ?').run(userId);

        if (result.changes > 0) {
            res.json({
                success: true,
                deletedUser: { username: user.username },
                relatedData: { orders: 0, products: 0 }
            });
        } else {
            res.json({ success: false, message: 'Failed to delete user' });
        }
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user',
            error: error.message
        });
    }
});

// Get all products
app.get('/api/products', async (req, res) => {
    try {
        // Get products from database with seller information
        const query = `
            SELECT
                p.*,
                u.username as seller_username
            FROM products p
            LEFT JOIN users u ON p.seller_id = u.id
            ORDER BY p.created_at DESC
        `;

        const products = db.prepare(query).all();

        // Transform the data to match the expected format
        const formattedProducts = products.map(product => ({
            id: product.id,
            title: product.title,
            description: product.description,
            price: product.price_local,
            category: product.category_id || 'general',
            status: product.status,
            seller_id: product.seller_id,
            seller: { username: product.seller_username || 'unknown' },
            views: product.view_count || 0,
            condition: product.condition,
            brand: product.brand,
            location: product.location,
            currency: product.currency_code || 'THB',
            images: product.images ? JSON.parse(product.images) : [],
            created_at: product.created_at,
            updated_at: product.updated_at
        }));

        res.json({
            success: true,
            data: formattedProducts,
            total: formattedProducts.length
        });
    } catch (error) {
        console.error('Error getting products:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get products',
            error: error.message
        });
    }
});

// Create new product
app.post('/api/products', async (req, res) => {
    try {
        const productData = req.body;

        // Generate unique product ID
        const productId = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Insert new product
        const insertProduct = db.prepare(`
            INSERT INTO products (
                id, title, description, price_local, seller_id, category_id,
                condition, brand, location, currency_code, status, images,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = insertProduct.run(
            productId,
            productData.title,
            productData.description,
            productData.price_local,
            productData.seller_id,
            productData.category_id || 'cat-general',
            productData.condition || 'ดี',
            productData.brand || null,
            JSON.stringify(productData.location || { city: 'Bangkok', district: 'Central' }),
            productData.currency_code || 'THB',
            productData.status || 'active',
            JSON.stringify(productData.images || []),
            new Date().toISOString(),
            new Date().toISOString()
        );

        // Get the created product
        const newProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);

        res.json({
            success: true,
            product: newProduct,
            message: 'Product created successfully'
        });

    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create product',
            error: error.message
        });
    }
});

// Update product status
app.put('/api/products/:productId', async (req, res) => {
    try {
        const productId = req.params.productId;
        const { status, admin_notes } = req.body;

        // Update product status
        const result = db.prepare(`
            UPDATE products
            SET status = ?, admin_notes = ?, updated_at = ?
            WHERE id = ?
        `).run(status, admin_notes || '', new Date().toISOString(), productId);

        if (result.changes > 0) {
            res.json({
                success: true,
                message: 'Product status updated successfully'
            });
        } else {
            res.json({ success: false, message: 'Product not found' });
        }
    } catch (error) {
        console.error('Update product status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update product status',
            error: error.message
        });
    }
});

// Delete product
app.delete('/api/products/:productId', async (req, res) => {
    try {
        const productId = req.params.productId;

        // Get product info before deletion
        const product = db.prepare('SELECT title FROM products WHERE id = ?').get(productId);
        if (!product) {
            return res.json({ success: false, message: 'Product not found' });
        }

        // Delete product (foreign keys are disabled globally)
        const result = db.prepare('DELETE FROM products WHERE id = ?').run(productId);

        if (result.changes > 0) {
            console.log('Product deleted:', productId, product.title);
            res.json({
                success: true,
                deletedProduct: { id: productId, title: product.title },
                message: 'Product deleted successfully'
            });
        } else {
            res.json({ success: false, message: 'Failed to delete product' });
        }
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete product',
            error: error.message
        });
    }
});

// Get all orders
app.get('/api/orders', async (req, res) => {
    try {
        const query = `
            SELECT
                o.*,
                u.username as buyer_username,
                p.title as product_title
            FROM orders o
            LEFT JOIN users u ON o.buyer_id = u.id
            LEFT JOIN products p ON o.product_id = p.id
            ORDER BY o.created_at DESC
        `;

        const orders = db.prepare(query).all();

        res.json({
            success: true,
            data: orders,
            total: orders.length
        });
    } catch (error) {
        console.error('Error getting orders:', error);
        res.json({
            success: true,
            data: [], // Return empty array as fallback
            total: 0
        });
    }
});

// Get all categories
app.get('/api/categories', async (req, res) => {
    try {
        const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();

        res.json({
            success: true,
            data: categories,
            total: categories.length
        });
    } catch (error) {
        console.error('Error getting categories:', error);
        res.json({
            success: true,
            data: [{ id: 'cat-general', name: 'General', name_th: 'ทั่วไป', is_active: 1, product_count: 0 }],
            total: 1
        });
    }
});

// Get all reviews
app.get('/api/reviews', async (req, res) => {
    try {
        const query = `
            SELECT
                r.*,
                reviewer.username as reviewer_username,
                reviewed.username as reviewed_user_username,
                p.title as product_title
            FROM reviews r
            LEFT JOIN users reviewer ON r.reviewer_id = reviewer.id
            LEFT JOIN users reviewed ON r.reviewed_user_id = reviewed.id
            LEFT JOIN products p ON r.product_id = p.id
            ORDER BY r.created_at DESC
        `;

        const reviews = db.prepare(query).all();

        res.json({
            success: true,
            data: reviews,
            total: reviews.length
        });
    } catch (error) {
        console.error('Error getting reviews:', error);
        res.json({
            success: true,
            data: [],
            total: 0
        });
    }
});

// Dashboard stats
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
        const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
        const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count || 0;
        const totalRevenue = db.prepare('SELECT COALESCE(SUM(total_amount), 0) as sum FROM orders WHERE status = "completed"').get().sum || 0;

        const stats = {
            totalUsers,
            totalProducts,
            totalOrders,
            totalRevenue,
            newUsersThisMonth: totalUsers, // Simplified for now
            activeListings: totalProducts
        };

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        res.json({
            success: true,
            data: {
                totalUsers: 0,
                totalProducts: 0,
                totalOrders: 0,
                totalRevenue: 0,
                newUsersThisMonth: 0,
                activeListings: 0
            }
        });
    }
});

// Dashboard sales data
app.get('/api/dashboard/sales', async (req, res) => {
    try {
        // Mock sales data for chart
        const salesData = [
            { month: 'Jan', sales: 12000, orders: 45 },
            { month: 'Feb', sales: 18000, orders: 62 },
            { month: 'Mar', sales: 15000, orders: 58 },
            { month: 'Apr', sales: 22000, orders: 78 },
            { month: 'May', sales: 28000, orders: 95 },
            { month: 'Jun', sales: 25000, orders: 88 }
        ];

        res.json({
            success: true,
            data: salesData
        });
    } catch (error) {
        console.error('Error getting sales data:', error);
        res.json({
            success: true,
            data: []
        });
    }
});

// Dashboard user data
app.get('/api/dashboard/users', async (req, res) => {
    try {
        // Mock user growth data for chart
        const userData = [
            { month: 'Jan', newUsers: 15, activeUsers: 120 },
            { month: 'Feb', newUsers: 25, activeUsers: 145 },
            { month: 'Mar', newUsers: 18, activeUsers: 163 },
            { month: 'Apr', newUsers: 32, activeUsers: 195 },
            { month: 'May', newUsers: 28, activeUsers: 223 },
            { month: 'Jun', newUsers: 35, activeUsers: 258 }
        ];

        res.json({
            success: true,
            data: userData
        });
    } catch (error) {
        console.error('Error getting user data:', error);
        res.json({
            success: true,
            data: []
        });
    }
});

// Top sellers
app.get('/api/dashboard/topsellers', async (req, res) => {
    try {
        const query = `
            SELECT
                u.username as seller_username,
                u.email as seller_email,
                COALESCE(COUNT(p.id), 0) as products_sold,
                COALESCE(SUM(o.total_amount), 0) as total_sales,
                COALESCE(COUNT(o.id), 0) as total_orders,
                COALESCE(AVG(r.rating), 0) as avg_rating
            FROM users u
            LEFT JOIN products p ON u.id = p.seller_id
            LEFT JOIN orders o ON p.id = o.product_id AND o.status = 'completed'
            LEFT JOIN reviews r ON u.id = r.reviewed_user_id
            GROUP BY u.id, u.username, u.email
            HAVING total_sales > 0
            ORDER BY total_sales DESC
            LIMIT 10
        `;

        const topSellers = db.prepare(query).all();

        res.json({
            success: true,
            data: topSellers
        });
    } catch (error) {
        console.error('Error getting top sellers:', error);
        res.json({
            success: true,
            data: []
        });
    }
});

// Get single user by ID
app.get('/api/users/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

        if (user) {
            res.json({
                success: true,
                data: user
            });
        } else {
            res.json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        console.error('Error getting user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user',
            error: error.message
        });
    }
});

// Search users
app.get('/api/users', async (req, res) => {
    try {
        const { search } = req.query;

        let query = `
            SELECT
                id, username, email, full_name, phone,
                referral_code, referrer_id as referred_by,
                created_at, last_login, is_active, avatar_url as profile_image,
                trust_score as seller_rating, total_sales, location as province
            FROM users
        `;

        let params = [];

        if (search) {
            query += ' WHERE username LIKE ? OR email LIKE ? OR full_name LIKE ?';
            params = [`%${search}%`, `%${search}%`, `%${search}%`];
        }

        query += ' ORDER BY created_at DESC';

        const users = db.prepare(query).all(...params);

        res.json({
            success: true,
            data: users,
            total: users.length
        });
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search users',
            error: error.message
        });
    }
});

// Serve static files
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/mobile', express.static(path.join(__dirname, 'mobile')));
app.use('/', express.static(__dirname));

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📱 Mobile app: http://localhost:${PORT}/mobile/`);
    console.log(`🔧 Admin panel: http://localhost:${PORT}/admin/`);
});