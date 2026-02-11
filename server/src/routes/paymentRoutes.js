// server/src/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

router.post('/create-intent', paymentController.createPaymentIntent);
router.post('/commission-payment', paymentController.createCommissionPayment);
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

module.exports = router;