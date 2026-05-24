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

// ✅ USD → NGN conversion rate
// You can later move this to ENV or API-based exchange rates
const USD_TO_NGN = 1600;

// ── Paystack helper — verify transaction ──────────────────────────────────────
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
      let data = '';

      res.on('data', chunk => data += chunk);

      res.on('end', () => {
        try {

          const parsed = JSON.parse(data);

          console.log('PAYSTACK VERIFY RESPONSE:');
          console.log(parsed);

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

// ── Paystack helper — initialize transaction ──────────────────────────────────
const initializePaystackTransaction = (data) => {
  return new Promise((resolve, reject) => {

    console.log('PAYSTACK REQUEST DATA:');
    console.log(data);

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

          console.log('PAYSTACK INITIALIZE RESPONSE:');
          console.log(parsed);

          resolve(parsed);

        } catch (e) {
          console.error('PAYSTACK PARSE ERROR:', e);
          reject(e);
        }
      });
    });

    req.on('error', (err) => {
      console.error('PAYSTACK REQUEST ERROR:', err);
      reject(err);
    });

    req.write(postData);
    req.end();
  });
};

// ─────────────────────────────────────────────────────────
// ARTWORK PAYMENT - Initialize
// POST /api/payments/artwork-payment
// ─────────────────────────────────────────────────────────
router.post('/artwork-payment', authenticateUser, async (req, res) => {
  try {

    if (!PAYSTACK_SECRET) {
      return res.status(500).json({
        error: 'Payment processing not configured'
      });
    }

    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        error: 'orderId is required'
      });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });

    if (!order) {
      return res.status(404).json({
        error: 'Order not found'
      });
    }

    if (order.paymentStatus === 'FULLY_PAID') {
      return res.status(400).json({
        error: 'This order has already been paid'
      });
    }

    // ✅ Original USD amount
    const usdAmount = parseFloat(order.total);

    // ✅ Convert to NGN
    const ngnAmount = usdAmount * USD_TO_NGN;

    console.log('Artwork USD Amount:', usdAmount);
    console.log('Artwork NGN Amount:', ngnAmount);

    const paystackData = await initializePaystackTransaction({
      email: order.customer?.email,

      // ✅ Paystack expects kobo
      amount: Math.round(ngnAmount * 100),

      // ✅ Switched to NGN
      currency: 'NGN',

      reference: `artwork_${order.id}_${Date.now()}`,

      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentType: 'artwork',
        customerId: order.customerId,

        // Optional metadata tracking
        usdAmount,
        ngnAmount,
      },

      callback_url: `${process.env.CLIENT_URL}/checkout/success`,
    });

    if (!paystackData.status) {
      return res.status(500).json({
        error: paystackData.message || 'Failed to initialize payment',
        paystack: paystackData,
      });
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        stripePaymentIntentId: paystackData.data.reference,
      },
    });

    // ✅ Frontend STILL receives USD values
    res.json({
      authorizationUrl: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
      total: usdAmount,
      currency: 'USD',
    });

  } catch (error) {

    console.error('Error creating artwork payment:');
    console.error(error);

    res.status(500).json({
      error: 'Failed to create artwork payment',
      details: error.message,
    });
  }
});

