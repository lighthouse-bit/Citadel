// client/src/pages/ArtworkDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, 
  ChevronLeft, 
  ChevronRight,
  Share2,
  Heart,
  Truck,
  Shield,
  Award,
  X,
  Download,
  FileLock2
} from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { artworksAPI } from '../services/api';
import toast from 'react-hot-toast';
import SEO from '../components/common/SEO';
import WallPlacement from '../components/WallPlacement';
import { trackArtworkView, trackEvent } from '../utils/analytics';
import { useWishlist } from '../hooks/useWishlist';
import { useAuth } from '../hooks/useAuth';
import ArtworkRecommendations from '../components/ArtworkRecommendations';
import { recordGuestArtworkView } from '../utils/recentlyViewed';
import ArtworkReviews from '../components/ArtworkReviews';

// Reusable Image Component
const ArtworkImage = ({ src, alt, className = "" }) => {
  const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=800&h=1000&fit=crop";
  const [imgSrc, setImgSrc] = useState(src || FALLBACK_IMAGE);

  return (
    <img
      src={imgSrc}
      alt={alt}
      onError={() => setImgSrc(FALLBACK_IMAGE)}
      className={className}
    />
  );
};

const ArtworkDetail = () => {
  const { id } = useParams();
  const { addToCart, isInCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { isAuthenticated } = useAuth();
  
  const [artwork, setArtwork] = useState(null);
  const [relatedWorks, setRelatedWorks] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLicense, setSelectedLicense] = useState('PERSONAL_USE');

  useEffect(() => {
    const fetchArtworkData = async () => {
      setIsLoading(true);
      try {
        const response = await artworksAPI.getById(id);
        
        if (response.data) {
          setArtwork(response.data);
          setSelectedLicense('PERSONAL_USE');
          const relatedRes = await artworksAPI.getRelated(id);
          setRelatedWorks(relatedRes.data.filter(w => w.id !== id).slice(0, 6));
        }
      } catch (error) {
        console.error("Error fetching artwork:", error);
        toast.error('Artwork not found');
      } finally {
        setIsLoading(false);
      }
    };
    

    if (id) fetchArtworkData();
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    if (!artwork) return;
    trackArtworkView(artwork);
    const guestHistory = recordGuestArtworkView(artwork).filter(item => item.id !== artwork.id);
    artworksAPI.recordView(artwork.id).catch(() => {});
    if (isAuthenticated) artworksAPI.getRecentlyViewed().then(response => setRecentlyViewed((response.data || []).filter(item => item.id !== artwork.id))).catch(() => setRecentlyViewed(guestHistory));
    else setRecentlyViewed(guestHistory);
  }, [artwork, isAuthenticated]);

  const handleAddToCart = () => {
    if (artwork) addToCart({
      ...artwork,
      licenseType: selectedLicense,
      price: selectedLicense === 'COMMERCIAL_USE' ? Number(artwork.commercialPrice) : Number(artwork.price),
    });
  };

  const handleShare = async () => {
    trackEvent('share', { method: navigator.share ? 'native' : 'clipboard', content_type: 'artwork', item_id: artwork.id });
    if (navigator.share) {
      try {
        await navigator.share({
          title: artwork.title,
          text: `Discover “${artwork.title}” at Highmarc Art Atelier`,
          url: window.location.href,
        });
      } catch {
        // Closing the native share sheet is not an application error.
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const nextImage = () => {
    if (!artwork?.images?.length) return;
    setSelectedImageIndex((prev) => (prev + 1) % artwork.images.length);
  };

  const prevImage = () => {
    if (!artwork?.images?.length) return;
    setSelectedImageIndex((prev) => (prev - 1 + artwork.images.length) % artwork.images.length);
  };

  if (isLoading) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (!artwork) {
    return (
      <div className="pt-32 min-h-screen bg-stone-50 flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-2xl font-serif text-stone-900 mb-4">Artwork Not Found</h2>
        <Link to="/gallery" className="px-6 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-800">
          Return to Gallery
        </Link>
      </div>
    );
  }

  const currentImage = artwork.images?.[selectedImageIndex]?.url;
  const isFavorited = isWishlisted(artwork.id);
  const editionRemaining = artwork.editionSize == null ? null : Math.max(artwork.editionSize - artwork.editionsIssued - artwork.editionsReserved, 0);
  const isAvailableForPurchase = artwork.status === 'AVAILABLE' && editionRemaining !== 0;
  const artworkUrl = `https://highmarc.com/artwork/${artwork.id}`;
  const artworkImages = artwork.images?.map((image) => image.url || image).filter(Boolean) || [];
  const availability = artwork.status === 'AVAILABLE'
    ? 'https://schema.org/InStock'
    : 'https://schema.org/SoldOut';
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: artwork.title,
      description: artwork.description || `Original artwork by Highmarc: ${artwork.title}.`,
      image: artworkImages,
      sku: artwork.id,
      category: artwork.category || 'Fine Art',
      material: artwork.medium,
      brand: { '@type': 'Brand', name: 'Highmarc' },
      offers: artwork.price ? {
        '@type': 'Offer',
        url: artworkUrl,
        priceCurrency: 'USD',
        price: Number(artwork.price).toFixed(2),
        availability,
        itemCondition: 'https://schema.org/NewCondition',
      } : undefined,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://highmarc.com/' },
        { '@type': 'ListItem', position: 2, name: 'Gallery', item: 'https://highmarc.com/gallery' },
        { '@type': 'ListItem', position: 3, name: artwork.title, item: artworkUrl },
      ],
    },
  ];

  return (
    <>
      <SEO
        title={artwork.title}
        description={artwork.description?.substring(0, 160)}
        keywords={`${artwork.title}, ${artwork.category?.toLowerCase()}, fine art, buy artwork`}
        image={artworkImages[0]}
        imageAlt={`${artwork.title}${artwork.medium ? ` — ${artwork.medium}` : ''}`}
        url={`/artwork/${artwork.id}`}
        type="product"
        structuredData={structuredData}
      />

      <div className="pt-20 min-h-screen bg-stone-50">
        {/* Breadcrumb */}
        <div className="bg-white border-b border-stone-200 py-4">
          <div className="max-w-7xl mx-auto px-6">
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
              <Link to="/" className="text-stone-500 hover:text-amber-600 transition-colors">Home</Link>
              <span className="text-stone-300">/</span>
              <Link to="/gallery" className="text-stone-500 hover:text-amber-600 transition-colors">Gallery</Link>
              <span className="text-stone-300">/</span>
              <span className="text-stone-900 font-medium truncate max-w-[200px]">{artwork.title}</span>
            </nav>
          </div>
        </div>

        <section className="py-12">
          <div className="max-w-7xl mx-auto px-6">
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
              
              {/* Left: Images */}
              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="relative group cursor-zoom-in bg-stone-200 rounded-lg overflow-hidden aspect-[4/5] lg:aspect-square"
                  onClick={() => setIsImageModalOpen(true)}
                >
                  <ArtworkImage
                    src={currentImage}
                    alt={artwork.title}
                    className="w-full h-full object-cover"
                  />
                  
                  {artwork.images?.length > 1 && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); prevImage(); }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-full shadow-md hover:bg-white transition-all opacity-0 group-hover:opacity-100"
                      >
                        <ChevronLeft size={24} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); nextImage(); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-full shadow-md hover:bg-white transition-all opacity-0 group-hover:opacity-100"
                      >
                        <ChevronRight size={24} />
                      </button>
                    </>
                  )}
                </motion.div>

                {/* Thumbnails */}
                {artwork.images?.length > 1 && (
                  <div className="grid grid-cols-5 gap-4">
                    {artwork.images.map((img, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`relative aspect-square rounded-md overflow-hidden border-2 transition-all ${
                          selectedImageIndex === index ? 'border-amber-600 ring-1 ring-amber-600' : 'border-transparent hover:border-stone-300'
                        }`}
                      >
                        <ArtworkImage
                          src={img.url}
                          alt={`View ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Details */}
              <div>
                <div className="sticky top-24">
                  <h1 className="text-4xl md:text-5xl font-serif text-stone-900 mb-2">{artwork.title}</h1>
                  <p className="text-stone-500 text-lg mb-6">{artwork.year}</p>
                  
                  <div className="flex items-center justify-between mb-8 pb-8 border-b border-stone-200">
                    <div>
                      {isAvailableForPurchase ? (
                        <p className="text-3xl text-stone-900 font-medium">
                          ${Number(selectedLicense === 'COMMERCIAL_USE' ? artwork.commercialPrice : artwork.price).toLocaleString()}
                        </p>
                      ) : (
                        <p className="text-3xl text-stone-400 font-medium">{editionRemaining === 0 ? 'SOLD OUT' : artwork.status.replace('_', ' ')}</p>
                      )}
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={() => toggleWishlist(artwork)}
                        aria-label={isFavorited ? `Remove ${artwork.title} from wishlist` : `Save ${artwork.title} to wishlist`}
                        aria-pressed={isFavorited}
                        className={`p-3 rounded-full border transition-all ${
                          isFavorited ? 'border-red-200 bg-red-50 text-red-500' : 'border-stone-200 hover:border-stone-300 text-stone-400'
                        }`}
                      >
                        <Heart size={20} fill={isFavorited ? "currentColor" : "none"} />
                      </button>
                      <button
                        onClick={handleShare}
                        aria-label={`Share ${artwork.title}`}
                        className="p-3 rounded-full border border-stone-200 hover:border-stone-300 text-stone-400 transition-all"
                      >
                        <Share2 size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="prose prose-stone mb-8">
                    <p className="text-stone-600 leading-relaxed text-lg">
                      {artwork.description}
                    </p>
                  </div>

                  {artwork.productType === 'DIGITAL' && (
                    <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-5">
                      <div className="flex items-start gap-3"><FileLock2 size={21} className="mt-0.5 shrink-0 text-amber-800"/><div><h3 className="font-medium text-stone-900">Secure digital edition</h3><p className="mt-1 text-sm leading-6 text-stone-600">Includes the protected high-resolution file, a named licence certificate, and immediate access after payment.</p>{artwork.editionSize && <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-amber-800">{Math.max(artwork.editionSize - artwork.editionsIssued - artwork.editionsReserved, 0)} of {artwork.editionSize} editions available</p>}</div></div>
                      {artwork.commercialLicenseEnabled && artwork.commercialPrice && <fieldset><legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-600">Choose your licence</legend><div className="grid gap-2 sm:grid-cols-2">{[
                        { value: 'PERSONAL_USE', label: 'Personal use', detail: 'Private display and personal prints', price: artwork.price },
                        { value: 'COMMERCIAL_USE', label: 'Commercial use', detail: 'Use in your own business projects', price: artwork.commercialPrice },
                      ].map(option => <label key={option.value} className={`cursor-pointer rounded-lg border p-3 ${selectedLicense === option.value ? 'border-stone-900 bg-white' : 'border-amber-200'}`}><input type="radio" className="sr-only" name="digital-license" value={option.value} checked={selectedLicense === option.value} onChange={() => setSelectedLicense(option.value)}/><span className="flex items-center justify-between gap-2 text-sm font-medium"><span>{option.label}</span><span>${Number(option.price).toLocaleString()}</span></span><span className="mt-1 block text-xs text-stone-500">{option.detail}</span></label>)}</div></fieldset>}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-8 text-sm">
                    <div>
                      <span className="block text-stone-400 mb-1">Medium</span>
                      <span className="text-stone-900 font-medium">{artwork.medium}</span>
                    </div>
                    <div>
                      <span className="block text-stone-400 mb-1">Dimensions</span>
                      <span className="text-stone-900 font-medium">
                        {artwork.width} x {artwork.height} {artwork.unit}
                      </span>
                    </div>
                    <div>
                      <span className="block text-stone-400 mb-1">Category</span>
                      <span className="text-stone-900 font-medium capitalize">
                        {artwork.category?.toLowerCase().replace('_', ' ')}
                      </span>
                    </div>
                    <div>
                      <span className="block text-stone-400 mb-1">Authenticity</span>
                      <span className="text-stone-900 font-medium">{artwork.productType === 'DIGITAL' ? (artwork.editionSize ? `Numbered edition of ${artwork.editionSize}` : 'Licensed digital work') : 'Signed Original'}</span>
                    </div>
                  </div>

                  {/* 2D Wall Placement */}
                  <WallPlacement artwork={artwork} />

                  {/* Action Buttons */}
                  {isAvailableForPurchase ? (
                    <div className="flex flex-col gap-4 mt-10">
                      <button
                        onClick={handleAddToCart}
                        disabled={isInCart(artwork.id)}
                        className="w-full bg-stone-900 text-white py-4 rounded-xl font-medium flex items-center justify-center gap-3 hover:bg-black transition"
                      >
                        {artwork.productType === 'DIGITAL' ? <Download size={18}/> : <ShoppingBag size={18} />}
                        {isInCart(artwork.id) ? 'In Cart' : artwork.productType === 'DIGITAL' ? 'Purchase Digital Licence' : 'Add to Collection'}
                      </button>
                    </div>
                  ) : (
                    <div className="bg-stone-100 p-4 rounded-lg text-center mt-10">
                      <p className="text-stone-500">{editionRemaining === 0 ? 'This digital edition is sold out.' : `This artwork has been ${artwork.status.toLowerCase().replace('_', ' ')}.`}</p>
                    </div>
                  )}

                  {/* Value Props */}
                  <div className="space-y-4 pt-8 border-t border-stone-200">
                    <div className="flex items-start gap-4">
                      {artwork.productType === 'DIGITAL' ? <Download className="text-amber-600 mt-1" size={20} /> : <Truck className="text-amber-600 mt-1" size={20} />}
                      <div>
                        <h4 className="font-medium text-stone-900">{artwork.productType === 'DIGITAL' ? 'Secure Digital Delivery' : 'Worldwide Shipping'}</h4>
                        <p className="text-sm text-stone-500">{artwork.productType === 'DIGITAL' ? 'Expiring download links are available only inside your account.' : 'Professional crate packaging and insurance included.'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <Shield className="text-amber-600 mt-1" size={20} />
                      <div>
                        <h4 className="font-medium text-stone-900">Secure Payment</h4>
                        <p className="text-sm text-stone-500">Transactions processed securely via Paystack.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <Award className="text-amber-600 mt-1" size={20} />
                      <div>
                        <h4 className="font-medium text-stone-900">{artwork.productType === 'DIGITAL' ? 'Named Licence Certificate' : 'Certificate of Authenticity'}</h4>
                        <p className="text-sm text-stone-500">{artwork.productType === 'DIGITAL' ? 'Your selected licence and edition number are recorded at purchase.' : 'Signed document included with every original piece.'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <ArtworkReviews artworkId={artwork.id} isAuthenticated={isAuthenticated} />

            {/* Related Works */}
            {relatedWorks.length > 0 && (
              <div className="mt-24 pt-16 border-t border-stone-200">
                <h2 className="text-3xl font-serif text-stone-900 mb-12 text-center">You May Also Like</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {relatedWorks.map((work) => (
                    <Link key={work.id} to={`/artwork/${work.id}`} className="group">
                      <div className="aspect-[3/4] overflow-hidden rounded-lg mb-4 bg-stone-200">
                        <ArtworkImage
                          src={work.images?.[0]?.url}
                          alt={work.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                      <h3 className="text-lg font-medium text-stone-900 mb-1 group-hover:text-amber-700 transition-colors">
                        {work.title}
                      </h3>
                      <p className="text-stone-500">${Number(work.price).toLocaleString()}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <ArtworkRecommendations title="Recently Viewed" subtitle="Return to artwork you explored earlier." artworks={recentlyViewed} />
          </div>
        </section>
      </div>

      {/* Full Screen Image Modal */}
      <AnimatePresence>
        {isImageModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setIsImageModalOpen(false)}
          >
            <button
              onClick={() => setIsImageModalOpen(false)}
              className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors"
            >
              <X size={32} />
            </button>
            
            <img
              src={currentImage}
              alt={artwork.title}
              className="max-w-full max-h-[90vh] object-contain select-none"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ArtworkDetail;
