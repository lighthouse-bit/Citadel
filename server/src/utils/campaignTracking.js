const crypto = require('crypto');
const { signAlertToken } = require('./wishlistAlertTokens');

const hashTrackingTarget = target => crypto.createHash('sha256').update(String(target)).digest('hex');

const isTrackableUrl = value => {
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

const buildTrackedCampaignBody = ({ htmlBody, customerId, deliveryId, apiUrl }) => {
  if (!customerId || !deliveryId) return String(htmlBody || '');
  const baseUrl = String(apiUrl).replace(/\/$/, '');
  const body = String(htmlBody || '').replace(/href\s*=\s*(["'])(.*?)\1/gi, (match, quote, target) => {
    if (!isTrackableUrl(target)) return match;
    const hash = hashTrackingTarget(target);
    const token = signAlertToken('marketing-click', customerId, `${deliveryId}:${hash}`);
    const trackedUrl = `${baseUrl}/marketing/campaigns/track/click?token=${encodeURIComponent(token)}&url=${encodeURIComponent(target)}`;
    return `href=${quote}${trackedUrl}${quote}`;
  });
  const openToken = signAlertToken('marketing-open', customerId, deliveryId);
  const pixelUrl = `${baseUrl}/marketing/campaigns/track/open.gif?token=${encodeURIComponent(openToken)}`;
  return `${body}<img src="${pixelUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;overflow:hidden" />`;
};

const verifyBoundTrackingTarget = (alertId, target) => {
  const separator = String(alertId || '').indexOf(':');
  if (separator < 1 || !isTrackableUrl(target)) return null;
  const deliveryId = alertId.slice(0, separator);
  const suppliedHash = alertId.slice(separator + 1);
  const expectedHash = hashTrackingTarget(target);
  const supplied = Buffer.from(suppliedHash);
  const expected = Buffer.from(expectedHash);
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null;
  return deliveryId;
};

module.exports = { buildTrackedCampaignBody, hashTrackingTarget, isTrackableUrl, verifyBoundTrackingTarget };
