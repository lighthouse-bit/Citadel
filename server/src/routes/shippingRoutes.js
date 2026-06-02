// server/src/routes/shippingRoutes.js
const express = require('express');
const router  = express.Router();
const prisma  = require('../config/database');
const { authenticateAdmin } = require('../middleware/auth');

const FREE_SHIPPING_THRESHOLD = 1000; // USD

// ── Country to Zone Mapping ──────────────────────────────────────
const COUNTRY_ZONES = {
  // Nigeria zone
  NG: 'Nigeria',

  // Africa zone
  GH: 'Africa', KE: 'Africa', ZA: 'Africa', EG: 'Africa', ET: 'Africa',
  TZ: 'Africa', UG: 'Africa', RW: 'Africa', SN: 'Africa', CI: 'Africa',
  MA: 'Africa', DZ: 'Africa', AO: 'Africa', CM: 'Africa', BW: 'Africa',
};

// Map country name (full text) to zone
const getZoneByCountry = (country) => {
  if (!country) return 'International';

  const upper = country.trim().toUpperCase();

  // Direct matches
  if (upper === 'NIGERIA' || upper === 'NG') return 'Nigeria';

  const africanCountries = [
    'GHANA', 'KENYA', 'SOUTH AFRICA', 'EGYPT', 'ETHIOPIA',
    'TANZANIA', 'UGANDA', 'RWANDA', 'SENEGAL', 'IVORY COAST',
    'MOROCCO', 'ALGERIA', 'ANGOLA', 'CAMEROON', 'BOTSWANA',
    'TUNISIA', 'LIBYA', 'SUDAN', 'ZIMBABWE', 'ZAMBIA',
    'MOZAMBIQUE', 'NAMIBIA', 'BENIN', 'TOGO', 'NIGER',
  ];

  if (africanCountries.includes(upper)) return 'Africa';
  return 'International';
};

// ── Determine artwork size category ─────────────────────────────
const getArtworkSize = (width, height) => {
  const maxDim = Math.max(parseFloat(width) || 0, parseFloat(height) || 0);
  if (maxDim <= 12) return 'small';
  if (maxDim <= 24) return 'medium';
  if (maxDim <= 36) return 'large';
  return 'xlarge';
};

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

    if (!items.length) {
      return res.json({
        shippingCost:    0,
        zone:            'Unknown',
        isFreeShipping:  false,
        message:         'No items in cart',
      });
    }

    // Calculate subtotal
    const subtotal = items.reduce(
      (sum, item) => sum + parseFloat(item.price || 0),
      0
    );

    // ✅ Free shipping above threshold
    if (subtotal >= FREE_SHIPPING_THRESHOLD) {
      return res.json({
        shippingCost:    0,
        zone:            getZoneByCountry(country),
        isFreeShipping:  true,
        message:         `Free shipping on orders over $${FREE_SHIPPING_THRESHOLD}`,
      });
    }

    // Determine zone
    const zoneName = getZoneByCountry(country);

    // Get zone + rates from DB
    const zone = await prisma.shippingZone.findFirst({
      where:   { name: zoneName, isActive: true },
      include: { rates: true },
    });

    if (!zone || !zone.rates.length) {
      return res.status(400).json({
        error: `Shipping not available to ${country}. Please contact us.`,
      });
    }

    const rate = zone.rates[0];

    // ✅ Find the LARGEST item and use its size for shipping
    let largestSize = 'small';
    items.forEach(item => {
      const size = getArtworkSize(item.width, item.height);
      const order = { small: 1, medium: 2, large: 3, xlarge: 4 };
      if (order[size] > order[largestSize]) largestSize = size;
    });

    // Get the rate for that size
    const sizeRates = {
      small:  parseFloat(rate.smallRate),
      medium: parseFloat(rate.mediumRate),
      large:  parseFloat(rate.largeRate),
      xlarge: parseFloat(rate.xlargeRate),
    };

    const shippingCost = sizeRates[largestSize];

    res.json({
      shippingCost,
      zone:           zoneName,
      size:           largestSize,
      estimatedDays:  rate.estimatedDays,
      isFreeShipping: false,
      message:        `Shipping to ${zoneName} (${largestSize})`,
    });

  } catch (error) {
    console.error('Shipping calc error:', error);
    res.status(500).json({ error: 'Failed to calculate shipping' });
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