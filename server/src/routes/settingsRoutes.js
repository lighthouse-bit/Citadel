// server/src/routes/settingsRoutes.js
const express = require('express');
const router  = express.Router();
const prisma  = require('../config/database');
const { authenticateAdmin } = require('../middleware/auth');
const { recordAudit } = require('../utils/auditService');

const SETTINGS_ID = 'settings'; // Single settings record

// ── Get site settings (Public) ──────────────────────────────
router.get('/', async (req, res) => {
  try {
    let settings = await prisma.siteSettings.findUnique({
      where: { id: SETTINGS_ID },
    });

    if (!settings) {
      // Create default settings if none exist
      settings = await prisma.siteSettings.create({
        data: { id: SETTINGS_ID },
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('Settings fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// ── Update site settings (Admin only) ───────────────────────
router.put('/', authenticateAdmin, async (req, res) => {
  try {
    const data = req.body;

    // ✅ Remove sensitive fields that shouldn't be saved in DB
    // (Paystack keys belong in environment variables, NOT in DB)
    delete data.paystackPublicKey;
    delete data.paystackSecretKey;
    delete data.id; // Never overwrite the ID

    // ✅ Parse numeric fields
    if (data.commissionDepositPercentage !== undefined) {
      data.commissionDepositPercentage = parseInt(data.commissionDepositPercentage);
    }
    if (data.freeShippingThreshold !== undefined) {
      data.freeShippingThreshold = parseFloat(data.freeShippingThreshold);
    }
    if (data.shippingFee !== undefined) {
      data.shippingFee = parseFloat(data.shippingFee);
    }
    if (data.taxRate !== undefined) {
      data.taxRate = parseFloat(data.taxRate);
    }
    if (data.minimumCommissionPrice !== undefined) {
      data.minimumCommissionPrice = parseFloat(data.minimumCommissionPrice);
    }

    const settings = await prisma.siteSettings.upsert({
      where:  { id: SETTINGS_ID },
      update: data,
      create: { id: SETTINGS_ID, ...data },
    });
    await recordAudit(req, 'UPDATE_SETTINGS', 'SiteSettings', SETTINGS_ID, { fields: Object.keys(data) });

    res.json(settings);
  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
