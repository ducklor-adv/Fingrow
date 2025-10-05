import { getDatabase } from '../config/database.js';

// Simple authentication middleware
export const authenticate = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    try {
        const db = getDatabase();
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid user'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('[Auth] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Authentication error'
        });
    }
};

// Admin authentication middleware
export const authenticateAdmin = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'Admin authentication required'
        });
    }

    try {
        const db = getDatabase();
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid user'
            });
        }

        // Check if user is admin (you can modify this logic)
        // For now, we'll check if username is 'admin' or 'Anatta999'
        if (!['admin', 'Anatta999'].includes(user.username)) {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('[Auth] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Authentication error'
        });
    }
};

// Optional authentication - doesn't fail if no auth, but adds user if present
export const optionalAuth = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    
    if (userId) {
        try {
            const db = getDatabase();
            const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
            if (user) {
                req.user = user;
            }
        } catch (error) {
            console.error('[Auth] Optional auth error:', error);
        }
    }
    
    next();
};

export default { authenticate, authenticateAdmin, optionalAuth };