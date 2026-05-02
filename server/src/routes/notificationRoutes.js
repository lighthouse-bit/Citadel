const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateAdmin } = require('../middleware/auth');

// ✅ Specific routes MUST come before dynamic routes
router.get('/', authenticateAdmin, notificationController.getNotifications);
router.patch('/read-all', authenticateAdmin, notificationController.markAllAsRead); // ✅ moved up
router.patch('/:id/read', authenticateAdmin, notificationController.markAsRead);
router.delete('/:id', authenticateAdmin, notificationController.deleteNotification);

module.exports = router;