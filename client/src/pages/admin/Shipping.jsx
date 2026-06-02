// src/pages/admin/Shipping.jsx
import { useState, useEffect } from 'react';
import {
  Truck, Save, Loader, Plus, Trash2, Edit2,
  X, Check, Globe, MapPin, DollarSign,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { shippingAPI } from '../../services/api';
import toast from 'react-hot-toast';

const Shipping = () => {
  const [zones, setZones]           = useState([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [isSaving, setIsSaving]     = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [editingRates, setEditingRates] = useState(null);
  const [showNewZone, setShowNewZone] = useState(false);

  // ── Fetch zones ────────────────────────────────────────
  const fetchZones = async () => {
    setIsLoading(true);
    try {
      const response = await shippingAPI.getAdminZones();
      setZones(response.data);
    } catch (error) {
      toast.error('Failed to load shipping zones');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  // ── Update zone info ───────────────────────────────────
  const handleSaveZone = async (zone) => {
    setIsSaving(true);
    try {
      await shippingAPI.updateZone(zone.id, {
        name:         zone.name,
        countries:    zone.countries,
        displayOrder: zone.displayOrder,
        isActive:     zone.isActive,
      });
      toast.success('Zone updated');
      setEditingZone(null);
      fetchZones();
    } catch (error) {
      toast.error('Failed to update zone');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Update shipping rates ───────────────────────────────
  const handleSaveRates = async (zoneId, rates) => {
    setIsSaving(true);
    try {
      await shippingAPI.upsertRate({
        zoneId,
        smallRate:     parseFloat(rates.smallRate)  || 0,
        mediumRate:    parseFloat(rates.mediumRate) || 0,
        largeRate:     parseFloat(rates.largeRate)  || 0,
        xlargeRate:    parseFloat(rates.xlargeRate) || 0,
        estimatedDays: rates.estimatedDays,
      });
      toast.success('Rates updated successfully');
      setEditingRates(null);
      fetchZones();
    } catch (error) {
      toast.error('Failed to update rates');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete zone ────────────────────────────────────────
  const handleDeleteZone = async (id, name) => {
    if (!window.confirm(`Delete "${name}" zone? This cannot be undone.`)) return;
    try {
      await shippingAPI.deleteZone(id);
      toast.success('Zone deleted');
      fetchZones();
    } catch (error) {
      toast.error('Failed to delete zone');
    }
  };

  // ── Create new zone ────────────────────────────────────
  const handleCreateZone = async (data) => {
    setIsSaving(true);
    try {
      await shippingAPI.createZone(data);
      toast.success('Zone created');
      setShowNewZone(false);
      fetchZones();
    } catch (error) {
      toast.error('Failed to create zone');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader size={32} className="animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif text-stone-900 flex items-center gap-3">
            <Truck size={28} className="text-amber-600" />
            Shipping Management
          </h1>
          <p className="text-stone-500 mt-1">
            Manage shipping zones, rates and free shipping rules
          </p>
        </div>
        <button
          onClick={() => setShowNewZone(true)}
          className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white
                     rounded-lg hover:bg-black"
        >
          <Plus size={18} />
          Add Zone
        </button>
      </div>

      {/* Info Card */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex
                      items-start gap-3">
        <DollarSign size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-amber-900">Free Shipping Threshold</p>
          <p className="text-amber-700 mt-1">
            All orders over <strong>$1,000</strong> ship FREE regardless of zone.
            Below that, rates are calculated based on artwork size and destination.
          </p>
        </div>
      </div>

      {/* Size Reference */}
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <h3 className="font-semibold text-stone-900 mb-4">Size Reference</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-stone-50 p-3 rounded-lg">
            <p className="font-medium">Small</p>
            <p className="text-stone-500 text-xs">≤ 12 inches</p>
          </div>
          <div className="bg-stone-50 p-3 rounded-lg">
            <p className="font-medium">Medium</p>
            <p className="text-stone-500 text-xs">12-24 inches</p>
          </div>
          <div className="bg-stone-50 p-3 rounded-lg">
            <p className="font-medium">Large</p>
            <p className="text-stone-500 text-xs">24-36 inches</p>
          </div>
          <div className="bg-stone-50 p-3 rounded-lg">
            <p className="font-medium">X-Large</p>
            <p className="text-stone-500 text-xs">36+ inches</p>
          </div>
        </div>
      </div>

      {/* Zones */}
      <div className="space-y-6">
        {zones.map((zone) => (
          <ZoneCard
            key={zone.id}
            zone={zone}
            isEditing={editingZone === zone.id}
            isEditingRates={editingRates === zone.id}
            onEdit={() => setEditingZone(zone.id)}
            onCancelEdit={() => setEditingZone(null)}
            onEditRates={() => setEditingRates(zone.id)}
            onCancelEditRates={() => setEditingRates(null)}
            onSave={handleSaveZone}
            onSaveRates={handleSaveRates}
            onDelete={() => handleDeleteZone(zone.id, zone.name)}
            isSaving={isSaving}
          />
        ))}
      </div>

      {/* New Zone Modal */}
      <AnimatePresence>
        {showNewZone && (
          <NewZoneModal
            onClose={() => setShowNewZone(false)}
            onCreate={handleCreateZone}
            isSaving={isSaving}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// Zone Card Component
// ─────────────────────────────────────────────────────────
const ZoneCard = ({
  zone, isEditing, isEditingRates, onEdit, onCancelEdit,
  onEditRates, onCancelEditRates, onSave, onSaveRates,
  onDelete, isSaving,
}) => {
  const [name, setName]                = useState(zone.name);
  const [countries, setCountries]      = useState(zone.countries.join(', '));
  const [isActive, setIsActive]        = useState(zone.isActive);

  const currentRate = zone.rates?.[0] || {};
  const [rates, setRates] = useState({
    smallRate:     currentRate.smallRate     || 0,
    mediumRate:    currentRate.mediumRate    || 0,
    largeRate:     currentRate.largeRate     || 0,
    xlargeRate:    currentRate.xlargeRate    || 0,
    estimatedDays: currentRate.estimatedDays || '',
  });

  const handleSubmitZone = () => {
    onSave({
      ...zone,
      name,
      countries:    countries.split(',').map(c => c.trim()).filter(Boolean),
      isActive,
    });
  };

  const handleSubmitRates = () => {
    onSaveRates(zone.id, rates);
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">

      {/* Zone Header */}
      <div className="p-6 border-b border-stone-200">
        <div className="flex items-center justify-between">
          {isEditing ? (
            <div className="flex-1 space-y-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Zone name"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg
                           text-lg font-semibold focus:outline-none focus:border-amber-500"
              />
              <input
                type="text"
                value={countries}
                onChange={(e) => setCountries(e.target.value)}
                placeholder="Country codes (e.g., NG, GH, KE)"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg
                           text-sm focus:outline-none focus:border-amber-500"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded"
                />
                Active
              </label>
            </div>
          ) : (
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <Globe size={20} className="text-amber-600" />
                <h2 className="text-xl font-semibold text-stone-900">
                  {zone.name}
                </h2>
                {!zone.isActive && (
                  <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700
                                   rounded-full">
                    Inactive
                  </span>
                )}
              </div>
              {zone.countries.length > 0 && (
                <p className="text-sm text-stone-500 mt-2 flex items-start gap-1">
                  <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                  <span>{zone.countries.join(', ')}</span>
                </p>
              )}
              {zone.countries.length === 0 && (
                <p className="text-sm text-stone-400 mt-2 italic">
                  Catches all countries not in other zones
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 ml-4">
            {isEditing ? (
              <>
                <button
                  onClick={handleSubmitZone}
                  disabled={isSaving}
                  className="p-2 bg-green-100 text-green-700 rounded-lg
                             hover:bg-green-200"
                >
                  <Check size={18} />
                </button>
                <button
                  onClick={onCancelEdit}
                  className="p-2 bg-stone-100 text-stone-700 rounded-lg
                             hover:bg-stone-200"
                >
                  <X size={18} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onEdit}
                  className="p-2 text-stone-600 hover:bg-stone-100 rounded-lg"
                  title="Edit zone"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={onDelete}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  title="Delete zone"
                >
                  <Trash2 size={18} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Rates Section */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-stone-900">Shipping Rates (USD)</h3>
          {!isEditingRates ? (
            <button
              onClick={onEditRates}
              className="text-sm text-amber-600 hover:text-amber-700 flex
                         items-center gap-1"
            >
              <Edit2 size={14} /> Edit Rates
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSubmitRates}
                disabled={isSaving}
                className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg
                           text-sm flex items-center gap-1 hover:bg-green-200"
              >
                {isSaving ? <Loader size={14} className="animate-spin" /> : <Check size={14} />}
                Save Rates
              </button>
              <button
                onClick={onCancelEditRates}
                className="px-3 py-1.5 bg-stone-100 text-stone-700 rounded-lg
                           text-sm hover:bg-stone-200"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {isEditingRates ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['small', 'medium', 'large', 'xlarge'].map((size) => (
                <div key={size}>
                  <label className="block text-xs font-medium text-stone-500
                                    uppercase tracking-wider mb-1.5">
                    {size === 'xlarge' ? 'X-Large' : size}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2
                                     text-stone-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={rates[`${size}Rate`]}
                      onChange={(e) => setRates({
                        ...rates,
                        [`${size}Rate`]: e.target.value,
                      })}
                      className="w-full pl-7 pr-3 py-2 border border-stone-300
                                 rounded-lg focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500
                                uppercase tracking-wider mb-1.5">
                Estimated Delivery
              </label>
              <input
                type="text"
                value={rates.estimatedDays}
                onChange={(e) => setRates({ ...rates, estimatedDays: e.target.value })}
                placeholder="e.g., 5-7 business days"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg
                           focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <RateDisplay label="Small (≤12in)"    amount={currentRate.smallRate} />
            <RateDisplay label="Medium (12-24)"   amount={currentRate.mediumRate} />
            <RateDisplay label="Large (24-36)"    amount={currentRate.largeRate} />
            <RateDisplay label="X-Large (36+)"    amount={currentRate.xlargeRate} />
          </div>
        )}

        {!isEditingRates && currentRate.estimatedDays && (
          <p className="mt-4 text-sm text-stone-500">
            <span className="font-medium">Delivery:</span> {currentRate.estimatedDays}
          </p>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// Rate Display Component
// ─────────────────────────────────────────────────────────
const RateDisplay = ({ label, amount }) => (
  <div className="bg-stone-50 p-3 rounded-lg">
    <p className="text-xs text-stone-500 mb-1">{label}</p>
    <p className="text-lg font-bold text-stone-900">
      ${Number(amount || 0).toFixed(2)}
    </p>
  </div>
);

// ─────────────────────────────────────────────────────────
// New Zone Modal
// ─────────────────────────────────────────────────────────
const NewZoneModal = ({ onClose, onCreate, isSaving }) => {
  const [name, setName]           = useState('');
  const [countries, setCountries] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-center
                 justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="bg-white rounded-xl p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-serif text-stone-900 mb-4">
          Create New Shipping Zone
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-stone-600 mb-2">Zone Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Europe, Asia"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg
                         focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm text-stone-600 mb-2">
              Country Codes
            </label>
            <input
              type="text"
              value={countries}
              onChange={(e) => setCountries(e.target.value)}
              placeholder="e.g., GB, DE, FR, IT"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg
                         focus:outline-none focus:border-amber-500"
            />
            <p className="text-xs text-stone-400 mt-1">
              Comma-separated 2-letter country codes
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-stone-300 rounded-lg
                       hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onCreate({
              name,
              countries: countries.split(',').map(c => c.trim()).filter(Boolean),
            })}
            disabled={!name || isSaving}
            className="flex-1 px-4 py-2 bg-stone-900 text-white rounded-lg
                       hover:bg-black disabled:opacity-50"
          >
            {isSaving ? <Loader size={16} className="animate-spin mx-auto" /> : 'Create Zone'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Shipping;