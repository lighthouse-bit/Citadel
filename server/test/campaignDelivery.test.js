const test = require('node:test');
const assert = require('node:assert/strict');

const { buildMarketingCampaignEmail } = require('../src/utils/emailService');
const { campaignStatusFromCounts, segmentWhere, VALID_SEGMENTS } = require('../src/services/campaignDeliveryService');
const { signAlertToken, verifyAlertToken } = require('../src/utils/wishlistAlertTokens');
const { safeEqual } = require('../src/middleware/cronAuth');

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
