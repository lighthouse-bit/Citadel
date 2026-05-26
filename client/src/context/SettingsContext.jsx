// client/src/context/SettingsContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { settingsAPI } from '../services/api';
import toast from 'react-hot-toast';

const SettingsContext = createContext();

const defaultSettings = {
  siteName: 'Citadel',
  siteTagline: 'Fine Art Atelier',
  artistName: 'Artist Name',
  artistBio: 'Fine artist specializing in portraits and landscapes. Each piece in my collection represents a convergence of technical mastery and emotional depth.',
  contactEmail: 'contact@citadel-art.com',
  phone: '+2348087535982',
  address: 'Johnson Tower Ikeja GRA, Lagos',

  // Payment
  paystackPublicKey: '',
  paystackSecretKey: '',
  currency: 'USD',
  enableTax: false,
  taxRate: 7.5,

  // Shipping
  freeShippingThreshold: 500,
  shippingFee: 0,
  internationalShipping: true,

  // Commissions
  commissionOpen: true,
  commissionDepositPercentage: 70,
  commissionWaitTime: '2-4 weeks',
  minimumCommissionPrice: 500,

  // Social
  socialInstagram: 'https://instagram.com/citadelart',
  socialTwitter: 'https://twitter.com/citadelart',
  socialFacebook: '',

  // SEO & Appearance
  metaDescription: 'Luxury art gallery showcasing original paintings and commissions.',
  heroTitle: 'Citadel',
  heroSubtitle: 'Where Artistry Meets Timeless Elegance',

  shippingInfo: 'Free worldwide shipping on all original artworks.',
  returnPolicy: '14-day return policy for undamaged items in original packaging.',
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  // Fetch settings from backend
  const fetchSettings = async () => {
    try {
      const response = await settingsAPI.getSettings();
      const serverSettings = response.data;

      // Merge server data with defaults to ensure all keys exist
      setSettings({ ...defaultSettings, ...serverSettings });
    } catch (error) {
      console.error('Failed to fetch settings from server:', error);
      toast.error('Using default settings');
      setSettings(defaultSettings);
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Update settings on backend + local state
  const updateSettings = async (newSettings) => {
    try {
      const response = await settingsAPI.updateSettings(newSettings);
      
      const updatedSettings = { ...defaultSettings, ...response.data.settings || newSettings };
      setSettings(updatedSettings);
      
      toast.success('Settings saved successfully!');
      return true;
    } catch (error) {
      console.error('Update settings failed:', error);
      toast.error('Failed to save settings on server');
      
      // Fallback: update locally
      const updatedSettings = { ...defaultSettings, ...newSettings };
      setSettings(updatedSettings);
      return false;
    }
  };

  // Reset to defaults
  const resetSettings = async () => {
    try {
      const response = await settingsAPI.resetSettings();
      const resetData = response.data.settings || defaultSettings;
      
      setSettings({ ...defaultSettings, ...resetData });
      toast.success('Settings reset to defaults');
    } catch (error) {
      console.error('Reset settings failed:', error);
      toast.error('Failed to reset on server. Using local defaults.');
      setSettings(defaultSettings);
    }
  };

  const getSetting = (key) => {
    return settings[key] ?? defaultSettings[key];
  };

  const value = {
    settings,
    isLoaded,
    updateSettings,
    resetSettings,
    fetchSettings,
    getSetting,
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