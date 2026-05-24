// server/src/routes/paymentRoutes.js

const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const https = require('https');

const {
  sendOrderInvoiceEmail,
  sendCommissionDepositInvoiceEmail,
  sendCommissionBalanceInvoiceEmail,
} = require('../utils/emailService');

const { authenticateUser } = require('../middleware/auth');

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

// =============================
// USD → NGN conversion rate
// =============================
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
// ARTWORK PAYMENT INIT
// ─────────────────────────────────────────────
router.post('/artwork-payment', authenticateUser, async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        error: 'Order not found',
      });
    }

    const usdAmount = parseFloat(order.total);
    const ngnAmount = usdAmount * USD_TO_NGN;

    const paystackData = await initializePaystackTransaction({
      email: order.customer.email,
      amount: Math.round(ngnAmount * 100),
      currency: 'NGN',
      reference: `artwork_${order.id}_${Date.now()}`,
      metadata: {
        orderId: order.id,
        paymentType: 'artwork',
      },
      callback_url: `${process.env.CLIENT_URL}/checkout/success`,
    });

    if (!paystackData.status) {
      return res.status(500).json(paystackData);
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        stripePaymentIntentId: paystackData.data.reference,
      },
    });

    return res.json({
      authorizationUrl: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
      total: usdAmount,
      currency: 'USD',
    });

  } catch (err) {
    console.error('ARTWORK PAYMENT ERROR:', err);

    return res.status(500).json({
      error: 'Payment init failed',
    });
  }
});

// ─────────────────────────────────────────────
// COMMISSION DEPOSIT PAYMENT INIT
// ─────────────────────────────────────────────
router.post('/commission-deposit', authenticateUser, async (req, res) => {
  try {
    const { commissionId } = req.body;

    const commission = await prisma.commission.findUnique({
      where: {
        id: commissionId,
      },
      include: {
        customer: true,
      },
    });

    if (!commission) {
      return res.status(404).json({
        error: 'Commission not found',
      });
    }

    // =============================
    // CALCULATIONS
    // =============================
    const finalPrice = Number(
      commission.finalPrice ||
      commission.estimatedPrice ||
      0
    );

    const depositPercentage = Number(
      commission.depositPercentage || 70
    );

    const depositAmount = Number(
      commission.depositAmount ||
      (finalPrice * depositPercentage) / 100
    );

    const balanceAmount = Number(
      commission.balanceAmount ||
      (finalPrice - depositAmount)
    );

    if (!finalPrice || finalPrice <= 0) {
      return res.status(400).json({
        error: 'Invalid commission price',
      });
    }

    // =============================
    // PAYSTACK
    // =============================
    const ngnAmount = depositAmount * USD_TO_NGN;

    const paystackData = await initializePaystackTransaction({
      email: commission.customer.email,

      amount: Math.round(ngnAmount * 100),

      currency: 'NGN',

      reference: `commission_deposit_${commission.id}_${Date.now()}`,

      metadata: {
        commissionId: commission.id,
        paymentType: 'commission_deposit',
      },

      callback_url: `${process.env.CLIENT_URL}/checkout/success`,
    });

    if (!paystackData.status) {
      return res.status(500).json(paystackData);
    }

    // =============================
    // SAVE PAYMENT REFERENCE
    // =============================
    await prisma.commission.update({
      where: {
        id: commissionId,
      },
      data: {
        depositPaymentIntentId: paystackData.data.reference,
      },
    });

    // =============================
    // RESPONSE
    // =============================
    return res.json({
      authorizationUrl: paystackData.data.authorization_url,

      reference: paystackData.data.reference,

      finalPrice,

      depositAmount,

      balanceAmount,

      depositPercentage,

      currency: 'USD',
    });

  } catch (err) {
    console.error('COMMISSION PAYMENT ERROR:', err);

    return res.status(500).json({
      error: 'Commission deposit init failed',
    });
  }
});

// ─────────────────────────────────────────────
// VERIFY PAYMENT
// ─────────────────────────────────────────────
router.post('/verify', async (req, res) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({
        success: false,
        error: 'Reference is required',
      });
    }

    // =============================
    // VERIFY WITH PAYSTACK
    // =============================
    const verificationData = await verifyPaystackTransaction(reference);

    if (
      !verificationData.status ||
      verificationData.data.status !== 'success'
    ) {
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed',
      });
    }

    const paymentData = verificationData.data;
    const metadata = paymentData.metadata;

    // =============================
    // COMMISSION DEPOSIT
    // =============================
    if (metadata.paymentType === 'commission_deposit') {

      const commissionId = metadata.commissionId;

      const commission = await prisma.commission.findUnique({
        where: {
          id: commissionId,
        },
        include: {
          customer: true,
        },
      });

      if (!commission) {
        return res.status(404).json({
          success: false,
          error: 'Commission not found',
        });
      }

      // Prevent duplicate verification
      if (
        commission.paymentStatus === 'DEPOSIT_PAID' ||
        commission.paymentStatus === 'FULLY_PAID'
      ) {
        return res.json({
          success: true,
          type: 'deposit',
          alreadyVerified: true,
        });
      }

      // =============================
      // UPDATE COMMISSION
      // =============================
      const updatedCommission = await prisma.commission.update({
        where: {
          id: commissionId,
        },
        data: {
          paymentStatus: 'DEPOSIT_PAID',
          depositPaidAt: new Date(),
          status: 'IN_PROGRESS',
        },
      });

      // =============================
      // SEND EMAIL
      // =============================
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

      return res.json({
        success: true,
        type: 'deposit',
        commission: updatedCommission,
      });
    }

    // =============================
    // ARTWORK PAYMENT
    // =============================
    if (metadata.paymentType === 'artwork') {

      const orderId = metadata.orderId;

      const order = await prisma.order.findUnique({
        where: {
          id: orderId,
        },
        include: {
          customer: true,
        },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found',
        });
      }

      if (order.paymentStatus === 'FULLY_PAID') {
        return res.json({
          success: true,
          type: 'artwork',
          alreadyVerified: true,
        });
      }

      const updatedOrder = await prisma.order.update({
        where: {
          id: orderId,
        },
        data: {
          paymentStatus: 'FULLY_PAID',
          status: 'CONFIRMED',
        },
      });

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

      return res.json({
        success: true,
        type: 'artwork',
        order: updatedOrder,
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Unknown payment type',
    });

  } catch (err) {
    console.error('VERIFY ERROR:', err);

    return res.status(500).json({
      success: false,
      error: 'Payment verification failed',
    });
  }
});

// ─────────────────────────────────────────────
// PAYMENT STATUS CHECK
// ─────────────────────────────────────────────
router.get('/status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
      select: {
        id: true,
        orderNumber: true,
        paymentStatus: true,
        status: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        error: 'Order not found',
      });
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

    return res.status(500).json({
      error: 'Failed to check status',
    });
  }
});

module.exports = router;