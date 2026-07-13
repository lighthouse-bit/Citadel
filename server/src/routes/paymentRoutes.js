// server/src/routes/paymentRoutes.js

const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const https = require('https');
const crypto = require('crypto');
const { recordOperationalEvent } = require('../utils/operationalEvents');
const { verifyPaystackSignature } = require('../utils/paymentSecurity');
const { createCustomerNotification } = require('../services/customerNotificationService');

const {
  sendOrderInvoiceEmail,
  sendCommissionDepositInvoiceEmail,
} = require('../utils/emailService');

const { authenticateUser } = require('../middleware/auth');

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const USD_TO_NGN = 1600;

const removePurchasedItemsFromCart = async orderId => {
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { customerId: true, items: { select: { artworkId: true } } } });
    if (!order) return;
    await prisma.cartItem.deleteMany({ where: { customerId: order.customerId, artworkId: { in: order.items.map(item => item.artworkId) } } });
  } catch (error) {
    await recordOperationalEvent('CART_PURCHASE_CLEANUP_FAILURE', error.message, { orderId });
  }
};

const notifyOrderPayment = async orderId => {
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { customerId: true, orderNumber: true } });
    if (order) await createCustomerNotification({ customerId: order.customerId, type: 'PAYMENT', message: `Payment confirmed for order #${order.orderNumber}.`, link: `/track/${order.orderNumber}`, dedupeMinutes: 60 });
  } catch (error) {
    console.error('Order payment notification error:', error.message);
  }
};

const notifyCommissionPayment = async commissionId => {
  try {
    const commission = await prisma.commission.findUnique({ where: { id: commissionId }, select: { customerId: true, commissionNumber: true } });
    if (commission) await createCustomerNotification({ customerId: commission.customerId, type: 'PAYMENT', message: `Payment confirmed for commission #${commission.commissionNumber}.`, link: '/account', dedupeMinutes: 60 });
  } catch (error) {
    console.error('Commission payment notification error:', error.message);
  }
};

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
// CALLBACK ROUTE - FIXED
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
      await prisma.order.update({
        where: { id: metadata.orderId },
        data: {
          paymentStatus: 'FULLY_PAID',
          status: 'CONFIRMED',
        },
      });
      await removePurchasedItemsFromCart(metadata.orderId);
      await notifyOrderPayment(metadata.orderId);

      // Create notification
      await prisma.notification.create({
        data: {
          type: 'PAYMENT',
          message: `Payment received for Order #${metadata.orderId}`,
          link: `/admin/orders/${metadata.orderId}`,
        },
      }).catch(() => {});
    } 
    else if (metadata.paymentType === 'commission_deposit' && metadata.commissionId) {
      await prisma.commission.update({
        where: { id: metadata.commissionId },
        data: {
          paymentStatus: 'DEPOSIT_PAID',
          depositPaidAt: new Date(),
          status: 'IN_PROGRESS',
        },
      });

      await notifyCommissionPayment(metadata.commissionId);

      await prisma.notification.create({
        data: {
          type: 'PAYMENT',
          message: `Deposit paid for Commission #${metadata.commissionId}`,
          link: `/admin/commissions/${metadata.commissionId}`,
        },
      }).catch(() => {});
    }

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

  if (!hash || !PAYSTACK_SECRET) { recordOperationalEvent('PAYMENT_WEBHOOK_REJECTED','Missing webhook signature or Paystack configuration',{hasSignature:Boolean(hash),configured:Boolean(PAYSTACK_SECRET)},'WARNING'); return res.sendStatus(400); }

  let bodyString = '';
  if (Buffer.isBuffer(req.body)) bodyString = req.body.toString();
  else if (typeof req.body === 'string') bodyString = req.body;
  else bodyString = JSON.stringify(req.body);

  if (!verifyPaystackSignature(bodyString,hash,PAYSTACK_SECRET)) { recordOperationalEvent('PAYMENT_WEBHOOK_REJECTED','Invalid Paystack webhook signature',null,'WARNING'); return res.sendStatus(400); }

  try {
    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (event.event === 'charge.success') {
      const metadata = event.data.metadata || {};

      if (metadata.paymentType === 'artwork' && metadata.orderId) {
        await prisma.order.update({
          where: { id: metadata.orderId },
          data: {
            paymentStatus: 'FULLY_PAID',
            status: 'CONFIRMED',
          },
        });
        await removePurchasedItemsFromCart(metadata.orderId);
        await notifyOrderPayment(metadata.orderId);
      } else if (metadata.paymentType === 'commission_deposit' && metadata.commissionId) {
        await prisma.commission.update({
          where: { id: metadata.commissionId },
          data: {
            paymentStatus: 'DEPOSIT_PAID',
            depositPaidAt: new Date(),
            status: 'IN_PROGRESS',
          },
        });
        await notifyCommissionPayment(metadata.commissionId);
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err);
    recordOperationalEvent('PAYMENT_WEBHOOK_FAILURE',err.message);
    res.sendStatus(200);
  }
});

