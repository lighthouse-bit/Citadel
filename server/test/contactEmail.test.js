const test = require('node:test');
const assert = require('node:assert/strict');
const { getContactRecipient } = require('../src/utils/emailService');

test('contact enquiries default to the Highmarc business inbox', () => {
  const previous = process.env.CONTACT_EMAIL;
  delete process.env.CONTACT_EMAIL;

  try {
    assert.equal(getContactRecipient(), 'luxuryarts@highmarc.com');
  } finally {
    if (previous === undefined) delete process.env.CONTACT_EMAIL;
    else process.env.CONTACT_EMAIL = previous;
  }
});

test('contact recipient can be explicitly configured without changing the SMTP sender', () => {
  const previous = process.env.CONTACT_EMAIL;
  process.env.CONTACT_EMAIL = ' studio@example.com ';

  try {
    assert.equal(getContactRecipient(), 'studio@example.com');
  } finally {
    if (previous === undefined) delete process.env.CONTACT_EMAIL;
    else process.env.CONTACT_EMAIL = previous;
  }
});
