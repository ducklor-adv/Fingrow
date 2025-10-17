import express from 'express';
import cors from 'cors';
import path from 'path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import fs from 'fs';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5050;

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

// Configure multer for QR code uploads
const qrStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadsDir = path.join(__dirname, 'uploads', 'qrcodes');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 15);
        const fileExtension = path.extname(file.originalname).toLowerCase();
        const uniqueFileName = `qr_${timestamp}_${randomId}${fileExtension}`;
        cb(null, uniqueFileName);
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

const uploadQR = multer({
    storage: qrStorage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit for QR codes
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

// Database schema initialization function
function initializeDatabase() {
    console.log('🔄 Initializing database schema...');

    const tables = [
        {
            name: 'users',
            sql: `CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                world_id TEXT UNIQUE,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE,
                phone TEXT,
                full_name TEXT,
                avatar_url TEXT,
                profile_image_filename TEXT,
                bio TEXT,
                location TEXT,
                preferred_currency TEXT DEFAULT 'THB',
                language TEXT DEFAULT 'th',
                is_verified INTEGER DEFAULT 0,
                verification_level INTEGER DEFAULT 0,
                trust_score REAL DEFAULT 0.00,
                total_sales INTEGER DEFAULT 0,
                total_purchases INTEGER DEFAULT 0,
                invite_code TEXT UNIQUE NOT NULL,
                invitor_id TEXT,
                total_invites INTEGER DEFAULT 0,
                active_invites INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                is_suspended INTEGER DEFAULT 0,
                last_login TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                password_hash TEXT,
                address_number TEXT,
                address_street TEXT,
                address_district TEXT,
                address_province TEXT,
                address_postal_code TEXT,
                parent_id TEXT
            )`
        },
        {
            name: 'products',
            sql: `CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                seller_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                condition TEXT,
                price_wld REAL NOT NULL,
                price_local REAL NOT NULL,
                currency_code TEXT DEFAULT 'THB',
                category TEXT,
                images TEXT,
                location TEXT,
                is_available INTEGER DEFAULT 1,
                status TEXT DEFAULT 'active',
                view_count INTEGER DEFAULT 0,
                community_percentage REAL DEFAULT 2.00,
                amount_fee REAL DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (seller_id) REFERENCES users(id)
            )`
        },
        {
            name: 'orders',
            sql: `CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                order_number TEXT UNIQUE,
                buyer_id TEXT NOT NULL,
                seller_id TEXT NOT NULL,
                product_id TEXT,
                quantity INTEGER DEFAULT 1,
                subtotal REAL DEFAULT 0,
                shipping_cost REAL DEFAULT 0,
                tax_amount REAL DEFAULT 0,
                community_fee REAL NOT NULL DEFAULT 0,
                total_amount REAL NOT NULL DEFAULT 0,
                total_price_wld REAL DEFAULT 0,
                total_price_local REAL DEFAULT 0,
                currency_code TEXT DEFAULT 'THB',
                wld_rate REAL DEFAULT 0,
                total_wld REAL DEFAULT 0,
                status TEXT DEFAULT 'pending',
                payment_status TEXT DEFAULT 'pending',
                shipping_address TEXT,
                shipping_method TEXT,
                tracking_number TEXT,
                notes TEXT,
                buyer_notes TEXT,
                seller_notes TEXT,
                admin_notes TEXT,
                order_date TEXT DEFAULT CURRENT_TIMESTAMP,
                confirmed_at TEXT,
                shipped_at TEXT,
                delivered_at TEXT,
                completed_at TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (buyer_id) REFERENCES users(id),
                FOREIGN KEY (seller_id) REFERENCES users(id),
                FOREIGN KEY (product_id) REFERENCES products(id)
            )`
        },
        {
            name: 'categories',
            sql: `CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                name_th TEXT,
                description TEXT,
                icon TEXT,
                is_active INTEGER DEFAULT 1,
                sort_order INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`
        },
        {
            name: 'chat_rooms',
            sql: `CREATE TABLE IF NOT EXISTS chat_rooms (
                id TEXT PRIMARY KEY,
                buyer_id TEXT NOT NULL,
                seller_id TEXT NOT NULL,
                product_id TEXT,
                last_message TEXT,
                last_message_at TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (buyer_id) REFERENCES users(id),
                FOREIGN KEY (seller_id) REFERENCES users(id),
                FOREIGN KEY (product_id) REFERENCES products(id)
            )`
        },
        {
            name: 'messages',
            sql: `CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                chat_room_id TEXT NOT NULL,
                sender_id TEXT NOT NULL,
                content TEXT NOT NULL,
                message_type TEXT DEFAULT 'text',
                is_read INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(id),
                FOREIGN KEY (sender_id) REFERENCES users(id)
            )`
        },
        {
            name: 'earnings',
            sql: `CREATE TABLE IF NOT EXISTS earnings (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                source_user_id TEXT NOT NULL,
                source_type TEXT NOT NULL,
                amount_wld REAL NOT NULL,
                amount_local REAL NOT NULL,
                currency_code TEXT DEFAULT 'THB',
                level INTEGER,
                percentage REAL,
                order_id TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (source_user_id) REFERENCES users(id),
                FOREIGN KEY (order_id) REFERENCES orders(id)
            )`
        },
        {
            name: 'settings',
            sql: `CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                description TEXT,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`
        },
        {
            name: 'reviews',
            sql: `CREATE TABLE IF NOT EXISTS reviews (
                id TEXT PRIMARY KEY,
                order_id TEXT NOT NULL,
                product_id TEXT NOT NULL,
                buyer_id TEXT NOT NULL,
                seller_id TEXT NOT NULL,
                rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
                comment TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders(id),
                FOREIGN KEY (product_id) REFERENCES products(id),
                FOREIGN KEY (buyer_id) REFERENCES users(id),
                FOREIGN KEY (seller_id) REFERENCES users(id)
            )`
        },
        {
            name: 'fingrow_dna',
            sql: `CREATE TABLE IF NOT EXISTS fingrow_dna (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_number INTEGER UNIQUE,
                user_id TEXT UNIQUE NOT NULL,
                user_type TEXT NOT NULL DEFAULT 'Atta',
                regist_time TEXT NOT NULL,
                regist_type TEXT NOT NULL,
                invitor TEXT,
                max_follower INTEGER NOT NULL DEFAULT 5,
                follower_count INTEGER NOT NULL DEFAULT 0,
                follower_full_status TEXT NOT NULL DEFAULT 'Open',
                max_level_royalty INTEGER NOT NULL DEFAULT 19530,
                child_count INTEGER NOT NULL DEFAULT 0,
                parent_id TEXT,
                own_finpoint REAL NOT NULL DEFAULT 0,
                total_finpoint REAL NOT NULL DEFAULT 0,
                level INTEGER NOT NULL DEFAULT 0,
                js_file_path TEXT,
                parent_file TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (parent_id) REFERENCES users(id)
            )`
        },
        {
            name: 'notifications',
            sql: `CREATE TABLE IF NOT EXISTS notifications (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                body TEXT NOT NULL,
                data TEXT,
                is_read INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )`
        }
    ];

    let successCount = 0;
    let failCount = 0;

    tables.forEach(table => {
        try {
            db.exec(table.sql);
            console.log(`✅ ${table.name} table ready`);
            successCount++;
        } catch (error) {
            console.error(`❌ Error creating ${table.name} table:`, error.message);
            failCount++;
        }
    });

    console.log(`\n📊 Database initialization complete: ${successCount} tables created, ${failCount} failed\n`);
}

// Initialize database
const dbPath = path.join(__dirname, 'data', 'fingrow.db');
let db = null;

try {
    db = new Database(dbPath);

    // Disable foreign key constraints globally for this connection
    db.exec('PRAGMA foreign_keys = OFF');

    console.log('✅ Database connected:', dbPath);

    // Initialize database schema
    initializeDatabase();

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

        // Add missing columns to orders table
        const orderColumns = db.prepare("PRAGMA table_info(orders)").all();
        const orderColumnNames = orderColumns.map(col => col.name);
        const missingOrderColumns = [
            { name: 'product_id', sql: 'ALTER TABLE orders ADD COLUMN product_id TEXT' },
            { name: 'quantity', sql: 'ALTER TABLE orders ADD COLUMN quantity INTEGER DEFAULT 1' },
            { name: 'total_price_wld', sql: 'ALTER TABLE orders ADD COLUMN total_price_wld REAL DEFAULT 0' },
            { name: 'total_price_local', sql: 'ALTER TABLE orders ADD COLUMN total_price_local REAL DEFAULT 0' },
            { name: 'notes', sql: 'ALTER TABLE orders ADD COLUMN notes TEXT' }
        ];

        for (const col of missingOrderColumns) {
            if (!orderColumnNames.includes(col.name)) {
                console.log(`🔄 Adding ${col.name} column to orders table...`);
                db.exec(col.sql);
                console.log(`✅ ${col.name} column added`);
            }
        }

        // Add missing columns to products table
        const productColumns = db.prepare("PRAGMA table_info(products)").all();
        const productColumnNames = productColumns.map(col => col.name);
        const missingProductColumns = [
            { name: 'price_wld', sql: 'ALTER TABLE products ADD COLUMN price_wld REAL DEFAULT 0' }
        ];

        for (const col of missingProductColumns) {
            if (!productColumnNames.includes(col.name)) {
                console.log(`🔄 Adding ${col.name} column to products table...`);
                db.exec(col.sql);
                console.log(`✅ ${col.name} column added`);
            }
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
            const rootId = '25AAA0001';
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

// Helper function: Create notification
function createNotification(userId, type, title, message, icon, referenceId = null) {
    try {
        const id = 'NOTIF-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

        // Store icon and referenceId in data as JSON
        const data = JSON.stringify({ icon: icon, referenceId: referenceId });

        db.prepare(`
            INSERT INTO notifications (id, user_id, type, title, body, data, created_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(id, userId, type, title, message, data);

        console.log(`✅ Notification created for user ${userId}: ${title}`);
        return id;
    } catch (error) {
        console.error('❌ Error creating notification:', error);
        return null;
    }
}

// Helper function: Create broadcast notification
function createBroadcastNotification(type, title, message, icon) {
    try {
        const users = db.prepare('SELECT id FROM users WHERE id IS NOT NULL').all();
        users.forEach(user => {
            createNotification(user.id, type, title, message, icon, null);
        });
        console.log(`✅ Broadcast notification sent to ${users.length} users`);
        return true;
    } catch (error) {
        console.error('❌ Error creating broadcast notification:', error);
        return false;
    }
}

// Helper function to generate invite code (now uses User ID)
function generateInviteCode(userId) {
    // Simply return the user ID as invite code
    // This makes it easy to track and verify invitations
    return userId;
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
 * ACF (Auto-Connect Follower) Allocation Logic - NEW FAIR DISTRIBUTION
 * Finds the best parent for a new user within the invitor's network
 * Rules:
 * - Max 5 direct children per user (Anatta999 = 1 child only)
 * - Max 7 levels depth
 * - Layer-first (closest to invitor) → Fair Distribution (childCount) → Earliest registration
 * - Fair Distribution: Distribute children evenly across all candidates in the same layer
 *   instead of filling one person to 5 first (round-robin style)
 * - If invitor's direct slot is full, search in invitor's child subtree only
 *
 * Sorting Priority (within same layer):
 * 1. childCount (ascending) - users with fewer children get priority
 * 2. created_at (ascending) - earlier registration gets priority when childCount is equal
 * 3. level (ascending) - closer to invitor when all else is equal
 */
function allocateParent(invitorId) {
    const MAX_DEPTH = 7;

    // Get invitor with username to check for special cases
    const invitor = db.prepare('SELECT id, parent_id, username FROM users WHERE id = ?').get(invitorId);
    if (!invitor) {
        throw new Error('Invitor not found');
    }

    // Determine max children based on user
    // Anatta999 can have only 1 child, others can have 5
    const MAX_CHILDREN = (invitor.username === 'Anatta999') ? 1 : 5;

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
                SELECT id, created_at, username
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

                    // Determine max children for this specific child
                    const childMaxChildren = (child.username === 'Anatta999') ? 1 : 5;

                    if (childCount.count < childMaxChildren) {
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

    // Sort candidates: NEW ACF Logic (Fair Distribution)
    // Priority: childCount → created_at → level
    // This ensures fair distribution across all candidates in the same layer
    // Instead of filling one person to 5 first, we distribute evenly (round-robin style)
    candidates.sort((a, b) => {
        // 1. Prioritize users with fewer children (fair distribution)
        if (a.childCount !== b.childCount) return a.childCount - b.childCount;

        // 2. If same childCount, earlier registration gets priority
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        if (dateA !== dateB) return dateA - dateB;

        // 3. If still tied, closer to invitor (shallower level)
        return a.level - b.level;
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
                u.invite_code, u.invitor_id as invited_by, u.invitor_id,
                u.created_at, u.last_login, u.is_active, u.avatar_url as profile_image,
                u.trust_score as seller_rating, u.total_sales, u.location as province,

                -- Get follower_count, child_count, and parent_id from fingrow_dna table
                COALESCE(dna.follower_count, 0) as follower_count,
                COALESCE(dna.child_count, 0) as child_count,
                dna.parent_id,
                COALESCE(dna.level, 0) as level,

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
            LEFT JOIN fingrow_dna dna ON u.id = dna.user_id
            ORDER BY u.created_at DESC
        `;

        const users = db.prepare(query).all();

        // Calculate network statistics for each user
        const usersWithNetwork = users.map(user => {
            try {
                // Get all network member IDs using recursive CTE based on parent_id (ACF structure)
                // Network limited to 5 children per level, 7 levels deep
                const networkMembers = db.prepare(`
                    WITH RECURSIVE network_tree AS (
                        -- Start with the user themselves
                        SELECT id, 0 as depth
                        FROM users
                        WHERE id = ?

                        UNION ALL

                        -- Add children (max 5 per parent, max 7 levels)
                        SELECT u.id, nt.depth + 1 as depth
                        FROM users u
                        INNER JOIN network_tree nt ON u.parent_id = nt.id
                        WHERE nt.depth < 7
                    )
                    SELECT DISTINCT id FROM network_tree
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

                    // Calculate network fees from amount_fee of all products in network
                    const feesResult = db.prepare(`
                        SELECT SUM(amount_fee) as total_fees
                        FROM products
                        WHERE seller_id IN (${placeholders})
                    `).get(...networkIds);

                    networkFees = feesResult.total_fees || 0;

                    // Calculate sales and orders
                    const networkStats = db.prepare(`
                        SELECT
                            COUNT(o.id) as total_orders,
                            SUM(o.total_amount) as total_sales
                        FROM orders o
                        WHERE o.seller_id IN (${placeholders})
                        AND o.status = 'completed'
                    `).get(...networkIds);

                    networkSales = networkStats.total_sales || 0;
                    networkOrders = networkStats.total_orders || 0;

                    // Get breakdown by member (using amount_fee from products)
                    networkBreakdown = db.prepare(`
                        SELECT
                            u.id,
                            u.username,
                            u.full_name,
                            COUNT(DISTINCT o.id) as order_count,
                            SUM(o.total_amount) as total_sales,
                            COALESCE((SELECT SUM(p.amount_fee) FROM products p WHERE p.seller_id = u.id), 0) as total_fees
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
            child_count: user.child_count || 0,
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
    console.log('\n========================================');
    console.log('📝 REGISTRATION REQUEST RECEIVED');
    console.log('========================================');
    try {
        const userData = req.body;
        console.log('📋 User Data:', JSON.stringify(userData, null, 2));

        // Check if username exists
        console.log('🔍 Checking if username exists:', userData.username);
        const existingUsername = db.prepare('SELECT id FROM users WHERE username = ?').get(userData.username);
        if (existingUsername) {
            console.log('❌ Username already exists');
            return res.json({ success: false, message: 'Username already exists' });
        }
        console.log('✅ Username available');

        // Check if email exists
        console.log('🔍 Checking if email exists:', userData.email);
        const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(userData.email);
        if (existingEmail) {
            console.log('❌ Email already exists');
            return res.json({ success: false, message: 'Email already exists' });
        }
        console.log('✅ Email available');

        // Hash password
        console.log('🔐 Hashing password...');
        let passwordHash = null;
        if (userData.password) {
            passwordHash = await bcrypt.hash(userData.password, 10);
            console.log('✅ Password hashed');
        }

        // Resolve invitor (BIC or NIC)
        let invitorId = null;
        let parentId = null;
        let registrationType = 'NIC'; // No Invite Code

        console.log('👤 Resolving invitor with code:', userData.invite_code);
        if (userData.invite_code && userData.invite_code.trim() !== '') {
            // BIC (By Invite Code)
            const invitor = db.prepare('SELECT id FROM users WHERE invite_code = ?').get(userData.invite_code.trim());
            if (invitor) {
                invitorId = invitor.id;
                registrationType = 'BIC';
                console.log('✅ BIC Registration - Invitor found:', invitorId);
            } else {
                console.log('❌ Invalid invite code');
                return res.json({ success: false, message: 'Invalid invite code' });
            }
        }

        // If no invitor (NIC), use configured target user (Anatta999 by default)
        if (!invitorId) {
            console.log('🔍 NIC Registration - Finding target user...');
            registrationType = 'NIC'; // Explicitly set to NIC

            // Check if NIC target is configured in settings
            const nicTargetSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('nic_registration_target');

            if (nicTargetSetting && nicTargetSetting.value) {
                // Use configured NIC target
                invitorId = nicTargetSetting.value;
                console.log('✅ NIC target user found (from settings):', invitorId);
            } else {
                // Fallback to Anatta999 (root user)
                const rootUser = db.prepare('SELECT id, username FROM users WHERE username = ? OR invitor_id IS NULL ORDER BY created_at ASC LIMIT 1').get('Anatta999');
                if (rootUser) {
                    invitorId = rootUser.id;
                    console.log('✅ NIC target user (Anatta999/Root):', invitorId, rootUser.username);
                } else {
                    console.log('❌ No target user found');
                    return res.json({ success: false, message: 'System target user not found' });
                }
            }

            console.log('✅ NIC Registration - Invitor set to:', invitorId);
        }

        // ACF Allocation: find best parent
        console.log('🌳 Starting ACF allocation for invitor:', invitorId);
        try {
            const allocation = allocateParent(invitorId);
            parentId = allocation.parentId;
            console.log('✅ ACF allocation successful - Parent:', parentId, 'Level:', allocation.parentLevel);

            // Validate depth constraint
            if (allocation.parentLevel + 1 >= 7) {
                console.log('❌ Network depth limit reached');
                return res.json({
                    success: false,
                    message: 'Network depth limit reached (max 7 levels)'
                });
            }
        } catch (allocationError) {
            console.log('❌ ACF allocation error:', allocationError.message);
            return res.json({
                success: false,
                message: allocationError.message
            });
        }

        // Generate User ID first
        const userId = generateUserId();
        console.log('🆔 Generated user ID:', userId);

        // Generate invite code from User ID
        console.log('🎫 Generating invite code from User ID...');
        const inviteCode = generateInviteCode(userId);
        console.log('✅ Invite code generated:', inviteCode);

        // Insert new user with ACF allocation
        console.log('💾 Preparing to insert user into database...');
        const insertUser = db.prepare(`
            INSERT INTO users (
                id, username, email, full_name, phone,
                password_hash, invite_code, invitor_id, parent_id,
                created_at, last_login, location
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        console.log('💾 Inserting user with:');
        console.log('   - ID:', userId);
        console.log('   - Username:', userData.username);
        console.log('   - Email:', userData.email);
        console.log('   - Full Name:', userData.full_name);
        console.log('   - Phone:', userData.phone || '');
        console.log('   - Invite Code:', inviteCode);
        console.log('   - Invitor ID:', invitorId);
        console.log('   - Parent ID:', parentId);
        console.log('   - Location:', userData.province || '');

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
        console.log('✅ User inserted successfully. Result:', JSON.stringify(result, null, 2));

        // Update invitor's total_invites count
        if (invitorId) {
            console.log('📊 Updating invitor total_invites count...');
            db.prepare('UPDATE users SET total_invites = COALESCE(total_invites, 0) + 1 WHERE id = ?').run(invitorId);
            console.log('✅ Invitor total_invites updated');

            // Create notification #10: New referral to referrer (if BIC registration)
            if (registrationType === 'BIC') {
                console.log('🔔 Creating notification for invitor:', invitorId);
                createNotification(
                    invitorId,
                    'new_referral',
                    '👥 มีสมาชิกใหม่',
                    `${userData.full_name} ได้สมัครสมาชิกผ่านรหัสแนะนำของคุณ`,
                    '👥',
                    userId
                );
                console.log('✅ Notification created for invitor');
            }
        }

        // Insert into fingrow_dna table for ACF tracking
        console.log('🧬 Inserting into fingrow_dna table...');
        try {
            // Calculate level (parent's level + 1)
            let level = 1;
            if (parentId) {
                const parentDna = db.prepare('SELECT level FROM fingrow_dna WHERE user_id = ?').get(parentId);
                if (parentDna) {
                    level = parentDna.level + 1;
                }
            }

            // Get next run_number
            const lastRun = db.prepare('SELECT MAX(run_number) as max_run FROM fingrow_dna').get();
            const runNumber = (lastRun && lastRun.max_run) ? lastRun.max_run + 1 : 1;

            db.prepare(`
                INSERT INTO fingrow_dna (
                    user_id, parent_id, level, run_number,
                    regist_time, regist_type, user_type,
                    own_finpoint, total_finpoint,
                    child_count, follower_count, follower_full_status,
                    max_follower, max_level_royalty
                ) VALUES (?, ?, ?, ?, ?, ?, 'Atta', 0, 0, 0, 0, 'Open', 5, 19530)
            `).run(userId, parentId, level, runNumber, new Date().toISOString(), registrationType);

            console.log('✅ fingrow_dna record created - Level:', level, 'Run:', runNumber);

            // Update parent's child_count
            if (parentId) {
                db.prepare(`
                    UPDATE fingrow_dna
                    SET child_count = child_count + 1
                    WHERE user_id = ?
                `).run(parentId);
                console.log('✅ Parent child_count updated');

                // Create notification for parent about new ACF child
                console.log('🔔 Creating ACF notification for parent:', parentId);

                // Get invitor name for notification message
                let invitorName = 'ไม่ทราบ';
                if (invitorId) {
                    const invitorData = db.prepare('SELECT full_name, username FROM users WHERE id = ?').get(invitorId);
                    if (invitorData) {
                        invitorName = invitorData.full_name || invitorData.username;
                    }
                }

                // Format registration date
                const registDate = new Date().toLocaleString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                createNotification(
                    parentId,
                    'new_acf_child',
                    '🌳 คุณได้รับ Child ระบบ ACF เพิ่ม 1 คน',
                    `คือ ${userData.full_name}\nจาก ${invitorName}\nเมื่อวันที่ ${registDate}`,
                    '🌳',
                    userId
                );
                console.log('✅ ACF notification created for parent');
            }
        } catch (dnaError) {
            console.error('⚠️ Error inserting into fingrow_dna:', dnaError);
            // Don't fail registration if DNA insert fails
        }

        // Get the created user
        console.log('🔍 Retrieving created user from database...');
        const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        if (newUser) {
            console.log('✅ User retrieved successfully:', newUser.username);
        } else {
            console.log('⚠️ WARNING: User not found after insertion!');
        }

        console.log('✅ REGISTRATION COMPLETED SUCCESSFULLY');
        console.log('========================================\n');
        res.json({
            success: true,
            user: newUser
        });

    } catch (error) {
        console.error('❌ REGISTRATION ERROR:', error);
        console.error('Error stack:', error.stack);
        console.log('========================================\n');
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

// Get earnings for a user
app.get('/api/earnings', async (req, res) => {
    try {
        const { user_id } = req.query;

        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: 'user_id is required'
            });
        }

        // Fetch earnings from database
        const earnings = db.prepare(`
            SELECT * FROM earnings
            WHERE user_id = ?
            ORDER BY created_at DESC
        `).all(user_id);

        res.json({
            success: true,
            data: earnings
        });
    } catch (error) {
        console.error('Error fetching earnings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch earnings',
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
        const relativePath = `/uploads/profiles/${req.file.filename}`;

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
                d.id, d.run_number, d.user_id, d.user_type, d.regist_time, d.regist_type,
                d.max_follower, d.follower_count, d.follower_full_status, d.max_level_royalty,
                d.child_count, d.parent_id, d.own_finpoint, d.total_finpoint, d.level,
                d.js_file_path, d.parent_file, d.created_at, d.updated_at,
                u.username,
                u.profile_image_filename,
                u.avatar_url,
                u.created_at as user_created_at,
                u.total_invites,
                u.invitor_id,
                invitor.username as invitor_name,
                invitor.full_name as invitor_full_name
            FROM fingrow_dna d
            LEFT JOIN users u ON d.user_id = u.id
            LEFT JOIN users invitor ON u.invitor_id = invitor.id
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

        // Calculate network size for each user
        const recordsWithNetworkSize = records.map(record => {
            // Calculate network size (all descendants)
            const networkSize = calculateNetworkSize(record.user_id);
            return {
                ...record,
                network_size: networkSize
            };
        });

        res.json({
            success: true,
            data: recordsWithNetworkSize,
            total: recordsWithNetworkSize.length
        });

    } catch (error) {
        console.error('Error fetching network DNA:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Helper function to calculate network size
function calculateNetworkSize(userId) {
    try {
        const allUsers = [];
        const queue = [userId];
        const visited = new Set();

        while (queue.length > 0) {
            const currentId = queue.shift();
            if (visited.has(currentId)) continue;
            visited.add(currentId);

            // Get all direct children (using invitor_id - BIC system)
            const children = db.prepare('SELECT id FROM users WHERE invitor_id = ?').all(currentId);
            children.forEach(child => {
                allUsers.push(child.id);
                queue.push(child.id);
            });
        }

        return allUsers.length;
    } catch (error) {
        console.error('Error calculating network size for', userId, ':', error);
        return 0;
    }
}

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

// Database Query Endpoint (for debugging)
app.post('/api/admin/db-query', (req, res) => {
    try {
        const { query } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        // Security: Only allow SELECT queries for safety
        const trimmedQuery = query.trim().toUpperCase();
        const isReadOnly = trimmedQuery.startsWith('SELECT') ||
                          trimmedQuery.startsWith('PRAGMA') ||
                          trimmedQuery.startsWith('EXPLAIN');

        if (!isReadOnly) {
            // Allow INSERT, UPDATE, DELETE but log them
            console.warn('⚠️ Non-read query executed:', query);
        }

        // Execute the query
        const stmt = db.prepare(query);

        let results;
        let changes = 0;

        if (isReadOnly) {
            results = stmt.all();
        } else {
            const info = stmt.run();
            changes = info.changes;
            results = [];
        }

        res.json({
            success: true,
            results,
            changes,
            rowCount: results.length
        });

    } catch (error) {
        console.error('Database query error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Version Info Endpoint
app.get('/api/version', (req, res) => {
    try {
        const packageJsonPath = path.join(__dirname, 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        res.json({
            success: true,
            version: packageJson.version,
            name: packageJson.name,
            environment: process.env.NODE_ENV || 'development'
        });
    } catch (error) {
        console.error('Error reading package.json:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to read version info'
        });
    }
});

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

// ==================== Payment Methods API ====================

// Get user's payment methods
app.get('/api/payment-methods/:userId', (req, res) => {
    try {
        const { userId } = req.params;

        const methods = db.prepare(`
            SELECT * FROM payment_methods
            WHERE user_id = ? AND is_active = 1
            ORDER BY is_default DESC, created_at DESC
        `).all(userId);

        res.json({ success: true, data: methods });
    } catch (error) {
        console.error('Error fetching payment methods:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Upload QR code endpoint
app.post('/api/upload-qr', uploadQR.single('qrCode'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const qrPath = `/uploads/qrcodes/${req.file.filename}`;
        res.json({ success: true, path: qrPath });
    } catch (error) {
        console.error('Error uploading QR code:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Add new payment method
app.post('/api/payment-methods', (req, res) => {
    try {
        const { user_id, type, account_name, account_number, bank_name, wallet_address, network, qr_code_path, is_default } = req.body;

        // Generate unique ID
        const id = 'PM-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

        // If setting as default, unset other defaults
        if (is_default) {
            db.prepare('UPDATE payment_methods SET is_default = 0 WHERE user_id = ?').run(user_id);
        }

        const stmt = db.prepare(`
            INSERT INTO payment_methods (id, user_id, type, account_name, account_number, bank_name, wallet_address, network, qr_code_path, is_default, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `);

        stmt.run(id, user_id, type, account_name, account_number || null, bank_name || null, wallet_address || null, network || null, qr_code_path || null, is_default ? 1 : 0);

        const method = db.prepare('SELECT * FROM payment_methods WHERE id = ?').get(id);
        res.json({ success: true, data: method });
    } catch (error) {
        console.error('Error adding payment method:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update payment method
app.put('/api/payment-methods/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { account_name, account_number, bank_name, wallet_address, network, qr_code_path, is_default } = req.body;

        // Get method to check user_id
        const method = db.prepare('SELECT user_id FROM payment_methods WHERE id = ?').get(id);
        if (!method) {
            return res.status(404).json({ success: false, message: 'Payment method not found' });
        }

        // If setting as default, unset other defaults
        if (is_default) {
            db.prepare('UPDATE payment_methods SET is_default = 0 WHERE user_id = ?').run(method.user_id);
        }

        const stmt = db.prepare(`
            UPDATE payment_methods
            SET account_name = ?, account_number = ?, bank_name = ?, wallet_address = ?, network = ?, qr_code_path = ?, is_default = ?, updated_at = datetime('now')
            WHERE id = ?
        `);

        stmt.run(account_name, account_number || null, bank_name || null, wallet_address || null, network || null, qr_code_path || null, is_default ? 1 : 0, id);

        const updated = db.prepare('SELECT * FROM payment_methods WHERE id = ?').get(id);
        res.json({ success: true, data: updated });
    } catch (error) {
        console.error('Error updating payment method:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete payment method
app.delete('/api/payment-methods/:id', (req, res) => {
    try {
        const { id } = req.params;

        // Soft delete
        db.prepare('UPDATE payment_methods SET is_active = 0 WHERE id = ?').run(id);

        res.json({ success: true, message: 'Payment method deleted' });
    } catch (error) {
        console.error('Error deleting payment method:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Set default payment method
app.post('/api/payment-methods/:id/set-default', (req, res) => {
    try {
        const { id } = req.params;

        // Get method to check user_id
        const method = db.prepare('SELECT user_id FROM payment_methods WHERE id = ?').get(id);
        if (!method) {
            return res.status(404).json({ success: false, message: 'Payment method not found' });
        }

        // Unset all defaults for this user
        db.prepare('UPDATE payment_methods SET is_default = 0 WHERE user_id = ?').run(method.user_id);

        // Set this one as default
        db.prepare('UPDATE payment_methods SET is_default = 1 WHERE id = ?').run(id);

        res.json({ success: true, message: 'Default payment method updated' });
    } catch (error) {
        console.error('Error setting default payment method:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==================== Orders API ====================

// Create new order
app.post('/api/orders', (req, res) => {
    try {
        const { buyer_id, seller_id, product_id, subtotal, community_fee, total_amount, shipping_address, buyer_notes } = req.body;

        // Generate unique order ID and number
        const orderId = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const orderNumber = 'FG' + Date.now().toString().slice(-8);

        const stmt = db.prepare(`
            INSERT INTO orders (
                id, order_number, buyer_id, seller_id,
                subtotal, community_fee, total_amount,
                currency_code, wld_rate, total_wld,
                shipping_address, buyer_notes,
                status, payment_status, order_date, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'THB', 1, ?, ?, ?, 'pending', 'pending', datetime('now'), datetime('now'))
        `);

        stmt.run(orderId, orderNumber, buyer_id, seller_id, subtotal, community_fee, total_amount, total_amount, shipping_address, buyer_notes || null);

        // Create order item
        const itemId = 'OI-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);

        const itemStmt = db.prepare(`
            INSERT INTO order_items (
                id, order_id, product_id, product_title, product_condition, product_image,
                unit_price, quantity, total_price, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'))
        `);

        itemStmt.run(itemId, orderId, product_id, product.title, product.condition, product.image_url, subtotal, subtotal);

        // Create notification #1: New order to seller
        const buyer = db.prepare('SELECT full_name FROM users WHERE id = ?').get(buyer_id);
        createNotification(
            seller_id,
            'new_order',
            '🛒 คำสั่งซื้อใหม่',
            `${buyer.full_name} สั่งซื้อสินค้า ${product.title} (${orderNumber})`,
            '🛒',
            orderId
        );

        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
        res.json({ success: true, data: order });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get user's orders (as buyer)
app.get('/api/orders/buyer/:userId', (req, res) => {
    try {
        const { userId } = req.params;

        const orders = db.prepare(`
            SELECT o.*, u.full_name as seller_name, u.phone as seller_phone
            FROM orders o
            LEFT JOIN users u ON o.seller_id = u.id
            WHERE o.buyer_id = ?
            ORDER BY o.created_at DESC
        `).all(userId);

        // Get items for each order and check if reviewed
        orders.forEach(order => {
            order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
            const review = db.prepare('SELECT id FROM reviews WHERE order_id = ?').get(order.id);
            order.reviewed = !!review;
        });

        res.json({ success: true, data: orders });
    } catch (error) {
        console.error('Error fetching buyer orders:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get user's orders (as seller)
app.get('/api/orders/seller/:userId', (req, res) => {
    try {
        const { userId } = req.params;

        const orders = db.prepare(`
            SELECT o.*, u.full_name as buyer_name, u.phone as buyer_phone
            FROM orders o
            LEFT JOIN users u ON o.buyer_id = u.id
            WHERE o.seller_id = ?
            ORDER BY o.created_at DESC
        `).all(userId);

        // Get items for each order
        orders.forEach(order => {
            order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
        });

        res.json({ success: true, data: orders });
    } catch (error) {
        console.error('Error fetching seller orders:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get single order by ID
app.get('/api/orders/:orderId', (req, res) => {
    try {
        const { orderId } = req.params;

        const order = db.prepare(`
            SELECT o.*,
                   buyer.full_name as buyer_name, buyer.phone as buyer_phone,
                   seller.full_name as seller_name, seller.phone as seller_phone
            FROM orders o
            LEFT JOIN users buyer ON o.buyer_id = buyer.id
            LEFT JOIN users seller ON o.seller_id = seller.id
            WHERE o.id = ?
        `).get(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Get order items
        order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);

        // Check if order has been reviewed
        const review = db.prepare('SELECT id FROM reviews WHERE order_id = ?').get(orderId);
        order.reviewed = !!review;

        res.json({ success: true, data: order });
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Seller confirms order (pending → confirmed)
app.post('/api/orders/:orderId/confirm', (req, res) => {
    try {
        const { orderId } = req.params;

        db.prepare(`
            UPDATE orders
            SET status = 'confirmed', updated_at = datetime('now')
            WHERE id = ?
        `).run(orderId);

        // Get order details for notification
        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
        const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
        const seller = db.prepare('SELECT full_name FROM users WHERE id = ?').get(order.seller_id);

        // Create notification #5: Seller confirmed order to buyer
        createNotification(
            order.buyer_id,
            'order_confirmed',
            '✅ คำสั่งซื้อได้รับการยืนยัน',
            `${seller.full_name} ยืนยันคำสั่งซื้อ ${orderItems[0].product_title} (${order.order_number}) กรุณาชำระเงินภายใน 24 ชั่วโมง`,
            '✅',
            orderId
        );

        res.json({ success: true, data: order });
    } catch (error) {
        console.error('Error confirming order:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Buyer marks as paid (simplified version without file upload)
app.post('/api/orders/:orderId/mark-paid', (req, res) => {
    try {
        const { orderId } = req.params;

        db.prepare(`
            UPDATE orders
            SET status = 'paid', updated_at = datetime('now')
            WHERE id = ?
        `).run(orderId);

        // Get order details for notification
        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
        const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
        const buyer = db.prepare('SELECT full_name FROM users WHERE id = ?').get(order.buyer_id);

        // Create notification #2: Payment confirmed to seller
        createNotification(
            order.seller_id,
            'order_paid',
            '💳 ผู้ซื้อยืนยันการโอนเงิน',
            `${buyer.full_name} ยืนยันการโอนเงินสำหรับ ${orderItems[0].product_title} (${order.order_number}) กรุณาตรวจสอบและยืนยัน`,
            '💳',
            orderId
        );

        res.json({ success: true, data: order });
    } catch (error) {
        console.error('Error marking as paid:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Buyer uploads payment slip (confirmed → paid)
app.post('/api/orders/:orderId/upload-payment', upload.single('paymentSlip'), (req, res) => {
    try {
        const { orderId } = req.params;
        const paymentSlipPath = req.file ? `/uploads/${req.file.filename}` : null;

        db.prepare(`
            UPDATE orders
            SET payment_status = 'paid', payment_slip_url = ?, updated_at = datetime('now')
            WHERE id = ?
        `).run(paymentSlipPath, orderId);

        // Get order details for notification
        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
        const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
        const buyer = db.prepare('SELECT full_name FROM users WHERE id = ?').get(order.buyer_id);

        // Create notification #2: Payment slip uploaded to seller
        createNotification(
            order.seller_id,
            'payment_uploaded',
            '💳 ได้รับสลิปการชำระเงิน',
            `${buyer.full_name} อัพโหลดสลิปการชำระเงินสำหรับ ${orderItems[0].product_title} (${order.order_number}) กรุณาตรวจสอบและยืนยัน`,
            '💳',
            orderId
        );

        res.json({ success: true, data: order });
    } catch (error) {
        console.error('Error uploading payment:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Seller confirms payment (paid → payment_verified)
app.post('/api/orders/:orderId/verify-payment', (req, res) => {
    try {
        const { orderId } = req.params;

        db.prepare(`
            UPDATE orders
            SET payment_status = 'payment_verified', status = 'payment_verified', updated_at = datetime('now')
            WHERE id = ?
        `).run(orderId);

        // Get order details for notification
        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
        const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
        const seller = db.prepare('SELECT full_name FROM users WHERE id = ?').get(order.seller_id);

        // Create notification #6: Seller confirmed payment to buyer
        createNotification(
            order.buyer_id,
            'payment_verified',
            '✅ ชำระเงินสำเร็จ',
            `${seller.full_name} ยืนยันการชำระเงินสำหรับ ${orderItems[0].product_title} (${order.order_number}) รอการจัดส่งสินค้า`,
            '✅',
            orderId
        );

        res.json({ success: true, data: order });
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Seller ships item (payment_verified → shipped)
app.post('/api/orders/:orderId/ship', (req, res) => {
    try {
        const { orderId } = req.params;
        const { tracking_number, shipping_provider } = req.body;

        // Combine shipping provider and tracking number
        const trackingInfo = shipping_provider && tracking_number
            ? `${shipping_provider}: ${tracking_number}`
            : tracking_number || null;

        db.prepare(`
            UPDATE orders
            SET status = 'shipped', tracking_number = ?, shipped_at = datetime('now'), updated_at = datetime('now')
            WHERE id = ?
        `).run(trackingInfo, orderId);

        // Get order details for notification
        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
        const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
        const seller = db.prepare('SELECT full_name FROM users WHERE id = ?').get(order.seller_id);

        // Create notification #7: Seller shipped item to buyer
        const trackingDisplay = trackingInfo ? `\n\n${trackingInfo}` : '';
        createNotification(
            order.buyer_id,
            'order_shipped',
            '📦 สินค้าถูกจัดส่งแล้ว',
            `${seller.full_name} จัดส่งสินค้า ${orderItems[0].product_title} (${order.order_number})${trackingDisplay}`,
            '📦',
            orderId
        );

        res.json({ success: true, data: order });
    } catch (error) {
        console.error('Error shipping order:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Mark order as delivered (shipped → delivered)
app.post('/api/orders/:orderId/deliver', (req, res) => {
    try {
        const { orderId } = req.params;

        db.prepare(`
            UPDATE orders
            SET status = 'delivered', delivered_at = datetime('now'), updated_at = datetime('now')
            WHERE id = ?
        `).run(orderId);

        // Get order details for notification
        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
        const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
        const seller = db.prepare('SELECT full_name FROM users WHERE id = ?').get(order.seller_id);

        // Create notification #8: Item delivered to buyer
        createNotification(
            order.buyer_id,
            'order_delivered',
            '🎉 สินค้าถึงปลายทางแล้ว',
            `สินค้า ${orderItems[0].product_title} (${order.order_number}) ถูกจัดส่งสำเร็จ กรุณายืนยันการรับสินค้า`,
            '🎉',
            orderId
        );

        res.json({ success: true, data: order });
    } catch (error) {
        console.error('Error marking as delivered:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Buyer confirms receipt (delivered → completed)
app.post('/api/orders/:orderId/complete', (req, res) => {
    try {
        const { orderId } = req.params;

        db.prepare(`
            UPDATE orders
            SET status = 'completed', completed_at = datetime('now'), updated_at = datetime('now')
            WHERE id = ?
        `).run(orderId);

        // Get order details for notification
        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
        const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
        const buyer = db.prepare('SELECT full_name FROM users WHERE id = ?').get(order.buyer_id);

        // Create notification #3: Buyer confirmed receipt to seller
        createNotification(
            order.seller_id,
            'order_completed',
            '✅ การสั่งซื้อสำเร็จ',
            `${buyer.full_name} ยืนยันการรับสินค้า ${orderItems[0].product_title} (${order.order_number}) ธุรกรรมสำเร็จ`,
            '✅',
            orderId
        );

        // No commission notification (community fee removed)

        res.json({ success: true, data: order });
    } catch (error) {
        console.error('Error completing order:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Submit review for completed order
app.post('/api/orders/:orderId/review', (req, res) => {
    try {
        const { orderId } = req.params;
        const { rating, comment } = req.body;

        // Get order details
        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.status !== 'completed') {
            return res.status(400).json({ success: false, message: 'Can only review completed orders' });
        }

        // Get product from order_items
        const orderItem = db.prepare('SELECT product_id FROM order_items WHERE order_id = ? LIMIT 1').get(orderId);

        if (!orderItem || !orderItem.product_id) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Drop and recreate reviews table to ensure correct schema
        db.exec(`DROP TABLE IF EXISTS reviews`);
        db.exec(`
            CREATE TABLE reviews (
                id TEXT PRIMARY KEY,
                order_id TEXT NOT NULL,
                product_id TEXT NOT NULL,
                buyer_id TEXT NOT NULL,
                seller_id TEXT NOT NULL,
                rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
                comment TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        `);

        // Check if review already exists for this order
        const existingReview = db.prepare('SELECT id FROM reviews WHERE order_id = ?').get(orderId);

        if (existingReview) {
            return res.status(400).json({ success: false, message: 'Review already submitted for this order' });
        }

        // Insert review
        const reviewId = 'REVIEW-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

        db.prepare(`
            INSERT INTO reviews (id, order_id, product_id, buyer_id, seller_id, rating, comment, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(reviewId, orderId, orderItem.product_id, order.buyer_id, order.seller_id, rating, comment);

        // Get buyer name for notification
        const buyer = db.prepare('SELECT full_name FROM users WHERE id = ?').get(order.buyer_id);
        const orderItems = db.prepare('SELECT product_title FROM order_items WHERE order_id = ?').all(orderId);

        // Create notification to seller
        createNotification(
            order.seller_id,
            'review_received',
            '⭐ ได้รับรีวิวใหม่',
            `${buyer.full_name} ให้คะแนน ${rating} ดาว สำหรับสินค้า ${orderItems[0].product_title}`,
            '⭐',
            orderId
        );

        // Update seller's average rating
        const sellerReviews = db.prepare('SELECT AVG(rating) as avg_rating FROM reviews WHERE seller_id = ?').get(order.seller_id);
        if (sellerReviews && sellerReviews.avg_rating) {
            db.prepare('UPDATE users SET trust_score = ? WHERE id = ?').run(sellerReviews.avg_rating, order.seller_id);
        }

        res.json({ success: true, data: { reviewId, rating, comment } });
    } catch (error) {
        console.error('Error submitting review:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get review for order
app.get('/api/orders/:orderId/review', (req, res) => {
    try {
        const { orderId } = req.params;

        const review = db.prepare(`
            SELECT r.*, u.full_name as buyer_name
            FROM reviews r
            LEFT JOIN users u ON r.buyer_id = u.id
            WHERE r.order_id = ?
        `).get(orderId);

        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        res.json({ success: true, data: review });
    } catch (error) {
        console.error('Error getting review:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Cancel order
app.post('/api/orders/:orderId/cancel', (req, res) => {
    try {
        const { orderId } = req.params;
        const { cancelled_by, reason } = req.body;

        db.prepare(`
            UPDATE orders
            SET status = 'cancelled', cancelled_by = ?, cancellation_reason = ?, cancelled_at = datetime('now'), updated_at = datetime('now')
            WHERE id = ?
        `).run(cancelled_by, reason || null, orderId);

        // Get order details for notification
        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
        const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);

        // Create notification #9: Order cancelled
        // Notify the other party (if buyer cancelled, notify seller and vice versa)
        const notifyUserId = cancelled_by === order.buyer_id ? order.seller_id : order.buyer_id;
        const cancelledByUser = db.prepare('SELECT full_name FROM users WHERE id = ?').get(cancelled_by);

        createNotification(
            notifyUserId,
            'order_cancelled',
            '❌ คำสั่งซื้อถูกยกเลิก',
            `${cancelledByUser.full_name} ยกเลิกคำสั่งซื้อ ${orderItems[0].product_title} (${order.order_number})${reason ? ` เหตุผล: ${reason}` : ''}`,
            '❌',
            orderId
        );

        res.json({ success: true, data: order });
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==================== Notifications API ====================

// Get user's notifications
app.get('/api/notifications/:userId', (req, res) => {
    try {
        const { userId } = req.params;

        const notifications = db.prepare(`
            SELECT * FROM notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 50
        `).all(userId);

        res.json({ success: true, data: notifications });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Mark notification as read
app.post('/api/notifications/:id/read', (req, res) => {
    try {
        const { id } = req.params;

        db.prepare(`
            UPDATE notifications
            SET is_read = 1, read_at = datetime('now')
            WHERE id = ?
        `).run(id);

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Mark all notifications as read
app.post('/api/notifications/:userId/read-all', (req, res) => {
    try {
        const { userId } = req.params;

        db.prepare(`
            UPDATE notifications
            SET is_read = 1, read_at = datetime('now')
            WHERE user_id = ? AND is_read = 0
        `).run(userId);

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking all as read:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Admin endpoint to send broadcast notifications (#15 maintenance, #16 promotions)
app.post('/api/admin/broadcast-notification', (req, res) => {
    try {
        const { type, title, message, icon } = req.body;

        if (!type || !title || !message) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        createBroadcastNotification(type, title, message, icon || '📢');

        res.json({ success: true, message: 'Broadcast sent to all users' });
    } catch (error) {
        console.error('Error sending broadcast:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ========================================
// SETTINGS ENDPOINTS
// ========================================

// Get system settings
app.get('/api/settings', (req, res) => {
    try {
        // Create settings table if not exists
        db.exec(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                description TEXT,
                updated_at TEXT DEFAULT (datetime('now'))
            )
        `);

        const settings = db.prepare('SELECT * FROM settings').all();

        // Convert to key-value object
        const settingsObj = {};
        settings.forEach(setting => {
            settingsObj[setting.key] = setting.value;
        });

        res.json({ success: true, data: settingsObj });
    } catch (error) {
        console.error('Error getting settings:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update system settings
app.post('/api/settings', (req, res) => {
    try {
        const { key, value, description } = req.body;

        if (!key) {
            return res.status(400).json({ success: false, message: 'Key is required' });
        }

        // Create settings table if not exists
        db.exec(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                description TEXT,
                updated_at TEXT DEFAULT (datetime('now'))
            )
        `);

        // Upsert the setting
        db.prepare(`
            INSERT INTO settings (key, value, description, updated_at)
            VALUES (?, ?, ?, datetime('now'))
            ON CONFLICT(key) DO UPDATE SET
                value = excluded.value,
                description = excluded.description,
                updated_at = datetime('now')
        `).run(key, value, description || null);

        res.json({ success: true, message: 'Setting updated' });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get NIC registration target user with full details
app.get('/api/settings/nic-target', (req, res) => {
    try {
        const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('nic_registration_target');

        let targetUserId = null;
        if (setting && setting.value) {
            targetUserId = setting.value;
        } else {
            // Default: find root user
            const rootUser = db.prepare('SELECT id FROM users WHERE invitor_id IS NULL LIMIT 1').get();
            if (rootUser) {
                targetUserId = rootUser.id;
            }
        }

        // Get user details with network stats
        if (targetUserId) {
            const user = db.prepare(`
                SELECT id, username, full_name, invite_code, profile_image_filename, created_at
                FROM users WHERE id = ?
            `).get(targetUserId);

            if (user) {
                // Get DNA info for follower_count and child_count
                const dnaInfo = db.prepare(`
                    SELECT follower_count, child_count, level
                    FROM fingrow_dna WHERE user_id = ?
                `).get(targetUserId);

                // Calculate network size (total descendants)
                const networkSize = calculateNetworkSize(targetUserId);

                // Add network stats to user
                user.follower_count = dnaInfo ? dnaInfo.follower_count : 0;
                user.child_count = dnaInfo ? dnaInfo.child_count : 0;
                user.level = dnaInfo ? dnaInfo.level : 0;
                user.network_size = networkSize;

                res.json({ success: true, data: user });
            } else {
                res.json({ success: false, message: 'User not found' });
            }
        } else {
            res.json({ success: false, message: 'No target user found' });
        }
    } catch (error) {
        console.error('Error getting NIC target:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Verify user by ID or username and get full network details
app.post('/api/settings/verify-user', (req, res) => {
    try {
        const { search } = req.body;

        if (!search) {
            return res.status(400).json({ success: false, message: 'Search term required' });
        }

        // Search by ID or username
        const user = db.prepare(`
            SELECT id, username, full_name, invite_code, profile_image_filename, created_at
            FROM users
            WHERE id = ? OR username = ?
            LIMIT 1
        `).get(search.trim(), search.trim());

        if (!user) {
            return res.json({ success: false, message: 'ไม่พบผู้ใช้ดังกล่าว' });
        }

        // Get DNA info
        const dnaInfo = db.prepare(`
            SELECT follower_count, child_count, level
            FROM fingrow_dna WHERE user_id = ?
        `).get(user.id);

        // Calculate network size
        const networkSize = calculateNetworkSize(user.id);

        // Add network stats
        user.follower_count = dnaInfo ? dnaInfo.follower_count : 0;
        user.child_count = dnaInfo ? dnaInfo.child_count : 0;
        user.level = dnaInfo ? dnaInfo.level : 0;
        user.network_size = networkSize;

        res.json({ success: true, data: user });
    } catch (error) {
        console.error('Error verifying user:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Serve mobile app (dist folder in production, src in development via Vite proxy)
const mobileDir = fs.existsSync(path.join(__dirname, 'mobile/dist'))
  ? 'mobile/dist'
  : 'mobile';
app.use('/mobile', express.static(path.join(__dirname, mobileDir)));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize SQLite GUI (enabled by default, runs on port 8080)
const ENABLE_DB_GUI = process.env.ENABLE_DB_GUI !== 'false'; // Enabled by default
if (ENABLE_DB_GUI) {
    (async () => {
        try {
            const sqlite3 = (await import('sqlite3')).default;
            const { SqliteGuiNode } = await import('sqlite-gui-node');

            const guiDb = new sqlite3.Database(dbPath);
            await SqliteGuiNode(guiDb);

            console.log('🗄️  SQLite GUI available at: http://localhost:8080/home');

            // Add proxy middleware to expose GUI on /db-gui path
            app.use('/db-gui', createProxyMiddleware({
                target: 'http://localhost:8080',
                changeOrigin: true,
                pathRewrite: {
                    '^/db-gui': '' // Remove /db-gui prefix when forwarding
                },
                onError: (err, req, res) => {
                    console.error('Proxy error:', err.message);
                    res.status(500).json({
                        success: false,
                        error: 'Database GUI is not available'
                    });
                }
            }));

            console.log(`🌐 Database GUI proxy available at: http://localhost:${PORT}/db-gui/home`);
        } catch (error) {
            console.error('❌ Failed to initialize SQLite GUI:', error.message);
        }
    })();
}

app.use('/', express.static(__dirname));

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📱 Mobile app: http://localhost:${PORT}/mobile/`);
    console.log(`🔧 Admin panel: http://localhost:${PORT}/admin/`);
    if (ENABLE_DB_GUI) {
        console.log(`🗄️  Database GUI: http://localhost:${PORT}/db-gui/home`);
    }
});