// ─────────────────────────────────────────────
// ARTWORK PAYMENT INIT
// ─────────────────────────────────────────────
router.post('/artwork-payment', authenticateUser, async (req, res) => {
  try {
    const { orderId, checkoutToken } = req.body;

    if (!PAYSTACK_SECRET) return res.status(503).json({ error: 'Payment service is not configured' });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });

    if (!order) return res.status(404).json({ error: 'Order not found' });
    const ownsOrder = req.user?.role === 'customer' && req.user.id === order.customerId;
    const hasCheckoutToken = typeof checkoutToken === 'string' && checkoutToken === order.checkoutToken;
    if (!ownsOrder && !hasCheckoutToken) return res.status(403).json({ error: 'This checkout session is not authorized' });
    if (order.paymentStatus === 'FULLY_PAID') return res.json({ alreadyPaid: true, order });
    if (order.status !== 'PENDING') return res.status(409).json({ error: 'This order is not available for payment' });

    const usdAmount = parseFloat(order.total);
    const ngnAmount = usdAmount * USD_TO_NGN;

    const paystackData = await initializePaystackTransaction({
      email: order.customer.email,
      amount: Math.round(ngnAmount * 100),
      currency: 'NGN',
      reference: `artwork_${order.id}_${Date.now()}`,
      metadata: { orderId: order.id, paymentType: 'artwork' },
      callback_url: `${process.env.CLIENT_URL}/checkout`,
    });

    if (!paystackData.status || !paystackData.data?.authorization_url) return res.status(502).json({ error: paystackData.message || 'Payment provider could not start the transaction' });

    await prisma.order.update({
      where: { id: orderId },
      data: { stripePaymentIntentId: paystackData.data.reference },
    });

    return res.json({
      authorizationUrl: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
      total: usdAmount,
      currency: 'USD',
      orderNumber: order.orderNumber,
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
      callback_url: `${process.env.CLIENT_URL}/commission/payment/${commission.id}`,
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
// VERIFY PAYMENT
// ─────────────────────────────────────────────
router.post('/verify', async (req, res) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({ success: false, error: 'Reference is required' });
    }

    const verificationData = await verifyPaystackTransaction(reference);

    if (!verificationData.status || verificationData.data.status !== 'success') {
      return res.status(400).json({ success: false, error: 'Payment verification failed' });
    }

    const paymentData = verificationData.data;
    const metadata = paymentData.metadata;

    if (metadata.paymentType === 'commission_deposit') {
      const commissionId = metadata.commissionId;
      const commission = await prisma.commission.findUnique({
        where: { id: commissionId },
        include: { customer: true },
      });

      if (!commission) return res.status(404).json({ success: false, error: 'Commission not found' });

      if (commission.paymentStatus === 'DEPOSIT_PAID' || commission.paymentStatus === 'FULLY_PAID') {
        return res.json({ success: true, type: 'deposit', alreadyVerified: true });
      }

      const updatedCommission = await prisma.commission.update({
        where: { id: commissionId },
        data: {
          paymentStatus: 'DEPOSIT_PAID',
          depositPaidAt: new Date(),
          status: 'IN_PROGRESS',
        },
      });

      await notifyCommissionPayment(commissionId);

      try {
        await sendCommissionDepositInvoiceEmail({
          customerEmail: commission.customer.email,
          customerName: `${commission.customer.firstName} ${commission.customer.lastName}`,
          commissionNumber: commission.commissionNumber,
          amount: Number(paymentData.amount) / 100 / USD_TO_NGN,
          reference,
        });
      } catch (emailErr) {
        console.error('EMAIL ERROR:', emailErr);
      }

      return res.json({ success: true, type: 'deposit', commission: updatedCommission });
    }

    if (metadata.paymentType === 'artwork') {
      const orderId = metadata.orderId;
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { customer: true, shippingAddress: true, items: true },
      });

      if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

      if (order.paymentStatus === 'FULLY_PAID') {
        await removePurchasedItemsFromCart(orderId);
        await notifyOrderPayment(orderId);
        return res.json({ success: true, type: 'artwork', alreadyVerified: true, order });
      }

      const expectedAmount = Math.round(Number(order.total) * USD_TO_NGN * 100);
      if (order.stripePaymentIntentId !== reference || Number(paymentData.amount) !== expectedAmount || paymentData.currency !== 'NGN') {
        await recordOperationalEvent('PAYMENT_VERIFICATION_MISMATCH', 'Paystack payment did not match the order', { orderId, reference, expectedAmount, receivedAmount: paymentData.amount, currency: paymentData.currency }, 'WARNING');
        return res.status(400).json({ success: false, error: 'Payment details do not match this order' });
      }

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'FULLY_PAID',
          status: 'CONFIRMED',
        },
      });
      await removePurchasedItemsFromCart(orderId);
      await notifyOrderPayment(orderId);

      try {
        await sendOrderInvoiceEmail({
          customerEmail: order.customer.email,
          customerName: `${order.customer.firstName} ${order.customer.lastName}`,
          orderNumber: order.orderNumber,
          amount: Number(paymentData.amount) / 100 / USD_TO_NGN,
          reference,
        });
      } catch (emailErr) {
        console.error('EMAIL ERROR:', emailErr);
      }

      return res.json({ success: true, type: 'artwork', order: { ...order, ...updatedOrder } });
    }

    return res.status(400).json({ success: false, error: 'Unknown payment type' });

  } catch (err) {
    console.error('VERIFY ERROR:', err);
    return res.status(500).json({ success: false, error: 'Payment verification failed' });
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

    return res.json({
      success: true,
      paid,
      paymentStatus: order.paymentStatus,
      orderStatus: order.status,
    });

  } catch (err) {
    console.error('STATUS ERROR:', err);
    return res.status(500).json({ error: 'Failed to check status' });
  }
});

module.exports = router;
