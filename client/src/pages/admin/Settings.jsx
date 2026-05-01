// src/pages/admin/Settings.jsx
import { useState, useEffect } from 'react';
import { Save, Loader, RotateCcw, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useSettings } from '../../context/SettingsContext';

const defaultSettings = {
  siteName:           'Citadel',
  siteTagline:        'Fine Art Atelier',
  artistName:         'Artist Name',
  artistBio:          'Fine artist specializing in portraits and landscapes. Each piece in my collection represents a convergence of technical mastery and emotional depth, carefully crafted to resonate with the discerning collector.',
  contactEmail:       'contact@citadel-art.com',
  phone:              '+1 (555) 123-4567',
  address:            'Johnson Tower Ikeja GRA, Lagos',
  socialInstagram:    'https://instagram.com/citadelart',
  socialTwitter:      'https://twitter.com/citadelart',
  socialFacebook:     '',
  commissionOpen:     true,
  commissionWaitTime: '2-4 weeks',
  shippingInfo:       'Free worldwide shipping on all original artworks. Each piece is carefully packaged and insured.',
  returnPolicy:       '14-day return policy for undamaged items in original packaging.',
  aboutPageContent:   '',
  heroTitle:          'CITADEL',
  heroSubtitle:       'Where Artistry Meets Timeless Elegance',
};

