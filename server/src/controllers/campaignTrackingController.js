const prisma = require('../config/database');
const { verifyAlertToken } = require('../utils/wishlistAlertTokens');
const { verifyBoundTrackingTarget } = require('../utils/campaignTracking');

const transparentGif = Buffer.from('R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=', 'base64');

const sendPixel = res => res
  .set({
    'Content-Type': 'image/gif',
    'Content-Length': transparentGif.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    Pragma: 'no-cache',
  })
  .status(200)
  .send(transparentGif);

const recordFirstEvent = async ({ deliveryId, customerId, event }) => {
  const isOpen = event === 'open';
  const timestampField = isOpen ? 'openedAt' : 'clickedAt';
  const countField = isOpen ? 'openCount' : 'clickCount';
  const campaignCountField = isOpen ? 'openedCount' : 'clickedCount';
  const now = new Date();

  await prisma.$transaction(async tx => {
    const first = await tx.campaignDelivery.updateMany({
      where: { id: deliveryId, customerId, status: 'DELIVERED', [timestampField]: null },
      data: { [timestampField]: now, [countField]: { increment: 1 } },
    });
    if (first.count) {
      const delivery = await tx.campaignDelivery.findUnique({ where: { id: deliveryId }, select: { campaignId: true } });
      if (delivery) await tx.emailCampaign.update({ where: { id: delivery.campaignId }, data: { [campaignCountField]: { increment: 1 } } });
      return;
    }
    await tx.campaignDelivery.updateMany({
      where: { id: deliveryId, customerId, status: 'DELIVERED', [timestampField]: { not: null } },
      data: { [countField]: { increment: 1 } },
    });
  });
};

exports.trackOpen = async (req, res) => {
  try {
    const payload = verifyAlertToken(req.query.token, 'marketing-open');
    if (payload?.customerId && payload?.alertId) {
      await recordFirstEvent({ deliveryId: payload.alertId, customerId: payload.customerId, event: 'open' });
    }
  } catch (error) {
    console.error('Campaign open tracking failed:', error.message);
  }
  return sendPixel(res);
};

exports.trackClick = async (req, res) => {
  try {
    const target = String(req.query.url || '');
    const payload = verifyAlertToken(req.query.token, 'marketing-click');
    const deliveryId = payload && verifyBoundTrackingTarget(payload.alertId, target);
    if (!payload?.customerId || !deliveryId) return res.status(400).send('Invalid tracking link');
    await recordFirstEvent({ deliveryId, customerId: payload.customerId, event: 'click' });
    return res.redirect(302, target);
  } catch (error) {
    console.error('Campaign click tracking failed:', error.message);
    return res.status(400).send('Invalid tracking link');
  }
};

module.exports.recordFirstEvent = recordFirstEvent;
