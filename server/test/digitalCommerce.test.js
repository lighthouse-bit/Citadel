const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeLicenseType, priceForLicense, remainingEditions } = require('../src/utils/digitalCommerce');

const digitalArtwork = {
  productType: 'DIGITAL',
  price: '45.00',
  commercialLicenseEnabled: true,
  commercialPrice: '160.00',
  editionSize: 25,
  editionsIssued: 10,
  editionsReserved: 2,
};

test('commercial licensing is accepted only when configured', () => {
  assert.equal(normalizeLicenseType(digitalArtwork, 'COMMERCIAL_USE'), 'COMMERCIAL_USE');
  assert.equal(normalizeLicenseType({ ...digitalArtwork, commercialLicenseEnabled: false }, 'COMMERCIAL_USE'), 'PERSONAL_USE');
  assert.equal(normalizeLicenseType({ ...digitalArtwork, productType: 'PHYSICAL' }, 'COMMERCIAL_USE'), 'PERSONAL_USE');
});

test('server selects the configured price for each licence', () => {
  assert.equal(priceForLicense(digitalArtwork, 'PERSONAL_USE'), 45);
  assert.equal(priceForLicense(digitalArtwork, 'COMMERCIAL_USE'), 160);
});

test('edition availability accounts for sold and reserved copies', () => {
  assert.equal(remainingEditions(digitalArtwork), 13);
  assert.equal(remainingEditions({ ...digitalArtwork, editionSize: null }), null);
  assert.equal(remainingEditions({ ...digitalArtwork, editionsIssued: 24, editionsReserved: 2 }), 0);
});
