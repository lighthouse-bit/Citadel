// server/src/routes/paymentRoutes.js

const express = require('express');
const router  = express.Router();
const prisma  = require('../config/database');
const https   = require('https');

const {
  sendOrderInvoiceEmail,
  sendCommissionDepositInvoiceEmail,
  sendCommissionBalanceInvoiceEmail,
} = require('../utils/emailService');

const { authenticateUser } = require('../middleware/auth');

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

// =============================
// USD → NGN conversion rate
// =============================
const USD_TO_NGN = 1600;

// ─────────────────────────────────────────────
// PAYSTACK INIT HELPER
// ─────────────────────────────────────────────
const initializePaystackTransaction = (data) => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);

    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: '/transaction/initialize',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', chunk => responseData += chunk);

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
};

// ─────────────────────────────────────────────
// ARTWORK PAYMENT INIT
// ─────────────────────────────────────────────
router.post('/artwork-payment', authenticateUser, async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const usdAmount = parseFloat(order.total);
    const ngnAmount = usdAmount * USD_TO_NGN;

    const paystackData = await initializePaystackTransaction({
      email: order.customer.email,
      amount: Math.round(ngnAmount * 100),
      currency: 'NGN',
      reference: `artwork_${order.id}_${Date.now()}`,
      metadata: {
        orderId: order.id,
        paymentType: 'artwork',
      },
      callback_url: `${process.env.CLIENT_URL}/checkout/success`,
    });

    if (!paystackData.status) {
      return res.status(500).json(paystackData);
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        stripePaymentIntentId: paystackData.data.reference,
      },
    });

    res.json({
      authorizationUrl: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
      total: usdAmount,
      currency: 'USD',
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Payment init failed' });
  }
});


// ─────────────────────────────────────────────
// ✅ NEW: COMMISSION DEPOSIT PAYMENT INIT (FIXED)
// ─────────────────────────────────────────────
router.post('/commission-deposit', authenticateUser, async (req, res) => {
  try {
    const { commissionId } = req.body;

    const commission = await prisma.commission.findUnique({
      where: { id: commissionId },
      include: { client: true },
    });

    if (!commission) {
      return res.status(404).json({ error: 'Commission not found' });
    }

    const usdAmount = parseFloat(commission.depositAmount || commission.totalAmount);
    const ngnAmount = usdAmount * USD_TO_NGN;

    const paystackData = await initializePaystackTransaction({
      email: commission.client.email,
      amount: Math.round(ngnAmount * 100),
      currency: 'NGN',
      reference: `commission_deposit_${commission.id}_${Date.now()}`,
      metadata: {
        commissionId: commission.id,
        paymentType: 'commission_deposit',
      },
      callback_url: `${process.env.CLIENT_URL}/checkout/success`,
    });

    if (!paystackData.status) {
      return res.status(500).json(paystackData);
    }

    await prisma.commission.update({
      where: { id: commissionId },
      data: {
        depositReference: paystackData.data.reference,
      },
    });

    res.json({
      authorizationUrl: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
      total: usdAmount,
      currency: 'USD',
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Commission deposit init failed' });
  }
});


// ─────────────────────────────────────────────
// PAYMENT STATUS CHECK
// ─────────────────────────────────────────────
router.get('/status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        paymentStatus: true,
        status: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const paid = order.paymentStatus === 'FULLY_PAID';

    res.json({
      success: true,
      paid,
      paymentStatus: order.paymentStatus,
      orderStatus: order.status,
    });

  } catch (err) {
    console.error('STATUS ERROR:', err);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

module.exports = router;