import { getDatabase } from '../config/database.js';
import bcrypt from 'bcryptjs';

// Get all users with pagination and filters
export const getUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', status = '' } = req.query;
        const db = getDatabase();
        const offset = (page - 1) * limit;

        console.log('[API] Get users request:', { page, limit, search, status });

        let query = 'SELECT * FROM users WHERE 1=1';
        const params = [];

        if (search) {
            query += ' AND (username LIKE ? OR full_name LIKE ? OR email LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const users = db.prepare(query).all(...params);
        const totalQuery = 'SELECT COUNT(*) as count FROM users WHERE 1=1' + 
            (search ? ' AND (username LIKE ? OR full_name LIKE ? OR email LIKE ?)' : '') +
            (status ? ' AND status = ?' : '');
        
        const totalParams = [];
        if (search) {
            const searchPattern = `%${search}%`;
            totalParams.push(searchPattern, searchPattern, searchPattern);
        }
        if (status) totalParams.push(status);

        const total = db.prepare(totalQuery).get(...totalParams).count;

        console.log(`[API] Found ${users.length} users, total: ${total}`);

        res.json({
            success: true,
            users,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('[API] Error getting users:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get users',
            error: error.message 
        });
    }
};

// Get single user by ID
export const getUserById = async (req, res) => {
    try {
        const { userId } = req.params;
        const db = getDatabase();

        console.log('[API] Get user by ID:', userId);

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get additional stats
        const orderStats = db.prepare(`
            SELECT 
                COUNT(CASE WHEN buyer_id = ? THEN 1 END) as total_purchases,
                COUNT(CASE WHEN seller_id = ? THEN 1 END) as total_sales,
                COALESCE(SUM(CASE WHEN buyer_id = ? THEN total_amount END), 0) as total_spent,
                COALESCE(SUM(CASE WHEN seller_id = ? THEN total_amount END), 0) as total_earned
            FROM orders
            WHERE status != 'cancelled'
        `).get(userId, userId, userId, userId);

        const referralStats = db.prepare(`
            SELECT COUNT(*) as referral_count 
            FROM users 
            WHERE invitor_id = ?
        `).get(userId);

        res.json({
            success: true,
            user: {
                ...user,
                stats: {
                    ...orderStats,
                    referral_count: referralStats.referral_count
                }
            }
        });
    } catch (error) {
        console.error('[API] Error getting user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user',
            error: error.message
        });
    }
};

// Register new user
export const registerUser = async (req, res) => {
    const { username, email, password, full_name, phone, invite_code } = req.body;

    console.log('[API] Register request for username:', username);

    if (!username || !password || !full_name) {
        return res.status(400).json({
            success: false,
            message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
        });
    }

    const db = getDatabase();

    try {
        // Check if username already exists
        const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (existingUser) {
            console.log('[API] Username already exists:', username);
            return res.status(400).json({
                success: false,
                message: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว'
            });
        }

        // Check if email already exists (if provided)
        if (email) {
            const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
            if (existingEmail) {
                console.log('[API] Email already exists:', email);
                return res.status(400).json({
                    success: false,
                    message: 'อีเมลนี้ถูกใช้แล้ว'
                });
            }
        }

        // Handle invitor/parent relationship
        let invitorId = null;
        let parentId = null;

        if (invite_code) {
            const invitor = db.prepare('SELECT id FROM users WHERE invite_code = ?').get(invite_code);
            if (invitor) {
                invitorId = invitor.id;
                parentId = invitor.id;
                console.log('[API] Found invitor:', invitor.id);
            }
        }

        // Generate unique invite code
        let userInviteCode;
        let attempts = 0;
        do {
            userInviteCode = username.toUpperCase() + Math.random().toString(36).substring(2, 8).toUpperCase();
            const existing = db.prepare('SELECT id FROM users WHERE invite_code = ?').get(userInviteCode);
            if (!existing) break;
            attempts++;
        } while (attempts < 10);

        // Generate user ID
        const timestamp = Date.now().toString();
        const randomId = Math.random().toString(36).substring(2, 7);
        const userId = `user_${timestamp}_${randomId}`;

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        const insertStmt = db.prepare(`
            INSERT INTO users (
                id, username, email, password, full_name, phone, 
                invite_code, invitor_id, parent_id, status, created_at, last_login
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'), datetime('now'))
        `);

        const result = insertStmt.run(
            userId, username, email || null, hashedPassword, 
            full_name, phone || null, userInviteCode, invitorId, parentId
        );

        console.log('[API] User registered successfully:', { userId, username });

        // Get the created user
        const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

        res.status(201).json({
            success: true,
            message: 'สมัครสมาชิกสำเร็จ',
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                full_name: newUser.full_name,
                invite_code: newUser.invite_code
            }
        });

    } catch (error) {
        console.error('[API] Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการสมัครสมาชิก',
            error: error.message
        });
    }
};

// Login user
export const loginUser = async (req, res) => {
    const { username, password } = req.body;

    console.log('[API] Login request for username:', username);

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'
        });
    }

    const db = getDatabase();

    try {
        const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, username);

        if (!user) {
            console.log('[API] User not found:', username);
            return res.status(401).json({
                success: false,
                message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
            });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            console.log('[API] Invalid password for user:', username);
            return res.status(401).json({
                success: false,
                message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
            });
        }

        // Update last login
        db.prepare('UPDATE users SET last_login = datetime("now") WHERE id = ?').run(user.id);

        console.log('[API] Login successful:', { userId: user.id, username: user.username });

        res.json({
            success: true,
            message: 'เข้าสู่ระบบสำเร็จ',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                phone: user.phone,
                profile_image: user.profile_image,
                invite_code: user.invite_code,
                wallet_balance: user.wallet_balance || 0,
                wld_balance: user.wld_balance || 0
            }
        });

    } catch (error) {
        console.error('[API] Login error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ',
            error: error.message
        });
    }
};

// Update user
export const updateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const updateData = req.body;
        const db = getDatabase();

        console.log('[API] Update user:', userId, updateData);

        // Check if user exists
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Build update query dynamically
        const updateFields = [];
        const values = [];

        const allowedFields = ['full_name', 'email', 'phone', 'status', 'profile_image', 
                              'wallet_balance', 'wld_balance', 'bio', 'address'];

        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                updateFields.push(`${field} = ?`);
                values.push(updateData[field]);
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }

        // Add userId to values array
        values.push(userId);

        const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
        const result = db.prepare(updateQuery).run(...values);

        console.log('[API] User updated:', result.changes);

        // Get updated user
        const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

        res.json({
            success: true,
            message: 'User updated successfully',
            user: updatedUser
        });

    } catch (error) {
        console.error('[API] Error updating user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user',
            error: error.message
        });
    }
};

// Delete user
export const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const db = getDatabase();

        console.log('[API] Delete user request:', userId);

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if user is root (Anatta999)
        if (!user.invitor_id) {
            return res.status(403).json({
                success: false,
                message: 'Cannot delete root user'
            });
        }

        // Delete user
        const result = db.prepare('DELETE FROM users WHERE id = ?').run(userId);

        console.log('[API] User deleted:', result.changes);

        res.json({
            success: true,
            message: 'User deleted successfully'
        });

    } catch (error) {
        console.error('[API] Error deleting user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user',
            error: error.message
        });
    }
};

export default {
    getUsers,
    getUserById,
    registerUser,
    loginUser,
    updateUser,
    deleteUser
};