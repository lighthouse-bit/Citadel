import test from 'node:test';
import assert from 'node:assert/strict';
import { getPrivacyConsent, hasAnalyticsConsent, PRIVACY_CONSENT_KEY, savePrivacyConsent } from '../src/utils/privacyConsent.js';

const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: key => values.delete(key),
};
globalThis.CustomEvent = class { constructor(type, options) { this.type = type; this.detail = options?.detail; } };
globalThis.window = { dispatchEvent: () => {} };

test('privacy consent defaults to no optional tracking', () => {
  values.clear();
  assert.equal(getPrivacyConsent(), null);
  assert.equal(hasAnalyticsConsent(), false);
});

test('saved privacy consent always keeps necessary storage enabled', () => {
  values.clear();
  const saved = savePrivacyConsent({ necessary: false, analytics: true, marketing: false });
  assert.equal(saved.necessary, true);
  assert.equal(getPrivacyConsent().analytics, true);
  assert.equal(hasAnalyticsConsent(), true);
  assert.ok(values.has(PRIVACY_CONSENT_KEY));
});

test('outdated consent versions require a fresh choice', () => {
  values.set(PRIVACY_CONSENT_KEY, JSON.stringify({ version: 0, analytics: true }));
  assert.equal(getPrivacyConsent(), null);
  assert.equal(hasAnalyticsConsent(), false);
});
