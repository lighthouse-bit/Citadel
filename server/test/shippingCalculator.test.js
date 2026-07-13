const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateShipping, getArtworkSize, getZoneByCountry } = require('../src/utils/shippingCalculator');

test('shipping zones are derived from the delivery country', () => {
  assert.equal(getZoneByCountry('Nigeria'), 'Nigeria');
  assert.equal(getZoneByCountry('Kenya'), 'Africa');
  assert.equal(getZoneByCountry('United Kingdom'), 'International');
});

test('artwork size uses the largest dimension', () => {
  assert.equal(getArtworkSize(10, 12), 'small');
  assert.equal(getArtworkSize(16, 24), 'medium');
  assert.equal(getArtworkSize(30, 20), 'large');
  assert.equal(getArtworkSize(48, 20), 'xlarge');
});

test('orders over the threshold receive free server-calculated shipping', async () => {
  const prisma = { shippingZone: { findFirst: () => { throw new Error('Rates should not be queried for free shipping'); } } };
  const quote = await calculateShipping(prisma, 'Ghana', [{ price: 1000, width: 40, height: 40 }]);
  assert.equal(quote.shippingCost, 0);
  assert.equal(quote.zone, 'Africa');
  assert.equal(quote.isFreeShipping, true);
});

test('configured rate for the largest artwork is selected', async () => {
  const prisma = { shippingZone: { findFirst: async () => ({ rates: [{ smallRate: 15, mediumRate: 30, largeRate: 60, xlargeRate: 120, estimatedDays: '3-5 days' }] }) } };
  const quote = await calculateShipping(prisma, 'Nigeria', [{ price: 250, width: 10, height: 10 }, { price: 300, width: 30, height: 20 }]);
  assert.equal(quote.shippingCost, 60);
  assert.equal(quote.size, 'large');
  assert.equal(quote.estimatedDays, '3-5 days');
});
