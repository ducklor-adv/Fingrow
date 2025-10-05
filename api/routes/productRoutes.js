import express from 'express';
import * as productController from '../controllers/productController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { uploadProduct } from '../config/multer.js';

const router = express.Router();

// Public routes (with optional auth for favorites, etc.)
router.get('/', optionalAuth, productController.getProducts);
router.get('/:productId', optionalAuth, productController.getProductById);

// Protected routes
router.post('/', authenticate, productController.createProduct);
router.put('/:productId', authenticate, productController.updateProduct);
router.delete('/:productId', authenticate, productController.deleteProduct);

// Product image upload
router.post('/upload-images', authenticate, uploadProduct.array('productImages', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No images uploaded'
            });
        }

        const imageUrls = req.files.map(file => `/uploads/products/${file.filename}`);

        res.json({
            success: true,
            message: 'Product images uploaded successfully',
            imageUrls
        });
    } catch (error) {
        console.error('[Upload] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload product images',
            error: error.message
        });
    }
});

export default router;