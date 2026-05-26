// src/pages/admin/Settings.jsx
import { useState, useEffect } from 'react';
import { Save, Loader, RotateCcw, Eye, CreditCard, Truck, Mail, Globe, Award, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useSettings } from '../../context/SettingsContext';

const defaultSettings = {
  siteName: 'Citadel',
  siteTagline: 'Fine Art Atelier',
  artistName: 'Artist Name',
  artistBio: '',
  contactEmail: 'contact@citadel-art.com',
  phone: '+234 803 000 0000',
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
  socialInstagram: '',
  socialTwitter: '',
  socialFacebook: '',

  // SEO
  metaDescription: 'Luxury art gallery showcasing original paintings and commissions.',
  heroTitle: 'CITADEL',
  heroSubtitle: 'Where Artistry Meets Timeless Elegance',

  shippingInfo: 'Free worldwide shipping on all original artworks.',
  returnPolicy: '14-day return policy for undamaged items in original packaging.',
};

const ToggleSwitch = ({ checked, onChange, name }) => (
  <button
    type="button"
    onClick={() => onChange({ target: { name, type: 'checkbox', checked: !checked } })}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 ${checked ? 'bg-green-500' : 'bg-stone-300'}`}
  >
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

const Settings = () => {
  const { settings, updateSettings, resetSettings, isLoaded } = useSettings();

  const [formData, setFormData] = useState(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    if (isLoaded && settings) {
      setFormData(settings);
    }
  }, [isLoaded, settings]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSettings(formData);
      toast.success('Settings saved successfully!');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'shipping', label: 'Shipping', icon: Truck },
    { id: 'commission', label: 'Commissions', icon: Award },
    { id: 'contact', label: 'Contact', icon: Mail },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif text-stone-900">Site Settings</h1>
          <p className="text-stone-500">Manage your entire website configuration</p>
        </div>
        <Link to="/" target="_blank" className="flex items-center gap-2 text-amber-600 hover:text-amber-700">
          <Eye size={18} /> Preview Site
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200 mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-8 py-4 font-medium flex items-center gap-2 border-b-2 transition-all ${
              activeTab === tab.id ? 'border-amber-600 text-amber-600' : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        {/* General */}
        {activeTab === 'general' && (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 space-y-8">
            <h2 className="text-xl font-semibold">Branding</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-stone-600 mb-2">Site Name</label>
                <input type="text" name="siteName" value={formData.siteName} onChange={handleChange} className="w-full px-4 py-3 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm text-stone-600 mb-2">Site Tagline</label>
                <input type="text" name="siteTagline" value={formData.siteTagline} onChange={handleChange} className="w-full px-4 py-3 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm text-stone-600 mb-2">Hero Title</label>
                <input type="text" name="heroTitle" value={formData.heroTitle} onChange={handleChange} className="w-full px-4 py-3 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm text-stone-600 mb-2">Hero Subtitle</label>
                <input type="text" name="heroSubtitle" value={formData.heroSubtitle} onChange={handleChange} className="w-full px-4 py-3 border rounded-lg" />
              </div>
            </div>
          </div>
        )}

        {/* Payment */}
        {activeTab === 'payment' && (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 space-y-8">
            <h2 className="text-xl font-semibold">Payment Configuration</h2>
            <div>
              <label className="block text-sm text-stone-600 mb-2">Paystack Public Key</label>
              <input type="text" name="paystackPublicKey" value={formData.paystackPublicKey} onChange={handleChange} className="w-full px-4 py-3 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm text-stone-600 mb-2">Paystack Secret Key</label>
              <input type="password" name="paystackSecretKey" value={formData.paystackSecretKey} onChange={handleChange} className="w-full px-4 py-3 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm text-stone-600 mb-2">Currency</label>
              <select name="currency" value={formData.currency} onChange={handleChange} className="w-full px-4 py-3 border rounded-lg">
                <option value="USD">USD</option>
                <option value="NGN">NGN</option>
              </select>
            </div>
          </div>
        )}

        {/* Shipping */}
        {activeTab === 'shipping' && (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 space-y-8">
            <h2 className="text-xl font-semibold">Shipping Settings</h2>
            <div>
              <label className="block text-sm text-stone-600 mb-2">Free Shipping Threshold (USD)</label>
              <input type="number" name="freeShippingThreshold" value={formData.freeShippingThreshold} onChange={handleChange} className="w-full px-4 py-3 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm text-stone-600 mb-2">Default Shipping Fee</label>
              <input type="number" name="shippingFee" value={formData.shippingFee} onChange={handleChange} className="w-full px-4 py-3 border rounded-lg" />
            </div>
          </div>
        )}

        {/* Commissions */}
        {activeTab === 'commission' && (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 space-y-8">
            <h2 className="text-xl font-semibold">Commission Settings</h2>
            <div className="flex items-center justify-between p-4 bg-stone-50 rounded-lg">
              <div>
                <p className="font-medium">Accept New Commissions</p>
                <p className="text-sm text-stone-500">Allow clients to request custom work</p>
              </div>
              <ToggleSwitch checked={formData.commissionOpen} onChange={handleChange} name="commissionOpen" />
            </div>
            <div>
              <label className="block text-sm text-stone-600 mb-2">Default Deposit Percentage (%)</label>
              <input type="number" name="commissionDepositPercentage" value={formData.commissionDepositPercentage} onChange={handleChange} className="w-full px-4 py-3 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm text-stone-600 mb-2">Estimated Wait Time</label>
              <input type="text" name="commissionWaitTime" value={formData.commissionWaitTime} onChange={handleChange} className="w-full px-4 py-3 border rounded-lg" />
            </div>
          </div>
        )}

        {/* Contact */}
        {activeTab === 'contact' && (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 space-y-8">
            <h2 className="text-xl font-semibold">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-stone-600 mb-2">Contact Email</label>
                <input type="email" name="contactEmail" value={formData.contactEmail} onChange={handleChange} className="w-full px-4 py-3 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm text-stone-600 mb-2">Phone Number</label>
                <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-3 border rounded-lg" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-stone-600 mb-2">Physical Address</label>
                <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full px-4 py-3 border rounded-lg" />
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end gap-4 pt-6 border-t">
          <button
            type="button"
            onClick={handleReset}
            className="px-6 py-3 border border-stone-300 rounded-xl hover:bg-stone-50"
          >
            Reset to Defaults
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3 bg-stone-900 text-white rounded-xl hover:bg-black flex items-center gap-2 disabled:opacity-70"
          >
            {isSaving ? <Loader className="animate-spin" size={20} /> : <Save size={20} />}
            Save All Settings
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;