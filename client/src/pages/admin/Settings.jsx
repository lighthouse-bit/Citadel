// src/pages/admin/Settings.jsx
import { useState, useEffect } from 'react';
import { Save, Loader, RotateCcw, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useSettings } from '../../context/SettingsContext';

const defaultSettings = {
  siteName: 'Citadel',
  siteTagline: 'Fine Art Atelier',
  artistName: 'Artist Name',
  artistBio: 'Fine artist specializing in portraits and landscapes.',
  contactEmail: 'contact@citadel-art.com',
  phone: '+234 803 000 0000',
  address: 'Johnson Tower Ikeja GRA, Lagos',
  commissionOpen: true,
  commissionWaitTime: '2-4 weeks',
  shippingInfo: 'Free worldwide shipping on all original artworks.',
  returnPolicy: '14-day return policy for undamaged items.',
  heroTitle: 'CITADEL',
  heroSubtitle: 'Where Artistry Meets Timeless Elegance',
};

const Settings = () => {
  const { settings, updateSettings, resetSettings, isLoaded } = useSettings();

  const [formData, setFormData] = useState(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleReset = () => {
    if (window.confirm('Reset all settings to defaults?')) {
      resetSettings();
      setFormData(defaultSettings);
      toast.success('Settings reset to defaults');
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="animate-spin text-amber-600" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif text-stone-900">Site Settings</h1>
          <p className="text-stone-500">Manage your website configuration</p>
        </div>
        <Link to="/" target="_blank" className="flex items-center gap-2 text-amber-600 hover:text-amber-700">
          <Eye size={18} /> Preview Site
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* General */}
        <div className="bg-white rounded-2xl border border-stone-200 p-8 space-y-6">
          <h2 className="text-xl font-semibold">General Information</h2>
          
          <div>
            <label className="block text-sm text-stone-600 mb-2">Site Name</label>
            <input
              type="text"
              name="siteName"
              value={formData.siteName}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm text-stone-600 mb-2">Site Tagline</label>
            <input
              type="text"
              name="siteTagline"
              value={formData.siteTagline}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm text-stone-600 mb-2">Artist Name</label>
            <input
              type="text"
              name="artistName"
              value={formData.artistName}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Commission */}
        <div className="bg-white rounded-2xl border border-stone-200 p-8 space-y-6">
          <h2 className="text-xl font-semibold">Commission Settings</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Accept Commissions</p>
              <p className="text-sm text-stone-500">Allow new commission requests</p>
            </div>
            <input
              type="checkbox"
              name="commissionOpen"
              checked={formData.commissionOpen}
              onChange={handleChange}
              className="w-5 h-5 accent-amber-600"
            />
          </div>
        </div>

        {/* Save Buttons */}
        <div className="flex justify-end gap-4">
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
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;