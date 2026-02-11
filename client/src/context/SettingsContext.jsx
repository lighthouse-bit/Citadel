// client/src/context/SettingsContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

// Default settings
const defaultSettings = {
  siteName: 'Citadel',
  siteTagline: 'Fine Art Atelier',
  artistName: 'Artist Name',
  artistBio: 'Fine artist specializing in portraits and landscapes. Each piece in my collection represents a convergence of technical mastery and emotional depth, carefully crafted to resonate with the discerning collector.',
  contactEmail: 'contact@citadel-art.com',
  phone: '+1 (555) 123-4567',
  address: '123 Art District, New York, NY 10001',
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
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save settings to localStorage
  const updateSettings = (newSettings) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    try {
      localStorage.setItem('citadel_settings', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
    return updated;
  };

  // Reset to default settings
  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('citadel_settings');
  };

  // Get a single setting
  const getSetting = (key) => {
    return settings[key] ?? defaultSettings[key];
  };

  const value = {
    settings,
    updateSettings,
    resetSettings,
    getSetting,
    isLoaded,
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