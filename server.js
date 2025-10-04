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

// Configure multer for profile image uploads
const profileStorage = multer.diskStorage({
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

// Configure multer for product image uploads
const productStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadsDir = path.join(__dirname, 'uploads', 'products');
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
        const uniqueFileName = `product_${timestamp}_${randomId}${fileExtension}`;
        cb(null, uniqueFileName);
    }
});

const upload = multer({
    storage: profileStorage,
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

const uploadProduct = multer({
    storage: productStorage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit for product images
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

    // Run migrations
    try {
        // Add parent_id column if it doesn't exist
        const columns = db.prepare("PRAGMA table_info(users)").all();
        const hasParentId = columns.some(col => col.name === 'parent_id');

        if (!hasParentId) {
            console.log('🔄 Running migration: Adding parent_id column...');
            db.exec('ALTER TABLE users ADD COLUMN parent_id TEXT');
            console.log('✅ Migration complete: parent_id added');
        }

        // Create indices
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_users_parent_id ON users(parent_id);
            CREATE INDEX IF NOT EXISTS idx_users_invitor_id ON users(invitor_id);
            CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
            CREATE INDEX IF NOT EXISTS idx_earnings_user_id ON earnings(user_id);
            CREATE INDEX IF NOT EXISTS idx_earnings_created_at ON earnings(created_at);
        `);

        // Backfill parent_id for existing users
        const needsBackfill = db.prepare('SELECT COUNT(*) as count FROM users WHERE parent_id IS NULL AND invitor_id IS NOT NULL').get();
        if (needsBackfill.count > 0) {
            console.log(`🔄 Backfilling parent_id for ${needsBackfill.count} users...`);
            db.exec('UPDATE users SET parent_id = invitor_id WHERE parent_id IS NULL AND invitor_id IS NOT NULL');
            console.log('✅ Backfill complete');
        }

        // Ensure root user exists (for NIC registration)
        const rootUser = db.prepare('SELECT id FROM users WHERE invitor_id IS NULL LIMIT 1').get();
        if (!rootUser) {
            console.log('🔄 Creating root user (Anatta999)...');
            const rootId = '25AAA0000';
            const rootInviteCode = 'ANATTA999ROOT';
            db.prepare(`
                INSERT INTO users (id, username, email, full_name, invite_code, created_at, last_login)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
                rootId,
                'Anatta999',
                'root@fingrow.app',
                'Anatta Boonnuam',
                rootInviteCode,
                new Date().toISOString(),
                new Date().toISOString()
            );
            console.log(`✅ Root user created: ${rootId}`);
        }

    } catch (migrationError) {
        console.error('⚠️  Migration warning:', migrationError.message);
    }

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

/**
 * ACF (Auto-Connect Follower) Allocation Logic
 * Finds the best parent for a new user within the invitor's network
 * Rules:
 * - Max 5 direct children per user
 * - Max 7 levels depth
 * - Layer-first (closest to invitor) → Earliest-first → Lowest childCount → Lowest runNumber
 * - If invitor's direct slot is full, search in invitor's child subtree only
 */
function allocateParent(invitorId) {
    const MAX_CHILDREN = 5;
    const MAX_DEPTH = 7;

    // Get invitor
    const invitor = db.prepare('SELECT id, parent_id FROM users WHERE id = ?').get(invitorId);
    if (!invitor) {
        throw new Error('Invitor not found');
    }

    // Calculate invitor's current depth
    let invitorDepth = 0;
    let currentId = invitor.parent_id;
    while (currentId && invitorDepth < MAX_DEPTH) {
        invitorDepth++;
        const parent = db.prepare('SELECT parent_id FROM users WHERE id = ?').get(currentId);
        if (!parent) break;
        currentId = parent.parent_id;
    }

    // Check if we can add to invitor directly (FILE scope)
    const invitorChildCount = db.prepare(
        'SELECT COUNT(*) as count FROM users WHERE parent_id = ?'
    ).get(invitorId);

    if (invitorChildCount.count < MAX_CHILDREN && invitorDepth + 1 < MAX_DEPTH) {
        return {
            parentId: invitorId,
            parentLevel: invitorDepth
        };
    }

    // FILE scope is full, search NETWORK scope (invitor's child subtree)
    // Build BFS layers using parent_id edges
    const candidates = [];
    const visited = new Set([invitorId]);
    let queue = [{ id: invitorId, level: invitorDepth }];

    while (queue.length > 0 && candidates.length === 0) {
        const nextQueue = [];

        for (const node of queue) {
            // Get children of this node
            const children = db.prepare(`
                SELECT id, created_at
                FROM users
                WHERE parent_id = ?
                ORDER BY created_at ASC
            `).all(node.id);

            for (const child of children) {
                if (visited.has(child.id)) continue;
                visited.add(child.id);

                const childLevel = node.level + 1;

                // Check if this child can accept a new node
                if (childLevel + 1 < MAX_DEPTH) {
                    const childCount = db.prepare(
                        'SELECT COUNT(*) as count FROM users WHERE parent_id = ?'
                    ).get(child.id);

                    if (childCount.count < MAX_CHILDREN) {
                        candidates.push({
                            id: child.id,
                            level: childLevel,
                            created_at: child.created_at,
                            childCount: childCount.count
                        });
                    }
                }

                // Add to next layer
                if (childLevel < MAX_DEPTH) {
                    nextQueue.push({ id: child.id, level: childLevel });
                }
            }
        }

        // If we found candidates in this layer, stop (layer-first)
        if (candidates.length > 0) {
            break;
        }

        queue = nextQueue;
    }

    if (candidates.length === 0) {
        throw new Error('No available slot in network (5×7 constraint reached)');
    }

    // Sort candidates: earliest created_at → lowest childCount
    candidates.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return a.childCount - b.childCount;
    });

    const bestCandidate = candidates[0];

    return {
        parentId: bestCandidate.id,
        parentLevel: bestCandidate.level
    };
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
                u.id, u.username, u.email, u.full_name, u.phone,
                u.invite_code, u.invitor_id as invited_by,
                u.created_at, u.last_login, u.is_active, u.avatar_url as profile_image,
                u.trust_score as seller_rating, u.total_sales, u.location as province,

                -- Follower count (people who used this user's invite code)
                (SELECT COUNT(*) FROM users WHERE invitor_id = u.id) as follower_count,

                -- Purchase stats (as buyer)
                (SELECT COUNT(*) FROM orders WHERE buyer_id = u.id) as purchase_count,
                (SELECT SUM(total_amount) FROM orders WHERE buyer_id = u.id AND status = 'completed') as total_spent,

                -- Sales stats (as seller)
                (SELECT COUNT(*) FROM orders WHERE seller_id = u.id) as sales_count,
                (SELECT SUM(total_amount) FROM orders WHERE seller_id = u.id AND status = 'completed') as total_sales_amount,
                (SELECT SUM(community_fee) FROM orders WHERE seller_id = u.id AND status = 'completed') as total_fees_paid,

                -- Earnings (from referrals and sales)
                (SELECT SUM(amount_local) FROM earnings WHERE user_id = u.id) as total_earnings,

                -- Products listed
                (SELECT COUNT(*) FROM products WHERE seller_id = u.id) as products_count
            FROM users u
            ORDER BY u.created_at DESC
        `;

        const users = db.prepare(query).all();

        // Calculate network statistics for each user
        const usersWithNetwork = users.map(user => {
            try {
                // Get all network member IDs using recursive CTE
                const networkMembers = db.prepare(`
                    WITH RECURSIVE network_tree AS (
                        SELECT id, 0 as depth
                        FROM users
                        WHERE id = ?

                        UNION ALL

                        SELECT u.id, nt.depth + 1 as depth
                        FROM users u
                        INNER JOIN network_tree nt ON u.parent_id = nt.id
                        WHERE nt.depth < 7
                    )
                    SELECT id FROM network_tree
                `).all(user.id);

                const networkIds = networkMembers.map(m => m.id);
                const networkSize = networkIds.length;

                // Calculate network fees and sales
                let networkFees = 0;
                let networkSales = 0;
                let networkOrders = 0;
                let networkBreakdown = [];

                if (networkIds.length > 0) {
                    const placeholders = networkIds.map(() => '?').join(',');
                    const networkStats = db.prepare(`
                        SELECT
                            COUNT(o.id) as total_orders,
                            SUM(o.total_amount) as total_sales,
                            SUM(o.community_fee) as total_fees
                        FROM orders o
                        WHERE o.seller_id IN (${placeholders})
                        AND o.status = 'completed'
                    `).get(...networkIds);

                    networkFees = networkStats.total_fees || 0;
                    networkSales = networkStats.total_sales || 0;
                    networkOrders = networkStats.total_orders || 0;

                    // Get breakdown by member
                    networkBreakdown = db.prepare(`
                        SELECT
                            u.id,
                            u.username,
                            u.full_name,
                            COUNT(o.id) as order_count,
                            SUM(o.total_amount) as total_sales,
                            SUM(o.community_fee) as total_fees
                        FROM users u
                        LEFT JOIN orders o ON o.seller_id = u.id AND o.status = 'completed'
                        WHERE u.id IN (${placeholders})
                        GROUP BY u.id, u.username, u.full_name
                        HAVING total_fees > 0
                        ORDER BY total_fees DESC
                    `).all(...networkIds);
                }

                // Calculate loyalty fee (14% of network fees)
                const loyaltyFee = networkFees * 0.14;

                return {
                    ...user,
                    network_size: networkSize,
                    network_fees: networkFees,
                    network_sales: networkSales,
                    network_orders: networkOrders,
                    network_breakdown: networkBreakdown,
                    loyalty_fee: loyaltyFee
                };
            } catch (error) {
                console.error(`Error calculating network for user ${user.id}:`, error);
                return {
                    ...user,
                    network_size: 0,
                    network_fees: 0,
                    network_sales: 0,
                    network_orders: 0,
                    network_breakdown: [],
                    loyalty_fee: 0
                };
            }
        });

        // Format users with stats object
        const formattedUsers = usersWithNetwork.map(user => ({
            ...user,
            is_active: Boolean(user.is_active),
            follower_count: user.follower_count || 0,
            purchase_count: user.purchase_count || 0,
            total_spent: user.total_spent || 0,
            sales_count: user.sales_count || 0,
            total_sales_amount: user.total_sales_amount || 0,
            total_fees_paid: user.total_fees_paid || 0,
            total_earnings: user.total_earnings || 0,
            products_count: user.products_count || 0,
            network_size: user.network_size || 0,
            network_fees: user.network_fees || 0,
            network_sales: user.network_sales || 0,
            network_orders: user.network_orders || 0,
            network_breakdown: user.network_breakdown || [],
            loyalty_fee: user.loyalty_fee || 0,
            stats: {
                purchases: {
                    count: user.purchase_count || 0,
                    totalAmount: user.total_spent || 0
                },
                sales: {
                    count: user.sales_count || 0,
                    totalAmount: user.total_sales_amount || 0
                },
                earnings: {
                    total: user.total_earnings || 0
                },
                referrals: {
                    total: user.follower_count || 0
                },
                network: {
                    size: user.network_size || 0,
                    fees: user.network_fees || 0,
                    sales: user.network_sales || 0,
                    orders: user.network_orders || 0,
                    breakdown: user.network_breakdown || [],
                    loyaltyFee: user.loyalty_fee || 0
                }
            }
        }));

        res.json({
            success: true,
            data: formattedUsers,
            total: formattedUsers.length
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

        // Resolve invitor (BIC or NIC)
        let invitorId = null;
        let parentId = null;
        let registrationType = 'NIC'; // No Invite Code

        if (userData.invite_code && userData.invite_code.trim() !== '') {
            // BIC (By Invite Code)
            const invitor = db.prepare('SELECT id FROM users WHERE invite_code = ?').get(userData.invite_code.trim());
            if (invitor) {
                invitorId = invitor.id;
                registrationType = 'BIC';
            } else {
                return res.json({ success: false, message: 'Invalid invite code' });
            }
        }

        // If no invitor (NIC), use root user
        if (!invitorId) {
            const rootUser = db.prepare('SELECT id FROM users WHERE invitor_id IS NULL LIMIT 1').get();
            if (rootUser) {
                invitorId = rootUser.id;
            } else {
                return res.json({ success: false, message: 'System root user not found' });
            }
        }

        // ACF Allocation: find best parent
        try {
            const allocation = allocateParent(invitorId);
            parentId = allocation.parentId;

            // Validate depth constraint
            if (allocation.parentLevel + 1 >= 7) {
                return res.json({
                    success: false,
                    message: 'Network depth limit reached (max 7 levels)'
                });
            }
        } catch (allocationError) {
            return res.json({
                success: false,
                message: allocationError.message
            });
        }

        // Insert new user with ACF allocation
        const insertUser = db.prepare(`
            INSERT INTO users (
                id, username, email, full_name, phone,
                password_hash, invite_code, invitor_id, parent_id,
                created_at, last_login, location
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            invitorId,
            parentId,
            new Date().toISOString(),
            new Date().toISOString(),
            userData.province || ''
        );

        // Update invitor's total_invites count
        if (invitorId) {
            db.prepare('UPDATE users SET total_invites = COALESCE(total_invites, 0) + 1 WHERE id = ?').run(invitorId);
        }

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
            price_local: product.price_local,
            category: product.category_id || 'general',
            category_id: product.category_id,
            sub_category: product.sub_category,
            status: product.status,
            seller_id: product.seller_id,
            seller: { username: product.seller_username || 'unknown' },
            views: product.view_count || 0,
            condition: product.condition,
            brand: product.brand,
            model: product.model,
            quantity: product.quantity,
            location: product.location,
            currency: product.currency_code || 'THB',
            currency_code: product.currency_code,
            images: product.images ? JSON.parse(product.images) : [],
            fin_fee_percent: product.fin_fee_percent || 2.0,
            amount_fee: product.amount_fee || 0,
            color: product.color,
            size: product.size,
            weight: product.weight,
            shipping_options: product.shipping_options,
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
            typeof productData.location === 'string' ? productData.location : JSON.stringify(productData.location || { city: 'Bangkok', district: 'Central' }),
            productData.currency_code || 'THB',
            productData.status || 'active',
            typeof productData.images === 'string' ? productData.images : JSON.stringify(productData.images || []),
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
        const updates = req.body;

        // If only status update (admin action)
        if (updates.status && Object.keys(updates).length <= 2) {
            const result = db.prepare(`
                UPDATE products
                SET status = ?, updated_at = ?
                WHERE id = ?
            `).run(updates.status, new Date().toISOString(), productId);

            if (result.changes > 0) {
                return res.json({
                    success: true,
                    message: 'Product status updated successfully'
                });
            } else {
                return res.json({ success: false, message: 'Product not found' });
            }
        }

        // Full product update - get existing product first to preserve required fields
        const existingProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);

        if (!existingProduct) {
            return res.json({ success: false, message: 'Product not found' });
        }

        console.log('Update product request:', {
            productId,
            category_id: updates.category_id,
            sub_category: updates.sub_category,
            fin_fee_percent: updates.fin_fee_percent
        });

        const result = db.prepare(`
            UPDATE products
            SET title = ?,
                description = ?,
                price_local = ?,
                currency_code = ?,
                category_id = ?,
                sub_category = ?,
                condition = ?,
                brand = ?,
                model = ?,
                quantity = ?,
                location = ?,
                fin_fee_percent = ?,
                amount_fee = ?,
                color = ?,
                size = ?,
                weight = ?,
                images = ?,
                shipping_options = ?,
                updated_at = ?
            WHERE id = ?
        `).run(
            updates.title ?? existingProduct.title,
            updates.description ?? existingProduct.description,
            updates.price_local ?? existingProduct.price_local,
            updates.currency_code || existingProduct.currency_code || 'THB',
            updates.category_id || existingProduct.category_id || 'cat-general',
            updates.sub_category ?? existingProduct.sub_category,
            updates.condition ?? existingProduct.condition,
            updates.brand ?? existingProduct.brand,
            updates.model ?? existingProduct.model,
            updates.quantity ?? existingProduct.quantity ?? 1,
            updates.location ?? existingProduct.location,
            updates.fin_fee_percent ?? existingProduct.fin_fee_percent ?? 2.0,
            updates.amount_fee ?? existingProduct.amount_fee ?? 0,
            updates.color ?? existingProduct.color,
            updates.size ?? existingProduct.size,
            updates.weight ?? existingProduct.weight,
            updates.images ?? existingProduct.images ?? '[]',
            updates.shipping_options ?? existingProduct.shipping_options,
            new Date().toISOString(),
            productId
        );

        if (result.changes > 0) {
            const updatedProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
            res.json({
                success: true,
                product: updatedProduct,
                message: 'Product updated successfully'
            });
        } else {
            res.json({ success: false, message: 'Product not found' });
        }
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update product',
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
                buyer.username as buyer_username,
                buyer.email as buyer_email,
                seller.username as seller_username,
                seller.email as seller_email,
                (SELECT product_title FROM order_items WHERE order_id = o.id LIMIT 1) as product_title,
                (SELECT product_id FROM order_items WHERE order_id = o.id LIMIT 1) as product_id
            FROM orders o
            LEFT JOIN users buyer ON o.buyer_id = buyer.id
            LEFT JOIN users seller ON o.seller_id = seller.id
            ORDER BY o.order_date DESC, o.created_at DESC
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

// Update order status
app.put('/api/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, admin_notes } = req.body;

        const updateQuery = db.prepare(`
            UPDATE orders
            SET status = ?,
                admin_notes = COALESCE(?, admin_notes),
                updated_at = ?
            WHERE id = ?
        `);

        const result = updateQuery.run(status, admin_notes || null, new Date().toISOString(), id);

        res.json({
            success: result.changes > 0,
            message: result.changes > 0 ? 'Order status updated successfully' : 'Order not found'
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order status',
            error: error.message
        });
    }
});

