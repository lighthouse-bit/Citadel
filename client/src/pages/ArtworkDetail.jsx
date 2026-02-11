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
import { getArtworkById, getRelatedArtworks } from '../data/sampleArtworks';
import toast from 'react-hot-toast';

const ArtworkDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, isInCart } = useCart();
  
  const [artwork, setArtwork] = useState(null);
  const [relatedWorks, setRelatedWorks] = useState([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    // Simulate loading delay
    setIsLoading(true);
    
    // Get artwork data
    const artworkData = getArtworkById(id);
    
    if (artworkData) {
      setArtwork(artworkData);
      setRelatedWorks(getRelatedArtworks(artworkData.id));
      setSelectedImage(0);
    } else {
      // If artwork not found, redirect to gallery
      toast.error('Artwork not found');
      navigate('/gallery');
    }
    
    setIsLoading(false);
    
    // Scroll to top
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
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleFavorite = () => {
    setIsFavorited(!isFavorited);
    toast.success(isFavorited ? 'Removed from favorites' : 'Added to favorites');
  };

  const nextImage = () => {
    setSelectedImage((prev) => 
      prev === artwork.images.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setSelectedImage((prev) => 
      prev === 0 ? artwork.images.length - 1 : prev - 1
    );
  };

  if (isLoading) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-citadel-gold"></div>
      </div>
    );
  }

  if (!artwork) {
    return null;
  }

  return (
    <div className="pt-20 min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-citadel-charcoal py-4">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex items-center gap-2 text-sm">
            <Link to="/" className="text-gray-400 hover:text-citadel-gold transition-colors">
              Home
            </Link>
            <span className="text-gray-500">/</span>
            <Link to="/gallery" className="text-gray-400 hover:text-citadel-gold transition-colors">
              Gallery
            </Link>
            <span className="text-gray-500">/</span>
            <span className="text-white">{artwork.title}</span>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <button
            onClick={() => navigate(-1)}
            className="mb-8 text-gray-400 hover:text-citadel-gold transition-colors 
                     inline-flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            Back to Gallery
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Image Gallery */}
            <div className="space-y-4">
              {/* Main Image */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative group cursor-pointer"
                onClick={() => setIsImageModalOpen(true)}
              >
                <img
                  src={artwork.images[selectedImage]}
                  alt={artwork.title}
                  className="w-full h-auto rounded-lg"
                />
                
                {/* Image Navigation */}
                {artwork.images.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        prevImage();
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-citadel-dark/80 
                               text-white p-2 rounded-full opacity-0 group-hover:opacity-100 
                               transition-opacity hover:bg-citadel-gold hover:text-citadel-dark"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        nextImage();
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-citadel-dark/80 
                               text-white p-2 rounded-full opacity-0 group-hover:opacity-100 
                               transition-opacity hover:bg-citadel-gold hover:text-citadel-dark"
                    >
                      <ChevronRight size={24} />
                    </button>
                  </>
                )}

                {/* Zoom hint */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 
                              group-hover:opacity-100 transition-opacity pointer-events-none">
                  <span className="bg-citadel-dark/80 text-white px-4 py-2 rounded">
                    Click to zoom
                  </span>
                </div>
              </motion.div>

              {/* Thumbnail Images */}
              {artwork.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {artwork.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`relative overflow-hidden rounded border-2 transition-all
                                ${selectedImage === index 
                                  ? 'border-citadel-gold' 
                                  : 'border-transparent hover:border-citadel-gold/50'}`}
                    >
                      <img
                        src={image}
                        alt={`${artwork.title} view ${index + 1}`}
                        className="w-full h-24 object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Artwork Details */}
            <div>
              <div className="mb-8">
                <h1 className="text-4xl font-serif text-white mb-4">{artwork.title}</h1>
                
                {/* Price and Status */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    {artwork.status === 'AVAILABLE' ? (
                      <p className="text-3xl text-citadel-gold font-medium">
                        ${artwork.price.toLocaleString()}
                      </p>
                    ) : (
                      <p className="text-3xl text-red-500 font-medium">SOLD</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleFavorite}
                      className={`p-3 rounded-full border transition-all
                                ${isFavorited 
                                  ? 'bg-red-500 border-red-500 text-white' 
                                  : 'border-citadel-gold/30 text-citadel-gold hover:border-citadel-gold'}`}
                    >
                      <Heart size={20} fill={isFavorited ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={handleShare}
                      className="p-3 rounded-full border border-citadel-gold/30 text-citadel-gold 
                               hover:border-citadel-gold transition-all"
                    >
                      <Share2 size={20} />
                    </button>
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-300 leading-relaxed mb-8">
                  {artwork.description}
                </p>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-citadel-charcoal p-4 rounded">
                    <p className="text-gray-400 text-sm mb-1">Medium</p>
                    <p className="text-white">{artwork.medium}</p>
                  </div>
                  <div className="bg-citadel-charcoal p-4 rounded">
                    <p className="text-gray-400 text-sm mb-1">Size</p>
                    <p className="text-white">{artwork.size}</p>
                  </div>
                  <div className="bg-citadel-charcoal p-4 rounded">
                    <p className="text-gray-400 text-sm mb-1">Year</p>
                    <p className="text-white">{artwork.year}</p>
                  </div>
                  <div className="bg-citadel-charcoal p-4 rounded">
                    <p className="text-gray-400 text-sm mb-1">Category</p>
                    <p className="text-white capitalize">{artwork.category.toLowerCase().replace('_', ' ')}</p>
                  </div>
                </div>

                {/* Tags */}
                {artwork.tags && artwork.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-8">
                    {artwork.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-citadel-dark text-citadel-gold text-sm rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                {artwork.status === 'AVAILABLE' && (
                  <div className="flex gap-4 mb-8">
                    <button
                      onClick={handleAddToCart}
                      disabled={isInCart(artwork.id)}
                      className="flex-1 btn-primary inline-flex items-center justify-center gap-2 
                               disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ShoppingBag size={20} />
                      {isInCart(artwork.id) ? 'In Cart' : 'Add to Cart'}
                    </button>
                    <Link
                      to="/checkout"
                      className="flex-1 btn-outline inline-flex items-center justify-center gap-2"
                    >
                      Buy Now
                    </Link>
                  </div>
                )}

                {/* Benefits */}
                <div className="space-y-3 border-t border-citadel-gold/20 pt-8">
                  <div className="flex items-center gap-3 text-gray-400">
                    <Truck size={20} className="text-citadel-gold" />
                    <span>{artwork.details?.shipping || 'Worldwide shipping available'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-400">
                    <Shield size={20} className="text-citadel-gold" />
                    <span>{artwork.details?.certificate || 'Certificate of authenticity included'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-400">
                    <Award size={20} className="text-citadel-gold" />
                    <span>{artwork.details?.frame || 'Professional framing available'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Related Artworks */}
          {relatedWorks.length > 0 && (
            <div className="mt-20 pt-12 border-t border-citadel-gold/20">
              <h2 className="text-3xl font-serif text-white mb-8">You May Also Like</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {relatedWorks.map((work) => (
                  <Link
                    key={work.id}
                    to={`/artwork/${work.id}`}
                    className="group"
                  >
                    <div className="relative overflow-hidden rounded-lg mb-4">
                      <img
                        src={work.images[0]}
                        alt={work.title}
                        className="w-full h-64 object-cover transition-transform duration-300 
                                 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-citadel-dark/0 group-hover:bg-citadel-dark/40 
                                    transition-colors duration-300" />
                    </div>
                    <h3 className="text-lg font-serif text-white group-hover:text-citadel-gold 
                                 transition-colors">
                      {work.title}
                    </h3>
                    <p className="text-citadel-gold">${work.price.toLocaleString()}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Image Modal */}
      <AnimatePresence>
        {isImageModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-citadel-dark/95 flex items-center justify-center p-4"
            onClick={() => setIsImageModalOpen(false)}
          >
            <button
              onClick={() => setIsImageModalOpen(false)}
              className="absolute top-4 right-4 text-white hover:text-citadel-gold transition-colors"
            >
              <X size={32} />
            </button>
            
            <img
              src={artwork.images[selectedImage]}
              alt={artwork.title}
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* Modal Image Navigation */}
            {artwork.images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prevImage();
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-citadel-dark/80 
                           text-white p-3 rounded-full hover:bg-citadel-gold hover:text-citadel-dark 
                           transition-colors"
                >
                  <ChevronLeft size={28} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextImage();
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-citadel-dark/80 
                           text-white p-3 rounded-full hover:bg-citadel-gold hover:text-citadel-dark 
                           transition-colors"
                >
                  <ChevronRight size={28} />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ArtworkDetail;