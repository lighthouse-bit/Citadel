export const PRIVACY_CONSENT_KEY = 'highmarc_privacy_consent_v1';

export const getPrivacyConsent = () => {
  try {
    const value = JSON.parse(localStorage.getItem(PRIVACY_CONSENT_KEY));
    if (!value || value.version !== 1) return null;
    return { necessary: true, analytics: Boolean(value.analytics), marketing: Boolean(value.marketing), version: 1, updatedAt: value.updatedAt };
  } catch {
    return null;
  }
};

export const savePrivacyConsent = preferences => {
  const value = { necessary: true, analytics: Boolean(preferences.analytics), marketing: Boolean(preferences.marketing), version: 1, updatedAt: new Date().toISOString() };
  localStorage.setItem(PRIVACY_CONSENT_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent('highmarc:privacy-consent-changed', { detail: value }));
  return value;
};

export const hasAnalyticsConsent = () => getPrivacyConsent()?.analytics === true;
