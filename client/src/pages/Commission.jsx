// client/src/pages/Commission.jsx
import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { Upload, X, Check, Info } from 'lucide-react';
import toast from 'react-hot-toast';

const Commission = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    artStyle: '',
    size: '',
    description: '',
    budget: '',
    deadline: '',
  });
  const [uploadedImages, setUploadedImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const artStyles = [
    { id: 'realistic', name: 'Realistic Portrait', basePrice: 500 },
    { id: 'abstract', name: 'Abstract', basePrice: 400 },
    { id: 'impressionist', name: 'Impressionist', basePrice: 450 },
    { id: 'digital', name: 'Digital Art', basePrice: 300 },
    { id: 'charcoal', name: 'Charcoal Drawing', basePrice: 250 },
  ];

  const sizes = [
    { id: 'small', name: '8x10 inches', multiplier: 1 },
    { id: 'medium', name: '16x20 inches', multiplier: 1.8 },
    { id: 'large', name: '24x36 inches', multiplier: 2.5 },
    { id: 'xlarge', name: '36x48 inches', multiplier: 3.5 },
  ];

  const onDrop = (acceptedFiles) => {
    const newImages = acceptedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
    }));
    setUploadedImages(prev => [...prev, ...newImages].slice(0, 5));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxSize: 10485760, // 10MB
    maxFiles: 5,
  });

  const removeImage = (index) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const calculateEstimate = () => {
    const style = artStyles.find(s => s.id === formData.artStyle);
    const size = sizes.find(s => s.id === formData.size);
    if (style && size) {
      return style.basePrice * size.multiplier;
    }
    return 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (uploadedImages.length === 0) {
      toast.error('Please upload at least one reference image');
      return;
    }

    setIsSubmitting(true);

    // Create FormData for file upload
    const submitData = new FormData();
    Object.keys(formData).forEach(key => {
      submitData.append(key, formData[key]);
    });
    uploadedImages.forEach((img, index) => {
      submitData.append(`reference_${index}`, img.file);
    });

    try {
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulated delay
      toast.success('Commission request submitted successfully!');
      // Reset form
      setFormData({
        name: '', email: '', phone: '', artStyle: '',
        size: '', description: '', budget: '', deadline: '',
      });
      setUploadedImages([]);
    } catch (error) {
      toast.error('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pt-20 min-h-screen">
      {/* Hero */}
      <section className="py-16 bg-citadel-charcoal">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-serif text-white mb-4">
            Commission Custom Artwork
          </h1>
          <p className="text-gray-400 text-lg">
            Transform your vision into a unique piece of art. Upload your reference images
            and let's create something beautiful together.
          </p>
        </div>
      </section>

      {/* Commission Form */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Contact Information */}
            <div className="bg-citadel-charcoal p-6 md:p-8 border border-citadel-gold/20">
              <h2 className="text-2xl font-serif text-white mb-6">Contact Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-400 mb-2">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-citadel-dark border border-citadel-gold/30 px-4 py-3 
                             text-white focus:border-citadel-gold focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-2">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-citadel-dark border border-citadel-gold/30 px-4 py-3 
                             text-white focus:border-citadel-gold focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-citadel-dark border border-citadel-gold/30 px-4 py-3 
                             text-white focus:border-citadel-gold focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Reference Images Upload */}
            <div className="bg-citadel-charcoal p-6 md:p-8 border border-citadel-gold/20">
              <h2 className="text-2xl font-serif text-white mb-2">Reference Images</h2>
              <p className="text-gray-400 mb-6 flex items-center gap-2">
                <Info size={16} />
                Upload up to 5 reference images (max 10MB each)
              </p>
              
              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                          transition-colors duration-300 
                          ${isDragActive 
                            ? 'border-citadel-gold bg-citadel-gold/10' 
                            : 'border-citadel-gold/30 hover:border-citadel-gold/60'
                          }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 text-citadel-gold mx-auto mb-4" />
                {isDragActive ? (
                  <p className="text-citadel-gold">Drop your images here...</p>
                ) : (
                  <div>
                    <p className="text-white mb-2">
                      Drag & drop images here, or click to select
                    </p>
                    <p className="text-gray-500 text-sm">
                      JPG, PNG, WebP up to 10MB
                    </p>
                  </div>
                )}
              </div>

              {/* Preview Images */}
              {uploadedImages.length > 0 && (
                <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
                  {uploadedImages.map((image, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative group"
                    >
                      <img
                        src={image.preview}
                        alt={`Reference ${index + 1}`}
                        className="w-full h-24 object-cover rounded"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full
                                 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Artwork Details */}
            <div className="bg-citadel-charcoal p-6 md:p-8 border border-citadel-gold/20">
              <h2 className="text-2xl font-serif text-white mb-6">Artwork Details</h2>
              
              {/* Art Style */}
              <div className="mb-6">
                <label className="block text-gray-400 mb-3">Art Style *</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {artStyles.map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setFormData({...formData, artStyle: style.id})}
                      className={`p-4 border text-left transition-all duration-300
                                ${formData.artStyle === style.id
                                  ? 'border-citadel-gold bg-citadel-gold/10'
                                  : 'border-citadel-gold/30 hover:border-citadel-gold/60'
                                }`}
                    >
                      <span className="block text-white">{style.name}</span>
                      <span className="text-citadel-gold text-sm">
                        From ${style.basePrice}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Size */}
              <div className="mb-6">
                <label className="block text-gray-400 mb-3">Size *</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {sizes.map((size) => (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => setFormData({...formData, size: size.id})}
                      className={`p-4 border text-center transition-all duration-300
                                ${formData.size === size.id
                                  ? 'border-citadel-gold bg-citadel-gold/10'
                                  : 'border-citadel-gold/30 hover:border-citadel-gold/60'
                                }`}
                    >
                      <span className="block text-white text-sm">{size.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <label className="block text-gray-400 mb-2">
                  Describe Your Vision *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Tell me about the artwork you envision. Include details about mood, colors, style preferences, and any specific elements you'd like..."
                  className="w-full bg-citadel-dark border border-citadel-gold/30 px-4 py-3 
                           text-white focus:border-citadel-gold focus:outline-none transition-colors
                           resize-none"
                />
              </div>

              {/* Deadline */}
              <div>
                <label className="block text-gray-400 mb-2">Preferred Deadline</label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                  min={new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  className="w-full md:w-auto bg-citadel-dark border border-citadel-gold/30 px-4 py-3 
                           text-white focus:border-citadel-gold focus:outline-none transition-colors"
                />
                <p className="text-gray-500 text-sm mt-2">
                  Minimum 2 weeks required for most commissions
                </p>
              </div>
            </div>

            {/* Price Estimate */}
            {formData.artStyle && formData.size && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-citadel-gold/10 border border-citadel-gold p-6 text-center"
              >
                <p className="text-gray-400 mb-2">Estimated Price</p>
                <p className="text-4xl font-serif text-citadel-gold">
                  ${calculateEstimate().toLocaleString()}
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Final price may vary based on complexity
                </p>
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-primary flex items-center justify-center gap-2 
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-citadel-dark border-t-transparent 
                                rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Check size={20} />
                  Submit Commission Request
                </>
              )}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};

export default Commission;