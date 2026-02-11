// server/src/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const prisma = require('../config/database');

// Initialize Stripe only if key is available
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}

// Create payment intent
router.post('/create-intent', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: 'Payment processing not configured' });
    }

    const { orderId } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(parseFloat(order.total) * 100),
      currency: 'usd',
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
    });

    // Save payment intent ID to order
    await prisma.order.update({
      where: { id: orderId },
      data: { stripePaymentIntentId: paymentIntent.id },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// Create commission deposit payment
router.post('/commission-payment', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: 'Payment processing not configured' });
    }

    const { commissionId, paymentType } = req.body;

    const commission = await prisma.commission.findUnique({
      where: { id: commissionId },
      include: { customer: true },
    });

    if (!commission) {
      return res.status(404).json({ error: 'Commission not found' });
    }

    const amount = paymentType === 'deposit'
      ? parseFloat(commission.finalPrice) * 0.5
      : parseFloat(commission.finalPrice);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      metadata: {
        commissionId: commission.id,
        commissionNumber: commission.commissionNumber,
        paymentType,
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      amount,
    });
  } catch (error) {
    console.error('Error creating commission payment:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// Stripe webhook handler
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

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handleSuccessfulPayment(event.data.object);
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

async function handleSuccessfulPayment(paymentIntent) {
  const { orderId, commissionId, paymentType } = paymentIntent.metadata;

  if (orderId) {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'FULLY_PAID',
        status: 'CONFIRMED',
      },
    });

    // Mark artworks as sold
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (order) {
      await prisma.artwork.updateMany({
        where: { id: { in: order.items.map(i => i.artworkId) } },
        data: { status: 'SOLD' },
      });
    }
  }

  if (commissionId) {
    const newStatus = paymentType === 'deposit' ? 'DEPOSIT_PAID' : 'FULLY_PAID';
    await prisma.commission.update({
      where: { id: commissionId },
      data: {
        paymentStatus: newStatus,
        depositAmount: paymentType === 'deposit'
          ? paymentIntent.amount / 100
          : undefined,
      },
    });
  }
}

module.exports = router;