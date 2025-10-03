// Database API for Admin Interface
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(dirname(__dirname));
const dbPath = join(projectRoot, 'data', 'fingrow.db');

// Database connection
let db = null;

function getDatabase() {
    if (!db) {
        db = new Database(dbPath);
        db.pragma('foreign_keys = ON');
    }
    return db;
}

// Admin Database Service
class AdminDatabaseService {
    // Users
    async getAllUsers() {
        const database = getDatabase();
        try {
            const users = database.prepare(`
                SELECT u.*,
                       -- Follower count (people who used this user's invite code)
                       (SELECT COUNT(*) FROM users WHERE invitor_id = u.id) as follower_count,

                       -- Purchase stats (as buyer)
                       (SELECT COUNT(*) FROM orders WHERE buyer_id = u.id) as purchase_count,
                       (SELECT SUM(total_amount) FROM orders WHERE buyer_id = u.id AND status = 'completed') as total_spent,

                       -- Sales stats (as seller)
                       (SELECT COUNT(*) FROM orders WHERE seller_id = u.id) as sales_count,
                       (SELECT SUM(total_amount) FROM orders WHERE seller_id = u.id AND status = 'completed') as total_sales,
                       (SELECT SUM(community_fee) FROM orders WHERE seller_id = u.id AND status = 'completed') as total_fees_paid,

                       -- Earnings (from referrals and sales)
                       (SELECT SUM(amount_local) FROM earnings WHERE user_id = u.id) as total_earnings,

                       -- Products listed
                       (SELECT COUNT(*) FROM products WHERE seller_id = u.id) as products_count
                FROM users u
                ORDER BY u.created_at DESC
            `).all();

            // Calculate network statistics for each user
            const usersWithNetwork = users.map(user => {
                try {
                    // Get all network member IDs using recursive CTE
                    const networkMembers = database.prepare(`
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
                        const networkStats = database.prepare(`
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
                        networkBreakdown = database.prepare(`
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

            return usersWithNetwork.map(user => ({
                ...user,
                is_verified: Boolean(user.is_verified),
                is_active: Boolean(user.is_active),
                is_suspended: Boolean(user.is_suspended),

                // Stats for display
                follower_count: user.follower_count || 0,
                purchase_count: user.purchase_count || 0,
                total_spent: user.total_spent || 0,
                sales_count: user.sales_count || 0,
                total_sales: user.total_sales || 0,
                total_fees_paid: user.total_fees_paid || 0,
                total_earnings: user.total_earnings || 0,
                products_count: user.products_count || 0,

                // Network stats
                network_size: user.network_size || 0,
                network_fees: user.network_fees || 0,
                network_sales: user.network_sales || 0,
                network_orders: user.network_orders || 0,
                network_breakdown: user.network_breakdown || [],
                loyalty_fee: user.loyalty_fee || 0,

                location: user.location ? JSON.parse(user.location) : null,

                // Format stats object for backward compatibility
                stats: {
                    purchases: {
                        count: user.purchase_count || 0,
                        totalAmount: user.total_spent || 0
                    },
                    sales: {
                        count: user.sales_count || 0,
                        totalAmount: user.total_sales || 0
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
        } catch (error) {
            console.error('Error getting users:', error);
            return [];
        }
    }

    async getUserById(userId) {
        const database = getDatabase();
        try {
            const user = database.prepare('SELECT * FROM users WHERE id = ?').get(userId);
            if (!user) return null;

            return {
                ...user,
                is_verified: Boolean(user.is_verified),
                is_active: Boolean(user.is_active),
                is_suspended: Boolean(user.is_suspended),
                location: user.location ? JSON.parse(user.location) : null
            };
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    }

    async updateUser(userId, updates) {
        const database = getDatabase();
        try {
            // Convert boolean values
            const processedUpdates = { ...updates };
            if ('is_verified' in processedUpdates) {
                processedUpdates.is_verified = processedUpdates.is_verified ? 1 : 0;
            }
            if ('is_active' in processedUpdates) {
                processedUpdates.is_active = processedUpdates.is_active ? 1 : 0;
            }
            if ('is_suspended' in processedUpdates) {
                processedUpdates.is_suspended = processedUpdates.is_suspended ? 1 : 0;
            }
            if (processedUpdates.location && typeof processedUpdates.location === 'object') {
                processedUpdates.location = JSON.stringify(processedUpdates.location);
            }

            // Add updated timestamp
            processedUpdates.updated_at = new Date().toISOString();

            const setClause = Object.keys(processedUpdates).map(key => `${key} = ?`).join(', ');
            const values = Object.values(processedUpdates);

            const result = database.prepare(`UPDATE users SET ${setClause} WHERE id = ?`).run(...values, userId);
            return result.changes > 0;
        } catch (error) {
            console.error('Error updating user:', error);
            return false;
        }
    }

    async deleteUser(userId) {
        const database = getDatabase();
        try {
            const result = database.prepare('DELETE FROM users WHERE id = ?').run(userId);
            return result.changes > 0;
        } catch (error) {
            console.error('Error deleting user:', error);
            return false;
        }
    }

    // Products
    async getAllProducts() {
        const database = getDatabase();
        try {
            const products = database.prepare(`
                SELECT p.*,
                       u.username as seller_username,
                       u.email as seller_email,
                       c.name as category_name,
                       c.name_th as category_name_th,
                       (SELECT COUNT(*) FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE oi.product_id = p.id AND o.status = 'completed') as sales_count
                FROM products p
                LEFT JOIN users u ON p.seller_id = u.id
                LEFT JOIN categories c ON p.category_id = c.id
                ORDER BY p.created_at DESC
            `).all();

            return products.map(product => ({
                ...product,
                is_available: Boolean(product.is_available),
                is_featured: Boolean(product.is_featured),
                images: product.images ? JSON.parse(product.images) : [],
                location: product.location ? JSON.parse(product.location) : null,
                sales_count: product.sales_count || 0
            }));
        } catch (error) {
            console.error('Error getting products:', error);
            return [];
        }
    }

    async updateProductStatus(productId, status, adminNotes = '') {
        const database = getDatabase();
        try {
            const updates = {
                status,
                updated_at: new Date().toISOString()
            };

            if (adminNotes) {
                updates.admin_notes = adminNotes;
            }

            const result = database.prepare(`
                UPDATE products
                SET status = ?, updated_at = ?, admin_notes = COALESCE(?, admin_notes)
                WHERE id = ?
            `).run(status, updates.updated_at, adminNotes || null, productId);

            return result.changes > 0;
        } catch (error) {
            console.error('Error updating product status:', error);
            return false;
        }
    }

    // Orders
    async getAllOrders() {
        const database = getDatabase();
        try {
            const orders = database.prepare(`
                SELECT o.*,
                       buyer.username as buyer_username,
                       buyer.email as buyer_email,
                       seller.username as seller_username,
                       seller.email as seller_email
                FROM orders o
                LEFT JOIN users buyer ON o.buyer_id = buyer.id
                LEFT JOIN users seller ON o.seller_id = seller.id
                ORDER BY o.order_date DESC
            `).all();

            return orders.map(order => ({
                ...order,
                shipping_address: order.shipping_address ? JSON.parse(order.shipping_address) : null
            }));
        } catch (error) {
            console.error('Error getting orders:', error);
            return [];
        }
    }

    // Dashboard Stats
    async getDashboardStats() {
        const database = getDatabase();
        try {
            const stats = {};

            // Total users
            stats.totalUsers = database.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').get().count;

            // Total products
            stats.totalProducts = database.prepare("SELECT COUNT(*) as count FROM products WHERE status = 'active'").get().count;

            // Total orders
            const orderStats = database.prepare(`
                SELECT
                    COUNT(*) as totalOrders,
                    SUM(total_amount) as totalRevenue
                FROM orders
                WHERE status = 'completed'
            `).get();

            stats.totalOrders = orderStats.totalOrders || 0;
            stats.totalRevenue = orderStats.totalRevenue || 0;

            // New users this month
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            stats.newUsersThisMonth = database.prepare(
                'SELECT COUNT(*) as count FROM users WHERE created_at >= ?'
            ).get(startOfMonth.toISOString()).count;

            // Active listings
            stats.activeListings = database.prepare(
                "SELECT COUNT(*) as count FROM products WHERE is_available = 1 AND status = 'active'"
            ).get().count;

            return stats;
        } catch (error) {
            console.error('Error getting dashboard stats:', error);
            return {};
        }
    }

    // Categories
    async getAllCategories() {
        const database = getDatabase();
        try {
            const categories = database.prepare(`
                SELECT c.*,
                       (SELECT COUNT(*) FROM products WHERE category_id = c.id AND status = 'active') as product_count
                FROM categories c
                ORDER BY c.sort_order
            `).all();

            return categories.map(category => ({
                ...category,
                is_active: Boolean(category.is_active),
                product_count: category.product_count || 0
            }));
        } catch (error) {
            console.error('Error getting categories:', error);
            return [];
        }
    }

    // Reviews
    async getAllReviews() {
        const database = getDatabase();
        try {
            const reviews = database.prepare(`
                SELECT r.*,
                       reviewer.username as reviewer_username,
                       reviewed_user.username as reviewed_user_username,
                       p.title as product_title
                FROM reviews r
                LEFT JOIN users reviewer ON r.reviewer_id = reviewer.id
                LEFT JOIN users reviewed_user ON r.reviewed_user_id = reviewed_user.id
                LEFT JOIN products p ON r.product_id = p.id
                ORDER BY r.created_at DESC
            `).all();

            return reviews.map(review => ({
                ...review,
                is_visible: Boolean(review.is_visible),
                is_verified_purchase: Boolean(review.is_verified_purchase),
                images: review.images ? JSON.parse(review.images) : []
            }));
        } catch (error) {
            console.error('Error getting reviews:', error);
            return [];
        }
    }

    // Search users
    async searchUsers(searchTerm) {
        const database = getDatabase();
        try {
            const users = database.prepare(`
                SELECT * FROM users
                WHERE username LIKE ?
                   OR email LIKE ?
                   OR full_name LIKE ?
                ORDER BY created_at DESC
            `).all(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);

            return users.map(user => ({
                ...user,
                is_verified: Boolean(user.is_verified),
                is_active: Boolean(user.is_active),
                is_suspended: Boolean(user.is_suspended),
                location: user.location ? JSON.parse(user.location) : null
            }));
        } catch (error) {
            console.error('Error searching users:', error);
            return [];
        }
    }
}

// Export for use
const adminDB = new AdminDatabaseService();

// Make it available globally for the admin interface
if (typeof window !== 'undefined') {
    window.AdminDatabaseService = adminDB;
}

export default AdminDatabaseService;