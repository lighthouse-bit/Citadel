// src/pages/admin/CommissionDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, User, Mail, Phone, Calendar, 
  DollarSign, Image as ImageIcon, Send, Loader, 
  Save, Upload, X, CheckCircle, AlertCircle, CreditCard,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { commissionsAPI } from '../../services/api';

const CommissionDetail = () => {
  const { id }     = useParams();
  const navigate   = useNavigate();

  const [commission, setCommission] = useState(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [isSaving, setIsSaving]     = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [finalPrice, setFinalPrice] = useState('');
  const [newNote, setNewNote]       = useState('');

  const [showImageModal, setShowImageModal]   = useState(false);
  const [selectedImage, setSelectedImage]     = useState(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);

  // ── Fetch commission ────────────────────────────────────
  const fetchCommission = async () => {
    setIsLoading(true);
    try {
      const response = await commissionsAPI.getById(id);
      setCommission(response.data);
      setFinalPrice(response.data.finalPrice || '');
    } catch (error) {
      console.error('Error loading commission:', error);
      toast.error('Failed to load commission');
      navigate('/admin/commissions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCommission();
  }, [id, navigate]);

  // ── Style helpers ───────────────────────────────────────
  const getStatusStyle = (status) => {
    const styles = {
      PENDING:     'bg-yellow-100 text-yellow-800 border-yellow-200',
      REVIEWING:   'bg-amber-100  text-amber-800  border-amber-200',
      ACCEPTED:    'bg-blue-100   text-blue-800   border-blue-200',
      IN_PROGRESS: 'bg-purple-100 text-purple-800 border-purple-200',
      REVISION:    'bg-orange-100 text-orange-800 border-orange-200',
      COMPLETED:   'bg-green-100  text-green-800  border-green-200',
      CANCELLED:   'bg-red-100    text-red-800    border-red-200',
    };
    return styles[status] || 'bg-stone-100 text-stone-700 border-stone-200';
  };

  const getPaymentBadge = (paymentStatus) => {
    const map = {
      UNPAID:       { style: 'bg-red-100   text-red-700',   label: 'Unpaid'            },
      DEPOSIT_PAID: { style: 'bg-blue-100  text-blue-700',  label: 'Deposit Paid (70%)' },
      FULLY_PAID:   { style: 'bg-green-100 text-green-700', label: 'Fully Paid'         },
    };
    return map[paymentStatus] || { style: 'bg-stone-100 text-stone-700', label: paymentStatus };
  };

  // ── Status options ──────────────────────────────────────
  const statusOptions = [
    { value: 'PENDING',     label: 'Pending',           description: 'Waiting for review'                       },
    { value: 'REVIEWING',   label: 'Reviewing',         description: 'Under consideration'                      },
    { value: 'ACCEPTED',    label: 'Accept & Set Price', description: 'Set price and notify client to pay deposit'},
    { value: 'IN_PROGRESS', label: 'In Progress',       description: 'Work has begun (deposit paid)'            },
    { value: 'REVISION',    label: 'Revision',          description: 'Client requested changes'                 },
    { value: 'COMPLETED',   label: 'Completed',         description: 'Work finished, awaiting balance payment'  },
    { value: 'CANCELLED',   label: 'Cancelled',         description: 'Commission cancelled'                     },
  ];

  // ── Handle status change ────────────────────────────────
  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'ACCEPTED') {
      if (!finalPrice || parseFloat(finalPrice) <= 0) {
        toast.error('You must set a final price before accepting the commission.');
        return;
      }
      setShowAcceptModal(true);
      return;
    }

    try {
      const response = await commissionsAPI.updateStatus(id, { status: newStatus });
      setCommission(prev => ({ ...prev, status: response.data.status }));
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  // ── Confirm accept - FIXED: single API call ─────────────
  const confirmAccept = async () => {
    setIsSaving(true);
    try {
      // ✅ Single call: set status AND finalPrice together
      const response = await commissionsAPI.updateStatus(id, {
        status:     'ACCEPTED',
        finalPrice: parseFloat(finalPrice),
        note:       `Commission accepted. Final price: $${parseFloat(finalPrice).toLocaleString()}. Client notified to pay 70% deposit.`,
      });

      setCommission(prev => ({
        ...prev,
        status:     'ACCEPTED',
        finalPrice: parseFloat(finalPrice),
      }));

      setShowAcceptModal(false);
      toast.success('Commission accepted! Client will be notified to pay the deposit.');
    } catch (error) {
      toast.error('Failed to accept commission');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Save price only ─────────────────────────────────────
  const handleSavePrice = async () => {
    if (!finalPrice || parseFloat(finalPrice) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }
    setIsSaving(true);
    try {
      await commissionsAPI.updateStatus(id, {
        status:     commission.status,
        finalPrice: parseFloat(finalPrice),
      });
      setCommission(prev => ({ ...prev, finalPrice: parseFloat(finalPrice) }));
      toast.success('Price updated');
    } catch (error) {
      toast.error('Failed to update price');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Add note ────────────────────────────────────────────
  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setIsSaving(true);
    try {
      await commissionsAPI.updateStatus(id, {
        status: commission.status,
        note:   newNote,
      });

      setCommission(prev => ({
        ...prev,
        notes: [
          {
            id:         Date.now(),
            content:    newNote,
            isInternal: false,
            createdAt:  new Date().toISOString(),
          },
          ...(prev.notes || []),
        ],
      }));
      setNewNote('');
      toast.success('Note added');
    } catch (error) {
      toast.error('Failed to add note');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Upload progress image ───────────────────────────────
  const handleProgressUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('image', file);
    formData.append('description', 'Progress update');

    try {
      const response = await commissionsAPI.addProgressImage(id, formData);
      setCommission(prev => ({
        ...prev,
        progressImages: [...(prev.progressImages || []), response.data],
      }));
      toast.success('Progress image uploaded');
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
      e.target.value = ''; // reset file input
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader size={32} className="animate-spin text-amber-600" />
      </div>
    );
  }

  if (!commission) return null;

  const paymentBadge = getPaymentBadge(commission.paymentStatus);

  return (
    <div className="space-y-6 pb-12">

      {/* ── Page Header ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 
                      sticky top-0 bg-stone-100 z-10 py-4 border-b border-stone-200">
        <div>
          <button
            onClick={() => navigate('/admin/commissions')}
            className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900 mb-2"
          >
            <ArrowLeft size={18} /> Back to Commissions
          </button>
          <h1 className="text-2xl text-stone-900 font-serif">
            Commission {commission.commissionNumber}
          </h1>
          <p className="text-stone-500 text-sm">
            Created on {new Date(commission.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${paymentBadge.style}`}>
            <CreditCard size={12} className="inline mr-1" />
            {paymentBadge.label}
          </span>
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold border 
                           ${getStatusStyle(commission.status)}`}>
            {commission.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* ✅ Payment Alert Banner */}
      {commission.status === 'ACCEPTED' && commission.paymentStatus === 'UNPAID' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <Clock size={20} className="text-blue-600 flex-shrink-0" />
          <div>
            <p className="text-blue-800 font-medium text-sm">Awaiting Client Deposit</p>
            <p className="text-blue-600 text-xs mt-0.5">
              Client has been notified to pay the 70% deposit 
              {commission.finalPrice && ` ($${(Number(commission.finalPrice) * 0.7).toFixed(2)})`} 
              before work begins.
            </p>
          </div>
        </div>
      )}

      {commission.paymentStatus === 'DEPOSIT_PAID' && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-purple-600 flex-shrink-0" />
          <div>
            <p className="text-purple-800 font-medium text-sm">Deposit Received — Work in Progress</p>
            <p className="text-purple-600 text-xs mt-0.5">
              70% deposit paid on {commission.depositPaidAt 
                ? new Date(commission.depositPaidAt).toLocaleDateString() 
                : 'N/A'}.
              Remaining balance: {commission.finalPrice && 
                `$${(Number(commission.finalPrice) * 0.3).toFixed(2)}`}
            </p>
          </div>
        </div>
      )}

      {commission.paymentStatus === 'FULLY_PAID' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-600 flex-shrink-0" />
          <div>
            <p className="text-green-800 font-medium text-sm">Fully Paid — Commission Complete</p>
            <p className="text-green-600 text-xs mt-0.5">
              Final balance received on {commission.balancePaidAt 
                ? new Date(commission.balancePaidAt).toLocaleDateString() 
                : 'N/A'}.
              Total: ${Number(commission.finalPrice).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── LEFT COLUMN ──────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Project Details */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Project Details</h2>
            <div className="mb-6">
              <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-2">
                Description
              </h3>
              <p className="text-stone-700 leading-relaxed bg-stone-50 p-4 rounded-lg border border-stone-100">
                {commission.description}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-stone-50 p-3 rounded-lg">
                <span className="block text-xs text-stone-500 mb-1">Art Style</span>
                <span className="font-medium text-stone-900">{commission.artStyle}</span>
              </div>
              <div className="bg-stone-50 p-3 rounded-lg">
                <span className="block text-xs text-stone-500 mb-1">Size</span>
                <span className="font-medium text-stone-900">{commission.size}</span>
              </div>
            </div>
          </div>

          {/* Status Management */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Manage Status</h2>

            {/* Workflow diagram */}
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 mb-6">
              <p className="text-xs text-stone-500 font-medium uppercase tracking-wider mb-3">
                Commission Workflow
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">1. Pending</span>
                <span className="text-stone-400">→</span>
                <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded">2. Reviewing</span>
                <span className="text-stone-400">→</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-bold">3. Accept & Set Price</span>
                <span className="text-stone-400">→</span>
                <span className="px-2 py-1 bg-stone-200 text-stone-600 rounded">Client pays 70%</span>
                <span className="text-stone-400">→</span>
                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">4. In Progress</span>
                <span className="text-stone-400">→</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded">5. Completed</span>
                <span className="text-stone-400">→</span>
                <span className="px-2 py-1 bg-stone-200 text-stone-600 rounded">Client pays 30%</span>
              </div>
            </div>

            {/* Status buttons */}
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleStatusChange(option.value)}
                  title={option.description}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                    commission.status === option.value
                      ? 'bg-stone-900 text-white border-stone-900 shadow-md'
                      : option.value === 'ACCEPTED'
                        ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                        : option.value === 'CANCELLED'
                          ? 'bg-white text-red-600 border-red-200 hover:bg-red-50'
                          : 'bg-white text-stone-600 border-stone-200 hover:border-amber-500'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reference Images */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">
              Reference Images ({commission.referenceImages?.length || 0})
            </h2>
            {commission.referenceImages?.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {commission.referenceImages.map((image, index) => (
                  <button
                    key={image.id || index}
                    onClick={() => { setSelectedImage(image.url); setShowImageModal(true); }}
                    className="aspect-square overflow-hidden rounded-lg hover:opacity-90 
                               transition-opacity border border-stone-200"
                  >
                    <img src={image.url} alt={`Reference ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-stone-500 italic">No reference images provided.</p>
            )}
          </div>

          {/* Progress Images */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-stone-900">Work in Progress</h2>
              <label className="inline-flex items-center gap-2 text-sm text-amber-700 
                               hover:text-amber-800 font-medium cursor-pointer bg-amber-50 
                               px-3 py-1.5 rounded-lg border border-amber-100">
                {isUploading 
                  ? <Loader size={16} className="animate-spin" /> 
                  : <Upload size={16} />
                }
                Upload Update
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleProgressUpload}
                  disabled={isUploading}
                />
              </label>
            </div>

            {commission.progressImages?.length > 0 ? (
              <div className="space-y-4">
                {commission.progressImages.map((progress, index) => (
                  <div key={progress.id || index} 
                       className="flex gap-4 p-4 bg-stone-50 rounded-lg border border-stone-100">
                    <button
                      onClick={() => { 
                        setSelectedImage(progress.imageUrl || progress.url); 
                        setShowImageModal(true); 
                      }}
                      className="w-24 h-24 flex-shrink-0 overflow-hidden rounded-lg border border-stone-200"
                    >
                      <img 
                        src={progress.imageUrl || progress.url} 
                        alt="Progress" 
                        className="w-full h-full object-cover" 
                      />
                    </button>
                    <div>
                      <p className="text-stone-900 font-medium mb-1">
                        {progress.description || 'Progress update'}
                      </p>
                      <p className="text-xs text-stone-500">
                        {new Date(progress.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-stone-50 rounded-lg border border-dashed border-stone-300">
                <ImageIcon size={32} className="mx-auto text-stone-300 mb-2" />
                <p className="text-stone-500 text-sm">No progress images yet.</p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Notes & Timeline</h2>
            <div className="space-y-4 mb-6 max-h-96 overflow-y-auto pr-2">
              {commission.notes?.length > 0 ? (
                commission.notes.map((note) => (
                  <div
                    key={note.id}
                    className={`p-4 rounded-lg border ${
                      note.isInternal 
                        ? 'bg-amber-50 border-amber-100' 
                        : 'bg-stone-50 border-stone-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-stone-500">
                        {new Date(note.createdAt).toLocaleString()}
                      </span>
                      {note.isInternal && (
                        <span className="text-[10px] font-bold text-amber-700 
                                         bg-amber-100 px-2 py-0.5 rounded-full uppercase">
                          System
                        </span>
                      )}
                    </div>
                    <p className="text-stone-800 text-sm">{note.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-stone-500 italic text-sm">No notes yet.</p>
              )}
            </div>

            {/* Add note */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note..."
                className="flex-1 px-4 py-2.5 border border-stone-300 rounded-lg text-sm 
                           focus:outline-none focus:border-amber-500"
                onKeyPress={(e) => e.key === 'Enter' && handleAddNote()}
              />
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim() || isSaving}
                className="px-4 py-2.5 bg-stone-900 text-white rounded-lg 
                           hover:bg-stone-800 disabled:opacity-50"
              >
                {isSaving 
                  ? <Loader size={18} className="animate-spin" /> 
                  : <Send size={18} />
                }
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN ─────────────────────────────────── */}
        <div className="space-y-6">

          {/* Client Info */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Client</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <User size={20} className="text-amber-700" />
                </div>
                <div>
                  <p className="font-medium text-stone-900">
                    {commission.customer?.firstName} {commission.customer?.lastName}
                  </p>
                  <span className="text-xs text-stone-500">Customer</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm pt-2 border-t border-stone-100">
                <Mail size={16} className="text-stone-400" />
                <a 
                  href={`mailto:${commission.customer?.email}`}
                  className="text-amber-700 hover:underline truncate"
                >
                  {commission.customer?.email}
                </a>
              </div>
              {commission.customer?.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone size={16} className="text-stone-400" />
                  <span className="text-stone-600">{commission.customer.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Pricing & Payment */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Pricing & Payment</h2>
            <div className="space-y-4">

              {/* Estimated price */}
              <div className="flex justify-between items-center p-3 bg-stone-50 rounded-lg">
                <span className="text-sm text-stone-600">Client's Estimate</span>
                <span className="font-medium text-stone-900">
                  ${Number(commission.estimatedPrice).toLocaleString()}
                </span>
              </div>

              {/* Final price input */}
              <div>
                <label className="block text-xs font-medium text-stone-500 
                                  uppercase tracking-wider mb-1.5">
                  Your Final Price <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">$</span>
                    <input
                      type="number"
                      value={finalPrice}
                      onChange={(e) => setFinalPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 border border-stone-300 rounded-lg 
                                 text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <button
                    onClick={handleSavePrice}
                    disabled={isSaving || !finalPrice}
                    className="px-3 py-2 bg-stone-900 text-white rounded-lg 
                               hover:bg-stone-800 disabled:opacity-50"
                  >
                    <Save size={16} />
                  </button>
                </div>
                <p className="text-xs text-stone-400 mt-1">
                  Set this before accepting the commission
                </p>
              </div>

              {/* Payment breakdown */}
              {commission.finalPrice && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                  <p className="text-xs font-medium text-amber-800 uppercase tracking-wider mb-2">
                    Payment Breakdown
                  </p>
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-700">Total Price</span>
                    <span className="font-semibold text-amber-900">
                      ${Number(commission.finalPrice).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-700">
                      Deposit (70%)
                      {commission.paymentStatus === 'DEPOSIT_PAID' && (
                        <span className="ml-2 text-xs text-green-600 font-bold">✓ PAID</span>
                      )}
                    </span>
                    <span className="text-amber-900">
                      ${(Number(commission.finalPrice) * 0.7).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-700">
                      Balance (30%)
                      {commission.paymentStatus === 'FULLY_PAID' && (
                        <span className="ml-2 text-xs text-green-600 font-bold">✓ PAID</span>
                      )}
                    </span>
                    <span className="text-amber-900">
                      ${(Number(commission.finalPrice) * 0.3).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Payment status */}
              <div className="pt-4 border-t border-stone-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-stone-600">Payment Status</span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase 
                                   ${paymentBadge.style}`}>
                    {paymentBadge.label}
                  </span>
                </div>
                {commission.depositPaidAt && (
                  <p className="text-xs text-stone-500">
                    Deposit paid: {new Date(commission.depositPaidAt).toLocaleDateString()}
                  </p>
                )}
                {commission.balancePaidAt && (
                  <p className="text-xs text-stone-500">
                    Balance paid: {new Date(commission.balancePaidAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Timeline</h2>
            <div className="space-y-4">
              <TimelineItem icon={Calendar}     label="Submitted"    date={commission.createdAt}   color="stone" />
              {commission.depositPaidAt && (
                <TimelineItem icon={CreditCard} label="Deposit Paid" date={commission.depositPaidAt} color="blue" />
              )}
              {commission.startedAt && (
                <TimelineItem icon={CheckCircle} label="Work Started" date={commission.startedAt}  color="purple" />
              )}
              {commission.deadline && (
                <TimelineItem icon={AlertCircle} label="Deadline"    date={commission.deadline}    color="amber" isDeadline />
              )}
              {commission.balancePaidAt && (
                <TimelineItem icon={CreditCard} label="Balance Paid" date={commission.balancePaidAt} color="green" />
              )}
              {commission.completedAt && (
                <TimelineItem icon={CheckCircle} label="Completed"   date={commission.completedAt} color="green" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Accept Confirmation Modal ─────────────────────── */}
      <AnimatePresence>
        {showAcceptModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowAcceptModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1,   opacity: 1 }}
              exit={{    scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-8 max-w-lg w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-serif text-stone-900 mb-4">Accept Commission</h3>
              <p className="text-stone-600 mb-6">
                By accepting, the client will be notified and asked to pay the 70% deposit before work begins.
              </p>

              <div className="bg-stone-50 rounded-lg p-4 mb-6 space-y-3">
                <div className="flex justify-between">
                  <span className="text-stone-600">Client</span>
                  <span className="text-stone-900 font-medium">
                    {commission.customer?.firstName} {commission.customer?.lastName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600">Style</span>
                  <span className="text-stone-900">{commission.artStyle}</span>
                </div>
                <div className="border-t border-stone-200 pt-3">
                  <div className="flex justify-between font-semibold text-lg">
                    <span className="text-stone-900">Final Price</span>
                    <span className="text-amber-700">
                      ${parseFloat(finalPrice).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-stone-500">Deposit (70%)</span>
                    <span className="text-stone-700">
                      ${(parseFloat(finalPrice) * 0.7).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Balance (30%)</span>
                    <span className="text-stone-700">
                      ${(parseFloat(finalPrice) * 0.3).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowAcceptModal(false)}
                  className="px-6 py-2.5 border border-stone-300 rounded-lg 
                             text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAccept}
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg 
                             hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? (
                    <><Loader size={16} className="animate-spin" /> Processing...</>
                  ) : (
                    <><CheckCircle size={16} /> Accept & Notify Client</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Image Modal ───────────────────────────────────── */}
      <AnimatePresence>
        {showImageModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setShowImageModal(false)}
          >
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-6 right-6 text-white/70 hover:text-white"
            >
              <X size={32} />
            </button>
            <img
              src={selectedImage}
              alt="Detail"
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Timeline Item Component ─────────────────────────────
const TimelineItem = ({ icon: Icon, label, date, color, isDeadline = false }) => {
  const colorStyles = {
    stone:  'bg-stone-100  text-stone-500',
    blue:   'bg-blue-50    text-blue-600',
    purple: 'bg-purple-50  text-purple-600',
    amber:  'bg-amber-50   text-amber-600',
    green:  'bg-green-50   text-green-600',
  };

  return (
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 p-1.5 rounded-md ${colorStyles[color] || colorStyles.stone}`}>
        <Icon size={16} />
      </div>
      <div>
        <p className="text-xs text-stone-500 uppercase tracking-wide">{label}</p>
        <p className={`text-sm font-medium ${isDeadline ? 'text-amber-700' : 'text-stone-900'}`}>
          {new Date(date).toLocaleDateString(undefined, {
            year: 'numeric', month: 'long', day: 'numeric',
          })}
        </p>
      </div>
    </div>
  );
};

export default CommissionDetail;