// ─────────────────────────────────────────────────────────
// COMMISSION DEPOSIT - Initialize
// POST /api/payments/commission-deposit
// ─────────────────────────────────────────────────────────
router.post('/commission-deposit', authenticateUser, async (req, res) => {
  try {

    if (!PAYSTACK_SECRET) {
      return res.status(500).json({
        error: 'Payment processing not configured'
      });
    }

    const { commissionId } = req.body;

    if (!commissionId) {
      return res.status(400).json({
        error: 'commissionId is required'
      });
    }

    const commission = await prisma.commission.findUnique({
      where: { id: commissionId },
      include: { customer: true },
    });

    if (!commission) {
      return res.status(404).json({
        error: 'Commission not found'
      });
    }

    if (commission.status !== 'ACCEPTED') {
      return res.status(400).json({
        error: 'Commission must be accepted before payment',
      });
    }

    if (
      commission.paymentStatus === 'DEPOSIT_PAID' ||
      commission.paymentStatus === 'FULLY_PAID'
    ) {
      return res.status(400).json({
        error: 'Deposit has already been paid',
      });
    }

    if (!commission.finalPrice) {
      return res.status(400).json({
        error: 'Commission price has not been set yet',
      });
    }

    const depositPct    = commission.depositPercentage / 100;
    const finalPrice    = parseFloat(commission.finalPrice);
    const depositAmount = parseFloat((finalPrice * depositPct).toFixed(2));
    const balanceAmount = parseFloat((finalPrice - depositAmount).toFixed(2));

    // ✅ Convert USD → NGN
    const ngnDepositAmount = depositAmount * USD_TO_NGN;

    console.log('Commission customer email:', commission.customer?.email);
    console.log('Final USD price:', finalPrice);
    console.log('Deposit USD amount:', depositAmount);
    console.log('Deposit NGN amount:', ngnDepositAmount);

    const paystackData = await initializePaystackTransaction({
      email: commission.customer?.email,

      // ✅ Kobo
      amount: Math.round(ngnDepositAmount * 100),

      // ✅ NGN
      currency: 'NGN',

      reference: `deposit_${commission.id}_${Date.now()}`,

      metadata: {
        commissionId: commission.id,
        commissionNumber: commission.commissionNumber,
        paymentType: 'deposit',
        customerId: commission.customerId,

        usdAmount: depositAmount,
        ngnAmount: ngnDepositAmount,
      },

      callback_url: `${process.env.CLIENT_URL}/commission/payment/${commission.id}?status=success`,
    });

    if (!paystackData.status) {

      console.error('PAYSTACK FAILED:', paystackData);

      return res.status(500).json({
        error: paystackData.message || 'Failed to initialize payment',
        paystack: paystackData,
      });
    }

    await prisma.commission.update({
      where: { id: commissionId },
      data: {
        depositPaymentIntentId: paystackData.data.reference,
        depositAmount,
        balanceAmount,
      },
    });

    // ✅ Frontend STILL receives USD values
    res.json({
      authorizationUrl: paystackData.data.authorization_url,
      reference: paystackData.data.reference,

      finalPrice,
      depositAmount,
      balanceAmount,

      depositPercentage: commission.depositPercentage,

      currency: 'USD',
    });

  } catch (error) {

    console.error('Error creating commission deposit:');
    console.error(error);

    res.status(500).json({
      error: 'Failed to create deposit payment',
      details: error.message,
    });
  }
});

// ─────────────────────────────────────────────────────────
// COMMISSION BALANCE - Initialize
// POST /api/payments/commission-balance
// ─────────────────────────────────────────────────────────
router.post('/commission-balance', authenticateUser, async (req, res) => {
  try {

    if (!PAYSTACK_SECRET) {
      return res.status(500).json({
        error: 'Payment processing not configured'
      });
    }

    const { commissionId } = req.body;

    if (!commissionId) {
      return res.status(400).json({
        error: 'commissionId is required'
      });
    }

    const commission = await prisma.commission.findUnique({
      where: { id: commissionId },
      include: { customer: true },
    });

    if (!commission) {
      return res.status(404).json({
        error: 'Commission not found'
      });
    }

    if (commission.paymentStatus !== 'DEPOSIT_PAID') {
      return res.status(400).json({
        error: 'Deposit must be paid before the final balance',
      });
    }

    if (!commission.finalPrice || !commission.depositAmount) {
      return res.status(400).json({
        error: 'Commission pricing data is incomplete',
      });
    }

    const finalPrice    = parseFloat(commission.finalPrice);
    const depositAmount = parseFloat(commission.depositAmount);
    const balanceAmount = parseFloat((finalPrice - depositAmount).toFixed(2));

    // ✅ USD → NGN
    const ngnBalanceAmount = balanceAmount * USD_TO_NGN;

    console.log('Balance USD amount:', balanceAmount);
    console.log('Balance NGN amount:', ngnBalanceAmount);

    const paystackData = await initializePaystackTransaction({
      email: commission.customer?.email,

      // ✅ Kobo
      amount: Math.round(ngnBalanceAmount * 100),

      // ✅ NGN
      currency: 'NGN',

      reference: `balance_${commission.id}_${Date.now()}`,

      metadata: {
        commissionId: commission.id,
        commissionNumber: commission.commissionNumber,
        paymentType: 'balance',
        customerId: commission.customerId,

        usdAmount: balanceAmount,
        ngnAmount: ngnBalanceAmount,
      },

      callback_url: `${process.env.CLIENT_URL}/commission/payment/${commission.id}?status=success`,
    });

    if (!paystackData.status) {

      console.error('PAYSTACK FAILED:', paystackData);

      return res.status(500).json({
        error: paystackData.message || 'Failed to initialize payment',
        paystack: paystackData,
      });
    }

    await prisma.commission.update({
      where: { id: commissionId },
      data: {
        balancePaymentIntentId: paystackData.data.reference,
      },
    });

    // ✅ Frontend STILL receives USD values
    res.json({
      authorizationUrl: paystackData.data.authorization_url,
      reference: paystackData.data.reference,

      finalPrice,
      depositAmount,
      balanceAmount,

      depositPercentage: commission.depositPercentage,

      currency: 'USD',
    });

  } catch (error) {

    console.error('Error creating commission balance:');
    console.error(error);

    res.status(500).json({
      error: 'Failed to create balance payment',
      details: error.message,
    });
  }
});

module.exports = router;