const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateUser } = require('../middleware/auth');

// Register
router.post('/register', authController.register);

// Login snkfs
router.post('/login', authController.login);

router.post('/google', authController.googleAuth);

// email
router.get('/verify-email', authController.verifyEmail); 

router.post('/resend-verification', authenticateUser, authController.resendVerification);

// Get Profile (Protected)
router.get('/me', authenticateUser, authController.getProfile);

module.exports = router;
