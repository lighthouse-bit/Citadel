// client/src/context/SettingsContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { settingsAPI } from '../services/api';

const SettingsContext = createContext();

const defaultSettings = {
  siteName:                    'Highmarc',
  siteTagline:                 'Fine Art Atelier',
  artistName:                  'Artist Name',
  artistBio:                   '',
  contactEmail:                '',
  phone:                       '',
  address:                     '',

  // Payment
  currency:                    'USD',
  enableTax:                   false,
  taxRate:                     7.5,

  // Shipping
  freeShippingThreshold:       500,
  shippingFee:                 0,
  internationalShipping:       true,

  // Commissions
  commissionOpen:              true,
  commissionDepositPercentage: 70,
  commissionWaitTime:          '2-4 weeks',
  minimumCommissionPrice:      500,

  // Social
  socialInstagram:             '',
  socialTwitter:               '',
  socialFacebook:              '',

  // SEO
  metaDescription:             '',
  heroTitle:                   'HIGHMARC',
  heroSubtitle:                'Where Artistry Meets Timeless Elegance',
  aboutPageContent:            '',

  // Policies
  shippingInfo:                '',
  returnPolicy:                '',
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings]   = useState(defaultSettings);
  const [isLoaded, setIsLoaded]   = useState(false);

  // ── Load settings from backend on mount ────────────────────
  useEffect(() => {
  const loadSettings = async () => {
    try {
      const response = await settingsAPI.get();

      // ✅ Replace nulls with defaults
      const cleaned = {};
      for (const key in defaultSettings) {
        cleaned[key] = response.data[key] ?? defaultSettings[key];
      }

      setSettings(cleaned);
    } catch (error) {
      console.error('Failed to load settings:', error);
      setSettings(defaultSettings);
    } finally {
      setIsLoaded(true);
    }
  };

  loadSettings();
}, []);

  // ── Save settings to backend ───────────────────────────────
  const updateSettings = async (newSettings) => {
  try {
    const response = await settingsAPI.update(newSettings);

    // ✅ Replace nulls with defaults
    const cleaned = {};
    for (const key in defaultSettings) {
      cleaned[key] = response.data[key] ?? defaultSettings[key];
    }

    setSettings(cleaned);
    return response.data;
  } catch (error) {
    console.error('Failed to save settings:', error);
    throw error;
  }
};

  // ── Reset settings ─────────────────────────────────────────
  const resetSettings = async () => {
    try {
      const response = await settingsAPI.update(defaultSettings);
      setSettings({ ...defaultSettings, ...response.data });
    } catch (error) {
      console.error('Failed to reset settings:', error);
      throw error;
    }
  };

  const getSetting = (key) => settings[key] ?? defaultSettings[key];

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        resetSettings,
        getSetting,
        isLoaded,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};