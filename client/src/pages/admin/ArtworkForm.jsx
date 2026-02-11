// client/src/pages/admin/ArtworkForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { ArrowLeft, Upload, X, Save, Loader } from 'lucide-react';
import { getArtworkById } from '../../data/sampleArtworks';
import toast from 'react-hot-toast';

const ArtworkForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [images, setImages] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: 'PAINTING',
    medium: '',
    year: new Date().getFullYear(),
    width: '',
    height: '',
    unit: 'inches',
    status: 'AVAILABLE',
    featured: false,
  });

  useEffect(() => {
    if (isEditing) {
      setIsLoading(true);
      const artwork = getArtworkById(id);
      if (artwork) {
        setFormData({
          title: artwork.title,
          description: artwork.description,
          price: artwork.price.toString(),
          category: artwork.category,
          medium: artwork.medium,
          year: artwork.year,
          width: artwork.width?.toString() || '',
          height: artwork.height?.toString() || '',
          unit: artwork.unit || 'inches',
          status: artwork.status,
          featured: artwork.featured,
        });
        setImages(artwork.images?.map((url, i) => ({
          preview: url,
          existing: true,
          id: i
        })) || []);
      }
      setIsLoading(false);
    }
  }, [id, isEditing]);

  const onDrop = (acceptedFiles) => {
    const newImages = acceptedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      existing: false,
    }));
    setImages(prev => [...prev, ...newImages].slice(0, 10));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxSize: 10485760,
  });

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success(isEditing ? 'Artwork updated successfully' : 'Artwork created successfully');
      navigate('/admin/artworks');
    } catch (error) {
      toast.error('Failed to save artwork');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader size={32} className="animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/admin/artworks')}
          className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900 
                   transition-colors mb-4"
        >
          <ArrowLeft size={18} />
          Back to Artworks
        </button>
        <h1 
          className="text-2xl text-stone-900"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {isEditing ? 'Edit Artwork' : 'Add New Artwork'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Images */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">Images</h2>
          
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                      transition-all duration-300 
                      ${isDragActive 
                        ? 'border-amber-500 bg-amber-50' 
                        : 'border-stone-300 hover:border-amber-400'
                      }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-10 h-10 text-stone-400 mx-auto mb-4" />
            <p className="text-stone-600 mb-1">
              Drag & drop images here, or <span className="text-amber-600">browse</span>
            </p>
            <p className="text-stone-400 text-sm">Up to 10 images, max 10MB each</p>
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
              {images.map((image, index) => (
                <div key={index} className="relative group aspect-square">
                  <img
                    src={image.preview}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full
                             opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                  {index === 0 && (
                    <span className="absolute bottom-2 left-2 px-2 py-1 bg-amber-600 text-white 
                                   text-xs rounded">Primary</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm text-stone-600 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-stone-300 rounded-lg
                         focus:outline-none focus:border-amber-500 text-stone-900"
                placeholder="Artwork title"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm text-stone-600 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                required
                rows={4}
                value={formData.description}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-stone-300 rounded-lg
                         focus:outline-none focus:border-amber-500 text-stone-900 resize-none"
                placeholder="Describe this artwork..."
              />
            </div>

            <div>
              <label className="block text-sm text-stone-600 mb-2">
                Price (USD) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="price"
                required
                min="0"
                step="0.01"
                value={formData.price}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-stone-300 rounded-lg
                         focus:outline-none focus:border-amber-500 text-stone-900"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm text-stone-600 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-stone-300 rounded-lg
                         focus:outline-none focus:border-amber-500 text-stone-900"
              >
                <option value="PAINTING">Painting</option>
                <option value="DRAWING">Drawing</option>
                <option value="DIGITAL">Digital Art</option>
                <option value="MIXED_MEDIA">Mixed Media</option>
                <option value="SCULPTURE">Sculpture</option>
                <option value="PHOTOGRAPHY">Photography</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-stone-600 mb-2">Medium</label>
              <input
                type="text"
                name="medium"
                value={formData.medium}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-stone-300 rounded-lg
                         focus:outline-none focus:border-amber-500 text-stone-900"
                placeholder="e.g., Oil on Canvas"
              />
            </div>

            <div>
              <label className="block text-sm text-stone-600 mb-2">Year</label>
              <input
                type="number"
                name="year"
                min="1900"
                max={new Date().getFullYear()}
                value={formData.year}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-stone-300 rounded-lg
                         focus:outline-none focus:border-amber-500 text-stone-900"
              />
            </div>
          </div>
        </div>

        {/* Dimensions */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">Dimensions</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm text-stone-600 mb-2">Width</label>
              <input
                type="number"
                name="width"
                min="0"
                step="0.1"
                value={formData.width}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-stone-300 rounded-lg
                         focus:outline-none focus:border-amber-500 text-stone-900"
              />
            </div>

            <div>
              <label className="block text-sm text-stone-600 mb-2">Height</label>
              <input
                type="number"
                name="height"
                min="0"
                step="0.1"
                value={formData.height}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-stone-300 rounded-lg
                         focus:outline-none focus:border-amber-500 text-stone-900"
              />
            </div>

            <div>
              <label className="block text-sm text-stone-600 mb-2">Unit</label>
              <select
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-stone-300 rounded-lg
                         focus:outline-none focus:border-amber-500 text-stone-900"
              >
                <option value="inches">Inches</option>
                <option value="cm">Centimeters</option>
                <option value="mm">Millimeters</option>
              </select>
            </div>
          </div>
        </div>

        {/* Status & Settings */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">Status & Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-stone-600 mb-2">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-stone-300 rounded-lg
                         focus:outline-none focus:border-amber-500 text-stone-900"
              >
                <option value="AVAILABLE">Available</option>
                <option value="SOLD">Sold</option>
                <option value="RESERVED">Reserved</option>
                <option value="NOT_FOR_SALE">Not for Sale</option>
              </select>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="featured"
                  checked={formData.featured}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-stone-700">Featured artwork</span>
              </label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/admin/artworks')}
            className="px-6 py-3 border border-stone-300 rounded-lg text-stone-700
                     hover:bg-stone-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 bg-stone-900 text-white rounded-lg
                     hover:bg-stone-800 transition-colors inline-flex items-center gap-2
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
                {isEditing ? 'Update Artwork' : 'Create Artwork'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ArtworkForm;