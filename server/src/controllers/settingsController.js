// server/src/controllers/settingsController.js
const prisma = require('../config/database');

const defaultSettings = {
  siteName: 'Citadel',
  siteTagline: 'Fine Art Atelier',
  artistName: 'Artist Name',
  artistBio: 'Fine artist specializing in portraits and landscapes. Each piece in my collection represents a convergence of technical mastery and emotional depth.',
  contactEmail: 'contact@citadel-art.com',
  phone: '+234 803 000 0000',
  address: 'Johnson Tower Ikeja GRA, Lagos',

  // Payment
  paystackPublicKey: '',
  paystackSecretKey: '',
  currency: 'USD',
  enableTax: false,
  taxRate: 7.5,

  // Shipping
  freeShippingThreshold: 500,
  shippingFee: 0,
  internationalShipping: true,

  // Commissions
  commissionOpen: true,
  commissionDepositPercentage: 70,
  commissionWaitTime: '2-4 weeks',
  minimumCommissionPrice: 500,

  // Social
  socialInstagram: 'https://instagram.com/citadelart',
  socialTwitter: 'https://twitter.com/citadelart',
  socialFacebook: '',

  // SEO & Appearance
  metaDescription: 'Luxury art gallery showcasing original paintings and commissions.',
  heroTitle: 'Citadel',
  heroSubtitle: 'Where Artistry Meets Timeless Elegance',

  shippingInfo: 'Free worldwide shipping on all original artworks.',
  returnPolicy: '14-day return policy for undamaged items in original packaging.',
};

// Get settings
exports.getSettings = async (req, res) => {
  try {
    let settings = await prisma.settings.findFirst();

    // Create default if none exists
    if (!settings) {
      settings = await prisma.settings.create({
        data: defaultSettings
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

// Update settings
exports.updateSettings = async (req, res) => {
  try {
    const data = req.body;

    let settings = await prisma.settings.findFirst();

    if (settings) {
      // Update existing
      settings = await prisma.settings.update({
        where: { id: settings.id },
        data: data
      });
    } else {
      // Create new
      settings = await prisma.settings.create({
        data: data
      });
    }

    res.json({ success: true, settings });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

// Reset to defaults
exports.resetSettings = async (req, res) => {
  try {
    // Delete all existing settings
    await prisma.settings.deleteMany();

    // Create fresh defaults
    const settings = await prisma.settings.create({
      data: defaultSettings
    });

    res.json({ success: true, settings });
  } catch (error) {
    console.error('Reset settings error:', error);
    res.status(500).json({ error: 'Failed to reset settings' });
  }
};