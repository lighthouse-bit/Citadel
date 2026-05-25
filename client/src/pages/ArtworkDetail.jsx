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
  X,
  Eye
} from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { artworksAPI } from '../services/api';
import toast from 'react-hot-toast';
import SEO from '../components/common/SEO';

// Virtual Placement Component
const VirtualPlacement = ({ artwork }) => {
  const modelViewerRef = React.useRef(null);

  const handleARClick = async () => {
    if (modelViewerRef.current) {
      try {
        await modelViewerRef.current.activateAR();
      } catch (error) {
        toast.error("AR is not supported on this device. Please try on a mobile device.");
      }
    }
  };

  return (
    <div className="mt-16 bg-black rounded-3xl overflow-hidden">
      <div className="p-6 border-b border-gray-800 flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold text-white">See it in your space</h3>
          <p className="text-gray-400 text-sm">Augmented Reality Experience</p>
        </div>
        <button
          onClick={handleARClick}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-full text-sm font-medium transition"
        >
          <Eye size={18} />
          Try in AR
        </button>
      </div>

      <div className="relative aspect-video bg-gray-950">
        <model-viewer
          ref={modelViewerRef}
          src="/models/art-frame.glb" // You can replace this with a better frame model later
          alt={`Virtual placement of ${artwork.title}`}
          ar
          ar-modes="webxr scene-viewer quick-look"
          camera-controls
          shadow-intensity="1.2"
          exposure="0.7"
          environment-intensity="0.8"
          style={{ width: '100%', height: '100%' }}
        >
          {/* Use the actual artwork as poster/texture */}
          <img 
            slot="poster" 
            src={artwork.images?.[0]?.url} 
            alt={artwork.title}
          />
        </model-viewer>
      </div>

      <div className="p-6 text-center text-gray-400 text-sm">
        Point your camera at a wall • Works best in well-lit spaces
      </div>
    </div>
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
        const response = await artworksAPI.getById(id);
        
        if (response.data) {
          setArtwork(response.data);
          const relatedRes = await artworksAPI.getFeatured();
          setRelatedWorks(relatedRes.data.filter(w => w.id !== id).slice(0, 3));
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

  const handleAddToCart = () => {
    if (artwork) addToCart(artwork);
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
      toast.success('Link copied!');
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

  return (
    <>
      <SEO
        title={artwork.title}
        description={artwork.description?.substring(0, 160)}
        keywords={`${artwork.title}, ${artwork.category?.toLowerCase()}, fine art`}
        image={artwork.images?.[0]?.url}
        url={`/artwork/${artwork.id}`}
        type="product"
      />

      <div className="pt-20 min-h-screen bg-stone-50">
        {/* Breadcrumb */}
        <div className="bg-white border-b border-stone-200 py-4">
          <div className="max-w-7xl mx-auto px-6">
            <nav className="flex items-center gap-2 text-sm">
              <Link to="/" className="text-stone-500 hover:text-amber-600">Home</Link>
              <span className="text-stone-300">/</span>
              <Link to="/gallery" className="text-stone-500 hover:text-amber-600">Gallery</Link>
              <span className="text-stone-300">/</span>
              <span className="text-stone-900 font-medium truncate">{artwork.title}</span>
            </nav>
          </div>
        </div>

        <section className="py-12">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
              
              {/* Images Section */}
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
                      <button onClick={(e) => { e.stopPropagation(); prevImage(); }} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-full opacity-0 group-hover:opacity-100">
                        <ChevronLeft size={24} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); nextImage(); }} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-full opacity-0 group-hover:opacity-100">
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
                        className={`relative aspect-square rounded-md overflow-hidden border-2 transition-all ${selectedImageIndex === index ? 'border-amber-600' : 'border-transparent hover:border-stone-300'}`}
                      >
                        <ArtworkImage src={img.url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Details Section */}
              <div>
                <div className="sticky top-24">
                  <h1 className="text-4xl md:text-5xl font-serif text-stone-900 mb-2">{artwork.title}</h1>
                  <p className="text-stone-500 text-lg mb-6">{artwork.year}</p>

                  <div className="flex items-center justify-between mb-8 pb-8 border-b border-stone-200">
                    <p className="text-3xl text-stone-900 font-medium">
                      ${artwork.price?.toLocaleString()}
                    </p>
                    
                    <div className="flex gap-3">
                      <button onClick={() => setIsFavorited(!isFavorited)} className={`p-3 rounded-full border ${isFavorited ? 'border-red-200 bg-red-50 text-red-500' : 'border-stone-200'}`}>
                        <Heart size={20} fill={isFavorited ? "currentColor" : "none"} />
                      </button>
                      <button onClick={handleShare} className="p-3 rounded-full border border-stone-200 hover:border-stone-300">
                        <Share2 size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="prose prose-stone mb-8">
                    <p className="text-stone-600 leading-relaxed text-lg">{artwork.description}</p>
                  </div>

                  {/* ... other details ... */}

                  {/* AR Virtual Placement */}
                  <VirtualPlacement artwork={artwork} />

                  {/* Action Buttons */}
                  {artwork.status === 'AVAILABLE' && (
                    <div className="flex flex-col gap-4 mt-10">
                      <button
                        onClick={handleAddToCart}
                        disabled={isInCart(artwork.id)}
                        className="w-full bg-stone-900 text-white py-4 rounded-xl font-medium flex items-center justify-center gap-3"
                      >
                        <ShoppingBag size={18} />
                        {isInCart(artwork.id) ? 'In Cart' : 'Add to Collection'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default ArtworkDetail;