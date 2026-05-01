const prisma = require('../config/database');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// ==========================================
// 1. CREATE ARTWORK PAYMENT INTENT (100%)
// ==========================================
exports.createArtworkPaymentIntent = async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const amount = Math.round(Number(order.total) * 100); // Convert to cents

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: {
        type: 'ARTWORK_PURCHASE',
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerEmail: order.customer.email
      },
      description: `Citadel Art - Order #${order.orderNumber}`
    });

    // Save payment intent ID to order
    await prisma.order.update({
      where: { id: orderId },
      data: { stripePaymentIntentId: paymentIntent.id }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      amount: Number(order.total),
      currency: 'usd'
    });
  } catch (error) {
    console.error('Artwork payment error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
};

// ==========================================
// 2. CREATE COMMISSION DEPOSIT (70%)
// ==========================================
exports.createCommissionDeposit = async (req, res) => {
  try {
    const { commissionId } = req.body;

    const commission = await prisma.commission.findUnique({
      where: { id: commissionId },
      include: { customer: true }
    });

    if (!commission) {
      return res.status(404).json({ error: 'Commission not found' });
    }

    if (!commission.finalPrice) {
      return res.status(400).json({ 
        error: 'Final price has not been set by the artist yet.' 
      });
    }

    if (commission.paymentStatus !== 'UNPAID') {
      return res.status(400).json({ 
        error: 'Deposit has already been paid.' 
      });
    }

    // Calculate 70% deposit
    const finalPrice = Number(commission.finalPrice);
    const depositPercentage = commission.depositPercentage || 70;
    const depositAmount = parseFloat((finalPrice * depositPercentage / 100).toFixed(2));
    const balanceAmount = parseFloat((finalPrice - depositAmount).toFixed(2));
    const amountInCents = Math.round(depositAmount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      metadata: {
        type: 'COMMISSION_DEPOSIT',
        commissionId: commission.id,
        commissionNumber: commission.commissionNumber,
        customerEmail: commission.customer.email,
        depositPercentage: depositPercentage.toString()
      },
      description: `Citadel Art - Commission #${commission.commissionNumber} (${depositPercentage}% Deposit)`
    });

    // Save amounts and payment intent to commission
    await prisma.commission.update({
      where: { id: commissionId },
      data: {
        depositAmount,
        balanceAmount,
        depositPaymentIntentId: paymentIntent.id
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      depositAmount,
      balanceAmount,
      finalPrice,
      depositPercentage,
      currency: 'usd'
    });
  } catch (error) {
    console.error('Commission deposit error:', error);
    res.status(500).json({ error: 'Failed to create deposit payment' });
  }
};

// ==========================================
// 3. CREATE COMMISSION BALANCE (30%)
// ==========================================
exports.createCommissionBalance = async (req, res) => {
  try {
    const { commissionId } = req.body;

    const commission = await prisma.commission.findUnique({
      where: { id: commissionId },
      include: { customer: true }
    });

    if (!commission) {
      return res.status(404).json({ error: 'Commission not found' });
    }

    if (commission.paymentStatus !== 'DEPOSIT_PAID') {
      return res.status(400).json({ 
        error: 'Deposit must be paid before paying the balance.' 
      });
    }

    if (commission.status !== 'COMPLETED') {
      return res.status(400).json({ 
        error: 'Balance payment is only available when the commission is completed.' 
      });
    }

    const balanceAmount = Number(commission.balanceAmount);
    const amountInCents = Math.round(balanceAmount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      metadata: {
        type: 'COMMISSION_BALANCE',
        commissionId: commission.id,
        commissionNumber: commission.commissionNumber,
        customerEmail: commission.customer.email
      },
      description: `Citadel Art - Commission #${commission.commissionNumber} (Balance Payment)`
    });

    await prisma.commission.update({
      where: { id: commissionId },
      data: { balancePaymentIntentId: paymentIntent.id }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      balanceAmount,
      currency: 'usd'
    });
  } catch (error) {
    console.error('Commission balance error:', error);
    res.status(500).json({ error: 'Failed to create balance payment' });
  }
};

// ==========================================
// 4. STRIPE WEBHOOK HANDLER
// ==========================================
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
    console.error('Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('Stripe event received:', event.type);

  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(event.data.object);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
    default:
      console.log(`Unhandled event: ${event.type}`);
  }

  res.json({ received: true });
};

// ==========================================
// HELPERS
// ==========================================

async function handlePaymentSuccess(paymentIntent) {
  const { type, orderId, commissionId } = paymentIntent.metadata;

  if (type === 'ARTWORK_PURCHASE' && orderId) {
    // 1. Update order to confirmed and paid
    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CONFIRMED',
        paymentStatus: 'FULLY_PAID'
      },
      include: { items: true, customer: true }
    });

    // 2. Mark artworks as SOLD
    const artworkIds = order.items.map(i => i.artworkId);
    await prisma.artwork.updateMany({
      where: { id: { in: artworkIds } },
      data: { status: 'SOLD' }
    });

    // 3. Create notification
    await prisma.notification.create({
      data: {
        type: 'ORDER',
        message: `Payment received for Order #${order.orderNumber} - $${Number(order.total).toLocaleString()}`,
        link: `/admin/orders/${order.id}`
      }
    });

    console.log('✅ Artwork order paid:', order.orderNumber);
  }

  if (type === 'COMMISSION_DEPOSIT' && commissionId) {
    // 1. Update commission deposit status
    const commission = await prisma.commission.update({
      where: { id: commissionId },
      data: {
        paymentStatus: 'DEPOSIT_PAID',
        depositPaidAt: new Date(),
        status: 'IN_PROGRESS', // Work can now begin
        startedAt: new Date()
      },
      include: { customer: true }
    });

    // 2. Create admin notification
    await prisma.notification.create({
      data: {
        type: 'COMMISSION',
        message: `Deposit paid for Commission #${commission.commissionNumber} - Work can begin!`,
        link: `/admin/commissions/${commission.id}`
      }
    });

    console.log('✅ Commission deposit paid:', commission.commissionNumber);
  }

  if (type === 'COMMISSION_BALANCE' && commissionId) {
    // 1. Update commission to fully paid
    const commission = await prisma.commission.update({
      where: { id: commissionId },
      data: {
        paymentStatus: 'FULLY_PAID',
        balancePaidAt: new Date()
      },
      include: { customer: true }
    });

    // 2. Create admin notification
    await prisma.notification.create({
      data: {
        type: 'COMMISSION',
        message: `Final balance paid for Commission #${commission.commissionNumber} - Fully paid!`,
        link: `/admin/commissions/${commission.id}`
      }
    });

    console.log('✅ Commission fully paid:', commission.commissionNumber);
  }
}

async function handlePaymentFailed(paymentIntent) {
  console.log('❌ Payment failed:', paymentIntent.id);
  const { type, orderId, commissionId } = paymentIntent.metadata;

  if (type === 'ARTWORK_PURCHASE' && orderId) {
    // Release reserved artworks back to available
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true }
    });

    if (order) {
      await prisma.artwork.updateMany({
        where: { id: { in: order.items.map(i => i.artworkId) } },
        data: { status: 'AVAILABLE' }
      });
    }
  }
}