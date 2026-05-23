// server/src/routes/paymentRoutes.js
const express = require('express');
const router  = express.Router();
const prisma  = require('../config/database');
const https   = require('https');
const {
  sendOrderInvoiceEmail,
  sendCommissionDepositInvoiceEmail,
  sendCommissionBalanceInvoiceEmail,
} = require('../services/emailService');

const { authenticateUser } = require('../middleware/auth');

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

// ── Paystack helper — verify transaction ──────────────────────────────────────
const verifyPaystackTransaction = (reference) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.paystack.co',
      port:     443,
      path:     `/transaction/verify/${reference}`,
      method:   'GET',
      headers:  {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
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
    const postData = JSON.stringify(data);

    const options = {
      hostname: 'api.paystack.co',
      port:     443,
      path:     '/transaction/initialize',
      method:   'POST',
      headers:  {
        Authorization:  `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
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

// ─────────────────────────────────────────────────────────
// ARTWORK PAYMENT - Initialize
// POST /api/payments/artwork-payment
// ─────────────────────────────────────────────────────────
router.post('/artwork-payment', authenticateUser, async (req, res) => {
  try {
    if (!PAYSTACK_SECRET) {
      return res.status(500).json({ error: 'Payment processing not configured' });
    }

    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }

    const order = await prisma.order.findUnique({
      where:   { id: orderId },
      include: { customer: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.paymentStatus === 'FULLY_PAID') {
      return res.status(400).json({ error: 'This order has already been paid' });
    }

    // ✅ Initialize Paystack transaction
    const paystackData = await initializePaystackTransaction({
      email:      order.customer?.email,
      amount:     Math.round(parseFloat(order.total) * 100), // kobo
      currency:   'USD',
      reference:  `artwork_${order.id}_${Date.now()}`,
      metadata: {
        orderId:     order.id,
        orderNumber: order.orderNumber,
        paymentType: 'artwork',
        customerId:  order.customerId,
      },
      callback_url: `${process.env.CLIENT_URL}/checkout/success`,
    });

    if (!paystackData.status) {
      return res.status(500).json({ error: 'Failed to initialize payment' });
    }

    // Save reference to order
    await prisma.order.update({
      where: { id: orderId },
      data:  { stripePaymentIntentId: paystackData.data.reference },
    });

    res.json({
      authorizationUrl: paystackData.data.authorization_url,
      reference:        paystackData.data.reference,
      total:            parseFloat(order.total),
    });

  } catch (error) {
    console.error('Error creating artwork payment:', error);
    res.status(500).json({ error: 'Failed to create artwork payment' });
  }
});

// ─────────────────────────────────────────────────────────
// COMMISSION DEPOSIT - Initialize
// POST /api/payments/commission-deposit
// ─────────────────────────────────────────────────────────
router.post('/commission-deposit', authenticateUser, async (req, res) => {
  try {
    if (!PAYSTACK_SECRET) {
      return res.status(500).json({ error: 'Payment processing not configured' });
    }

    const { commissionId } = req.body;

    if (!commissionId) {
      return res.status(400).json({ error: 'commissionId is required' });
    }

    const commission = await prisma.commission.findUnique({
      where:   { id: commissionId },
      include: { customer: true },
    });

    if (!commission) {
      return res.status(404).json({ error: 'Commission not found' });
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

    const paystackData = await initializePaystackTransaction({
      email:    commission.customer?.email,
      amount:   Math.round(depositAmount * 100),
      currency: 'USD',
      reference: `deposit_${commission.id}_${Date.now()}`,
      metadata: {
        commissionId:     commission.id,
        commissionNumber: commission.commissionNumber,
        paymentType:      'deposit',
        customerId:       commission.customerId,
      },
      callback_url: `${process.env.CLIENT_URL}/commission/payment/${commission.id}?status=success`,
    });

    if (!paystackData.status) {
      return res.status(500).json({ error: 'Failed to initialize payment' });
    }

    await prisma.commission.update({
      where: { id: commissionId },
      data: {
        depositPaymentIntentId: paystackData.data.reference,
        depositAmount,
        balanceAmount,
      },
    });

    res.json({
      authorizationUrl:  paystackData.data.authorization_url,
      reference:         paystackData.data.reference,
      finalPrice,
      depositAmount,
      balanceAmount,
      depositPercentage: commission.depositPercentage,
    });

  } catch (error) {
    console.error('Error creating commission deposit:', error);
    res.status(500).json({ error: 'Failed to create deposit payment' });
  }
});

// ─────────────────────────────────────────────────────────
// COMMISSION BALANCE - Initialize
// POST /api/payments/commission-balance
// ─────────────────────────────────────────────────────────
router.post('/commission-balance', authenticateUser, async (req, res) => {
  try {
    if (!PAYSTACK_SECRET) {
      return res.status(500).json({ error: 'Payment processing not configured' });
    }

    const { commissionId } = req.body;

    if (!commissionId) {
      return res.status(400).json({ error: 'commissionId is required' });
    }

    const commission = await prisma.commission.findUnique({
      where:   { id: commissionId },
      include: { customer: true },
    });

    if (!commission) {
      return res.status(404).json({ error: 'Commission not found' });
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

    const paystackData = await initializePaystackTransaction({
      email:    commission.customer?.email,
      amount:   Math.round(balanceAmount * 100),
      currency: 'USD',
      reference: `balance_${commission.id}_${Date.now()}`,
      metadata: {
        commissionId:     commission.id,
        commissionNumber: commission.commissionNumber,
        paymentType:      'balance',
        customerId:       commission.customerId,
      },
      callback_url: `${process.env.CLIENT_URL}/commission/payment/${commission.id}?status=success`,
    });

    if (!paystackData.status) {
      return res.status(500).json({ error: 'Failed to initialize payment' });
    }

    await prisma.commission.update({
      where: { id: commissionId },
      data:  { balancePaymentIntentId: paystackData.data.reference },
    });

    res.json({
      authorizationUrl:  paystackData.data.authorization_url,
      reference:         paystackData.data.reference,
      finalPrice,
      depositAmount,
      balanceAmount,
      depositPercentage: commission.depositPercentage,
    });

  } catch (error) {
    console.error('Error creating commission balance:', error);
    res.status(500).json({ error: 'Failed to create balance payment' });
  }
});

// ─────────────────────────────────────────────────────────
// VERIFY PAYMENT (called by frontend after redirect)
// POST /api/payments/verify
// ─────────────────────────────────────────────────────────
router.post('/verify', authenticateUser, async (req, res) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({ error: 'Reference is required' });
    }

    // ✅ Verify with Paystack
    const verification = await verifyPaystackTransaction(reference);

    if (!verification.status || verification.data.status !== 'success') {
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    const { metadata } = verification.data;
    const { orderId, commissionId, paymentType } = metadata;

    // ── Artwork Order ──────────────────────────────────
    if (orderId) {
      const order = await prisma.order.findUnique({
        where:   { id: orderId },
        include: {
          customer: true,
          items: { include: { artwork: true } },
        },
      });

      if (order && order.paymentStatus !== 'FULLY_PAID') {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            paymentStatus:         'FULLY_PAID',
            status:                'CONFIRMED',
            stripePaymentIntentId: reference,
          },
        });

        // Mark artworks as SOLD
        const artworkIds = order.items.map(i => i.artworkId).filter(Boolean);
        if (artworkIds.length > 0) {
          await prisma.artwork.updateMany({
            where: { id: { in: artworkIds } },
            data:  { status: 'SOLD' },
          });
        }

        // Admin notification
        await prisma.notification.create({
          data: {
            type:    'ORDER',
            message: `💰 Payment received for Order #${order.orderNumber} — $${Number(order.total).toLocaleString()}`,
            link:    `/admin/orders/${order.id}`,
          },
        }).catch(() => {});

        // ✅ Send invoice email
        if (order.customer?.email) {
          await sendOrderInvoiceEmail({
            email:       order.customer.email,
            firstName:   order.customer.firstName,
            orderNumber: order.orderNumber,
            items:       order.items.map(item => ({
              title: item.title || item.artwork?.title || 'Artwork',
              price: parseFloat(item.price),
            })),
            subtotal:  parseFloat(order.subtotal),
            shipping:  parseFloat(order.shippingCost),
            tax:       parseFloat(order.tax),
            total:     parseFloat(order.total),
            createdAt: order.createdAt,
          }).catch(err => console.error('Invoice email error:', err.message));
        }
      }

      return res.json({ success: true, type: 'artwork', orderId });
    }

    // ── Commission Deposit ─────────────────────────────
    if (commissionId && paymentType === 'deposit') {
      const commission = await prisma.commission.findUnique({
        where:   { id: commissionId },
        include: { customer: true },
      });

      if (commission && commission.paymentStatus !== 'DEPOSIT_PAID') {
        const paidAmount = verification.data.amount / 100;

        await prisma.commission.update({
          where: { id: commissionId },
          data: {
            paymentStatus: 'DEPOSIT_PAID',
            depositAmount: paidAmount,
            status:        'IN_PROGRESS',
            depositPaidAt: new Date(),
            startedAt:     new Date(),
          },
        });

        await prisma.notification.create({
          data: {
            type:    'COMMISSION',
            message: `💰 Deposit paid for Commission #${commission.commissionNumber}`,
            link:    `/admin/commissions/${commission.id}`,
          },
        }).catch(() => {});

        // ✅ Send deposit invoice
        if (commission.customer?.email) {
          await sendCommissionDepositInvoiceEmail({
            email:            commission.customer.email,
            firstName:        commission.customer.firstName,
            commissionNumber: commission.commissionNumber,
            artStyle:         commission.artStyle,
            size:             commission.size,
            finalPrice:       parseFloat(commission.finalPrice),
            depositAmount:    paidAmount,
            balanceAmount:    parseFloat(commission.balanceAmount),
            depositPercent:   commission.depositPercentage,
            paidAt:           new Date(),
          }).catch(err => console.error('Deposit invoice error:', err.message));
        }
      }

      return res.json({ success: true, type: 'deposit', commissionId });
    }

    // ── Commission Balance ─────────────────────────────
    if (commissionId && paymentType === 'balance') {
      const commission = await prisma.commission.findUnique({
        where:   { id: commissionId },
        include: { customer: true },
      });

      if (commission && commission.paymentStatus !== 'FULLY_PAID') {
        await prisma.commission.update({
          where: { id: commissionId },
          data: {
            paymentStatus: 'FULLY_PAID',
            status:        'COMPLETED',
            balancePaidAt: new Date(),
            completedAt:   new Date(),
          },
        });

        await prisma.notification.create({
          data: {
            type:    'COMMISSION',
            message: `✅ Final balance paid for Commission #${commission.commissionNumber}`,
            link:    `/admin/commissions/${commission.id}`,
          },
        }).catch(() => {});

        // ✅ Send final invoice
        if (commission.customer?.email) {
          await sendCommissionBalanceInvoiceEmail({
            email:            commission.customer.email,
            firstName:        commission.customer.firstName,
            commissionNumber: commission.commissionNumber,
            artStyle:         commission.artStyle,
            size:             commission.size,
            finalPrice:       parseFloat(commission.finalPrice),
            depositAmount:    parseFloat(commission.depositAmount),
            balanceAmount:    parseFloat(commission.balanceAmount),
            paidAt:           new Date(),
          }).catch(err => console.error('Balance invoice error:', err.message));
        }
      }

      return res.json({ success: true, type: 'balance', commissionId });
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// ─────────────────────────────────────────────────────────
// PAYSTACK WEBHOOK (for automatic server-side updates)
// POST /api/payments/webhook
// ─────────────────────────────────────────────────────────
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const crypto = require('crypto');

  // ✅ Verify webhook signature
  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET)
    .update(req.body)
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event = JSON.parse(req.body);
  console.log('Paystack webhook event:', event.event);

  if (event.event === 'charge.success') {
    const { reference, metadata, amount } = event.data;
    const { orderId, commissionId, paymentType } = metadata;

    // Same logic as verify endpoint
    if (orderId) {
      const order = await prisma.order.findUnique({
        where:   { id: orderId },
        include: {
          customer: true,
          items: { include: { artwork: true } },
        },
      });

      if (order && order.paymentStatus !== 'FULLY_PAID') {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            paymentStatus:         'FULLY_PAID',
            status:                'CONFIRMED',
            stripePaymentIntentId: reference,
          },
        });

        const artworkIds = order.items.map(i => i.artworkId).filter(Boolean);
        if (artworkIds.length > 0) {
          await prisma.artwork.updateMany({
            where: { id: { in: artworkIds } },
            data:  { status: 'SOLD' },
          });
        }

        await prisma.notification.create({
          data: {
            type:    'ORDER',
            message: `💰 Payment received for Order #${order.orderNumber}`,
            link:    `/admin/orders/${order.id}`,
          },
        }).catch(() => {});

        if (order.customer?.email) {
          await sendOrderInvoiceEmail({
            email:       order.customer.email,
            firstName:   order.customer.firstName,
            orderNumber: order.orderNumber,
            items:       order.items.map(item => ({
              title: item.title || item.artwork?.title || 'Artwork',
              price: parseFloat(item.price),
            })),
            subtotal:  parseFloat(order.subtotal),
            shipping:  parseFloat(order.shippingCost),
            tax:       parseFloat(order.tax),
            total:     parseFloat(order.total),
            createdAt: order.createdAt,
          }).catch(() => {});
        }
      }
    }
  }

  res.json({ received: true });
});

module.exports = router;