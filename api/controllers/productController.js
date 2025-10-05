import { getDatabase } from '../config/database.js';

// Get all products with pagination and filters
export const getProducts = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            search = '', 
            category = '', 
            minPrice, 
            maxPrice,
            seller_id,
            status = 'available'
        } = req.query;

        const db = getDatabase();
        const offset = (page - 1) * limit;

        console.log('[API] Get products request:', req.query);

        let query = 'SELECT * FROM products WHERE 1=1';
        const params = [];

        if (search) {
            query += ' AND (title LIKE ? OR description LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern);
        }

        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }

        if (minPrice) {
            query += ' AND price >= ?';
            params.push(parseFloat(minPrice));
        }

        if (maxPrice) {
            query += ' AND price <= ?';
            params.push(parseFloat(maxPrice));
        }

        if (seller_id) {
            query += ' AND seller_id = ?';
            params.push(seller_id);
        }

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const products = db.prepare(query).all(...params);

        // Get total count
        let totalQuery = 'SELECT COUNT(*) as count FROM products WHERE 1=1';
        const totalParams = [];

        if (search) {
            totalQuery += ' AND (title LIKE ? OR description LIKE ?)';
            const searchPattern = `%${search}%`;
            totalParams.push(searchPattern, searchPattern);
        }

        if (category) {
            totalQuery += ' AND category = ?';
            totalParams.push(category);
        }

        if (minPrice) {
            totalQuery += ' AND price >= ?';
            totalParams.push(parseFloat(minPrice));
        }

        if (maxPrice) {
            totalQuery += ' AND price <= ?';
            totalParams.push(parseFloat(maxPrice));
        }

        if (seller_id) {
            totalQuery += ' AND seller_id = ?';
            totalParams.push(seller_id);
        }

        if (status) {
            totalQuery += ' AND status = ?';
            totalParams.push(status);
        }

        const total = db.prepare(totalQuery).get(...totalParams).count;

        console.log(`[API] Found ${products.length} products, total: ${total}`);

        res.json({
            success: true,
            products,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('[API] Error getting products:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get products',
            error: error.message
        });
    }
};

// Get single product by ID
export const getProductById = async (req, res) => {
    try {
        const { productId } = req.params;
        const db = getDatabase();

        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Get seller information
        const seller = db.prepare('SELECT id, username, full_name, profile_image FROM users WHERE id = ?').get(product.seller_id);

        res.json({
            success: true,
            product: {
                ...product,
                seller
            }
        });

    } catch (error) {
        console.error('[API] Error getting product:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get product',
            error: error.message
        });
    }
};

// Create new product
export const createProduct = async (req, res) => {
    try {
        const {
            title,
            description,
            price,
            category,
            condition,
            images = [],
            quantity = 1,
            seller_id
        } = req.body;

        if (!title || !price || !category || !seller_id) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: title, price, category, seller_id'
            });
        }

        const db = getDatabase();

        // Generate product ID
        const timestamp = Date.now().toString();
        const randomId = Math.random().toString(36).substring(2, 7);
        const productId = `prod_${timestamp}_${randomId}`;

        // Insert product
        const insertStmt = db.prepare(`
            INSERT INTO products (
                id, seller_id, title, description, price, category, 
                condition, images, quantity, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'available', datetime('now'))
        `);

        const result = insertStmt.run(
            productId,
            seller_id,
            title,
            description || '',
            price,
            category,
            condition || 'ดี',
            JSON.stringify(images),
            quantity
        );

        console.log('[API] Product created:', productId);

        // Get created product
        const newProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            product: newProduct
        });

    } catch (error) {
        console.error('[API] Error creating product:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create product',
            error: error.message
        });
    }
};

// Update product
export const updateProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const updateData = req.body;
        const db = getDatabase();

        // Check if product exists
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Build update query
        const updateFields = [];
        const values = [];
        const allowedFields = ['title', 'description', 'price', 'category', 
                              'condition', 'images', 'quantity', 'status'];

        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                updateFields.push(`${field} = ?`);
                values.push(field === 'images' ? JSON.stringify(updateData[field]) : updateData[field]);
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }

        values.push(productId);

        const updateQuery = `UPDATE products SET ${updateFields.join(', ')}, updated_at = datetime('now') WHERE id = ?`;
        const result = db.prepare(updateQuery).run(...values);

        console.log('[API] Product updated:', result.changes);

        // Get updated product
        const updatedProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);

        res.json({
            success: true,
            message: 'Product updated successfully',
            product: updatedProduct
        });

    } catch (error) {
        console.error('[API] Error updating product:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update product',
            error: error.message
        });
    }
};

// Delete product
export const deleteProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const db = getDatabase();

        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Soft delete by updating status
        const result = db.prepare('UPDATE products SET status = "deleted" WHERE id = ?').run(productId);

        console.log('[API] Product deleted:', result.changes);

        res.json({
            success: true,
            message: 'Product deleted successfully'
        });

    } catch (error) {
        console.error('[API] Error deleting product:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete product',
            error: error.message
        });
    }
};

export default {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
};