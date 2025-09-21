import express from 'express';
import cors from 'cors';
import path from 'path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';

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

        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

        // For now, skip password validation since we don't store hashed passwords
        // In production, you should hash passwords and validate them
        const user = db.prepare(`
            SELECT * FROM users
            WHERE (username = ? OR email = ?) AND is_active = 1
        `).get(username, username);

        if (user) {
            // Update last login
            db.prepare('UPDATE users SET last_login = ? WHERE id = ?')
              .run(new Date().toISOString(), user.id);

            console.log('[API] Login successful for:', user.username);
            res.json({
                success: true,
                user: user
            });
        } else {
            console.log('[API] Login failed - user not found');
            res.json({
                success: false,
                message: 'Invalid credentials'
            });
        }
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

        // Delete user
        const result = db.prepare('DELETE FROM users WHERE id = ?').run(userId);

        if (result.changes > 0) {
            res.json({
                success: true,
                deletedUser: { username: user.username },
                relatedData: { orders: 0, products: 0 } // TODO: Check actual related data
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