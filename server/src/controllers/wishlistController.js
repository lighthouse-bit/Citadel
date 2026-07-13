const prisma = require('../config/database');
const { verifyAlertToken } = require('../utils/wishlistAlertTokens');

const preferenceSelect = {
  wishlistAvailabilityAlerts: true,
  wishlistPriceAlerts: true,
  newArtworkAlerts: true,
  marketingEmails: true,
  emailPreferencesUpdatedAt: true,
};

const artworkInclude = {
  images: { orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }] },
  _count: { select: { wishlistItems: true } },
};

exports.list = async (req, res) => {
  try {
    const items = await prisma.wishlistItem.findMany({
      where: { customerId: req.user.id },
      include: { artwork: { include: artworkInclude } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({
      artworks: items.map(({ artwork, createdAt }) => ({ ...artwork, wishlistedAt: createdAt })),
      artworkIds: items.map(item => item.artworkId),
    });
  } catch (error) {
    console.error('Failed to load wishlist:', error);
    res.status(500).json({ error: 'Failed to load wishlist' });
  }
};

exports.add = async (req, res) => {
  try {
    const artwork = await prisma.artwork.findUnique({ where: { id: req.params.artworkId }, select: { id: true } });
    if (!artwork) return res.status(404).json({ error: 'Artwork not found' });
    await prisma.wishlistItem.upsert({
      where: { customerId_artworkId: { customerId: req.user.id, artworkId: artwork.id } },
      create: { customerId: req.user.id, artworkId: artwork.id },
      update: {},
    });
    const count = await prisma.wishlistItem.count({ where: { artworkId: artwork.id } });
    res.status(201).json({ saved: true, artworkId: artwork.id, wishlistCount: count });
  } catch (error) {
    console.error('Failed to save wishlist item:', error);
    res.status(500).json({ error: 'Failed to save artwork' });
  }
};

exports.remove = async (req, res) => {
  try {
    await prisma.wishlistItem.deleteMany({
      where: { customerId: req.user.id, artworkId: req.params.artworkId },
    });
    const count = await prisma.wishlistItem.count({ where: { artworkId: req.params.artworkId } });
    res.json({ saved: false, artworkId: req.params.artworkId, wishlistCount: count });
  } catch (error) {
    console.error('Failed to remove wishlist item:', error);
    res.status(500).json({ error: 'Failed to remove artwork' });
  }
};

exports.getPreferences = async (req, res) => {
  try {
    const preferences = await prisma.customer.findUnique({ where: { id: req.user.id }, select: preferenceSelect });
    if (!preferences) return res.status(404).json({ error: 'Customer not found' });
    res.json(preferences);
  } catch (error) {
    console.error('Failed to load email preferences:', error);
    res.status(500).json({ error: 'Failed to load email preferences' });
  }
};

exports.updatePreferences = async (req, res) => {
  try {
    const data = {};
    Object.keys(preferenceSelect).filter(key => key !== 'emailPreferencesUpdatedAt').forEach(key => {
      if (req.body[key] !== undefined) data[key] = req.body[key] === true;
    });
    if (!Object.keys(data).length) return res.status(400).json({ error: 'No preference changes supplied' });
    data.emailPreferencesUpdatedAt = new Date();
    const preferences = await prisma.customer.update({ where: { id: req.user.id }, data, select: preferenceSelect });
    res.json(preferences);
  } catch (error) {
    console.error('Failed to update email preferences:', error);
    res.status(500).json({ error: 'Failed to update email preferences' });
  }
};

exports.unsubscribe = async (req, res) => {
  try {
    const decoded = verifyAlertToken(req.params.token, 'unsubscribe');
    if (!decoded) return res.status(400).json({ error: 'Invalid unsubscribe link' });
    const result = await prisma.customer.updateMany({
      where: { id: decoded.customerId },
      data: {
        wishlistAvailabilityAlerts: false,
        wishlistPriceAlerts: false,
        newArtworkAlerts: false,
        marketingEmails: false,
        emailPreferencesUpdatedAt: new Date(),
      },
    });
    if (!result.count) return res.status(404).json({ error: 'Customer not found' });
    res.json({ success: true, message: 'You have been unsubscribed from optional emails.' });
  } catch (error) {
    console.error('Failed to unsubscribe customer:', error);
    res.status(500).json({ error: 'Failed to update email preferences' });
  }
};

const validateTrackingAlert = async (req) => {
  const decoded = verifyAlertToken(req.query.token, 'track');
  if (!decoded || decoded.alertId !== req.params.id) return null;
  return prisma.wishlistAlert.findFirst({ where: { id: req.params.id, customerId: decoded.customerId } });
};

exports.trackOpen = async (req, res) => {
  const pixel = Buffer.from('R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=', 'base64');
  try {
    const alert = await validateTrackingAlert(req);
    if (alert && !alert.openedAt) await prisma.wishlistAlert.update({ where: { id: alert.id }, data: { openedAt: new Date() } });
  } catch (error) {
    console.error('Failed to track wishlist alert open:', error);
  }
  res.set({ 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, max-age=0' }).send(pixel);
};

exports.trackClick = async (req, res) => {
  try {
    const alert = await validateTrackingAlert(req);
    if (!alert) return res.status(400).send('Invalid tracking link');
    await prisma.wishlistAlert.update({ where: { id: alert.id }, data: { clickedAt: alert.clickedAt || new Date(), openedAt: alert.openedAt || new Date() } });
    const clientUrl = (process.env.CLIENT_URL || 'https://highmarc.com').replace(/\/$/, '');
    res.redirect(302, `${clientUrl}/artwork/${encodeURIComponent(alert.artworkId)}?utm_source=wishlist_alert&utm_medium=email&utm_campaign=${encodeURIComponent(alert.type.toLowerCase())}`);
  } catch (error) {
    console.error('Failed to track wishlist alert click:', error);
    res.status(500).send('Unable to open this link');
  }
};

exports.getAlertPerformance = async (req, res) => {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [sent, failed, opened, clicked, recent] = await Promise.all([
      prisma.wishlistAlert.count({ where: { status: 'SENT', createdAt: { gte: since } } }),
      prisma.wishlistAlert.count({ where: { status: 'FAILED', createdAt: { gte: since } } }),
      prisma.wishlistAlert.count({ where: { openedAt: { not: null }, createdAt: { gte: since } } }),
      prisma.wishlistAlert.count({ where: { clickedAt: { not: null }, createdAt: { gte: since } } }),
      prisma.wishlistAlert.findMany({ include: { artwork: { select: { title: true } } }, orderBy: { createdAt: 'desc' }, take: 20 }),
    ]);
    res.json({ periodDays: 30, sent, failed, opened, clicked, openRate: sent ? opened / sent : 0, clickRate: sent ? clicked / sent : 0, recent });
  } catch (error) {
    console.error('Failed to load wishlist alert performance:', error);
    res.status(500).json({ error: 'Failed to load alert performance' });
  }
};
