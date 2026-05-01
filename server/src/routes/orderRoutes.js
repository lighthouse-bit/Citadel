// server/src/routes/orderRoutes.js
const express = require('express');
const router  = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateAdmin, authenticateUser } = require('../middleware/auth');

// Create order (guest or logged-in user)
router.post('/', authenticateUser, orderController.createOrder);

// Get all orders (admin sees all, user filtered by email)
router.get('/', authenticateUser, orderController.getAllOrders);

// Get single order
router.get('/:id', authenticateUser, orderController.getOrderById);

// Update status / tracking / notes (Admin)
router.patch('/:id/status', authenticateAdmin, orderController.updateOrderStatus);

// ✅ Confirm payment after Stripe succeeds (User)
router.post('/:id/confirm-payment', authenticateUser, orderController.confirmOrderPayment);

module.exports = router;