import express from 'express';
import * as userController from '../controllers/userController.js';
import { authenticate, authenticateAdmin } from '../middleware/auth.js';
import { uploadProfile } from '../config/multer.js';

const router = express.Router();

// Public routes
router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);

// Protected routes
router.get('/', authenticateAdmin, userController.getUsers);
router.get('/:userId', authenticate, userController.getUserById);
router.put('/:userId', authenticate, userController.updateUser);
router.delete('/:userId', authenticateAdmin, userController.deleteUser);

// Profile image upload
router.post('/:userId/upload-avatar', authenticate, uploadProfile.single('profileImage'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image uploaded'
            });
        }

        const imageUrl = `/uploads/profiles/${req.file.filename}`;
        
        // Update user profile image in database
        const db = req.app.locals.db;
        db.prepare('UPDATE users SET profile_image = ? WHERE id = ?').run(imageUrl, req.params.userId);

        res.json({
            success: true,
            message: 'Profile image uploaded successfully',
            imageUrl
        });
    } catch (error) {
        console.error('[Upload] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload profile image',
            error: error.message
        });
    }
});

export default router;