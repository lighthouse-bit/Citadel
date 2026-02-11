// server/src/controllers/paymentController.js
const prisma = require('../config/database');
const stripe = require('../config/stripe');
const { sendEmail } = require('../services/emailService');

// Create payment intent
exports.createPaymentIntent = async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Create or get Stripe customer
    let stripeCustomerId = order.customer.stripeCustomerId;
    
    if (!stripeCustomerId) {
      const stripeCustomer = await stripe.customers.create({
        email: order.customer.email,
        name: `${order.customer.firstName} ${order.customer.lastName}`,
      });
      
      stripeCustomerId = stripeCustomer.id;
      
      await prisma.customer.update({
        where: { id: order.customerId },
        data: { stripeCustomerId },
      });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(parseFloat(order.total) * 100), // Convert to cents
      currency: 'usd',
      customer: stripeCustomerId,
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
};

// Create commission deposit payment
exports.createCommissionPayment = async (req, res) => {
  try {
    const { commissionId, paymentType } = req.body; // 'deposit' or 'full'

    const commission = await prisma.commission.findUnique({
      where: { id: commissionId },
      include: { customer: true },
    });

    if (!commission) {
      return res.status(404).json({ error: 'Commission not found' });
    }

    const amount = paymentType === 'deposit' 
      ? parseFloat(commission.finalPrice) * 0.5 // 50% deposit
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
};

// Stripe webhook handler
exports.handleWebhook = async (req, res) => {
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
      
    case 'payment_intent.payment_failed':
      await handleFailedPayment(event.data.object);
      break;
      
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
};

async function handleSuccessfulPayment(paymentIntent) {
  const { orderId, commissionId, paymentType } = paymentIntent.metadata;

  if (orderId) {
    // Update order
    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'FULLY_PAID',
        status: 'CONFIRMED',
      },
      include: { 
        customer: true,
        items: { include: { artwork: true } },
      },
    });

    // Mark artworks as sold
    await prisma.artwork.updateMany({
      where: { 
        id: { in: order.items.map(i => i.artworkId) } 
      },
      data: { status: 'SOLD' },
    });

    // Send confirmation email
    await sendEmail({
      to: order.customer.email,
      subject: `Order Confirmed - ${order.orderNumber}`,
      template: 'order-confirmed',
      data: {
        name: order.customer.firstName,
        orderNumber: order.orderNumber,
        items: order.items,
        total: order.total,
      },
    });
  }

  if (commissionId) {
    // Update commission
    const newStatus = paymentType === 'deposit' ? 'DEPOSIT_PAID' : 'FULLY_PAID';
    
    const commission = await prisma.commission.update({
      where: { id: commissionId },
      data: {
        paymentStatus: newStatus,
        depositAmount: paymentType === 'deposit' 
          ? paymentIntent.amount / 100 
          : undefined,
      },
      include: { customer: true },
    });

    await sendEmail({
      to: commission.customer.email,
      subject: `Payment Received - ${commission.commissionNumber}`,
      template: 'commission-payment',
      data: {
        name: commission.customer.firstName,
        commissionNumber: commission.commissionNumber,
        amount: paymentIntent.amount / 100,
        paymentType,
      },
    });
  }
}

async function handleFailedPayment(paymentIntent) {
  console.log('Payment failed:', paymentIntent.id);
  // Could notify admin or take other action
}