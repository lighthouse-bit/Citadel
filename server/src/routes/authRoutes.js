const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateUser } = require('../middleware/auth');

// Register
router.post('/register', authController.register);

// Login
router.post('/login', authController.login);

// email
router.get('/verify-email', authController.verifyEmail); 

// Get Profile (Protected)
router.get('/me', authenticateUser, authController.getProfile);

module.exports = router;