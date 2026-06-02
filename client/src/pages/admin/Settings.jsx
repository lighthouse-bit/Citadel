// src/pages/admin/Settings.jsx
import { useState, useEffect } from 'react';
import {
  Save, Loader, RotateCcw, Eye,
  CreditCard, Truck, Mail, Globe, Award, AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useSettings } from '../../context/SettingsContext';

const ToggleSwitch = ({ checked, onChange, name }) => (
  <button
    type="button"
    onClick={() => onChange({
      target: { name, type: 'checkbox', checked: !checked },
    })}
    className={`relative inline-flex h-6 w-11 items-center rounded-full
                transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500
                ${checked ? 'bg-green-500' : 'bg-stone-300'}`}
  >
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white
                      shadow-md transition-transform
                      ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

const Settings = () => {
  const { settings, updateSettings, resetSettings, isLoaded } = useSettings();

  const [formData, setFormData]     = useState(null);
  const [isSaving, setIsSaving]     = useState(false);
  const [activeTab, setActiveTab]   = useState('general');

  // ── Sync with context when loaded ──────────────────────────
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

  const handleReset = async () => {
    if (!window.confirm('Reset all settings to defaults?')) return;
    setIsSaving(true);
    try {
      await resetSettings();
      toast.success('Settings reset to defaults');
    } catch (error) {
      toast.error('Failed to reset settings');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Loading state ──────────────────────────────────────────
  if (!isLoaded || !formData) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader size={32} className="animate-spin text-amber-600" />
      </div>
    );
  }

  const tabs = [
    { id: 'general',    label: 'General',     icon: Globe       },
    { id: 'payment',    label: 'Payment',     icon: CreditCard  },
    { id: 'shipping',   label: 'Shipping',    icon: Truck       },
    { id: 'commission', label: 'Commissions', icon: Award       },
    { id: 'contact',    label: 'Contact',     icon: Mail        },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif text-stone-900">Site Settings</h1>
          <p className="text-stone-500">
            Changes save to the database and reflect site-wide
          </p>
        </div>
        <Link
          to="/"
          target="_blank"
          className="flex items-center gap-2 text-amber-600 hover:text-amber-700"
        >
          <Eye size={18} /> Preview Site
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-8 py-4 font-medium flex items-center gap-2 border-b-2
                       transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-amber-600 text-amber-600'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">

        {/* ── General Tab ──────────────────────────────────── */}
        {activeTab === 'general' && (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 space-y-6">
            <h2 className="text-xl font-semibold">Branding</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-stone-600 mb-2">Site Name</label>
                <input
                  type="text"
                  name="siteName"
                  value={formData.siteName || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg
                             focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm text-stone-600 mb-2">Site Tagline</label>
                <input
                  type="text"
                  name="siteTagline"
                  value={formData.siteTagline || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg
                             focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm text-stone-600 mb-2">Hero Title</label>
                <input
                  type="text"
                  name="heroTitle"
                  value={formData.heroTitle || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg
                             focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm text-stone-600 mb-2">Hero Subtitle</label>
                <input
                  type="text"
                  name="heroSubtitle"
                  value={formData.heroSubtitle || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg
                             focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-stone-600 mb-2">Artist Name</label>
              <input
                type="text"
                name="artistName"
                value={formData.artistName || ''}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-stone-300 rounded-lg
                           focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm text-stone-600 mb-2">Artist Bio</label>
              <textarea
                name="artistBio"
                rows={4}
                value={formData.artistBio || ''}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-stone-300 rounded-lg
                           focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm text-stone-600 mb-2">
                Meta Description (SEO)
              </label>
              <textarea
                name="metaDescription"
                rows={2}
                value={formData.metaDescription || ''}
                onChange={handleChange}
                placeholder="Short description shown in Google search results"
                className="w-full px-4 py-3 border border-stone-300 rounded-lg
                           focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        )}

        {/* ── Payment Tab ──────────────────────────────────── */}
        {activeTab === 'payment' && (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 space-y-6">
            <h2 className="text-xl font-semibold">Payment Settings</h2>

            {/* Security warning */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4
                            flex items-start gap-3">
              <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-900">
                  Paystack API keys are managed via environment variables
                </p>
                <p className="text-amber-700 mt-1">
                  For security, your Paystack keys are stored on the Vercel backend,
                  not in this admin panel. Configure them at Vercel → Settings →
                  Environment Variables (PAYSTACK_SECRET_KEY).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-stone-600 mb-2">Currency</label>
                <select
                  name="currency"
                  value={formData.currency || 'USD'}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg
                             focus:outline-none focus:border-amber-500"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="NGN">NGN - Nigerian Naira</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4
                              bg-stone-50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">Enable Tax</p>
                  <p className="text-xs text-stone-500">
                    Add tax to checkout totals
                  </p>
                </div>
                <ToggleSwitch
                  checked={formData.enableTax}
                  onChange={handleChange}
                  name="enableTax"
                />
              </div>

              {formData.enableTax && (
                <div className="md:col-span-2">
                  <label className="block text-sm text-stone-600 mb-2">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    name="taxRate"
                    step="0.01"
                    value={formData.taxRate || 0}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-stone-300 rounded-lg
                               focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Shipping Tab ─────────────────────────────────── */}
        {activeTab === 'shipping' && (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 space-y-6">
            <h2 className="text-xl font-semibold">Shipping Settings</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-stone-600 mb-2">
                  Default Shipping Fee (USD)
                </label>
                <input
                  type="number"
                  name="shippingFee"
                  step="0.01"
                  value={formData.shippingFee || 0}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg
                             focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm text-stone-600 mb-2">
                  Free Shipping Threshold (USD)
                </label>
                <input
                  type="number"
                  name="freeShippingThreshold"
                  step="0.01"
                  value={formData.freeShippingThreshold || 0}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg
                             focus:outline-none focus:border-amber-500"
                />
                <p className="text-xs text-stone-400 mt-1">
                  Orders above this amount ship free
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-stone-50 rounded-lg">
              <div>
                <p className="font-medium text-sm">International Shipping</p>
                <p className="text-xs text-stone-500">Allow shipping worldwide</p>
              </div>
              <ToggleSwitch
                checked={formData.internationalShipping}
                onChange={handleChange}
                name="internationalShipping"
              />
            </div>

            <div>
              <label className="block text-sm text-stone-600 mb-2">
                Shipping Info Text
              </label>
              <textarea
                name="shippingInfo"
                rows={3}
                value={formData.shippingInfo || ''}
                onChange={handleChange}
                placeholder="Shown on artwork pages and footer"
                className="w-full px-4 py-3 border border-stone-300 rounded-lg
                           focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm text-stone-600 mb-2">
                Return Policy
              </label>
              <textarea
                name="returnPolicy"
                rows={3}
                value={formData.returnPolicy || ''}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-stone-300 rounded-lg
                           focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        )}

        {/* ── Commission Tab ───────────────────────────────── */}
        {activeTab === 'commission' && (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 space-y-6">
            <h2 className="text-xl font-semibold">Commission Settings</h2>

            <div className="flex items-center justify-between p-4 bg-stone-50 rounded-lg">
              <div>
                <p className="font-medium text-sm">Accept New Commissions</p>
                <p className="text-xs text-stone-500">
                  Allow clients to request custom work
                </p>
              </div>
              <ToggleSwitch
                checked={formData.commissionOpen}
                onChange={handleChange}
                name="commissionOpen"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-stone-600 mb-2">
                  Default Deposit Percentage (%)
                </label>
                <input
                  type="number"
                  name="commissionDepositPercentage"
                  min="0"
                  max="100"
                  value={formData.commissionDepositPercentage || 70}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg
                             focus:outline-none focus:border-amber-500"
                />
                <p className="text-xs text-stone-400 mt-1">
                  Amount client pays upfront (default 70%)
                </p>
              </div>

              <div>
                <label className="block text-sm text-stone-600 mb-2">
                  Minimum Commission Price (USD)
                </label>
                <input
                  type="number"
                  name="minimumCommissionPrice"
                  step="0.01"
                  value={formData.minimumCommissionPrice || 0}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg
                             focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm text-stone-600 mb-2">
                  Estimated Wait Time
                </label>
                <input
                  type="text"
                  name="commissionWaitTime"
                  value={formData.commissionWaitTime || ''}
                  onChange={handleChange}
                  placeholder="e.g., 2-4 weeks"
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg
                             focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Contact Tab ──────────────────────────────────── */}
        {activeTab === 'contact' && (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 space-y-6">
            <h2 className="text-xl font-semibold">Contact Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-stone-600 mb-2">
                  Contact Email
                </label>
                <input
                  type="email"
                  name="contactEmail"
                  value={formData.contactEmail || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg
                             focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm text-stone-600 mb-2">
                  Phone Number
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg
                             focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm text-stone-600 mb-2">
                  Physical Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg
                             focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <h3 className="text-lg font-semibold pt-4 border-t border-stone-200">
              Social Media
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-stone-600 mb-2">
                  Instagram URL
                </label>
                <input
                  type="url"
                  name="socialInstagram"
                  value={formData.socialInstagram || ''}
                  onChange={handleChange}
                  placeholder="https://instagram.com/yourhandle"
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg
                             focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm text-stone-600 mb-2">
                  Twitter / X URL
                </label>
                <input
                  type="url"
                  name="socialTwitter"
                  value={formData.socialTwitter || ''}
                  onChange={handleChange}
                  placeholder="https://twitter.com/yourhandle"
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg
                             focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm text-stone-600 mb-2">
                  Facebook URL
                </label>
                <input
                  type="url"
                  name="socialFacebook"
                  value={formData.socialFacebook || ''}
                  onChange={handleChange}
                  placeholder="https://facebook.com/yourpage"
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg
                             focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Save Buttons ─────────────────────────────────── */}
        <div className="flex justify-end gap-4 sticky bottom-4 bg-white/95
                        backdrop-blur p-4 rounded-xl shadow-lg border border-stone-200">
          <button
            type="button"
            onClick={handleReset}
            disabled={isSaving}
            className="px-6 py-3 border border-stone-300 rounded-xl
                       hover:bg-stone-50 flex items-center gap-2
                       disabled:opacity-50"
          >
            <RotateCcw size={18} />
            Reset to Defaults
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3 bg-stone-900 text-white rounded-xl
                       hover:bg-black flex items-center gap-2
                       disabled:opacity-70"
          >
            {isSaving ? (
              <>
                <Loader className="animate-spin" size={20} />
                Saving...
              </>
            ) : (
              <>
                <Save size={20} />
                Save All Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;