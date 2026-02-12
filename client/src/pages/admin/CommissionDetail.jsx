import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  DollarSign, 
  Image as ImageIcon, 
  Send, 
  Loader, 
  Save, 
  Upload, 
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { commissionsAPI } from '../../services/api';

const CommissionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [commission, setCommission] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Local state for edits
  const [finalPrice, setFinalPrice] = useState('');
  const [newNote, setNewNote] = useState('');
  
  // Image Modal State
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // Fetch Commission Data
  useEffect(() => {
    const fetchCommission = async () => {
      setIsLoading(true);
      try {
        const response = await commissionsAPI.getById(id);
        setCommission(response.data);
        setFinalPrice(response.data.finalPrice || '');
      } catch (error) {
        console.error('Error loading commission:', error);
        toast.error('Failed to load commission details');
        navigate('/admin/commissions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommission();
  }, [id, navigate]);

  // Status Options matching Prisma Enums
  const statusOptions = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'REVIEWING', label: 'Reviewing' },
    { value: 'ACCEPTED', label: 'Accepted' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'REVISION', label: 'Revision' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  const getStatusStyle = (status) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      REVIEWING: 'bg-amber-100 text-amber-800 border-amber-200',
      ACCEPTED: 'bg-blue-100 text-blue-800 border-blue-200',
      IN_PROGRESS: 'bg-purple-100 text-purple-800 border-purple-200',
      REVISION: 'bg-orange-100 text-orange-800 border-orange-200',
      COMPLETED: 'bg-green-100 text-green-800 border-green-200',
      CANCELLED: 'bg-red-100 text-red-800 border-red-200',
    };
    return styles[status] || 'bg-stone-100 text-stone-700 border-stone-200';
  };

  // Handlers
  const handleStatusChange = async (newStatus) => {
    try {
      const response = await commissionsAPI.updateStatus(id, { status: newStatus });
      setCommission(prev => ({ ...prev, status: response.data.status }));
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleSavePrice = async () => {
    setIsSaving(true);
    try {
      const response = await commissionsAPI.updateStatus(id, { 
        status: commission.status, // Keep existing status
        finalPrice: parseFloat(finalPrice) 
      });
      setCommission(prev => ({ ...prev, finalPrice: response.data.finalPrice }));
      toast.success('Price updated successfully');
    } catch (error) {
      toast.error('Failed to update price');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setIsSaving(true);
    try {
      // Using updateStatus endpoint to append a note (backend logic supports this)
      await commissionsAPI.updateStatus(id, { 
        status: commission.status,
        note: newNote 
      });
      
      // Optimistically update notes list
      const newNoteObj = {
        id: Date.now(),
        content: newNote,
        isInternal: false,
        createdAt: new Date().toISOString()
      };
      
      setCommission(prev => ({
        ...prev,
        notes: [newNoteObj, ...(prev.notes || [])]
      }));
      setNewNote('');
      toast.success('Note added');
    } catch (error) {
      toast.error('Failed to add note');
    } finally {
      setIsSaving(false);
    }
  };

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
        progressImages: [...(prev.progressImages || []), response.data]
      }));
      toast.success('Progress image uploaded');
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const openImageModal = (imageUrl) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 min-h-screen">
        <Loader size={32} className="animate-spin text-amber-600" />
      </div>
    );
  }

  if (!commission) return null;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sticky top-0 bg-stone-100 z-10 py-4 border-b border-stone-200">
        <div>
          <button
            onClick={() => navigate('/admin/commissions')}
            className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900 
                     transition-colors mb-2"
          >
            <ArrowLeft size={18} />
            Back to Commissions
          </button>
          <h1 className="text-2xl text-stone-900 font-serif">
            Commission {commission.commissionNumber}
          </h1>
          <p className="text-stone-500 text-sm">
            Created on {new Date(commission.createdAt).toLocaleDateString()}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={commission.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={`appearance-none pl-4 pr-10 py-2.5 rounded-lg font-medium text-sm border cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-amber-500 ${getStatusStyle(commission.status)}`}
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-current">
              <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Project Details */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Project Details</h2>
            <div className="mb-6">
              <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-2">Description</h3>
              <p className="text-stone-700 leading-relaxed bg-stone-50 p-4 rounded-lg border border-stone-100">
                {commission.description}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-sm text-stone-500 mb-1">Art Style</span>
                <span className="font-medium text-stone-900">{commission.artStyle}</span>
              </div>
              <div>
                <span className="block text-sm text-stone-500 mb-1">Size</span>
                <span className="font-medium text-stone-900">{commission.size}</span>
              </div>
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
                    onClick={() => openImageModal(image.url)}
                    className="aspect-square overflow-hidden rounded-lg hover:opacity-90 transition-opacity border border-stone-200"
                  >
                    <img
                      src={image.url}
                      alt={`Reference ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
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
              <label className="inline-flex items-center gap-2 text-sm text-amber-700 hover:text-amber-800 font-medium cursor-pointer bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 transition-colors">
                {isUploading ? <Loader size={16} className="animate-spin" /> : <Upload size={16} />}
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
                  <div key={progress.id || index} className="flex gap-4 p-4 bg-stone-50 rounded-lg border border-stone-100">
                    <button
                      onClick={() => openImageModal(progress.imageUrl || progress.url)}
                      className="w-24 h-24 flex-shrink-0 overflow-hidden rounded-lg border border-stone-200"
                    >
                      <img
                        src={progress.imageUrl || progress.url}
                        alt="Progress update"
                        className="w-full h-full object-cover"
                      />
                    </button>
                    <div className="flex-1">
                      <p className="text-stone-900 font-medium mb-1">
                        {progress.description || 'Progress update'}
                      </p>
                      <p className="text-xs text-stone-500">
                        Uploaded on {new Date(progress.createdAt).toLocaleDateString()} at {new Date(progress.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-stone-50 rounded-lg border border-dashed border-stone-300">
                <ImageIcon size={32} className="mx-auto text-stone-300 mb-2" />
                <p className="text-stone-500 text-sm">No progress images uploaded yet.</p>
              </div>
            )}
          </div>

          {/* Notes & Communication */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Notes & Timeline</h2>
            
            {/* Notes List */}
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
                      <span className="text-xs text-stone-500 font-medium">
                        {new Date(note.createdAt).toLocaleString()}
                      </span>
                      {note.isInternal && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
                          System Note
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

            {/* Add Note Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note or update..."
                className="flex-1 px-4 py-2.5 border border-stone-300 rounded-lg text-sm
                         focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                onKeyPress={(e) => e.key === 'Enter' && handleAddNote()}
              />
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim() || isSaving}
                className="px-4 py-2.5 bg-stone-900 text-white rounded-lg
                         hover:bg-stone-800 transition-colors disabled:opacity-50"
              >
                {isSaving ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (1/3) */}
        <div className="space-y-6">
          
          {/* Client Info */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Client Information</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User size={20} className="text-amber-700" />
                </div>
                <div className="overflow-hidden">
                  <p className="font-medium text-stone-900 truncate">
                    {commission.customer?.firstName} {commission.customer?.lastName}
                  </p>
                  <span className="text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded">Customer</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm pt-2 border-t border-stone-100">
                <Mail size={16} className="text-stone-400 flex-shrink-0" />
                <a href={`mailto:${commission.customer?.email}`} className="text-amber-700 hover:underline truncate">
                  {commission.customer?.email}
                </a>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone size={16} className="text-stone-400 flex-shrink-0" />
                <span className="text-stone-600">{commission.customer?.phone || 'No phone provided'}</span>
              </div>
            </div>
          </div>

          {/* Pricing & Finance */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Financials</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-stone-50 rounded-lg">
                <span className="text-sm text-stone-600">Estimated</span>
                <span className="font-medium text-stone-900">
                  ${commission.estimatedPrice?.toLocaleString()}
                </span>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
                  Final Agreed Price
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">$</span>
                    <input
                      type="number"
                      value={finalPrice}
                      onChange={(e) => setFinalPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 border border-stone-300 rounded-lg text-sm
                               focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <button
                    onClick={handleSavePrice}
                    disabled={isSaving || !finalPrice}
                    className="px-3 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 disabled:opacity-50 transition-colors"
                  >
                    <Save size={16} />
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-stone-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-stone-600">Payment Status</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                    commission.paymentStatus === 'FULLY_PAID'
                      ? 'bg-green-100 text-green-700'
                      : commission.paymentStatus === 'DEPOSIT_PAID'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-stone-100 text-stone-600'
                  }`}>
                    {commission.paymentStatus?.replace('_', ' ') || 'UNPAID'}
                  </span>
                </div>
                {commission.depositAmount > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-stone-500">Deposit Paid</span>
                    <span className="font-medium text-green-700">
                      +${commission.depositAmount.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Timeline & Deadlines */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Timeline</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-1.5 bg-stone-100 rounded-md">
                  <Calendar size={16} className="text-stone-500" />
                </div>
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wide">Submission Date</p>
                  <p className="text-sm font-medium text-stone-900">
                    {new Date(commission.createdAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-1.5 bg-amber-50 rounded-md">
                  <AlertCircle size={16} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wide">Target Deadline</p>
                  <p className="text-sm font-medium text-amber-700">
                    {commission.deadline ? new Date(commission.deadline).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'No deadline set'}
                  </p>
                </div>
              </div>

              {commission.startedAt && (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 bg-blue-50 rounded-md">
                    <CheckCircle size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-500 uppercase tracking-wide">Started On</p>
                    <p className="text-sm font-medium text-stone-900">
                      {new Date(commission.startedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Full Screen Image Modal */}
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
              className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors"
            >
              <X size={32} />
            </button>
            <img
              src={selectedImage}
              alt="Detail view"
              className="max-w-full max-h-[90vh] object-contain select-none"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CommissionDetail;