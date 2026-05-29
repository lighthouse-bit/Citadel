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

      res.on('data', (chunk) => {
        responseData += chunk;
      });

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

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
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
// CALLBACK ROUTE (FIXED ONLY)
// ─────────────────────────────────────────────
router.get('/callback', async (req, res) => {
  const reference = req.query.reference || req.query.trxref;

  console.log('🔥 CALLBACK HIT:', reference);

  if (!reference) {
    return res.redirect(`${process.env.CLIENT_URL}/checkout`);
  }

  try {
    const verification = await verifyPaystackTransaction(reference);

    // FIXED: safe validation (prevents undefined crash)
    if (
      !verification ||
      !verification.data ||
      verification.data.status !== 'success'
    ) {
      return res.redirect(
        `${process.env.CLIENT_URL}/checkout?error=payment_failed`
      );
    }

    const paymentData = verification.data;

    // FIXED: safe metadata access
    const metadata = paymentData.metadata || {};

    // ─────────────────────────────
    // UPDATE ORDER
    // ─────────────────────────────
    if (metadata.paymentType === 'artwork' && metadata.orderId) {
      await prisma.order.update({
        where: { id: metadata.orderId },
        data: {
          paymentStatus: 'FULLY_PAID',
          status: 'CONFIRMED',
        },
      });

      await prisma.notification.create({
        data: {
          type: 'PAYMENT',
          message: `Payment received for Order #${metadata.orderId}`,
          link: `/admin/orders/${metadata.orderId}`,
        },
      }).catch(() => {});
    }

    // ─────────────────────────────
    // UPDATE COMMISSION
    // ─────────────────────────────
    else if (
      metadata.paymentType === 'commission_deposit' &&
      metadata.commissionId
    ) {
      await prisma.commission.update({
        where: { id: metadata.commissionId },
        data: {
          paymentStatus: 'DEPOSIT_PAID',
          depositPaidAt: new Date(),
          status: 'IN_PROGRESS',
        },
      });

      await prisma.notification.create({
        data: {
          type: 'PAYMENT',
          message: `Deposit paid for Commission #${metadata.commissionId}`,
          link: `/admin/commissions/${metadata.commissionId}`,
        },
      }).catch(() => {});
    }

    // IMPORTANT: keep success route
    return res.redirect(
      `${process.env.CLIENT_URL}/checkout/success?reference=${reference}`
    );

  } catch (err) {
    console.error('Callback error:', err);

    return res.redirect(
      `${process.env.CLIENT_URL}/checkout?error=verification_error`
    );
  }
});

// ─────────────────────────────────────────────
// WEBHOOK (UNCHANGED)
// ─────────────────────────────────────────────
router.post('/webhook', async (req, res) => {
  const hash = req.headers['x-paystack-signature'];

  if (!hash || !PAYSTACK_SECRET) return res.sendStatus(400);

  let bodyString = '';

  if (Buffer.isBuffer(req.body)) {
    bodyString = req.body.toString();
  } else if (typeof req.body === 'string') {
    bodyString = req.body;
  } else {
    bodyString = JSON.stringify(req.body);
  }

  const expectedHash = crypto
    .createHmac('sha512', PAYSTACK_SECRET)
    .update(bodyString)
    .digest('hex');

  if (hash !== expectedHash) return res.sendStatus(400);

  try {
    const event =
      typeof req.body === 'string'
        ? JSON.parse(req.body)
        : req.body;

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
      }

      else if (
        metadata.paymentType === 'commission_deposit' &&
        metadata.commissionId
      ) {
        await prisma.commission.update({
          where: { id: metadata.commissionId },
          data: {
            paymentStatus: 'DEPOSIT_PAID',
            depositPaidAt: new Date(),
            status: 'IN_PROGRESS',
          },
        });
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err);
    res.sendStatus(200);
  }
});

module.exports = router;