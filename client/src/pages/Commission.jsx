import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { Upload, X, Check, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { commissionsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const Commission = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
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

  // Auto-fill form if user is logged in
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        firstName: user.name?.split(' ')[0] || '',
        lastName: user.name?.split(' ')[1] || '',
        email: user.email || '',
        // If phone isn't in user object, it will remain empty, allowing user to fill
      }));
    }
  }, [user]);

  const artStyles = [
    { id: 'realistic', name: 'Realistic Portrait', basePrice: 500 },
    { id: 'abstract', name: 'Abstract', basePrice: 400 },
    { id: 'impressionist', name: 'Impressionist', basePrice: 450 },
    { id: 'contemporary', name: 'Contemporary', basePrice: 450 },
    { id: 'charcoal', name: 'Charcoal Drawing', basePrice: 250 },
    { id: 'watercolor', name: 'Watercolor', basePrice: 350 },
  ];

  const sizes = [
    { id: 'small', name: '8×10 inches', multiplier: 1 },
    { id: 'medium', name: '16×20 inches', multiplier: 1.8 },
    { id: 'large', name: '24×36 inches', multiplier: 2.5 },
    { id: 'xlarge', name: '36×48 inches', multiplier: 3.5 },
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
    maxSize: 10485760,
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

    const submitData = new FormData();
    Object.keys(formData).forEach(key => {
      submitData.append(key, formData[key]);
    });
    uploadedImages.forEach((img) => {
      submitData.append('referenceImages', img.file);
    });

    try {
      await commissionsAPI.create(submitData);
      toast.success('Commission request submitted successfully!');
      
      // Reset form but keep user details if logged in
      setFormData(prev => ({
        firstName: user ? prev.firstName : '',
        lastName: user ? prev.lastName : '',
        email: user ? prev.email : '',
        phone: '',
        artStyle: '',
        size: '',
        description: '',
        budget: '',
        deadline: '',
      }));
      setUploadedImages([]);
    } catch (error) {
      console.error('Commission error:', error);
      toast.error('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pt-20 min-h-screen bg-stone-50">
      {/* Hero Section */}
      <section 
        className="relative py-24"
        style={{ backgroundColor: '#1a1a1a' }}
      >
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1920&h=600&fit=crop)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-black/70" />
        
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <p 
            className="text-amber-400 mb-4 font-sans text-xs"
            style={{ letterSpacing: '0.2em', textTransform: 'uppercase' }}
          >
            Bespoke Artistry
          </p>
          <h1 
            className="text-white mb-6"
            style={{ 
              fontFamily: "'Playfair Display', serif", 
              fontWeight: 400,
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            }}
          >
            Commission Your Artwork
          </h1>
          <p className="text-stone-300 max-w-2xl mx-auto leading-relaxed">
            Transform your vision into a unique piece of art. Share your inspiration 
            with us, and let's create something extraordinary together.
          </p>
        </div>
      </section>

      {/* Form Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6">
          <form onSubmit={handleSubmit} className="space-y-10">
            
            {/* Contact Information */}
            <div className="bg-white p-8 border border-stone-200 shadow-sm">
              <h2 
                className="text-stone-900 mb-6 text-2xl"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Contact Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-stone-600 text-sm mb-2">
                    First Name <span className="text-amber-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    className="w-full bg-stone-50 border border-stone-300 px-4 py-3 
                             text-stone-900 focus:border-amber-600 focus:outline-none 
                             transition-colors placeholder-stone-400"
                    placeholder="Enter your first name"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 text-sm mb-2">
                    Last Name <span className="text-amber-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    className="w-full bg-stone-50 border border-stone-300 px-4 py-3 
                             text-stone-900 focus:border-amber-600 focus:outline-none 
                             transition-colors placeholder-stone-400"
                    placeholder="Enter your last name"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 text-sm mb-2">
                    Email <span className="text-amber-600">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-stone-50 border border-stone-300 px-4 py-3 
                             text-stone-900 focus:border-amber-600 focus:outline-none 
                             transition-colors placeholder-stone-400"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 text-sm mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-stone-50 border border-stone-300 px-4 py-3 
                             text-stone-900 focus:border-amber-600 focus:outline-none 
                             transition-colors placeholder-stone-400"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
            </div>

            {/* Reference Images Upload */}
            <div className="bg-white p-8 border border-stone-200 shadow-sm">
              <h2 
                className="text-stone-900 mb-2 text-2xl"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Reference Images
              </h2>
              <p className="text-stone-500 mb-6 flex items-center gap-2 text-sm">
                <Info size={16} className="text-amber-600" />
                Upload up to 5 reference images (max 10MB each)
              </p>
              
              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer
                          transition-all duration-300 
                          ${isDragActive 
                            ? 'border-amber-600 bg-amber-50' 
                            : 'border-stone-300 hover:border-amber-500 bg-stone-50'
                          }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 text-amber-600 mx-auto mb-4" />
                {isDragActive ? (
                  <p className="text-amber-700 font-medium">Drop your images here...</p>
                ) : (
                  <div>
                    <p className="text-stone-700 mb-2">
                      Drag & drop images here, or <span className="text-amber-600 font-medium">click to browse</span>
                    </p>
                    <p className="text-stone-400 text-sm">
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
                        className="w-full h-24 object-cover rounded border border-stone-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full
                                 opacity-0 group-hover:opacity-100 transition-opacity 
                                 hover:bg-red-600"
                      >
                        <X size={14} />
                      </button>
                      <p className="text-xs text-stone-500 mt-1 truncate">{image.name}</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Artwork Details */}
            <div className="bg-white p-8 border border-stone-200 shadow-sm">
              <h2 
                className="text-stone-900 mb-6 text-2xl"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Artwork Details
              </h2>
              
              {/* Art Style */}
              <div className="mb-8">
                <label className="block text-stone-600 text-sm mb-3">
                  Art Style <span className="text-amber-600">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {artStyles.map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setFormData({...formData, artStyle: style.id})}
                      className={`p-4 border text-left transition-all duration-300 rounded
                                ${formData.artStyle === style.id
                                  ? 'border-amber-600 bg-amber-50 shadow-sm'
                                  : 'border-stone-200 hover:border-amber-400 bg-white'
                                }`}
                    >
                      <span className="block text-stone-900 font-medium">{style.name}</span>
                      <span className="text-amber-700 text-sm">
                        From ${style.basePrice}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Size */}
              <div className="mb-8">
                <label className="block text-stone-600 text-sm mb-3">
                  Size <span className="text-amber-600">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {sizes.map((size) => (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => setFormData({...formData, size: size.id})}
                      className={`p-4 border text-center transition-all duration-300 rounded
                                ${formData.size === size.id
                                  ? 'border-amber-600 bg-amber-50 shadow-sm'
                                  : 'border-stone-200 hover:border-amber-400 bg-white'
                                }`}
                    >
                      <span className="block text-stone-900 font-medium text-sm">{size.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="mb-8">
                <label className="block text-stone-600 text-sm mb-2">
                  Describe Your Vision <span className="text-amber-600">*</span>
                </label>
                <textarea
                  required
                  rows={5}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Tell us about the artwork you envision. Include details about mood, colors, style preferences, and any specific elements you'd like..."
                  className="w-full bg-stone-50 border border-stone-300 px-4 py-3 
                           text-stone-900 focus:border-amber-600 focus:outline-none 
                           transition-colors resize-none placeholder-stone-400"
                />
              </div>

              {/* Deadline */}
              <div>
                <label className="block text-stone-600 text-sm mb-2">Preferred Deadline</label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                  min={new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  className="w-full md:w-auto bg-stone-50 border border-stone-300 px-4 py-3 
                           text-stone-900 focus:border-amber-600 focus:outline-none transition-colors"
                />
                <p className="text-stone-500 text-sm mt-2">
                  Minimum 2 weeks required for most commissions
                </p>
              </div>
            </div>

            {/* Price Estimate */}
            {formData.artStyle && formData.size && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-amber-50 border border-amber-200 p-8 text-center rounded"
              >
                <p className="text-stone-600 mb-2 text-sm">Estimated Price</p>
                <p 
                  className="text-amber-700 text-4xl mb-2"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  ${calculateEstimate().toLocaleString()}
                </p>
                <p className="text-stone-500 text-sm">
                  Final price may vary based on complexity and specific requirements
                </p>
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-8 bg-stone-900 text-white font-sans text-sm 
                       uppercase tracking-wider flex items-center justify-center gap-2 
                       hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-300"
              style={{ letterSpacing: '0.15em' }}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent 
                                rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Check size={18} />
                  Submit Commission Request
                </>
              )}
            </button>
          </form>

          {/* Additional Info */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'Consultation',
                description: 'We\'ll discuss your vision and provide a detailed quote within 48 hours.'
              },
              {
                title: 'Creation',
                description: 'Watch your artwork come to life with regular progress updates.'
              },
              {
                title: 'Delivery',
                description: 'Professional packaging and worldwide shipping with full insurance.'
              }
            ].map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 
                              flex items-center justify-center mx-auto mb-4 font-medium">
                  {index + 1}
                </div>
                <h3 
                  className="text-stone-900 mb-2 text-lg"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {step.title}
                </h3>
                <p className="text-stone-600 text-sm">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Commission;