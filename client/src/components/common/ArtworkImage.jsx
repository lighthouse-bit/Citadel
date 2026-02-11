import { useState, useEffect } from 'react';
import { ImageOff } from 'lucide-react';

const ArtworkImage = ({ src, alt, className = "" }) => {
  // Beautiful fallback image (Unsplash) if the main image fails
  const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=800&h=1000&fit=crop";
  
  const [imageSrc, setImageSrc] = useState(src);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setImageSrc(src || FALLBACK_IMAGE);
    setHasError(false);
    setIsLoading(true);
  }, [src]);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImageSrc(FALLBACK_IMAGE);
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
        src={imageSrc}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-500 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        onError={handleError}
        onLoad={handleLoad}
        loading="lazy"
      />

      {/* Error State (if even fallback fails) */}
      {hasError && imageSrc === FALLBACK_IMAGE && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-100 text-stone-400">
          <ImageOff size={24} />
        </div>
      )}
    </div>
  );
};

export default ArtworkImage;