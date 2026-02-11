// client/src/pages/ArtworkDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight,
  Share2,
  Heart,
  Truck,
  Shield,
  Award,
  X
} from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { artworksAPI } from '../services/api'; // Changed import
import toast from 'react-hot-toast';

// Reusable Image Component (Same as Gallery)
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
  const navigate = useNavigate();
  const { addToCart, isInCart } = useCart();
  
  const [artwork, setArtwork] = useState(null);
  const [relatedWorks, setRelatedWorks] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    const fetchArtworkData = async () => {
      setIsLoading(true);
      try {
        console.log("Fetching artwork ID:", id); // Debug log
        const response = await artworksAPI.getById(id);
        
        if (response.data) {
          setArtwork(response.data);
          // Fetch related works (simplified: just getting featured for now)
          const relatedRes = await artworksAPI.getFeatured();
          setRelatedWorks(relatedRes.data.filter(w => w.id !== id).slice(0, 3));
        }
      } catch (error) {
        console.error("Error fetching artwork:", error);
        toast.error('Artwork not found');
        // Optional: Redirect back to gallery after a delay
        // setTimeout(() => navigate('/gallery'), 2000);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchArtworkData();
    }
    
    window.scrollTo(0, 0);
  }, [id, navigate]);

  const handleAddToCart = () => {
    if (artwork) {
      addToCart(artwork);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: artwork.title,
        text: `Check out "${artwork.title}" at Citadel Art`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const nextImage = () => {
    if (!artwork?.images) return;
    setSelectedImageIndex((prev) => 
      prev === artwork.images.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    if (!artwork?.images) return;
    setSelectedImageIndex((prev) => 
      prev === 0 ? artwork.images.length - 1 : prev - 1
    );
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
        <p className="text-stone-500 mb-8">The artwork you are looking for may have been removed or does not exist.</p>
        <Link to="/gallery" className="px-6 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors">
          Return to Gallery
        </Link>
      </div>
    );
  }

  // Safe access to images array
  const currentImage = artwork.images?.[selectedImageIndex]?.url;

  return (
    <div className="pt-20 min-h-screen bg-stone-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-stone-200 py-4">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex items-center gap-2 text-sm">
            <Link to="/" className="text-stone-500 hover:text-amber-600 transition-colors">Home</Link>
            <span className="text-stone-300">/</span>
            <Link to="/gallery" className="text-stone-500 hover:text-amber-600 transition-colors">Gallery</Link>
            <span className="text-stone-300">/</span>
            <span className="text-stone-900 font-medium truncate max-w-[200px]">{artwork.title}</span>
          </nav>
        </div>
      </div>

      {/* Main Content */}
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
                
                {/* Navigation Arrows (only if multiple images) */}
                {artwork.images?.length > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); prevImage(); }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-full 
                               shadow-md hover:bg-white transition-all opacity-0 group-hover:opacity-100"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); nextImage(); }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-full 
                               shadow-md hover:bg-white transition-all opacity-0 group-hover:opacity-100"
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
                    {artwork.status === 'AVAILABLE' ? (
                      <p className="text-3xl text-stone-900 font-medium">
                        ${artwork.price?.toLocaleString()}
                      </p>
                    ) : (
                      <p className="text-3xl text-stone-400 font-medium">{artwork.status.replace('_', ' ')}</p>
                    )}
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => setIsFavorited(!isFavorited)}
                      className={`p-3 rounded-full border transition-all ${
                        isFavorited ? 'border-red-200 bg-red-50 text-red-500' : 'border-stone-200 hover:border-stone-300 text-stone-400'
                      }`}
                    >
                      <Heart size={20} fill={isFavorited ? "currentColor" : "none"} />
                    </button>
                    <button
                      onClick={handleShare}
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
                    <span className="text-stone-900 font-medium">Signed Original</span>
                  </div>
                </div>

                {/* Action Buttons */}
                {artwork.status === 'AVAILABLE' ? (
                  <div className="flex flex-col gap-4 mb-8">
                    <button
                      onClick={handleAddToCart}
                      disabled={isInCart(artwork.id)}
                      className="w-full btn-luxury flex items-center justify-center gap-3 py-4 text-sm"
                    >
                      <ShoppingBag size={18} />
                      {isInCart(artwork.id) ? 'In Cart' : 'Add to Collection'}
                    </button>
                    <Link
                      to="/checkout"
                      onClick={() => !isInCart(artwork.id) && addToCart(artwork)}
                      className="w-full btn-luxury-outline flex items-center justify-center py-4 text-sm"
                    >
                      Purchase Now
                    </Link>
                  </div>
                ) : (
                  <div className="bg-stone-100 p-4 rounded-lg text-center mb-8">
                    <p className="text-stone-500">This artwork has been {artwork.status.toLowerCase().replace('_', ' ')}.</p>
                  </div>
                )}

                {/* Value Props */}
                <div className="space-y-4 pt-8 border-t border-stone-200">
                  <div className="flex items-start gap-4">
                    <Truck className="text-amber-600 mt-1" size={20} />
                    <div>
                      <h4 className="font-medium text-stone-900">Worldwide Shipping</h4>
                      <p className="text-sm text-stone-500">Professional crate packaging and insurance included.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <Shield className="text-amber-600 mt-1" size={20} />
                    <div>
                      <h4 className="font-medium text-stone-900">Secure Payment</h4>
                      <p className="text-sm text-stone-500">Transactions processed securely via Stripe.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <Award className="text-amber-600 mt-1" size={20} />
                    <div>
                      <h4 className="font-medium text-stone-900">Certificate of Authenticity</h4>
                      <p className="text-sm text-stone-500">Signed document included with every original piece.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Related Works Section */}
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
                    <p className="text-stone-500">${work.price.toLocaleString()}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

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
    </div>
  );
};

export default ArtworkDetail;