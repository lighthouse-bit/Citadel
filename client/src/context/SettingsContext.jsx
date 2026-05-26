// client/src/context/SettingsContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { settingsAPI } from '../services/api';
import toast from 'react-hot-toast';

const SettingsContext = createContext();

const defaultSettings = {
  siteName: 'Citadel',
  siteTagline: 'Fine Art Atelier',
  artistName: 'Artist Name',
  artistBio: 'Fine artist specializing in portraits and landscapes.',
  contactEmail: 'contact@citadel-art.com',
  phone: '+2348087535982',
  address: 'Johnson Tower Ikeja GRA, Lagos',

  paystackPublicKey: '',
  paystackSecretKey: '',
  currency: 'USD',
  enableTax: false,
  taxRate: 7.5,

  freeShippingThreshold: 500,
  shippingFee: 0,
  internationalShipping: true,

  commissionOpen: true,
  commissionDepositPercentage: 70,
  commissionWaitTime: '2-4 weeks',
  minimumCommissionPrice: 500,

  socialInstagram: 'https://instagram.com/citadelart',
  socialTwitter: 'https://twitter.com/citadelart',
  socialFacebook: '',

  metaDescription: 'Luxury art gallery showcasing original paintings and commissions.',
  heroTitle: 'Citadel',
  heroSubtitle: 'Where Artistry Meets Timeless Elegance',

  shippingInfo: 'Free worldwide shipping on all original artworks.',
  returnPolicy: '14-day return policy for undamaged items in original packaging.',
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  const fetchSettings = async () => {
    try {
      const response = await settingsAPI.getSettings();
      setSettings({ ...defaultSettings, ...response.data });
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error('Using default settings');
      setSettings(defaultSettings);
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateSettings = async (newSettings) => {
    try {
      const response = await settingsAPI.updateSettings(newSettings);
      setSettings({ ...defaultSettings, ...response.data.settings || newSettings });
      toast.success('Settings saved successfully!');
      return true;
    } catch (error) {
      console.error('Update failed:', error);
      toast.error('Failed to save settings');
      return false;
    }
  };

  const resetSettings = async () => {
    try {
      const response = await settingsAPI.resetSettings();
      setSettings({ ...defaultSettings, ...response.data.settings });
      toast.success('Settings reset to defaults');
    } catch (error) {
      console.error('Reset failed:', error);
      toast.error('Failed to reset settings');
      setSettings(defaultSettings);
    }
  };

  const getSetting = (key) => settings[key] ?? defaultSettings[key];

  return (
    <SettingsContext.Provider value={{
      settings,
      isLoaded,
      updateSettings,
      resetSettings,
      fetchSettings,
      getSetting,
      defaultSettings,
    }}>
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