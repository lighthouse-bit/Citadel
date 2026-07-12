const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateUser, authenticateAdmin } = require('../middleware/auth');
const { authRateLimit } = require('../middleware/security');
router.use(authRateLimit);

// Register
router.post('/register', authController.register);

// Login snkfs
router.post('/login', authController.login);
router.post('/admin/login', authController.adminLogin);
router.post('/admin/change-password', authenticateAdmin, authController.changeAdminPassword);
router.post('/admin/forgot-password', authController.requestAdminPasswordReset);
router.post('/admin/reset-password', authController.resetAdminPassword);

router.post('/google', authController.googleAuth);

// email
router.get('/verify-email', authController.verifyEmail); 

router.post('/resend-verification', authenticateUser, authController.resendVerification);

// Get Profile (Protected)
router.get('/me', authenticateUser, authController.getProfile);

module.exports = router;