// Get chat messages
app.get('/api/messages', async (req, res) => {
    try {
        const { product_id, user1, user2 } = req.query;

        if (!product_id || !user1 || !user2) {
            return res.json({
                success: true,
                data: [],
                total: 0
            });
        }

        // Find chat room
        let chatRoom = db.prepare(`
            SELECT * FROM chat_rooms
            WHERE product_id = ?
            AND ((buyer_id = ? AND seller_id = ?) OR (buyer_id = ? AND seller_id = ?))
        `).get(product_id, user1, user2, user2, user1);

        if (!chatRoom) {
            return res.json({
                success: true,
                data: [],
                total: 0
            });
        }

        // Get messages for this chat room
        const messages = db.prepare(`
            SELECT
                id,
                chat_room_id,
                sender_id,
                content as message,
                message_type as type,
                is_read,
                read_at,
                created_at
            FROM messages
            WHERE chat_room_id = ?
            ORDER BY created_at ASC
        `).all(chatRoom.id);

        res.json({
            success: true,
            data: messages,
            total: messages.length
        });
    } catch (error) {
        console.error('Error getting messages:', error);
        res.json({
            success: true,
            data: [],
            total: 0
        });
    }
});

// POST create new message
app.post('/api/messages', async (req, res) => {
    try {
        const { sender_id, receiver_id, product_id, message, type = 'text' } = req.body;

        if (!sender_id || !receiver_id || !product_id || !message) {
            return res.json({
                success: false,
                error: 'Missing required fields'
            });
        }

        // Find or create chat room
        let chatRoom = db.prepare(`
            SELECT * FROM chat_rooms
            WHERE product_id = ?
            AND ((buyer_id = ? AND seller_id = ?) OR (buyer_id = ? AND seller_id = ?))
        `).get(product_id, sender_id, receiver_id, receiver_id, sender_id);

        if (!chatRoom) {
            // Create new chat room
            const chatRoomId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

            db.prepare(`
                INSERT INTO chat_rooms (id, product_id, buyer_id, seller_id, is_active, last_message_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, 1, ?, ?, ?)
            `).run(chatRoomId, product_id, sender_id, receiver_id, now, now, now);

            chatRoom = { id: chatRoomId };
        }

        // Insert message
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const created_at = new Date().toISOString().replace('T', ' ').substring(0, 19);

        db.prepare(`
            INSERT INTO messages (id, chat_room_id, sender_id, content, message_type, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(messageId, chatRoom.id, sender_id, message, type, created_at);

        // Update chat room last_message_at
        db.prepare(`
            UPDATE chat_rooms
            SET last_message_at = ?, updated_at = ?
            WHERE id = ?
        `).run(created_at, created_at, chatRoom.id);

        res.json({
            success: true,
            data: {
                id: messageId,
                chat_room_id: chatRoom.id,
                sender_id,
                message,
                type,
                created_at
            }
        });
    } catch (error) {
        console.error('Error creating message:', error);
        res.json({
            success: false,
            error: error.message
        });
    }
});

// GET all messages for a user
app.get('/api/messages/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Get all chat rooms for this user
        const chatRooms = db.prepare(`
            SELECT * FROM chat_rooms
            WHERE buyer_id = ? OR seller_id = ?
            ORDER BY last_message_at DESC
        `).all(userId, userId);

        if (chatRooms.length === 0) {
            return res.json({
                success: true,
                data: [],
                total: 0
            });
        }

        // Get all messages from these chat rooms
        const chatRoomIds = chatRooms.map(room => room.id);
        const placeholders = chatRoomIds.map(() => '?').join(',');

        const messages = db.prepare(`
            SELECT
                id,
                chat_room_id,
                sender_id,
                content as message,
                message_type as type,
                is_read,
                read_at,
                created_at
            FROM messages
            WHERE chat_room_id IN (${placeholders})
            ORDER BY created_at ASC
        `).all(...chatRoomIds);

        // Add product_id to each message from chat_room
        const messagesWithProduct = messages.map(msg => {
            const room = chatRooms.find(r => r.id === msg.chat_room_id);
            return {
                ...msg,
                product_id: room ? room.product_id : null,
                receiver_id: msg.sender_id === userId ?
                    (room.buyer_id === userId ? room.seller_id : room.buyer_id) :
                    userId
            };
        });

        res.json({
            success: true,
            data: messagesWithProduct,
            total: messagesWithProduct.length
        });
    } catch (error) {
        console.error('Error getting user messages:', error);
        res.json({
            success: true,
            data: [],
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

// Product images upload endpoint (supports multiple images)
app.post('/api/upload-product-images', uploadProduct.array('productImages', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No files uploaded'
            });
        }

        // Generate relative paths for all uploaded files
        const uploadedImages = req.files.map(file => ({
            filename: file.filename,
            path: `/uploads/products/${file.filename}`,
            originalName: file.originalname,
            size: file.size,
            mimetype: file.mimetype
        }));

        res.json({
            success: true,
            message: `${req.files.length} image(s) uploaded successfully`,
            data: {
                images: uploadedImages
            }
        });

    } catch (error) {
        console.error('Error uploading product images:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload product images',
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

// ==================== ADMIN EARNINGS API ====================

/**
 * Helper: Get subtree with 7-level depth limit using parent_id edges
 */
function getSubtreeWithLimit(rootId, maxDepth = 7) {
    const subtree = [];
    const queue = [{ id: rootId, level: 0 }];
    const visited = new Set();

    while (queue.length > 0) {
        const node = queue.shift();
        if (visited.has(node.id) || node.level > maxDepth) continue;
        visited.add(node.id);

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(node.id);
        if (user) {
            subtree.push({ ...user, level: node.level });

            // Get children using parent_id
            const children = db.prepare('SELECT id FROM users WHERE parent_id = ?').all(node.id);
            children.forEach(child => {
                queue.push({ id: child.id, level: node.level + 1 });
            });
        }
    }

    return subtree;
}

/**
 * GET /api/admin/earnings/summary
 * Returns: { totalSelf, totalSubtree, totalAll, currency, members, depth, generatedAt }
 */
app.get('/api/admin/earnings/summary', (req, res) => {
    try {
        const { userId, from, to } = req.query;

        // Default to root user if no userId specified
        let targetUserId = userId;
        if (!targetUserId) {
            const root = db.prepare('SELECT id FROM users WHERE invitor_id IS NULL LIMIT 1').get();
            targetUserId = root ? root.id : null;
        }

        if (!targetUserId) {
            return res.json({ success: false, message: 'User not found' });
        }

        // Get subtree (7-level limit)
        const subtree = getSubtreeWithLimit(targetUserId, 7);
        const userIds = subtree.map(u => u.id);

        // Build date filter
        let dateFilter = '';
        const params = [targetUserId];

        if (from && to) {
            dateFilter = 'AND e.created_at BETWEEN ? AND ?';
            params.push(from, to);
        } else if (from) {
            dateFilter = 'AND e.created_at >= ?';
            params.push(from);
        } else if (to) {
            dateFilter = 'AND e.created_at <= ?';
            params.push(to);
        }

        // Calculate totals
        const selfEarnings = db.prepare(`
            SELECT COALESCE(SUM(COALESCE(amount_local, amount)), 0) as total
            FROM earnings e
            WHERE e.user_id = ? ${dateFilter}
        `).get(...params);

        // Subtree earnings (including self)
        const subtreeQuery = `
            SELECT COALESCE(SUM(COALESCE(amount_local, amount)), 0) as total
            FROM earnings e
            WHERE e.user_id IN (${userIds.map(() => '?').join(',')}) ${dateFilter}
        `;
        const subtreeEarnings = db.prepare(subtreeQuery).get(...userIds, ...(from ? [from] : []), ...(to ? [to] : []));

        // Max depth found
        const maxDepth = Math.max(...subtree.map(u => u.level));

        res.json({
            success: true,
            data: {
                totalSelf: selfEarnings.total,
                totalSubtree: subtreeEarnings.total,
                totalAll: subtreeEarnings.total, // Same as subtree in this context
                currency: 'THB',
                members: subtree.length,
                depth: maxDepth,
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error fetching earnings summary:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/admin/earnings/top
 * Returns top users by subtree earnings
 */
app.get('/api/admin/earnings/top', (req, res) => {
    try {
        const { limit = 20, from, to } = req.query;

        // Get all users
        const allUsers = db.prepare('SELECT id, username, full_name, avatar_url, profile_image, created_at FROM users').all();

        // Calculate subtree earnings for each user
        const userEarnings = allUsers.map(user => {
            const subtree = getSubtreeWithLimit(user.id, 7);
            const userIds = subtree.map(u => u.id);

            let dateFilter = '';
            const params = [];

            if (from && to) {
                dateFilter = 'AND created_at BETWEEN ? AND ?';
                params.push(from, to);
            } else if (from) {
                dateFilter = 'AND created_at >= ?';
                params.push(from);
            } else if (to) {
                dateFilter = 'AND created_at <= ?';
                params.push(to);
            }

            const query = `
                SELECT COALESCE(SUM(COALESCE(amount_local, amount)), 0) as total,
                       MAX(created_at) as last_earning_at
                FROM earnings
                WHERE user_id IN (${userIds.map(() => '?').join(',')}) ${dateFilter}
            `;

            const earnings = db.prepare(query).get(...userIds, ...params);

            // Get last earning date for this specific user
            const userLastEarning = db.prepare(`
                SELECT MAX(created_at) as last_earning_at
                FROM earnings
                WHERE user_id = ?
            `).get(user.id);

            return {
                user_id: user.id,
                username: user.username,
                full_name: user.full_name,
                avatar_url: user.avatar_url || user.profile_image,
                members: subtree.length,
                subtree_total: earnings.total,
                last_earning_at: userLastEarning.last_earning_at || earnings.last_earning_at
            };
        });

        // Sort by subtree_total descending
        userEarnings.sort((a, b) => b.subtree_total - a.subtree_total);

        // Apply limit
        const topEarners = userEarnings.slice(0, parseInt(limit));

        res.json({
            success: true,
            data: topEarners
        });

    } catch (error) {
        console.error('Error fetching top earners:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/admin/earnings/user/:userId
 * Per-user breakdown by generation
 */
app.get('/api/admin/earnings/user/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const { from, to } = req.query;

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }

        // Get subtree with levels
        const subtree = getSubtreeWithLimit(userId, 7);

        // Group by generation
        const byGeneration = {};
        for (let i = 1; i <= 7; i++) {
            byGeneration[i] = 0;
        }

        let dateFilter = '';
        const params = [];
        if (from && to) {
            dateFilter = 'AND created_at BETWEEN ? AND ?';
            params.push(from, to);
        } else if (from) {
            dateFilter = 'AND created_at >= ?';
            params.push(from);
        } else if (to) {
            dateFilter = 'AND created_at <= ?';
            params.push(to);
        }

        // Calculate earnings by generation
        subtree.forEach(member => {
            if (member.level > 0 && member.level <= 7) {
                const earnings = db.prepare(`
                    SELECT COALESCE(SUM(COALESCE(amount_local, amount)), 0) as total
                    FROM earnings
                    WHERE user_id = ? ${dateFilter}
                `).get(member.id, ...params);

                byGeneration[member.level] += earnings.total;
            }
        });

        // Self earnings
        const selfEarnings = db.prepare(`
            SELECT COALESCE(SUM(COALESCE(amount_local, amount)), 0) as total
            FROM earnings
            WHERE user_id = ? ${dateFilter}
        `).get(userId, ...params);

        // Subtree total
        const userIds = subtree.map(u => u.id);
        const subtreeQuery = `
            SELECT COALESCE(SUM(COALESCE(amount_local, amount)), 0) as total
            FROM earnings
            WHERE user_id IN (${userIds.map(() => '?').join(',')}) ${dateFilter}
        `;
        const subtreeTotal = db.prepare(subtreeQuery).get(...userIds, ...params);

        // Get orders linked to earnings
        const ordersLinked = db.prepare(`
            SELECT COUNT(DISTINCT order_id) as count
            FROM earnings
            WHERE user_id = ? AND order_id IS NOT NULL ${dateFilter}
        `).get(userId, ...params);

        // Last earning
        const lastEarning = db.prepare(`
            SELECT MAX(created_at) as last_earning_at
            FROM earnings
            WHERE user_id = ?
        `).get(userId);

        res.json({
            success: true,
            data: {
                user_id: userId,
                username: user.username,
                full_name: user.full_name,
                self: selfEarnings.total,
                byGeneration,
                subtreeTotal: subtreeTotal.total,
                ordersLinked: ordersLinked.count,
                lastEarningAt: lastEarning.last_earning_at
            }
        });

    } catch (error) {
        console.error('Error fetching user earnings:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/admin/earnings/export.csv
 * Export earnings data as CSV
 */
app.get('/api/admin/earnings/export.csv', (req, res) => {
    try {
        const { from, to } = req.query;

        // Get all users
        const allUsers = db.prepare('SELECT id, username, created_at FROM users ORDER BY created_at ASC').all();

        // Build CSV
        let csv = 'user_id,username,level,subtree_total,self_total,members,first_join,last_join\n';

        allUsers.forEach(user => {
            const subtree = getSubtreeWithLimit(user.id, 7);
            const userIds = subtree.map(u => u.id);

            let dateFilter = '';
            const params = [];
            if (from && to) {
                dateFilter = 'AND created_at BETWEEN ? AND ?';
                params.push(from, to);
            }

            // Self total
            const selfQuery = `
                SELECT COALESCE(SUM(COALESCE(amount_local, amount)), 0) as total
                FROM earnings
                WHERE user_id = ? ${dateFilter}
            `;
            const selfTotal = db.prepare(selfQuery).get(user.id, ...params);

            // Subtree total
            const subtreeQuery = `
                SELECT COALESCE(SUM(COALESCE(amount_local, amount)), 0) as total
                FROM earnings
                WHERE user_id IN (${userIds.map(() => '?').join(',')}) ${dateFilter}
            `;
            const subtreeTotal = db.prepare(subtreeQuery).get(...userIds, ...params);

            // Level calculation
            let level = 0;
            let currentId = user.parent_id;
            while (currentId && level < 7) {
                level++;
                const parent = db.prepare('SELECT parent_id FROM users WHERE id = ?').get(currentId);
                if (!parent) break;
                currentId = parent.parent_id;
            }

            // First and last join in subtree
            const joins = subtree.map(u => u.created_at).filter(d => d).sort();
            const firstJoin = joins[0] || user.created_at;
            const lastJoin = joins[joins.length - 1] || user.created_at;

            csv += `${user.id},${user.username},${level},${subtreeTotal.total},${selfTotal.total},${subtree.length},${firstJoin},${lastJoin}\n`;
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="earnings_export_${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csv);

    } catch (error) {
        console.error('Error exporting earnings:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==================== END ADMIN EARNINGS API ====================

// ==================== NETWORK DNA API ====================

// Get all DNA records with user info
app.get('/api/admin/network-dna', (req, res) => {
    try {
        const { userId, fromDate, toDate } = req.query;

        let query = `
            SELECT
                d.*,
                u.username,
                u.profile_image_filename,
                u.avatar_url,
                u.created_at as user_created_at
            FROM fingrow_dna d
            LEFT JOIN users u ON d.user_id = u.id
            WHERE 1=1
        `;

        const params = [];

        if (userId) {
            query += ` AND d.user_id = ?`;
            params.push(userId);
        }

        if (fromDate) {
            query += ` AND d.regist_time >= ?`;
            params.push(fromDate);
        }

        if (toDate) {
            query += ` AND d.regist_time <= ?`;
            params.push(toDate);
        }

        query += ` ORDER BY d.run_number ASC`;

        const records = db.prepare(query).all(...params);

        res.json({
            success: true,
            data: records,
            total: records.length
        });

    } catch (error) {
        console.error('Error fetching network DNA:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get network tree for a specific user (BFS traversal)
app.get('/api/admin/network-tree/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const { generations = 6 } = req.query;

        // Start with root user
        const root = db.prepare(`
            SELECT
                d.*,
                u.username,
                u.profile_image_filename,
                u.avatar_url
            FROM fingrow_dna d
            LEFT JOIN users u ON d.user_id = u.id
            WHERE d.user_id = ?
        `).get(userId);

        if (!root) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const tree = [root];
        const queue = [root];
        let currentGen = 0;

        while (queue.length > 0 && currentGen < parseInt(generations)) {
            const parent = queue.shift();

            // Get children of this parent
            const children = db.prepare(`
                SELECT
                    d.*,
                    u.username,
                    u.profile_image_filename,
                    u.avatar_url
                FROM fingrow_dna d
                LEFT JOIN users u ON d.user_id = u.id
                WHERE d.parent_id = ?
                ORDER BY d.regist_time ASC
            `).all(parent.user_id);

            children.forEach(child => {
                tree.push(child);
                queue.push(child);
            });

            currentGen++;
        }

        res.json({
            success: true,
            data: tree,
            root: root,
            total: tree.length
        });

    } catch (error) {
        console.error('Error fetching network tree:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get network statistics
app.get('/api/admin/network-stats', (req, res) => {
    try {
        const { userId } = req.query;

        // Total users
        const totalUsers = db.prepare('SELECT COUNT(*) as count FROM fingrow_dna').get();

        // Users by level
        const byLevel = db.prepare(`
            SELECT level, COUNT(*) as count
            FROM fingrow_dna
            GROUP BY level
            ORDER BY level
        `).all();

        // Users by status
        const byStatus = db.prepare(`
            SELECT follower_full_status, COUNT(*) as count
            FROM fingrow_dna
            GROUP BY follower_full_status
        `).all();

        // Total finpoints
        const totalFinpoints = db.prepare(`
            SELECT
                SUM(own_finpoint) as total_own,
                SUM(total_finpoint) as total_subtree
            FROM fingrow_dna
        `).get();

        // Top earners
        const topEarners = db.prepare(`
            SELECT
                d.user_id,
                d.total_finpoint,
                d.level,
                d.child_count,
                u.username
            FROM fingrow_dna d
            LEFT JOIN users u ON d.user_id = u.id
            ORDER BY d.total_finpoint DESC
            LIMIT 10
        `).all();

        res.json({
            success: true,
            data: {
                totalUsers: totalUsers.count,
                byLevel,
                byStatus,
                totalFinpoints,
                topEarners
            }
        });

    } catch (error) {
        console.error('Error fetching network stats:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get user list for filters
app.get('/api/admin/network-users', (req, res) => {
    try {
        const users = db.prepare(`
            SELECT
                d.user_id,
                u.username,
                d.level,
                d.follower_full_status
            FROM fingrow_dna d
            LEFT JOIN users u ON d.user_id = u.id
            ORDER BY d.run_number ASC
        `).all();

        res.json({
            success: true,
            data: users
        });

    } catch (error) {
        console.error('Error fetching network users:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==================== END NETWORK DNA API ====================

// Serve static files with no-cache headers for admin JS/CSS
app.use('/admin', (req, res, next) => {
    // Disable cache for JS and CSS files
    if (req.path.endsWith('.js') || req.path.endsWith('.css')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    next();
}, express.static(path.join(__dirname, 'admin')));

app.use('/mobile', express.static(path.join(__dirname, 'mobile')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/', express.static(__dirname));

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📱 Mobile app: http://localhost:${PORT}/mobile/`);
    console.log(`🔧 Admin panel: http://localhost:${PORT}/admin/`);
});