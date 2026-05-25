// server/src/routes/paymentRoutes.js

const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const https = require('https');
const crypto = require('crypto');

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
      res.on('data', (chunk) => { responseData += chunk; });
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
// VERIFY PAYSTACK TRANSACTION
// ─────────────────────────────────────────────
const verifyPaystackTransaction = (reference) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: `/transaction/verify/${reference}`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
      },
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
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
    req.end();
  });
};

// ─────────────────────────────────────────────
// CALLBACK ROUTE (VERIFIES + UPDATES DB + REDIRECTS TO SUCCESS)
// ─────────────────────────────────────────────
router.get('/callback', async (req, res) => {
  const reference = req.query.reference || req.query.trxref;

  if (!reference) {
    return res.redirect(`${process.env.CLIENT_URL}/`);
  }

  try {
    const verification = await verifyPaystackTransaction(reference);

    if (verification.data.status !== 'success') {
      return res.redirect(`${process.env.CLIENT_URL}/checkout?error=payment_failed`);
    }

    const paymentData = verification.data;
    const metadata = paymentData.metadata || {};

    // UPDATE DATABASE
    if (metadata.paymentType === 'artwork' && metadata.orderId) {
      const updatedOrder = await prisma.order.update({
        where: { id: metadata.orderId },
        data: {
          paymentStatus: 'FULLY_PAID',
          status: 'CONFIRMED',
          paidAt: new Date(),
        },
      });

      // Send email
      try {
        const order = await prisma.order.findUnique({
          where: { id: metadata.orderId },
          include: { customer: true },
        });
        if (order?.customer) {
          await sendOrderInvoiceEmail({
            customerEmail: order.customer.email,
            customerName: `${order.customer.firstName} ${order.customer.lastName}`,
            orderNumber: order.orderNumber,
            amount: Number(paymentData.amount) / 100 / USD_TO_NGN,
            reference,
          });
        }
      } catch (emailErr) {
        console.error('Email error:', emailErr);
      }
    } 
    else if (metadata.paymentType === 'commission_deposit' && metadata.commissionId) {
      const updatedCommission = await prisma.commission.update({
        where: { id: metadata.commissionId },
        data: {
          paymentStatus: 'DEPOSIT_PAID',
          depositPaidAt: new Date(),
          status: 'IN_PROGRESS',
        },
      });

      try {
        const commission = await prisma.commission.findUnique({
          where: { id: metadata.commissionId },
          include: { customer: true },
        });
        if (commission?.customer) {
          await sendCommissionDepositInvoiceEmail({
            customerEmail: commission.customer.email,
            customerName: `${commission.customer.firstName} ${commission.customer.lastName}`,
            commissionNumber: commission.commissionNumber,
            amount: Number(paymentData.amount) / 100 / USD_TO_NGN,
            reference,
          });
        }
      } catch (emailErr) {
        console.error('Email error:', emailErr);
      }
    }

    // Redirect to success page
    return res.redirect(`${process.env.CLIENT_URL}/checkout/success?reference=${reference}`);

  } catch (err) {
    console.error('Callback error:', err);
    return res.redirect(`${process.env.CLIENT_URL}/checkout?error=verification_error`);
  }
});

// ─────────────────────────────────────────────
// WEBHOOK (Backup)
// ─────────────────────────────────────────────
router.post('/webhook', async (req, res) => {
  const hash = req.headers['x-paystack-signature'];

  if (!hash || !PAYSTACK_SECRET) return res.sendStatus(400);

  let bodyString = '';
  if (Buffer.isBuffer(req.body)) bodyString = req.body.toString();
  else if (typeof req.body === 'string') bodyString = req.body;
  else bodyString = JSON.stringify(req.body);

  const expectedHash = crypto
    .createHmac('sha512', PAYSTACK_SECRET)
    .update(bodyString)
    .digest('hex');

  if (hash !== expectedHash) return res.sendStatus(400);

  try {
    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (event.event === 'charge.success') {
      const metadata = event.data.metadata || {};
      if (metadata.paymentType === 'artwork' && metadata.orderId) {
        await prisma.order.update({
          where: { id: metadata.orderId },
          data: { paymentStatus: 'FULLY_PAID', status: 'CONFIRMED', paidAt: new Date() },
        });
      } else if (metadata.paymentType === 'commission_deposit' && metadata.commissionId) {
        await prisma.commission.update({
          where: { id: metadata.commissionId },
          data: { paymentStatus: 'DEPOSIT_PAID', depositPaidAt: new Date(), status: 'IN_PROGRESS' },
        });
      }
    }
    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err);
    res.sendStatus(200);
  }
});

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

    if (!order) return res.status(404).json({ error: 'Order not found' });

    const usdAmount = parseFloat(order.total);
    const ngnAmount = usdAmount * USD_TO_NGN;

    const paystackData = await initializePaystackTransaction({
      email: order.customer.email,
      amount: Math.round(ngnAmount * 100),
      currency: 'NGN',
      reference: `artwork_${order.id}_${Date.now()}`,
      metadata: { orderId: order.id, paymentType: 'artwork' },
      callback_url: `${process.env.SERVER_URL}/api/payments/callback`,
    });

    if (!paystackData.status) return res.status(500).json(paystackData);

    await prisma.order.update({
      where: { id: orderId },
      data: { stripePaymentIntentId: paystackData.data.reference },
    });

    return res.json({
      authorizationUrl: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
      total: usdAmount,
      currency: 'USD',
    });
  } catch (err) {
    console.error('ARTWORK PAYMENT ERROR:', err);
    return res.status(500).json({ error: 'Payment init failed' });
  }
});

// ─────────────────────────────────────────────
// COMMISSION DEPOSIT PAYMENT INIT
// ─────────────────────────────────────────────
router.post('/commission-deposit', authenticateUser, async (req, res) => {
  try {
    const { commissionId } = req.body;

    const commission = await prisma.commission.findUnique({
      where: { id: commissionId },
      include: { customer: true },
    });

    if (!commission) return res.status(404).json({ error: 'Commission not found' });

    const finalPrice = Number(commission.finalPrice || commission.estimatedPrice || 0);
    const depositPercentage = Number(commission.depositPercentage || 70);
    const depositAmount = Number(commission.depositAmount || (finalPrice * depositPercentage) / 100);

    if (finalPrice <= 0) return res.status(400).json({ error: 'Invalid commission price' });

    const ngnAmount = depositAmount * USD_TO_NGN;

    const paystackData = await initializePaystackTransaction({
      email: commission.customer.email,
      amount: Math.round(ngnAmount * 100),
      currency: 'NGN',
      reference: `commission_deposit_${commission.id}_${Date.now()}`,
      metadata: { commissionId: commission.id, paymentType: 'commission_deposit' },
      callback_url: `${process.env.SERVER_URL}/api/payments/callback`,
    });

    if (!paystackData.status) return res.status(500).json(paystackData);

    await prisma.commission.update({
      where: { id: commissionId },
      data: { depositPaymentIntentId: paystackData.data.reference },
    });

    return res.json({
      authorizationUrl: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
      finalPrice,
      depositAmount,
      currency: 'USD',
    });
  } catch (err) {
    console.error('COMMISSION PAYMENT ERROR:', err);
    return res.status(500).json({ error: 'Commission deposit init failed' });
  }
});

// ─────────────────────────────────────────────
// VERIFY & STATUS ROUTES (unchanged)
// ─────────────────────────────────────────────
router.post('/verify', async (req, res) => { /* your original verify code */ });
router.get('/status/:orderId', async (req, res) => { /* your original status code */ });

module.exports = router;