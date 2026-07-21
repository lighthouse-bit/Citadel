import { useState, useEffect } from 'react';
import { ImageOff } from 'lucide-react';
import { getOptimizedImageUrl, getResponsiveImageSrcSet } from '../../utils/cloudinaryImage';

const ArtworkImage = ({
  src,
  alt,
  className = '',
  widths = [320, 480, 640, 960],
  sizes = '100vw',
  loading = 'lazy',
  fetchPriority = 'auto',
}) => {
  // Beautiful fallback image (Unsplash) if the main image fails
  const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=800&h=1000&fit=crop";
  
  const [imageSrc, setImageSrc] = useState(src);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setImageSrc(src || FALLBACK_IMAGE);
    setFallbackFailed(false);
    setIsLoading(true);
  }, [src]);

  const handleError = () => {
    if (imageSrc !== FALLBACK_IMAGE) {
      setImageSrc(FALLBACK_IMAGE);
      setIsLoading(true);
    } else {
      setFallbackFailed(true);
      setIsLoading(false);
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className={`relative overflow-hidden bg-stone-200 ${className}`}>
      {/* Loading Skeleton */}
      {isLoading && (
        <div className="absolute inset-0 bg-stone-200 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-stone-300 border-t-amber-600 rounded-full animate-spin" />
        </div>
      )}

      {/* Main Image */}
      <img
        src={getOptimizedImageUrl(imageSrc, { width: widths.at(-1) })}
        srcSet={getResponsiveImageSrcSet(imageSrc, widths)}
        sizes={sizes}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-500 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        onError={handleError}
        onLoad={handleLoad}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
      />

      {/* Error State (if even fallback fails) */}
      {fallbackFailed && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-100 text-stone-400">
          <ImageOff size={24} />
        </div>
      )}
    </div>
  );
};

export default ArtworkImage;
