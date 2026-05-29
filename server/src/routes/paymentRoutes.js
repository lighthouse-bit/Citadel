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

// =========================
// VERIFY HELPER
// =========================
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

      res.on('data', (chunk) => (data += chunk));

      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
};

// =========================
// CALLBACK (FIXED)
// =========================
router.get('/callback', async (req, res) => {
  const reference = req.query.reference || req.query.trxref;

  console.log('🔥 CALLBACK:', reference);

  if (!reference) {
    return res.redirect(`${process.env.CLIENT_URL}/checkout`);
  }

  try {
    const verification = await verifyPaystackTransaction(reference);

    if (!verification.status || verification.data.status !== 'success') {
      return res.redirect(
        `${process.env.CLIENT_URL}/checkout?error=payment_failed`
      );
    }

    const metadata = verification.data.metadata || {};

    // UPDATE ORDER
    if (metadata.paymentType === 'artwork' && metadata.orderId) {
      await prisma.order.update({
        where: { id: metadata.orderId },
        data: {
          paymentStatus: 'FULLY_PAID',
          status: 'CONFIRMED',
        },
      });
    }

    // UPDATE COMMISSION
    if (metadata.paymentType === 'commission_deposit') {
      await prisma.commission.update({
        where: { id: metadata.commissionId },
        data: {
          paymentStatus: 'DEPOSIT_PAID',
          status: 'IN_PROGRESS',
        },
      });
    }

    // 🔥 IMPORTANT FIX
    // ALWAYS GO BACK TO CHECKOUT WITH REFERENCE
    return res.redirect(
      `${process.env.CLIENT_URL}/checkout?reference=${reference}`
    );

  } catch (err) {
    console.error('Callback error:', err);

    return res.redirect(
      `${process.env.CLIENT_URL}/checkout?error=verification_error`
    );
  }
});

// =========================
// VERIFY API
// =========================
router.post('/verify', async (req, res) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({
        success: false,
        error: 'Reference required',
      });
    }

    const result = await verifyPaystackTransaction(reference);

    if (!result.status || result.data.status !== 'success') {
      return res.status(400).json({
        success: false,
        error: 'Payment not successful',
      });
    }

    return res.json({
      success: true,
      data: result.data,
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      error: 'Verification failed',
    });
  }
});

module.exports = router;