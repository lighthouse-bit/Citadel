// server/src/routes/paymentRoutes.js
const express = require('express');
const router  = express.Router();
const prisma  = require('../config/database');
const {
  sendOrderInvoiceEmail,
  sendCommissionDepositInvoiceEmail,
  sendCommissionBalanceInvoiceEmail,
} = require('../utils/emailService');

const { authenticateUser } = require('../middleware/auth');

let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}

// ─────────────────────────────────────────────────────────
// ARTWORK PAYMENT - Full 100% payment
// POST /api/payments/artwork-payment
// ─────────────────────────────────────────────────────────
router.post('/artwork-payment', authenticateUser, async (req, res) => {
  try {
    if (!stripe) {
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

    const paymentIntent = await stripe.paymentIntents.create({
      amount:        Math.round(parseFloat(order.total) * 100),
      currency:      'usd',
      receipt_email: order.customer?.email,
      metadata: {
        orderId:     order.id,
        orderNumber: order.orderNumber,
        paymentType: 'artwork',
      },
    });

    await prisma.order.update({
      where: { id: orderId },
      data:  { stripePaymentIntentId: paymentIntent.id },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      total:        parseFloat(order.total),
    });
  } catch (error) {
    console.error('Error creating artwork payment:', error);
    res.status(500).json({ error: 'Failed to create artwork payment' });
  }
});

// ─────────────────────────────────────────────────────────
// COMMISSION DEPOSIT - 70% upfront
// POST /api/payments/commission-deposit
// ─────────────────────────────────────────────────────────
router.post('/commission-deposit', authenticateUser, async (req, res) => {
  try {
    if (!stripe) {
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
        error: 'Commission must be accepted before payment can be made',
      });
    }

    if (
      commission.paymentStatus === 'DEPOSIT_PAID' ||
      commission.paymentStatus === 'FULLY_PAID'
    ) {
      return res.status(400).json({
        error: 'Deposit has already been paid for this commission',
      });
    }

    if (!commission.finalPrice) {
      return res.status(400).json({
        error: 'Commission price has not been set by the admin yet',
      });
    }

    const depositPct    = commission.depositPercentage / 100;
    const finalPrice    = parseFloat(commission.finalPrice);
    const depositAmount = parseFloat((finalPrice * depositPct).toFixed(2));
    const balanceAmount = parseFloat((finalPrice - depositAmount).toFixed(2));

    const paymentIntent = await stripe.paymentIntents.create({
      amount:        Math.round(depositAmount * 100),
      currency:      'usd',
      receipt_email: commission.customer?.email,
      metadata: {
        commissionId:     commission.id,
        commissionNumber: commission.commissionNumber,
        paymentType:      'deposit',
        customerId:       commission.customerId,
      },
    });

    await prisma.commission.update({
      where: { id: commissionId },
      data: {
        depositPaymentIntentId: paymentIntent.id,
        depositAmount,
        balanceAmount,
      },
    });

    res.json({
      clientSecret:      paymentIntent.client_secret,
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
// COMMISSION BALANCE - Remaining 30%
// POST /api/payments/commission-balance
// ─────────────────────────────────────────────────────────
router.post('/commission-balance', authenticateUser, async (req, res) => {
  try {
    if (!stripe) {
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

    const paymentIntent = await stripe.paymentIntents.create({
      amount:        Math.round(balanceAmount * 100),
      currency:      'usd',
      receipt_email: commission.customer?.email,
      metadata: {
        commissionId:     commission.id,
        commissionNumber: commission.commissionNumber,
        paymentType:      'balance',
        customerId:       commission.customerId,
      },
    });

    await prisma.commission.update({
      where: { id: commissionId },
      data:  { balancePaymentIntentId: paymentIntent.id },
    });

    res.json({
      clientSecret:      paymentIntent.client_secret,
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
// STRIPE WEBHOOK
// POST /api/payments/webhook
// ─────────────────────────────────────────────────────────
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) {
    return res.status(500).json({ error: 'Payment processing not configured' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      await handleSuccessfulPayment(event.data.object);
      break;
    case 'payment_intent.payment_failed':
      await handleFailedPayment(event.data.object);
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

// ─────────────────────────────────────────────────────────
// WEBHOOK HANDLER — Payment Succeeded
// ─────────────────────────────────────────────────────────
async function handleSuccessfulPayment(paymentIntent) {
  const { orderId, commissionId, paymentType } = paymentIntent.metadata;

  // ── Artwork Order ──────────────────────────────────────
  if (orderId) {
    try {
      const order = await prisma.order.update({
        where:   { id: orderId },
        data: {
          paymentStatus: 'FULLY_PAID',
          status:        'CONFIRMED',
        },
        include: {
          customer: true,
          items: {
            include: { artwork: true },
          },
        },
      });

      // Mark artworks as SOLD
      if (order.items?.length > 0) {
        await prisma.artwork.updateMany({
          where: { id: { in: order.items.map(i => i.artworkId) } },
          data:  { status: 'SOLD' },
        });
      }

      // Create admin notification
      await prisma.notification.create({
        data: {
          type:    'ORDER',
          message: `Payment received for Order #${order.orderNumber} — $${Number(order.total).toLocaleString()}`,
          link:    `/admin/orders/${order.id}`,
        },
      }).catch(() => {});

      // ✅ Send invoice email to customer
      if (order.customer?.email) {
        await sendOrderInvoiceEmail({
          email:       order.customer.email,
          firstName:   order.customer.firstName,
          orderNumber: order.orderNumber,
          items:       order.items,
          subtotal:    parseFloat(order.subtotal),
          shipping:    parseFloat(order.shippingCost),
          tax:         parseFloat(order.tax),
          total:       parseFloat(order.total),
          createdAt:   order.createdAt,
        }).catch(err => console.error('Invoice email error:', err.message));
      }

      console.log('✅ Artwork order paid:', order.orderNumber);
    } catch (err) {
      console.error('Error handling artwork payment:', err);
    }
  }

  // ── Commission Deposit ─────────────────────────────────
  if (commissionId && paymentType === 'deposit') {
    try {
      const paidAmount = paymentIntent.amount / 100;

      const commission = await prisma.commission.update({
        where: { id: commissionId },
        data: {
          paymentStatus: 'DEPOSIT_PAID',
          depositAmount: paidAmount,
          status:        'IN_PROGRESS',
          depositPaidAt: new Date(),
          startedAt:     new Date(),
        },
        include: { customer: true },
      });

      // Create admin notification
      await prisma.notification.create({
        data: {
          type:    'COMMISSION',
          message: `💰 Deposit paid for Commission #${commission.commissionNumber} — Work can begin!`,
          link:    `/admin/commissions/${commission.id}`,
        },
      }).catch(() => {});

      // ✅ Send deposit invoice email to customer
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
        }).catch(err => console.error('Deposit invoice email error:', err.message));
      }

      console.log('✅ Commission deposit paid:', commission.commissionNumber);
    } catch (err) {
      console.error('Error handling commission deposit:', err);
    }
  }

  // ── Commission Balance ─────────────────────────────────
  if (commissionId && paymentType === 'balance') {
    try {
      const commission = await prisma.commission.update({
        where: { id: commissionId },
        data: {
          paymentStatus: 'FULLY_PAID',
          status:        'COMPLETED',
          balancePaidAt: new Date(),
          completedAt:   new Date(),
        },
        include: { customer: true },
      });

      // Create admin notification
      await prisma.notification.create({
        data: {
          type:    'COMMISSION',
          message: `✅ Final balance paid for Commission #${commission.commissionNumber} — Fully paid!`,
          link:    `/admin/commissions/${commission.id}`,
        },
      }).catch(() => {});

      // ✅ Send final invoice email to customer
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
        }).catch(err => console.error('Balance invoice email error:', err.message));
      }

      console.log('✅ Commission fully paid:', commission.commissionNumber);
    } catch (err) {
      console.error('Error handling commission balance:', err);
    }
  }
}

// ─────────────────────────────────────────────────────────
// WEBHOOK HANDLER — Payment Failed
// ─────────────────────────────────────────────────────────
async function handleFailedPayment(paymentIntent) {
  console.log('❌ Payment failed:', paymentIntent.id);
  const { orderId } = paymentIntent.metadata;

  if (orderId) {
    const order = await prisma.order.findUnique({
      where:   { id: orderId },
      include: { items: true },
    });

    if (order) {
      await prisma.artwork.updateMany({
        where: { id: { in: order.items.map(i => i.artworkId) } },
        data:  { status: 'AVAILABLE' },
      });
    }
  }
}

module.exports = router;