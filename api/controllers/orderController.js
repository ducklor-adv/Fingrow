import { getDatabase } from '../config/database.js';

// Get all orders with filters
export const getOrders = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            status,
            buyer_id,
            seller_id
        } = req.query;

        const db = getDatabase();
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM orders WHERE 1=1';
        const params = [];

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        if (buyer_id) {
            query += ' AND buyer_id = ?';
            params.push(buyer_id);
        }

        if (seller_id) {
            query += ' AND seller_id = ?';
            params.push(seller_id);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const orders = db.prepare(query).all(...params);

        // Get total count
        let totalQuery = 'SELECT COUNT(*) as count FROM orders WHERE 1=1';
        const totalParams = [];

        if (status) {
            totalQuery += ' AND status = ?';
            totalParams.push(status);
        }

        if (buyer_id) {
            totalQuery += ' AND buyer_id = ?';
            totalParams.push(buyer_id);
        }

        if (seller_id) {
            totalQuery += ' AND seller_id = ?';
            totalParams.push(seller_id);
        }

        const total = db.prepare(totalQuery).get(...totalParams).count;

        res.json({
            success: true,
            orders,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('[API] Error getting orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get orders',
            error: error.message
        });
    }
};

// Get single order
export const getOrderById = async (req, res) => {
    try {
        const { orderId } = req.params;
        const db = getDatabase();

        const order = db.prepare(`
            SELECT o.*, 
                   b.username as buyer_username, b.full_name as buyer_name,
                   s.username as seller_username, s.full_name as seller_name,
                   p.title as product_title, p.images as product_images
            FROM orders o
            LEFT JOIN users b ON o.buyer_id = b.id
            LEFT JOIN users s ON o.seller_id = s.id
            LEFT JOIN products p ON o.product_id = p.id
            WHERE o.id = ?
        `).get(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.json({
            success: true,
            order
        });

    } catch (error) {
        console.error('[API] Error getting order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get order',
            error: error.message
        });
    }
};

// Create order
export const createOrder = async (req, res) => {
    try {
        const {
            buyer_id,
            seller_id,
            product_id,
            quantity = 1,
            total_amount,
            shipping_address,
            payment_method
        } = req.body;

        if (!buyer_id || !seller_id || !product_id || !total_amount) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const db = getDatabase();

        // Check if product is available
        const product = db.prepare('SELECT * FROM products WHERE id = ? AND status = "available"').get(product_id);
        if (!product) {
            return res.status(400).json({
                success: false,
                message: 'Product not available'
            });
        }

        // Generate order ID
        const timestamp = Date.now().toString();
        const randomId = Math.random().toString(36).substring(2, 7);
        const orderId = `order_${timestamp}_${randomId}`;

        // Create order
        const insertStmt = db.prepare(`
            INSERT INTO orders (
                id, buyer_id, seller_id, product_id, quantity,
                total_amount, status, shipping_address, payment_method,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, datetime('now'))
        `);

        const result = insertStmt.run(
            orderId,
            buyer_id,
            seller_id,
            product_id,
            quantity,
            total_amount,
            shipping_address || '',
            payment_method || 'bank_transfer'
        );

        console.log('[API] Order created:', orderId);

        // Update product status if only 1 quantity
        if (product.quantity <= quantity) {
            db.prepare('UPDATE products SET status = "sold" WHERE id = ?').run(product_id);
        } else {
            db.prepare('UPDATE products SET quantity = quantity - ? WHERE id = ?').run(quantity, product_id);
        }

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            orderId
        });

    } catch (error) {
        console.error('[API] Error creating order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order',
            error: error.message
        });
    }
};

// Update order status
export const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;
        const db = getDatabase();

        const validStatuses = ['pending', 'confirmed', 'paid', 'shipped', 'delivered', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const result = db.prepare('UPDATE orders SET status = ?, updated_at = datetime("now") WHERE id = ?')
            .run(status, orderId);

        // If cancelled, restore product availability
        if (status === 'cancelled') {
            db.prepare('UPDATE products SET status = "available", quantity = quantity + ? WHERE id = ?')
                .run(order.quantity, order.product_id);
        }

        console.log('[API] Order status updated:', { orderId, status });

        res.json({
            success: true,
            message: 'Order status updated successfully'
        });

    } catch (error) {
        console.error('[API] Error updating order status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order status',
            error: error.message
        });
    }
};

// Get buyer orders
export const getBuyerOrders = async (req, res) => {
    try {
        const { userId } = req.params;
        const db = getDatabase();

        const orders = db.prepare(`
            SELECT o.*, p.title as product_title, p.images as product_images,
                   s.username as seller_username, s.full_name as seller_name
            FROM orders o
            LEFT JOIN products p ON o.product_id = p.id
            LEFT JOIN users s ON o.seller_id = s.id
            WHERE o.buyer_id = ?
            ORDER BY o.created_at DESC
        `).all(userId);

        res.json({
            success: true,
            orders
        });

    } catch (error) {
        console.error('[API] Error getting buyer orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get buyer orders',
            error: error.message
        });
    }
};

// Get seller orders
export const getSellerOrders = async (req, res) => {
    try {
        const { userId } = req.params;
        const db = getDatabase();

        const orders = db.prepare(`
            SELECT o.*, p.title as product_title, p.images as product_images,
                   b.username as buyer_username, b.full_name as buyer_name
            FROM orders o
            LEFT JOIN products p ON o.product_id = p.id
            LEFT JOIN users b ON o.buyer_id = b.id
            WHERE o.seller_id = ?
            ORDER BY o.created_at DESC
        `).all(userId);

        res.json({
            success: true,
            orders
        });

    } catch (error) {
        console.error('[API] Error getting seller orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get seller orders',
            error: error.message
        });
    }
};

export default {
    getOrders,
    getOrderById,
    createOrder,
    updateOrderStatus,
    getBuyerOrders,
    getSellerOrders
};