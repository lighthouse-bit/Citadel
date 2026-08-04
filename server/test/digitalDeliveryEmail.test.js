const test = require('node:test');
const assert = require('node:assert/strict');
const { buildDigitalDeliveryEmail } = require('../src/utils/emailService');

test('digital delivery email links the protected library and issued certificates', () => {
  const previousClientUrl = process.env.CLIENT_URL;
  process.env.CLIENT_URL = 'https://highmarc.com/';
  const message = buildDigitalDeliveryEmail({
    firstName: 'Ada',
    orderNumber: 'ORD-1001',
    items: [{
      certificateId: '123e4567-e89b-42d3-a456-426614174000',
      title: 'Night Study',
      licenseName: 'Commercial Use Licence',
      editionNumber: 4,
      editionSize: 20,
    }],
  });
  assert.match(message.subject, /ORD-1001/);
  assert.match(message.html, /https:\/\/highmarc\.com\/account\?tab=digital/);
  assert.match(message.html, /https:\/\/highmarc\.com\/certificate\/123e4567-e89b-42d3-a456-426614174000/);
  assert.match(message.html, /Edition 4 of 20/);
  assert.match(message.html, /links are generated only after you sign in/);
  if (previousClientUrl === undefined) delete process.env.CLIENT_URL;
  else process.env.CLIENT_URL = previousClientUrl;
});

test('digital delivery email escapes customer and artwork content', () => {
  const message = buildDigitalDeliveryEmail({
    firstName: '<script>alert(1)</script>',
    orderNumber: '<unsafe>',
    items: [{ certificateId: 'safe-id', title: '<img src=x>', licenseName: 'Personal & Private' }],
  });
  assert.doesNotMatch(message.html, /<script>/);
  assert.doesNotMatch(message.html, /<img src=x>/);
  assert.match(message.html, /&lt;script&gt;/);
  assert.match(message.html, /Personal &amp; Private/);
});
