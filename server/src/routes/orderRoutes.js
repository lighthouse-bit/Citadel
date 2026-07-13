// server/src/routes/orderRoutes.js
const express = require('express');
const router  = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateAdmin, authenticateUser } = require('../middleware/auth');


// ✅ Public tracking — search by order number
router.post('/track', authenticateUser, orderController.trackOrder);
router.get('/track/:orderNumber', authenticateUser, orderController.trackOrder);

// Create order (guest or logged-in user)
router.post('/', authenticateUser, orderController.createOrder);

router.patch('/bulk/status', authenticateAdmin, orderController.bulkUpdateStatus);
router.get('/admin/export', authenticateAdmin, orderController.exportOrders);

// Get all orders (admin sees all, user filtered by email)
router.get('/', authenticateUser, orderController.getAllOrders);

// Get single order
router.get('/:id', authenticateUser, orderController.getOrderById);

// Update status / tracking / notes (Admin)
router.patch('/:id/status', authenticateAdmin, orderController.updateOrderStatus);
router.post('/:id/resend-email', authenticateAdmin, orderController.resendOrderEmail);
router.post('/:id/cancel', authenticateAdmin, orderController.cancelOrder);

// ✅ Confirm payment after Stripe succeeds (User)
router.post('/:id/confirm-payment', authenticateUser, orderController.confirmOrderPayment);

module.exports = router;
