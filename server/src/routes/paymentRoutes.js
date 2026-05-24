// server/src/routes/paymentRoutes.js

const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const https = require('https');
const crypto = require('crypto');

const {
  sendOrderInvoiceEmail,
  sendCommissionDepositInvoiceEmail,
} = require('../utils/emailService');

const { authenticateUser } = require('../middleware/auth');

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const USD_TO_NGN = 1600;

// ─────────────────────────────────────────────
// HELPERS (unchanged)
// ─────────────────────────────────────────────
const initializePaystackTransaction = (data) => { ... }; // Keep your existing function

const verifyPaystackTransaction = (reference) => { ... }; // Keep your existing function

// ─────────────────────────────────────────────
// CALLBACK ROUTE
// ─────────────────────────────────────────────
router.get('/callback', async (req, res) => {
  const reference = req.query.reference || req.query.trxref;

  if (!reference) {
    return res.redirect(`${process.env.CLIENT_URL}/checkout?error=missing_reference`);
  }

  try {
    const verification = await verifyPaystackTransaction(reference);
    if (verification.data.status === 'success') {
      return res.redirect(`${process.env.CLIENT_URL}/checkout/success?reference=${reference}`);
    } else {
      return res.redirect(`${process.env.CLIENT_URL}/checkout?error=payment_failed`);
    }
  } catch (err) {
    console.error('Callback error:', err);
    return res.redirect(`${process.env.CLIENT_URL}/checkout?error=verification_error`);
  }
});

// ─────────────────────────────────────────────
// WEBHOOK (Vercel Optimized)
// ─────────────────────────────────────────────
router.post('/webhook', async (req, res) => {
  const hash = req.headers['x-paystack-signature'];

  if (!hash || !PAYSTACK_SECRET) {
    return res.sendStatus(400);
  }

  // Verify signature
  const expectedHash = crypto
    .createHmac('sha512', PAYSTACK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== expectedHash) {
    console.error('Invalid Paystack webhook signature');
    return res.sendStatus(400);
  }

  const event = req.body;

  try {
    if (event.event === 'charge.success') {
      const { reference, metadata = {} } = event.data;

      // Artwork Payment
      if (metadata.paymentType === 'artwork' && metadata.orderId) {
        await prisma.order.update({
          where: { id: metadata.orderId },
          data: {
            paymentStatus: 'FULLY_PAID',
            status: 'CONFIRMED',
            paidAt: new Date(),
          },
        });
        console.log(`✅ Webhook: Order ${metadata.orderId} paid`);
      }

      // Commission Deposit
      else if (metadata.paymentType === 'commission_deposit' && metadata.commissionId) {
        await prisma.commission.update({
          where: { id: metadata.commissionId },
          data: {
            paymentStatus: 'DEPOSIT_PAID',
            depositPaidAt: new Date(),
            status: 'IN_PROGRESS',
          },
        });
        console.log(`✅ Webhook: Commission ${metadata.commissionId} deposit paid`);
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err);
    res.sendStatus(200); // Always return 200
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

    const ngnAmount = parseFloat(order.total) * USD_TO_NGN;

    const paystackData = await initializePaystackTransaction({
      email: order.customer.email,
      amount: Math.round(ngnAmount * 100),
      currency: 'NGN',
      reference: `artwork_${order.id}_${Date.now()}`,
      metadata: { orderId: order.id, paymentType: 'artwork' },
      callback_url: `${process.env.SERVER_URL}/api/payment/callback`,
    });

    if (!paystackData.status) return res.status(500).json(paystackData);

    await prisma.order.update({
      where: { id: orderId },
      data: { stripePaymentIntentId: paystackData.data.reference },
    });

    return res.json({
      authorizationUrl: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
    });
  } catch (err) {
    console.error('ARTWORK PAYMENT ERROR:', err);
    return res.status(500).json({ error: 'Payment initialization failed' });
  }
});

// ─────────────────────────────────────────────
// COMMISSION DEPOSIT (similar updates)
// ─────────────────────────────────────────────
router.post('/commission-deposit', authenticateUser, async (req, res) => {
  // ... (same pattern as above, with callback_url updated)
  // I can give you the full version if needed
});

// Keep your existing /verify route unchanged...

module.exports = router;