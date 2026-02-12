const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateAdmin } = require('../middleware/auth');

router.get('/', authenticateAdmin, notificationController.getNotifications);
router.patch('/:id/read', authenticateAdmin, notificationController.markAsRead);
router.patch('/read-all', authenticateAdmin, notificationController.markAllAsRead);

module.exports = router;