// ── Toggle Switch ────────────────────────────────────────────────────────────
const ToggleSwitch = ({ checked, onChange, name }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() =>
      onChange({ target: { name, type: 'checkbox', checked: !checked } })
    }
    className={`relative inline-flex h-6 w-11 items-center rounded-full
                transition-colors duration-300 focus:outline-none
                focus:ring-2 focus:ring-amber-500 focus:ring-offset-2
                ${checked ? 'bg-green-500' : 'bg-stone-300'}`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white
                  shadow-md transition-transform duration-300
                  ${checked ? 'translate-x-6' : 'translate-x-1'}`}
    />
  </button>
);

// ── Main Component ───────────────────────────────────────────────────────────
const Settings = () => {
  const { settings, updateSettings, resetSettings, isLoaded } = useSettings();

  const [isSaving, setIsSaving]         = useState(false);
  const [formData, setFormData]         = useState(defaultSettings);
  const [originalData, setOriginalData] = useState(defaultSettings);
  const [hasChanges, setHasChanges]     = useState(false);

  // ✅ Wait for context to finish loading from localStorage before
  //    populating the form — prevents stale defaults overwriting real data
  useEffect(() => {
    if (isLoaded) {
      setFormData(settings);
      setOriginalData(settings);
    }
  }, [isLoaded]); // ✅ only re-runs when load state changes

  // Track unsaved changes
  useEffect(() => {
    setHasChanges(JSON.stringify(formData) !== JSON.stringify(originalData));
  }, [formData, originalData]);

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
      await new Promise(resolve => setTimeout(resolve, 500));

      // ✅ Updates context state + localStorage in one call
      updateSettings(formData);

      setOriginalData(formData);
      setHasChanges(false);
      toast.success('Settings saved! Changes are now live across the site.');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (
      window.confirm('Reset all settings to defaults? This cannot be undone.')
    ) {
      // ✅ resetSettings now saves defaults to localStorage correctly
      resetSettings();
      setFormData(defaultSettings);
      setOriginalData(defaultSettings);
      toast.success('Settings reset to defaults');
    }
  };

  const handleDiscard = () => {
    setFormData(originalData);
    toast('Changes discarded', { icon: '↩️' });
  };

  // ✅ Show loader while context hydrates from localStorage
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-stone-400">
          <Loader size={20} className="animate-spin" />
          <span className="text-sm">Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-2xl text-stone-900"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Site Settings
          </h1>
          <p className="text-stone-500">
            Changes reflect immediately across the entire website.
          </p>
        </div>
        <Link
          to="/"
          target="_blank"
          className="inline-flex items-center gap-2 text-amber-600
                     hover:text-amber-700 text-sm"
        >
          <Eye size={16} />
          Preview Site
        </Link>
      </div>

      {/* ── Unsaved Changes Warning ──────────────────────────────────────── */}
      {hasChanges && (
        <div
          className="bg-amber-50 border border-amber-200 rounded-lg p-4
                     flex items-center justify-between"
        >
          <p className="text-amber-800 text-sm">
            You have unsaved changes. Save to apply them to the website.
          </p>
          <button
            type="button"
            onClick={handleDiscard}
            className="text-amber-700 hover:text-amber-800 text-sm font-medium"
          >
            Discard
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* ── Branding ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-6">
            Branding
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-stone-600 mb-2">
                Site Name
              </label>
              <input
                type="text"
                name="siteName"
                value={formData.siteName}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-stone-300 rounded-lg
                           focus:outline-none focus:border-amber-500 text-stone-900"
              />
              <p className="text-xs text-stone-400 mt-1">
                Displayed in the header and browser tab
              </p>
            </div>
            <div>
              <label className="block text-sm text-stone-600 mb-2">
                Site Tagline
              </label>
              <input
                type="text"
                name="siteTagline"
                value={formData.siteTagline}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-stone-300 rounded-lg
                           focus:outline-none focus:border-amber-500 text-stone-900"
              />
              <p className="text-xs text-stone-400 mt-1">
                Shown under the logo
              </p>
            </div>
            <div>
              <label className="block text-sm text-stone-600 mb-2">
                Hero Title
              </label>
              <input
                type="text"
                name="heroTitle"
                value={formData.heroTitle}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-stone-300 rounded-lg
                           focus:outline-none focus:border-amber-500 text-stone-900"
              />
              <p className="text-xs text-stone-400 mt-1">
                Large text on the homepage hero
              </p>
            </div>
            <div>
              <label className="block text-sm text-stone-600 mb-2">
                Hero Subtitle
              </label>
              <input
                type="text"
                name="heroSubtitle"
                value={formData.heroSubtitle}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-stone-300 rounded-lg
                           focus:outline-none focus:border-amber-500 text-stone-900"
              />
              <p className="text-xs text-stone-400 mt-1">
                Subtitle below the hero title
              </p>
            </div>
          </div>
        </div>

        {/* ── Artist Information ───────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-6">
            Artist Information
          </h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm text-stone-600 mb-2">
                Artist Name
              </label>
              <input
                type="text"
                name="artistName"
                value={formData.artistName}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-stone-300 rounded-lg
                           focus:outline-none focus:border-amber-500 text-stone-900"
              />
            </div>
            <div>
              <label className="block text-sm text-stone-600 mb-2">
                Artist Bio
              </label>
              <textarea
                name="artistBio"
                rows={5}
                value={formData.artistBio}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-stone-300 rounded-lg
                           focus:outline-none focus:border-amber-500
                           text-stone-900 resize-none"
                placeholder="Tell visitors about yourself and your artistic journey..."
              />
              <p className="text-xs text-stone-400 mt-1">
                Displayed on the About / Homepage section
              </p>
            </div>
          </div>
        </div>

        {/* ── Contact Information ──────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-6">
            Contact Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-stone-600 mb-2">
                Contact Email
              </label>
              <input
                type="email"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-stone-300 rounded-lg
                           focus:outline-none focus:border-amber-500 text-stone-900"
              />
            </div>
            <div>
              <label className="block text-sm text-stone-600 mb-2">
                Phone Number
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-stone-300 rounded-lg
                           focus:outline-none focus:border-amber-500 text-stone-900"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-stone-600 mb-2">
                Address
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-stone-300 rounded-lg
                           focus:outline-none focus:border-amber-500 text-stone-900"
              />
            </div>
          </div>
        </div>

        {/* ── Social Media ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-6">
            Social Media
          </h2>
          <div className="space-y-6">
            {[
              {
                name:        'socialInstagram',
                label:       'Instagram URL',
                placeholder: 'https://instagram.com/yourhandle',
              },
              {
                name:        'socialTwitter',
                label:       'Twitter / X URL',
                placeholder: 'https://twitter.com/yourhandle',
              },
              {
                name:        'socialFacebook',
                label:       'Facebook URL',
                placeholder: 'https://facebook.com/yourpage',
              },
            ].map((field) => (
              <div key={field.name}>
                <label className="block text-sm text-stone-600 mb-2">
                  {field.label}
                </label>
                <input
                  type="url"
                  name={field.name}
                  value={formData[field.name]}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg
                             focus:outline-none focus:border-amber-500 text-stone-900"
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── Commission Settings ──────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-6">
            Commission Settings
          </h2>
          <div className="space-y-6">
            <div
              className="flex items-center justify-between p-4
                         bg-stone-50 rounded-lg"
            >
              <div>
                <p className="text-stone-900 font-medium">
                  Accept Commissions
                </p>
                <p className="text-sm text-stone-500">
                  {formData.commissionOpen
                    ? 'Visitors can submit commission requests'
                    : 'Commission requests are currently disabled'}
                </p>
              </div>
              <ToggleSwitch
                checked={formData.commissionOpen}
                onChange={handleChange}
                name="commissionOpen"
              />
            </div>

            <div className="flex items-center gap-2 px-4">
              <div
                className={`w-3 h-3 rounded-full ${
                  formData.commissionOpen ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span
                className={`text-sm font-medium ${
                  formData.commissionOpen
                    ? 'text-green-700'
                    : 'text-red-700'
                }`}
              >
                Commissions are currently{' '}
                {formData.commissionOpen ? 'OPEN' : 'CLOSED'}
              </span>
            </div>

            <div>
              <label className="block text-sm text-stone-600 mb-2">
                Estimated Wait Time
              </label>
              <input
                type="text"
                name="commissionWaitTime"
                value={formData.commissionWaitTime}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-stone-300 rounded-lg
                           focus:outline-none focus:border-amber-500 text-stone-900"
                placeholder="e.g., 2-4 weeks"
              />
              <p className="text-xs text-stone-400 mt-1">
                Shown on the commission page
              </p>
            </div>
          </div>
        </div>

        {/* ── Policies ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-6">
            Policies
          </h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm text-stone-600 mb-2">
                Shipping Information
              </label>
              <textarea
                name="shippingInfo"
                rows={3}
                value={formData.shippingInfo}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-stone-300 rounded-lg
                           focus:outline-none focus:border-amber-500
                           text-stone-900 resize-none"
              />
              <p className="text-xs text-stone-400 mt-1">
                Shown on artwork detail pages and footer
              </p>
            </div>
            <div>
              <label className="block text-sm text-stone-600 mb-2">
                Return Policy
              </label>
              <textarea
                name="returnPolicy"
                rows={3}
                value={formData.returnPolicy}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-stone-300 rounded-lg
                           focus:outline-none focus:border-amber-500
                           text-stone-900 resize-none"
              />
              <p className="text-xs text-stone-400 mt-1">
                Shown on artwork detail pages and footer
              </p>
            </div>
          </div>
        </div>

        {/* ── Actions ─────────────────────────────────────────────────────── */}
        <div
          className="flex flex-col sm:flex-row justify-between gap-4
                     pt-4 border-t border-stone-200"
        >
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3
                       border border-stone-300 rounded-lg text-stone-600
                       hover:bg-stone-50 transition-colors"
          >
            <RotateCcw size={18} />
            Reset to Defaults
          </button>

          <button
            type="submit"
            disabled={isSaving || !hasChanges}
            className="px-8 py-3 bg-stone-900 text-white rounded-lg
                       hover:bg-stone-800 transition-colors inline-flex
                       items-center justify-center gap-2
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader size={18} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Settings
              </>
            )}
          </button>
        </div>
      </form>

      {/* ── Live Preview ─────────────────────────────────────────────────── */}
      <div className="bg-stone-50 rounded-xl border border-stone-200 p-6">
        <h3 className="text-sm font-medium text-stone-700 mb-4">
          Live Settings Preview
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-stone-500">Site Name</p>
            <p className="text-stone-900 font-medium">{formData.siteName}</p>
          </div>
          <div>
            <p className="text-stone-500">Email</p>
            <p className="text-stone-900 font-medium">
              {formData.contactEmail}
            </p>
          </div>
          <div>
            <p className="text-stone-500">Phone</p>
            <p className="text-stone-900 font-medium">{formData.phone}</p>
          </div>
          <div>
            <p className="text-stone-500">Commissions</p>
            <p
              className={`font-medium ${
                formData.commissionOpen ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formData.commissionOpen ? 'Open' : 'Closed'}
            </p>
          </div>
          <div>
            <p className="text-stone-500">Hero Title</p>
            <p className="text-stone-900 font-medium">{formData.heroTitle}</p>
          </div>
          <div>
            <p className="text-stone-500">Tagline</p>
            <p className="text-stone-900 font-medium">
              {formData.siteTagline}
            </p>
          </div>
          <div>
            <p className="text-stone-500">Wait Time</p>
            <p className="text-stone-900 font-medium">
              {formData.commissionWaitTime}
            </p>
          </div>
          <div>
            <p className="text-stone-500">Artist Name</p>
            <p className="text-stone-900 font-medium">
              {formData.artistName}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;