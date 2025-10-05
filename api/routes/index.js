import express from 'express';
import userRoutes from './userRoutes.js';
import productRoutes from './productRoutes.js';
import orderRoutes from './orderRoutes.js';
import adminRoutes from './adminRoutes.js';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Fingrow API is running',
        timestamp: new Date().toISOString()
    });
});

// Mount routes
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/admin', adminRoutes);

// Categories endpoint (simple implementation)
router.get('/categories', (req, res) => {
    const categories = [
        { id: '1', name: 'เสื้อผ้า', slug: 'clothing' },
        { id: '2', name: 'อิเล็กทรอนิกส์', slug: 'electronics' },
        { id: '3', name: 'เครื่องใช้ในบ้าน', slug: 'home' },
        { id: '4', name: 'กีฬา', slug: 'sports' },
        { id: '5', name: 'หนังสือ', slug: 'books' },
        { id: '6', name: 'ของเล่น', slug: 'toys' },
        { id: '7', name: 'เครื่องสำอาง', slug: 'beauty' },
        { id: '8', name: 'อื่นๆ', slug: 'other' }
    ];
    
    res.json({
        success: true,
        categories
    });
});

export default router;