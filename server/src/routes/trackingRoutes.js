// server/src/routes/trackingRoutes.js
const express = require('express');
const router  = express.Router();
const prisma  = require('../config/database');
const { getTrackingInfo, registerTracking } = require('../utils/trackingService');

// ── Get live tracking info ───────────────────────────────
// GET /api/tracking/:orderNumber
router.get('/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;

    // Get order from DB
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      select: {
        orderNumber:       true,
        trackingNumber:    true,
        carrier:           true,
        status:            true,
        shippedAt:         true,
        deliveredAt:       true,
        estimatedDelivery: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!order.trackingNumber || !order.carrier) {
      return res.json({
        hasTracking: false,
        message:     'Tracking not yet available',
        order,
      });
    }

    // Get live tracking from 17track
    try {
      const trackingInfo = await getTrackingInfo(
        order.trackingNumber,
        order.carrier
      );

      res.json({
        hasTracking: true,
        order,
        tracking:    trackingInfo,
      });
    } catch (trackErr) {
      // Fall back to DB info if 17track fails
      console.error('17track API error:', trackErr.message);
      res.json({
        hasTracking: false,
        order,
        message:     'Live tracking unavailable. Showing last known status.',
      });
    }

  } catch (error) {
    console.error('Tracking error:', error);
    res.status(500).json({ error: 'Failed to get tracking info' });
  }
});

// ── Register tracking with 17track (call when shipped) ───
// POST /api/tracking/register
router.post('/register', async (req, res) => {
  try {
    const { trackingNumber, carrier } = req.body;

    if (!trackingNumber || !carrier) {
      return res.status(400).json({
        error: 'trackingNumber and carrier required',
      });
    }

    const result = await registerTracking(trackingNumber, carrier);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Register tracking error:', error);
    res.status(500).json({ error: 'Failed to register tracking' });
  }
});

module.exports = router;