// client/src/context/SettingsContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

// Default settings
const defaultSettings = {
  siteName: 'Highmarc',
  siteTagline: 'Fine Art Atelier',
  artistName: 'Artist Name',
  artistBio: 'Fine artist specializing in portraits and landscapes. Each piece in my collection represents a convergence of technical mastery and emotional depth, carefully crafted to resonate with the discerning collector.',
  contactEmail: 'contact@citadel-art.com',
  phone: '+2348087535982',
  address: 'Johnson Tower Ikeja GRA, Lagos',
  socialInstagram: 'https://instagram.com/citadelart',
  socialTwitter: 'https://twitter.com/citadelart',
  socialFacebook: '',
  commissionOpen: true,
  commissionWaitTime: '2-4 weeks',
  shippingInfo: 'Free worldwide shipping on all original artworks. Each piece is carefully packaged and insured.',
  returnPolicy: '14-day return policy for undamaged items in original packaging.',
  aboutPageContent: '',
  heroTitle: 'CITADEL',
  heroSubtitle: 'Where Artistry Meets Timeless Elegance',
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('citadel_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        // ✅ Merge with defaults so any new keys are always present
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      // ✅ Fall back to defaults silently
      setSettings(defaultSettings);
    } finally {
      // ✅ Always mark as loaded so the app doesn't hang
      setIsLoaded(true);
    }
  }, []);

  // ✅ Save to context + localStorage atomically
  const updateSettings = (newSettings) => {
    const updated = { ...defaultSettings, ...newSettings };
    setSettings(updated);
    try {
      localStorage.setItem('citadel_settings', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
    return updated;
  };

  // ✅ Reset saves defaults to localStorage instead of removing the key
  const resetSettings = () => {
    setSettings(defaultSettings);
    try {
      localStorage.setItem('citadel_settings', JSON.stringify(defaultSettings));
    } catch (error) {
      console.error('Failed to reset settings:', error);
    }
  };

  // Get a single setting with fallback
  const getSetting = (key) => {
    return settings[key] ?? defaultSettings[key];
  };

  const value = {
    settings,
    updateSettings,
    resetSettings,
    getSetting,
    isLoaded,
    defaultSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
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

export default SettingsContext;