// server/src/routes/shippingRoutes.js
const express = require('express');
const router  = express.Router();
const prisma  = require('../config/database');
const { authenticateAdmin } = require('../middleware/auth');
const { calculateShipping } = require('../utils/shippingCalculator');

// ── Country to Zone Mapping ──────────────────────────────────────
// ── Determine artwork size category ─────────────────────────────
// ─────────────────────────────────────────────────────────
// GET all shipping zones with rates (Public — used at checkout)
// ─────────────────────────────────────────────────────────
router.get('/zones', async (req, res) => {
  try {
    const zones = await prisma.shippingZone.findMany({
      where:   { isActive: true },
      include: { rates: true },
      orderBy: { displayOrder: 'asc' },
    });

    res.json(zones);
  } catch (error) {
    console.error('Shipping zones fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch shipping zones' });
  }
});

// ─────────────────────────────────────────────────────────
// POST calculate shipping for cart (Public)
// Body: { country, items: [{ width, height, price }] }
// ─────────────────────────────────────────────────────────
router.post('/calculate', async (req, res) => {
  try {
    const { country, items = [] } = req.body;
    return res.json(await calculateShipping(prisma, country, items));
  } catch (error) {
    console.error('Shipping calc error:', error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Failed to calculate shipping' });
  }
});

// ─────────────────────────────────────────────────────────
// ADMIN ROUTES — Manage zones
// ─────────────────────────────────────────────────────────

// GET all zones (Admin — includes inactive)
router.get('/admin/zones', authenticateAdmin, async (req, res) => {
  try {
    const zones = await prisma.shippingZone.findMany({
      include: { rates: true },
      orderBy: { displayOrder: 'asc' },
    });
    res.json(zones);
  } catch (error) {
    console.error('Admin zones fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch zones' });
  }
});

// CREATE zone
router.post('/admin/zones', authenticateAdmin, async (req, res) => {
  try {
    const { name, countries = [], displayOrder = 0, isActive = true } = req.body;

    const zone = await prisma.shippingZone.create({
      data: { name, countries, displayOrder, isActive },
    });

    res.status(201).json(zone);
  } catch (error) {
    console.error('Zone create error:', error);
    res.status(500).json({ error: 'Failed to create zone' });
  }
});

// UPDATE zone
router.put('/admin/zones/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, countries, displayOrder, isActive } = req.body;

    const zone = await prisma.shippingZone.update({
      where: { id },
      data:  { name, countries, displayOrder, isActive },
    });

    res.json(zone);
  } catch (error) {
    console.error('Zone update error:', error);
    res.status(500).json({ error: 'Failed to update zone' });
  }
});

// DELETE zone
router.delete('/admin/zones/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.shippingZone.delete({ where: { id } });
    res.json({ message: 'Zone deleted' });
  } catch (error) {
    console.error('Zone delete error:', error);
    res.status(500).json({ error: 'Failed to delete zone' });
  }
});

// ─────────────────────────────────────────────────────────
// ADMIN ROUTES — Manage rates
// ─────────────────────────────────────────────────────────

// UPSERT rate for a zone
router.post('/admin/rates', authenticateAdmin, async (req, res) => {
  try {
    const {
      zoneId,
      smallRate,
      mediumRate,
      largeRate,
      xlargeRate,
      estimatedDays,
    } = req.body;

    const rate = await prisma.shippingRate.upsert({
      where:  { zoneId },
      update: {
        smallRate:     parseFloat(smallRate)  || 0,
        mediumRate:    parseFloat(mediumRate) || 0,
        largeRate:     parseFloat(largeRate)  || 0,
        xlargeRate:    parseFloat(xlargeRate) || 0,
        estimatedDays,
      },
      create: {
        zoneId,
        smallRate:     parseFloat(smallRate)  || 0,
        mediumRate:    parseFloat(mediumRate) || 0,
        largeRate:     parseFloat(largeRate)  || 0,
        xlargeRate:    parseFloat(xlargeRate) || 0,
        estimatedDays,
      },
    });

    res.json(rate);
  } catch (error) {
    console.error('Rate upsert error:', error);
    res.status(500).json({ error: 'Failed to save rate' });
  }
});

// ─────────────────────────────────────────────────────────
// Seed default zones (run once after migration)
// POST /api/shipping/admin/seed
// ─────────────────────────────────────────────────────────
router.post('/admin/seed', authenticateAdmin, async (req, res) => {
  try {
    const existing = await prisma.shippingZone.count();
    if (existing > 0) {
      return res.json({ message: 'Zones already exist', count: existing });
    }

    // Create the 3 default zones
    const zones = [
      {
        name:         'Nigeria',
        countries:    ['NG'],
        displayOrder: 1,
        rates: {
          create: {
            smallRate:     15,
            mediumRate:    30,
            largeRate:     60,
            xlargeRate:    120,
            estimatedDays: '3-5 business days',
          },
        },
      },
      {
        name:         'Africa',
        countries:    ['GH','KE','ZA','EG','ET','TZ','UG','RW','SN','MA'],
        displayOrder: 2,
        rates: {
          create: {
            smallRate:     40,
            mediumRate:    80,
            largeRate:     150,
            xlargeRate:    250,
            estimatedDays: '7-14 business days',
          },
        },
      },
      {
        name:         'International',
        countries:    [],
        displayOrder: 3,
        rates: {
          create: {
            smallRate:     80,
            mediumRate:    150,
            largeRate:     250,
            xlargeRate:    400,
            estimatedDays: '10-21 business days',
          },
        },
      },
    ];

    for (const zone of zones) {
      await prisma.shippingZone.create({ data: zone });
    }

    res.json({ message: 'Default zones seeded', count: zones.length });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ error: 'Failed to seed zones' });
  }
});

module.exports = router;
