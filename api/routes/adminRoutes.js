import express from 'express';
import { authenticateAdmin } from '../middleware/auth.js';
import { getDatabase } from '../config/database.js';

const router = express.Router();

// All admin routes require admin authentication
router.use(authenticateAdmin);

// Dashboard stats
router.get('/dashboard/stats', (req, res) => {
    try {
        const db = getDatabase();
        
        const stats = {
            totalUsers: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
            totalProducts: db.prepare('SELECT COUNT(*) as count FROM products WHERE status = "available"').get().count,
            totalOrders: db.prepare('SELECT COUNT(*) as count FROM orders').get().count,
            totalRevenue: db.prepare('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status != "cancelled"').get().total
        };

        res.json({ success: true, stats });
    } catch (error) {
        console.error('[Admin] Dashboard stats error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Top sellers
router.get('/dashboard/topsellers', (req, res) => {
    try {
        const db = getDatabase();
        const limit = parseInt(req.query.limit) || 5;

        const topSellers = db.prepare(`
            SELECT u.id, u.username, u.full_name, u.profile_image,
                   COUNT(o.id) as total_sales,
                   COALESCE(SUM(o.total_amount), 0) as total_revenue
            FROM users u
            JOIN orders o ON u.id = o.seller_id
            WHERE o.status != 'cancelled'
            GROUP BY u.id
            ORDER BY total_revenue DESC
            LIMIT ?
        `).all(limit);

        res.json({ success: true, topSellers });
    } catch (error) {
        console.error('[Admin] Top sellers error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Network stats
router.get('/network-stats', (req, res) => {
    try {
        const db = getDatabase();
        
        const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
        const activeUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE status = "active"').get().count;
        const totalEarnings = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM earnings WHERE type = "commission"').get().total;
        
        const levelCounts = db.prepare(`
            WITH RECURSIVE network(id, level) AS (
                SELECT id, 0 FROM users WHERE invitor_id IS NULL
                UNION ALL
                SELECT u.id, n.level + 1
                FROM users u
                JOIN network n ON u.parent_id = n.id
                WHERE n.level < 7
            )
            SELECT level, COUNT(*) as count
            FROM network
            WHERE level > 0
            GROUP BY level
            ORDER BY level
        `).all();

        res.json({
            success: true,
            stats: {
                totalUsers,
                activeUsers,
                totalEarnings,
                levelCounts
            }
        });
    } catch (error) {
        console.error('[Admin] Network stats error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Earnings summary
router.get('/earnings/summary', (req, res) => {
    try {
        const db = getDatabase();
        const { period = '7d' } = req.query;

        let dateFilter = '';
        switch (period) {
            case '24h':
                dateFilter = "AND created_at >= datetime('now', '-1 day')";
                break;
            case '7d':
                dateFilter = "AND created_at >= datetime('now', '-7 days')";
                break;
            case '30d':
                dateFilter = "AND created_at >= datetime('now', '-30 days')";
                break;
            case '90d':
                dateFilter = "AND created_at >= datetime('now', '-90 days')";
                break;
        }

        const summary = db.prepare(`
            SELECT 
                COUNT(DISTINCT user_id) as unique_earners,
                COUNT(*) as total_transactions,
                COALESCE(SUM(amount), 0) as total_amount,
                COALESCE(AVG(amount), 0) as avg_amount
            FROM earnings
            WHERE 1=1 ${dateFilter}
        `).get();

        const byType = db.prepare(`
            SELECT type, COUNT(*) as count, COALESCE(SUM(amount), 0) as total
            FROM earnings
            WHERE 1=1 ${dateFilter}
            GROUP BY type
        `).all();

        res.json({
            success: true,
            summary: {
                ...summary,
                byType
            }
        });
    } catch (error) {
        console.error('[Admin] Earnings summary error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Network tree
router.get('/network-tree/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const db = getDatabase();

        const buildTree = (parentId, level = 0, maxLevel = 7) => {
            if (level >= maxLevel) return [];

            const children = db.prepare(`
                SELECT id, username, full_name, profile_image, created_at,
                       (SELECT COUNT(*) FROM users WHERE parent_id = u.id) as child_count
                FROM users u
                WHERE parent_id = ?
                ORDER BY created_at ASC
            `).all(parentId);

            return children.map(child => ({
                ...child,
                level: level + 1,
                children: buildTree(child.id, level + 1, maxLevel)
            }));
        };

        const user = db.prepare('SELECT id, username, full_name, profile_image FROM users WHERE id = ?').get(userId);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const tree = {
            ...user,
            level: 0,
            children: buildTree(userId)
        };

        res.json({ success: true, tree });
    } catch (error) {
        console.error('[Admin] Network tree error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;