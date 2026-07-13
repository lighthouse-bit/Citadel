const prisma = require('../config/database');
const { sendWishlistAlertEmail } = require('../utils/emailService');
const { recordOperationalEvent } = require('../utils/operationalEvents');
const { signAlertToken } = require('../utils/wishlistAlertTokens');

const eligibleCustomer = {
  isVerified: true,
  isSuspended: false,
};

const changesFor = (previous, artwork) => {
  const changes = [];
  if (Number(previous.price) !== Number(artwork.price)) {
    changes.push({ type: 'PRICE_CHANGE', preference: 'wishlistPriceAlerts', oldValue: String(previous.price), newValue: String(artwork.price) });
  }
  if (previous.status !== 'AVAILABLE' && artwork.status === 'AVAILABLE') {
    changes.push({ type: 'AVAILABILITY', preference: 'wishlistAvailabilityAlerts', oldValue: previous.status, newValue: artwork.status });
  }
  return changes;
};

const deliver = async ({ customer, artwork, change }) => {
  const recent = await prisma.wishlistAlert.findFirst({
    where: {
      customerId: customer.id,
      artworkId: artwork.id,
      type: change.type,
      newValue: change.newValue,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });
  if (recent) return 'skipped';

  const alert = await prisma.wishlistAlert.create({
    data: {
      customerId: customer.id,
      artworkId: artwork.id,
      type: change.type,
      oldValue: change.oldValue,
      newValue: change.newValue,
    },
  });

  try {
    const trackingToken = signAlertToken('track', customer.id, alert.id);
    const unsubscribeToken = signAlertToken('unsubscribe', customer.id);
    const info = await sendWishlistAlertEmail({ customer, artwork, ...change, alertId: alert.id, trackingToken, unsubscribeToken });
    await prisma.$transaction([
      prisma.wishlistAlert.update({ where: { id: alert.id }, data: { status: 'SENT', sentAt: new Date(), messageId: info.messageId || null } }),
      prisma.notification.create({
        data: {
          customerId: customer.id,
          type: 'WISHLIST',
          message: change.type === 'PRICE_CHANGE' ? `Price updated for “${artwork.title}”` : change.type === 'NEW_ARTWORK' ? `New artwork: “${artwork.title}”` : `“${artwork.title}” is available again`,
          link: `/artwork/${artwork.id}`,
        },
      }),
    ]);
    return 'sent';
  } catch (error) {
    await prisma.wishlistAlert.update({ where: { id: alert.id }, data: { status: 'FAILED', error: String(error.message).slice(0, 1000) } });
    await recordOperationalEvent('WISHLIST_ALERT_FAILURE', error.message, { alertId: alert.id, artworkId: artwork.id, customerId: customer.id });
    return 'failed';
  }
};

const summarizeResults = results => results.reduce((summary, result) => ({ ...summary, [result]: (summary[result] || 0) + 1 }), { sent: 0, failed: 0, skipped: 0 });

exports.previewWishlistAlertAudience = async ({ artworkId, previous, proposed }) => {
  const changes = changesFor(previous, proposed);
  const counts = {};
  for (const change of changes) {
    counts[change.type] = await prisma.wishlistItem.count({
      where: { artworkId, customer: { ...eligibleCustomer, [change.preference]: true } },
    });
  }
  return { total: Object.values(counts).reduce((sum, count) => sum + count, 0), byType: counts };
};

exports.sendWishlistChangeAlerts = async ({ previous, artwork }) => {
  const changes = changesFor(previous, artwork);
  const jobs = [];
  for (const change of changes) {
    const items = await prisma.wishlistItem.findMany({
      where: { artworkId: artwork.id, customer: { ...eligibleCustomer, [change.preference]: true } },
      include: { customer: true },
      take: 100,
    });
    items.forEach(item => jobs.push(deliver({ customer: item.customer, artwork, change })));
  }
  return { audience: jobs.length, ...summarizeResults(await Promise.all(jobs)) };
};

exports.sendSimilarArtworkAlerts = async (artwork) => {
  if (artwork.status !== 'AVAILABLE') return { audience: 0, sent: 0, failed: 0, skipped: 0 };
  const customers = await prisma.customer.findMany({
    where: {
      ...eligibleCustomer,
      newArtworkAlerts: true,
      wishlistItems: { some: { artwork: { category: artwork.category, id: { not: artwork.id } } } },
    },
    take: 100,
  });
  const change = { type: 'NEW_ARTWORK', oldValue: null, newValue: artwork.id };
  const results = await Promise.all(customers.map(customer => deliver({ customer, artwork, change })));
  return { audience: customers.length, ...summarizeResults(results) };
};
