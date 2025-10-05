import express from 'express';
import * as orderController from '../controllers/orderController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All order routes require authentication
router.use(authenticate);

// Order management
router.get('/', orderController.getOrders);
router.get('/:orderId', orderController.getOrderById);
router.post('/', orderController.createOrder);
router.put('/:orderId/status', orderController.updateOrderStatus);

// User-specific order routes
router.get('/buyer/:userId', orderController.getBuyerOrders);
router.get('/seller/:userId', orderController.getSellerOrders);

export default router;