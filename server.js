import express from 'express';
import cors from 'cors';
import path from 'path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadsDir = path.join(__dirname, 'uploads', 'profiles');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 15);
        const fileExtension = path.extname(file.originalname).toLowerCase();
        const uniqueFileName = `profile_${req.body.userId || 'user'}_${timestamp}_${randomId}${fileExtension}`;
        cb(null, uniqueFileName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Serve static files for uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// Helper function to generate invite code
function generateInviteCode(username) {
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
                invite_code, invitor_id as invited_by,
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

        // Hash password
        let passwordHash = null;
        if (userData.password) {
            passwordHash = await bcrypt.hash(userData.password, 10);
        }

        // Generate invite code
        const inviteCode = generateInviteCode(userData.username);

        // Check if invite code exists
        let invitedBy = null;
        if (userData.invite_code) {
            const invitor = db.prepare('SELECT id FROM users WHERE invite_code = ?').get(userData.invite_code);
            if (invitor) {
                invitedBy = invitor.id;
            }
        }

        // Insert new user
        const insertUser = db.prepare(`
            INSERT INTO users (
                id, username, email, full_name, phone,
                password_hash, invite_code, invitor_id,
                created_at, last_login, location
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const userId = generateUserId();
        const result = insertUser.run(
            userId,
            userData.username,
            userData.email,
            userData.full_name,
            userData.phone || '',
            passwordHash,
            inviteCode,
            invitedBy,
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

        // Verify password - handle both hashed and plain text passwords
        let passwordValid = false;

        // First try bcrypt comparison (for properly hashed passwords)
        try {
            console.log('[API] Trying bcrypt comparison...');
            passwordValid = bcrypt.compareSync(password, user.password_hash);
            console.log('[API] Bcrypt result:', passwordValid);
        } catch (error) {
            console.log('[API] Bcrypt threw error:', error.message);
        }

        // If bcrypt didn't work, try plain text comparison
        if (!passwordValid) {
            console.log('[API] Bcrypt failed, checking for plain text password');
            passwordValid = (password === user.password_hash);
            console.log('[API] Plain text comparison result:', passwordValid);

            // If it's a plain text match, hash it and update the database
            if (passwordValid) {
                console.log('[API] Plain text password detected, hashing and updating...');
                const hashedPassword = bcrypt.hashSync(password, 10);
                db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
                  .run(hashedPassword, user.id);
                console.log('[API] Password hashed and updated for user:', user.username);
            }
        }

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

        console.log('PUT /api/users/:userId called');
        console.log('User ID:', userId);
        console.log('Request body:', JSON.stringify(updates, null, 2));

        // Filter out fields that don't exist in the current database schema
        const validFields = ['id', 'world_id', 'username', 'email', 'phone', 'full_name', 'avatar_url', 'profile_image_filename', 'bio', 'location', 'preferred_currency', 'language', 'is_verified', 'verification_level', 'trust_score', 'total_sales', 'total_purchases', 'invite_code', 'invitor_id', 'total_invites', 'active_invites', 'is_active', 'is_suspended', 'last_login', 'created_at', 'updated_at', 'password_hash', 'address_number', 'address_street', 'address_district', 'address_province', 'address_postal_code'];

        // Field mapping for compatibility between old and new field names
        const fieldMapping = {
            'profile_image': 'avatar_url',
            'password': 'password_hash',
            'user_type': 'verification_level',
            'shipping_address': 'location'
        };

        const filteredUpdates = {};

        // Handle address fields specially - save to addresses table AND location field
        if (updates.address_number || updates.address_street || updates.address_district ||
            updates.address_province || updates.address_postal_code) {
            const addressObj = {
                number: updates.address_number || '',
                street: updates.address_street || '',
                district: updates.address_district || '',
                province: updates.address_province || '',
                postal_code: updates.address_postal_code || ''
            };

            // Still update location field for backward compatibility
            filteredUpdates.location = JSON.stringify(addressObj);

            // Also save to addresses table
            try {
                // Check if user already has a default address
                const existingAddress = db.prepare('SELECT id FROM addresses WHERE user_id = ? AND is_default = 1').get(userId);

                if (existingAddress) {
                    // Update existing default address
                    db.prepare(`
                        UPDATE addresses
                        SET address_line1 = ?,
                            city = ?,
                            state_province = ?,
                            postal_code = ?,
                            updated_at = ?
                        WHERE id = ?
                    `).run(
                        `${updates.address_number || ''} ${updates.address_street || ''}`.trim(),
                        updates.address_district || '',
                        updates.address_province || '',
                        updates.address_postal_code || '',
                        new Date().toISOString(),
                        existingAddress.id
                    );
                    console.log('Updated existing address in addresses table');
                } else {
                    // Create new default address
                    const addressId = 'ADDR_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    db.prepare(`
                        INSERT INTO addresses (id, user_id, label, recipient_name, phone, address_line1, city, state_province, postal_code, country, is_default, is_active, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `).run(
                        addressId,
                        userId,
                        'หลัก', // Default label
                        updates.full_name || 'ผู้ใช้',
                        updates.phone || '',
                        `${updates.address_number || ''} ${updates.address_street || ''}`.trim(),
                        updates.address_district || '',
                        updates.address_province || '',
                        updates.address_postal_code || '',
                        'ไทย',
                        1, // is_default
                        1, // is_active
                        new Date().toISOString(),
                        new Date().toISOString()
                    );
                    console.log('Created new address in addresses table:', addressId);
                }
            } catch (addressError) {
                console.error('Error saving to addresses table:', addressError);
                // Continue with user update even if address table update fails
            }
        }

        Object.keys(updates).forEach(key => {
            // Skip address fields as they're handled above
            if (['address_number', 'address_street', 'address_district', 'address_province', 'address_postal_code'].includes(key)) {
                return;
            }

            // Map old field names to new ones
            const mappedKey = fieldMapping[key] || key;

            if (validFields.includes(mappedKey)) {
                filteredUpdates[mappedKey] = updates[key];
            }
        });

        // Build dynamic update query
        const updateFields = Object.keys(filteredUpdates);
        if (updateFields.length === 0) {
            return res.json({ success: true, message: 'No valid fields to update' });
        }

        console.log('Update fields:', updateFields);
        console.log('Filtered updates:', filteredUpdates);

        const setClause = updateFields.map(field => `${field} = ?`).join(', ');
        const values = Object.values(filteredUpdates);

        const result = db.prepare(`UPDATE users SET ${setClause} WHERE id = ?`).run(...values, userId);

        if (result.changes > 0) {
            // Get updated user with consistent field mapping
            const updatedUser = db.prepare(`
                SELECT
                    id, username, email, full_name, phone,
                    invite_code, invitor_id as invited_by,
                    created_at, last_login, is_active, avatar_url as profile_image,
                    trust_score as seller_rating, total_sales, location as province
                FROM users
                WHERE id = ?
            `).get(userId);
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
                fin_fee_percent, amount_fee,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            productData.fin_fee_percent || 2.0,
            productData.amount_fee || 0,
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
        // Since orders table doesn't exist yet, use placeholder values
        const totalOrders = 0;
        const totalRevenue = 0;

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
        // Since orders and reviews tables don't exist yet, return simplified top sellers
        const query = `
            SELECT
                u.username as seller_username,
                u.email as seller_email,
                COALESCE(COUNT(p.id), 0) as products_sold,
                0 as total_sales,
                0 as total_orders,
                0 as avg_rating
            FROM users u
            LEFT JOIN products p ON u.id = p.seller_id
            GROUP BY u.id, u.username, u.email
            HAVING products_sold > 0
            ORDER BY products_sold DESC
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
            // Try to get default address from addresses table
            try {
                const defaultAddress = db.prepare(`
                    SELECT * FROM addresses
                    WHERE user_id = ? AND is_default = 1
                    ORDER BY updated_at DESC
                    LIMIT 1
                `).get(userId);

                if (defaultAddress) {
                    // Parse address_line1 to extract number and street if structured fields are empty
                    const addressLine1 = defaultAddress.address_line1 || '';
                    const parts = addressLine1.split(' ');

                    user.address_number = parts[0] || '';
                    user.address_street = parts.slice(1).join(' ') || '';
                    user.address_district = defaultAddress.city || '';
                    user.address_province = defaultAddress.state_province || '';
                    user.address_postal_code = defaultAddress.postal_code || '';

                    // Also keep the full formatted address for backward compatibility
                    user.shipping_address = `${defaultAddress.address_line1} ${defaultAddress.city} ${defaultAddress.state_province} ${defaultAddress.postal_code}`.trim();
                }
            } catch (addressError) {
                console.error('Error fetching address:', addressError);
                // Continue without address data
            }

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
                invite_code, invitor_id as invited_by,
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

// Profile image upload endpoint
app.post('/api/upload-profile-image', upload.single('profileImage'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const userId = req.body.userId;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // Generate the relative path for database storage
        const relativePath = `/uploads/profile-images/${req.file.filename}`;

        // Update user's profile image path in database
        const updateStmt = db.prepare(`
            UPDATE users
            SET avatar_url = ?, profile_image_filename = ?
            WHERE id = ?
        `);

        const result = updateStmt.run(relativePath, req.file.filename, userId);

        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'Profile image uploaded successfully',
            data: {
                filename: req.file.filename,
                path: relativePath,
                originalName: req.file.originalname
            }
        });

    } catch (error) {
        console.error('Error uploading profile image:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload profile image',
            error: error.message
        });
    }
});

// Serve static files
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/mobile', express.static(path.join(__dirname, 'mobile')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/', express.static(__dirname));

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📱 Mobile app: http://localhost:${PORT}/mobile/`);
    console.log(`🔧 Admin panel: http://localhost:${PORT}/admin/`);
});