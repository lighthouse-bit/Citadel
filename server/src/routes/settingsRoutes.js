// server/src/routes/settingsRoutes.js
const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticateAdmin } = require('../middleware/auth');

// Get current settings (public - no auth needed for reading)
router.get('/', settingsController.getSettings);

// Update settings (Admin only)
router.put('/', authenticateAdmin, settingsController.updateSettings);

// Reset settings to defaults (Admin only)
router.post('/reset', authenticateAdmin, settingsController.resetSettings);

module.exports = router;