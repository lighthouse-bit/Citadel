// client/src/pages/admin/ArtworkForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { ArrowLeft, ArrowRight, Upload, X, Save, Loader, FileLock2, CheckCircle } from 'lucide-react';
import { artworksAPI } from '../../services/api';
import toast from 'react-hot-toast';
import uploadToCloudinary, { uploadDigitalMaster } from '../../utils/uploadToCloudinary';

const DEFAULT_PERSONAL_LICENSE = `This purchase grants one named customer a non-exclusive, non-transferable personal-use licence.

You may display the work on your personal devices and create prints for your own private, non-commercial use.

You may not resell, redistribute, share, sublicense, modify for resale, use commercially, mint as an NFT, or claim authorship. Copyright remains with the artist.`;

const DEFAULT_COMMERCIAL_LICENSE = `This purchase grants one named customer a non-exclusive, non-transferable commercial-use licence.

You may use the artwork in your own commercial projects and marketing, subject to the terms of this certificate.

You may not resell or redistribute the original digital file, sublicense it, mint it as an NFT, or claim authorship. Copyright remains with the artist.`;

const ArtworkForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [isLoading, setIsLoading]   = useState(false);
  const [isSaving, setIsSaving]     = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [images, setImages]         = useState([]);
  const [digitalMasterFile, setDigitalMasterFile] = useState(null);
  const [digitalAsset, setDigitalAsset] = useState(null);
  const [alertAudience, setAlertAudience] = useState({ total: 0, byType: {} });
  const [formData, setFormData]     = useState({
    title:       '',
    description: '',
    price:       '',
    category:    'PAINTING',
    medium:      '',
    year:        new Date().getFullYear(),
    width:       '',
    height:      '',
    unit:        'inches',
    status:      'AVAILABLE',
    featured:    false,
    productType: 'PHYSICAL',
    digitalDownloadLimit: 5,
    digitalLicenseName: 'Personal Use License',
    digitalLicenseText: DEFAULT_PERSONAL_LICENSE,
    editionSize: '',
    commercialLicenseEnabled: false,
    commercialPrice: '',
    commercialLicenseName: 'Commercial Use License',
    commercialLicenseText: DEFAULT_COMMERCIAL_LICENSE,
  });

  useEffect(() => {
    if (isEditing) loadArtwork();
  }, [id, isEditing]);

  const loadArtwork = async () => {
    setIsLoading(true);
    try {
      const response = await artworksAPI.getById(id);
      const artwork  = response.data;

      setFormData({
        title:       artwork.title,
        description: artwork.description,
        price:       artwork.price?.toString() || '',
        category:    artwork.category,
        medium:      artwork.medium || '',
        year:        artwork.year || new Date().getFullYear(),
        width:       artwork.width?.toString() || '',
        height:      artwork.height?.toString() || '',
        unit:        artwork.unit || 'inches',
        status:      artwork.status,
        featured:    artwork.featured || false,
        productType: artwork.productType || 'PHYSICAL',
        digitalDownloadLimit: artwork.digitalAsset?.downloadLimit || 5,
        digitalLicenseName: artwork.digitalAsset?.licenseName || 'Personal Use License',
        digitalLicenseText: artwork.digitalAsset?.licenseText || DEFAULT_PERSONAL_LICENSE,
        editionSize: artwork.editionSize?.toString() || '',
        commercialLicenseEnabled: artwork.commercialLicenseEnabled || false,
        commercialPrice: artwork.commercialPrice?.toString() || '',
        commercialLicenseName: artwork.digitalAsset?.commercialLicenseName || 'Commercial Use License',
        commercialLicenseText: artwork.digitalAsset?.commercialLicenseText || DEFAULT_COMMERCIAL_LICENSE,
      });
      setDigitalAsset(artwork.digitalAsset || null);

      if (artwork.images) {
        setImages(
          artwork.images.map((img, i) => ({
            id:       img.id,
            preview:  img.url,
            url:      img.url,
            publicId: img.publicId,
            existing: true,
            order:    i,
          }))
        );
      }
    } catch (error) {
      console.error('Error loading artwork:', error);
      toast.error('Failed to load artwork');
      navigate('/admin/artworks');
    } finally {
      setIsLoading(false);
    }
  };

  const onDrop = (acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length) toast.error('Use JPG, PNG or WebP images no larger than 10MB');
    const newImages = acceptedFiles.map(file => ({
      file,
      preview:  URL.createObjectURL(file),
      existing: false,
    }));
    setImages(prev => [...prev, ...newImages].slice(0, 10));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept:  { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxSize: 10485760, // 10MB per file — Cloudinary handles this directly ✅
  });

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (!isEditing || !formData.price) return undefined;
    const timer = window.setTimeout(async () => {
      try {
        const { data } = await artworksAPI.getAlertAudience(id, { price: formData.price, status: formData.status });
        setAlertAudience(data);
      } catch {
        setAlertAudience({ total: 0, byType: {} });
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [formData.price, formData.status, id, isEditing]);

  const moveImage = (index, direction) => {
    const destination = index + direction;
    if (destination < 0 || destination >= images.length) return;
    setImages(previous => {
      const next = [...previous];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
  };

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
    setUploadProgress(0);

    try {
      // ── Step 1: Upload new images to Cloudinary directly ──────────────
      const newImages      = images.filter(img => !img.existing && img.file);
      const existingImages = images.filter(img => img.existing);

      let uploadedImages = [];

      if (newImages.length > 0) {
        toast.loading(`Uploading ${newImages.length} image(s) to Cloudinary...`);

        const uploadPromises = newImages.map((img, index) =>
          uploadToCloudinary(img.file, (percent) => {
            // Calculate overall progress across all uploads
            setUploadProgress(
              Math.round((index / newImages.length) * 100 + percent / newImages.length)
            );
          }, 'artworks')
        );

        uploadedImages = await Promise.all(uploadPromises);
        toast.dismiss();
        setUploadProgress(100);
      }

      let protectedMaster = digitalAsset;
      if (formData.productType === 'DIGITAL' && digitalMasterFile) {
        toast.loading('Uploading protected digital master...');
        protectedMaster = await uploadDigitalMaster(digitalMasterFile, setUploadProgress);
        toast.dismiss();
        setDigitalAsset(protectedMaster);
      }
      if (formData.productType === 'DIGITAL' && !protectedMaster) {
        throw new Error('Select the high-resolution digital master before publishing');
      }

      // ── Step 2: Send artwork data + Cloudinary URLs to your backend ───
      // ✅ No binary files — just JSON — stays well under 4.5MB limit
      const submitData = {
        ...formData,
        price:    parseFloat(formData.price),
        year:     parseInt(formData.year),
        width:    formData.width    ? parseFloat(formData.width)  : null,
        height:   formData.height   ? parseFloat(formData.height) : null,
        featured: Boolean(formData.featured),
        productType: formData.productType,
        editionSize: formData.productType === 'DIGITAL' && formData.editionSize ? Number(formData.editionSize) : null,
        commercialLicenseEnabled: formData.productType === 'DIGITAL' && Boolean(formData.commercialLicenseEnabled),
        commercialPrice: formData.productType === 'DIGITAL' && formData.commercialLicenseEnabled ? Number(formData.commercialPrice) : null,
        digitalAsset: formData.productType === 'DIGITAL' ? {
          ...protectedMaster,
          downloadLimit: Number(formData.digitalDownloadLimit),
          licenseName: formData.digitalLicenseName,
          licenseText: formData.digitalLicenseText,
          commercialLicenseName: formData.commercialLicenseName,
          commercialLicenseText: formData.commercialLicenseText,
        } : undefined,

        // ✅ Send Cloudinary URLs + existing images together
        images: [
          // Keep existing images
          ...existingImages.map((img, i) => ({
            url:       img.url,
            publicId:  img.publicId || '',
            isPrimary: i === 0,
            order:     i,
            existing:  true,
            id:        img.id,
          })),
          // Add newly uploaded images
          ...uploadedImages.map((img, i) => ({
            url:       img.url,
            publicId:  img.publicId,
            isPrimary: existingImages.length === 0 && i === 0,
            order:     existingImages.length + i,
            existing:  false,
          })),
        ],
      };

      // ── Step 3: Save to your backend / database ───────────────────────
      if (isEditing) {
        const { data } = await artworksAPI.update(id, submitData);
        const delivered = data.alertSummary?.sent || 0;
        toast.success(delivered ? `Artwork updated; ${delivered} wishlist alert${delivered === 1 ? '' : 's'} delivered` : 'Artwork updated successfully!');
      } else {
        await artworksAPI.create(submitData);
        toast.success('Artwork created successfully!');
      }

      navigate('/admin/artworks');

    } catch (error) {
      console.error('Error saving artwork:', error);
      toast.dismiss();

      if (!error.response) {
        toast.error(error.message || 'Image upload failed. Please try again.');
      } else {
        toast.error(error.response?.data?.error || 'Failed to save artwork');
      }
    } finally {
      setIsSaving(false);
      setUploadProgress(0);
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

        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-1">Product format</h2>
          <p className="text-sm text-stone-500 mb-5">Choose whether this listing ships as an original or is delivered securely as a digital file.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { value: 'PHYSICAL', label: 'Physical original', detail: 'Reserved once and shipped to the collector' },
              { value: 'DIGITAL', label: 'Digital artwork', detail: 'Reusable listing with protected delivery' },
            ].map(option => (
              <label key={option.value} className={`cursor-pointer rounded-xl border p-4 ${formData.productType === option.value ? 'border-amber-500 bg-amber-50' : 'border-stone-200'}`}>
                <input type="radio" name="productType" value={option.value} checked={formData.productType === option.value} onChange={handleChange} className="sr-only" />
                <span className="font-medium text-stone-900">{option.label}</span>
                <span className="mt-1 block text-xs text-stone-500">{option.detail}</span>
              </label>
            ))}
          </div>

          {formData.productType === 'DIGITAL' && (
            <div className="mt-6 border-t border-stone-200 pt-6 space-y-5">
              <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-5">
                <div className="flex items-start gap-3">
                  <FileLock2 className="mt-0.5 text-amber-700" size={22}/>
                  <div className="flex-1">
                    <p className="font-medium text-stone-900">Protected high-resolution master</p>
                    <p className="mt-1 text-xs leading-5 text-stone-500">Stored as an authenticated Cloudinary asset. Customers receive only short-lived signed links after payment. Upload a reduced-size, watermarked public preview in the Images section below.</p>
                    {digitalAsset && !digitalMasterFile && <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-emerald-700"><CheckCircle size={15}/> Protected master is stored ({digitalAsset.format?.toUpperCase()})</p>}
                    {digitalMasterFile && <p className="mt-3 text-sm text-amber-800">Selected: {digitalMasterFile.name} ({(digitalMasterFile.size / 1024 / 1024).toFixed(1)} MB)</p>}
                    <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white">
                      <Upload size={16}/> {digitalAsset ? 'Replace master' : 'Select master'}
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/tiff" className="sr-only" onChange={event => setDigitalMasterFile(event.target.files?.[0] || null)} />
                    </label>
                  </div>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                <label className="block"><span className="block text-sm text-stone-600 mb-2">Download limit</span><input type="number" name="digitalDownloadLimit" min="1" max="25" value={formData.digitalDownloadLimit} onChange={handleChange} className="w-full px-4 py-3 border border-stone-300 rounded-lg"/></label>
                <label className="block"><span className="block text-sm text-stone-600 mb-2">Edition size</span><input type="number" name="editionSize" min="1" max="10000" value={formData.editionSize} onChange={handleChange} placeholder="Blank for unlimited" className="w-full px-4 py-3 border border-stone-300 rounded-lg"/><span className="mt-1 block text-xs text-stone-500">Leave blank for an unlimited digital edition.</span></label>
              </div>
              <label className="block"><span className="block text-sm text-stone-600 mb-2">Personal licence name</span><input name="digitalLicenseName" maxLength="100" value={formData.digitalLicenseName} onChange={handleChange} className="w-full px-4 py-3 border border-stone-300 rounded-lg"/></label>
              <label className="block"><span className="block text-sm text-stone-600 mb-2">Personal-use licence terms</span><textarea name="digitalLicenseText" rows={7} maxLength="10000" value={formData.digitalLicenseText} onChange={handleChange} className="w-full px-4 py-3 border border-stone-300 rounded-lg resize-y"/></label>
              <div className="rounded-xl border border-stone-200 p-5 space-y-4"><label className="flex items-center gap-3"><input type="checkbox" name="commercialLicenseEnabled" checked={formData.commercialLicenseEnabled} onChange={handleChange} className="h-4 w-4"/><span><span className="block font-medium text-stone-900">Offer a commercial-use licence</span><span className="block text-xs text-stone-500">Charge a separate price for business use.</span></span></label>{formData.commercialLicenseEnabled && <><div className="grid sm:grid-cols-2 gap-5"><label className="block"><span className="block text-sm text-stone-600 mb-2">Commercial price (USD)</span><input type="number" name="commercialPrice" min="0.01" step="0.01" required value={formData.commercialPrice} onChange={handleChange} className="w-full px-4 py-3 border border-stone-300 rounded-lg"/></label><label className="block"><span className="block text-sm text-stone-600 mb-2">Commercial licence name</span><input name="commercialLicenseName" maxLength="100" value={formData.commercialLicenseName} onChange={handleChange} className="w-full px-4 py-3 border border-stone-300 rounded-lg"/></label></div><label className="block"><span className="block text-sm text-stone-600 mb-2">Commercial-use licence terms</span><textarea name="commercialLicenseText" rows={7} maxLength="10000" value={formData.commercialLicenseText} onChange={handleChange} className="w-full px-4 py-3 border border-stone-300 rounded-lg resize-y"/></label></>}</div>
            </div>
          )}
        </div>

        {isEditing && alertAudience.total > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
            <b>{alertAudience.total} opted-in customer{alertAudience.total === 1 ? '' : 's'}</b> will receive an email if you save these price or availability changes.
            <span className="block text-xs text-amber-700 mt-1">Availability: {alertAudience.byType?.AVAILABILITY || 0} · Price: {alertAudience.byType?.PRICE_CHANGE || 0}</span>
          </div>
        )}

        {/* ── Images ──────────────────────────────────────────────────── */}
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
              Drag & drop images here, or{' '}
              <span className="text-amber-600">browse</span>
            </p>
            <p className="text-stone-400 text-sm">
              Up to 10 images, max 10MB each — uploaded directly to Cloudinary
            </p>
          </div>

          {/* ✅ Upload progress bar */}
          {isSaving && uploadProgress > 0 && uploadProgress < 100 && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-stone-600 mb-1">
                <span>Uploading images...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-stone-200 rounded-full h-2">
                <div
                  className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
              {images.map((image, index) => (
                <div key={index} className="relative group aspect-square">
                  <img
                    src={image.preview || image.url}
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
                    <span className="absolute bottom-2 left-2 px-2 py-1 bg-amber-600
                                     text-white text-xs rounded">
                      Primary
                    </span>
                  )}
                  <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" disabled={index === 0} onClick={() => moveImage(index, -1)} className="p-1 bg-white rounded disabled:opacity-40" title="Move left"><ArrowLeft size={14}/></button>
                    <button type="button" disabled={index === images.length - 1} onClick={() => moveImage(index, 1)} className="p-1 bg-white rounded disabled:opacity-40" title="Move right"><ArrowRight size={14}/></button>
                  </div>
                  {image.existing && (
                    <span className="absolute bottom-2 right-2 px-2 py-1 bg-stone-600
                                     text-white text-xs rounded">
                      Saved
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Basic Info ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">
            Basic Information
          </h2>

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
                           focus:outline-none focus:border-amber-500
                           text-stone-900 resize-none"
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

        {/* ── Dimensions ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">Dimensions</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

        {/* ── Status & Settings ────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">
            Status & Settings
          </h2>

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
                <option value="DRAFT">Draft</option>
                <option value="AVAILABLE">Available</option>
                <option value="SOLD">Sold</option>
                <option value="RESERVED">Reserved</option>
                <option value="NOT_FOR_SALE">Not for Sale</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="featured"
                  checked={formData.featured}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-stone-300 text-amber-600
                             focus:ring-amber-500"
                />
                <span className="text-stone-700">Featured artwork</span>
              </label>
            </div>
          </div>
        </div>

        {/* ── Actions ─────────────────────────────────────────────────── */}
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
            disabled={
              isSaving ||
              !formData.title ||
              !formData.description ||
              !formData.price
            }
            className="px-6 py-3 bg-stone-900 text-white rounded-lg
                       hover:bg-stone-800 transition-colors inline-flex
                       items-center gap-2 disabled:opacity-50
                       disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader size={18} className="animate-spin" />
                {uploadProgress > 0 && uploadProgress < 100
                  ? `Uploading ${uploadProgress}%...`
                  : 'Saving...'}
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
