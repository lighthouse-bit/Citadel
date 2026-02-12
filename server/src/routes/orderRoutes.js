const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateAdmin, authenticateUser } = require('../middleware/auth');

// Public/User: Create Order (authenticateUser handles guest vs logged-in logic)
router.post('/', authenticateUser, orderController.createOrder);

// User/Admin: Get All Orders (authenticateUser allows users to see own, Admin sees all via controller logic or middleware check inside)
// For security, usually you'd separate these, but we'll use the controller filter logic for now.
router.get('/', authenticateUser, orderController.getAllOrders);

// Admin/User: Get Single Order
router.get('/:id', authenticateUser, orderController.getOrderById);

// Admin: Update Status
router.patch('/:id/status', authenticateAdmin, orderController.updateOrderStatus);

module.exports = router;