const test = require('node:test');
const assert = require('node:assert/strict');

const { buildMarketingCampaignEmail, buildAutomationEmail } = require('../src/utils/emailService');
const { campaignStatusFromCounts, segmentWhere, VALID_SEGMENTS } = require('../src/services/campaignDeliveryService');
const { signAlertToken, verifyAlertToken } = require('../src/utils/wishlistAlertTokens');
const { safeEqual } = require('../src/middleware/cronAuth');
const { buildTrackedCampaignBody, verifyBoundTrackingTarget } = require('../src/utils/campaignTracking');
const { assignCampaignVariant, subjectForVariant } = require('../src/utils/campaignVariants');
const { normalizeDelay } = require('../src/services/automationService');

test('marketing campaign email personalizes safely and includes one-click unsubscribe headers', () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'campaign-test-secret';
  const token = signAlertToken('marketing-unsubscribe', 'customer-1');
  const email = buildMarketingCampaignEmail({
    subject: 'New collection',
    htmlBody: '<h1>Hello {{firstName}}</h1>',
    firstName: '<script>alert(1)</script>',
    unsubscribeToken: token,
  });

  assert.equal(email.subject, 'New collection');
  assert.match(email.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(email.html, /<script>alert/);
  assert.match(email.html, /scope=marketing/);
  assert.match(email.headers['List-Unsubscribe'], /\/api\/marketing\/unsubscribe\//);
  assert.equal(email.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
  assert.deepEqual(verifyAlertToken(token, 'marketing-unsubscribe'), { purpose: 'marketing-unsubscribe', customerId: 'customer-1', alertId: '' });
  assert.equal(verifyAlertToken(token, 'unsubscribe'), null);
  if (previousSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previousSecret;
});

test('campaign tracking signs the recipient and binds redirects to their original destination', () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'campaign-tracking-secret';
  const target = 'https://highmarc.com/shop?category=digital';
  const html = buildTrackedCampaignBody({
    htmlBody: `<a href="${target}">Shop</a><a href="mailto:luxuryarts@highmarc.com">Contact</a>`,
    customerId: 'customer-1',
    deliveryId: 'delivery-1',
    apiUrl: 'https://api.highmarc.com/api',
  });
  const trackedHref = html.match(/href="([^"]+)"/)[1];
  const trackedUrl = new URL(trackedHref.replaceAll('&amp;', '&'));
  const clickPayload = verifyAlertToken(trackedUrl.searchParams.get('token'), 'marketing-click');
  const openUrl = new URL(html.match(/src="([^"]+open\.gif[^"]+)"/)[1]);

  assert.equal(trackedUrl.searchParams.get('url'), target);
  assert.equal(verifyBoundTrackingTarget(clickPayload.alertId, target), 'delivery-1');
  assert.equal(verifyBoundTrackingTarget(clickPayload.alertId, 'https://attacker.example'), null);
  assert.match(html, /href="mailto:luxuryarts@highmarc\.com"/);
  assert.deepEqual(verifyAlertToken(openUrl.searchParams.get('token'), 'marketing-open'), {
    purpose: 'marketing-open', customerId: 'customer-1', alertId: 'delivery-1',
  });
  if (previousSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previousSecret;
});

test('A/B campaign assignment is stable and each delivery uses its assigned subject', () => {
  const assignments = Array.from({ length: 100 }, (_, index) => assignCampaignVariant('campaign-1', `customer-${index}`, true));
  assert.deepEqual(assignments, Array.from({ length: 100 }, (_, index) => assignCampaignVariant('campaign-1', `customer-${index}`, true)));
  assert.ok(assignments.includes('A'));
  assert.ok(assignments.includes('B'));
  assert.equal(assignCampaignVariant('campaign-1', 'customer-1', false), 'A');
  assert.equal(subjectForVariant({ subject: 'Original', subjectB: 'Alternative', abTestEnabled: true }, 'B'), 'Alternative');
  assert.equal(subjectForVariant({ subject: 'Original', subjectB: null, abTestEnabled: false }, 'B'), 'Original');
});

test('welcome automation personalizes safely and constrains configured delays', () => {
  const email = buildAutomationEmail({ subject: 'Welcome', htmlBody: '<p>Hello {{firstName}}</p>', firstName: '<Admin>' });
  assert.equal(email.subject, 'Welcome');
  assert.match(email.html, /Hello &lt;Admin&gt;/);
  assert.doesNotMatch(email.html, /Hello <Admin>/);
  assert.equal(normalizeDelay(-20), 0);
  assert.equal(normalizeDelay(90.4), 90);
  assert.equal(normalizeDelay(999999), 10080);
});

test('campaign status remains active until all retryable work is terminal', () => {
  assert.equal(campaignStatusFromCounts({ delivered: 4, failed: 1, pending: 0, processing: 0, retryable: 1 }), 'SENDING');
  assert.equal(campaignStatusFromCounts({ delivered: 4, failed: 1, pending: 0, processing: 0, retryable: 0 }), 'PARTIAL');
  assert.equal(campaignStatusFromCounts({ delivered: 0, failed: 1, pending: 0, processing: 0, retryable: 0 }), 'FAILED');
  assert.equal(campaignStatusFromCounts({ delivered: 4, failed: 0, pending: 0, processing: 0, retryable: 0 }), 'COMPLETED');
});

test('recipient segments always enforce consent and account eligibility', () => {
  assert.deepEqual(segmentWhere('ALL'), { isSuspended: false, marketingEmails: true });
  assert.equal(segmentWhere('VERIFIED').isVerified, true);
  assert.ok(segmentWhere('CUSTOMERS').orders.some);
  assert.ok(segmentWhere('COMMISSION_CLIENTS').commissions.some);
});

test('targeted campaign segments use fixed and explainable audience rules', () => {
  const now = new Date('2026-11-21T12:00:00.000Z');
  const recent = segmentWhere('RECENT_CUSTOMERS', now);
  const highValue = segmentWhere('HIGH_VALUE_COLLECTORS', now);
  const inactive = segmentWhere('INACTIVE_CUSTOMERS', now);
  assert.equal(recent.createdAt.gte.toISOString(), '2026-08-23T12:00:00.000Z');
  assert.equal(highValue.OR[0].orders.some.total.gte, 5000);
  assert.equal(highValue.OR[1].commissions.some.finalPrice.gte, 5000);
  assert.equal(inactive.createdAt.lt.toISOString(), '2026-05-25T12:00:00.000Z');
  assert.ok(VALID_SEGMENTS.has('RECENT_CUSTOMERS'));
  assert.ok(VALID_SEGMENTS.has('HIGH_VALUE_COLLECTORS'));
  assert.ok(VALID_SEGMENTS.has('INACTIVE_CUSTOMERS'));
});

test('cron secrets use constant-time comparison helper', () => {
  assert.equal(safeEqual('Bearer secret', 'Bearer secret'), true);
  assert.equal(safeEqual('Bearer wrong', 'Bearer secret'), false);
});
