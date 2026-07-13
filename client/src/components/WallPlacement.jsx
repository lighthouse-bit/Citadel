// src/components/WallPlacement.jsx
import { useState, useRef } from 'react';
import { Upload, RotateCw, Maximize2, X } from 'lucide-react';

const WallPlacement = ({ artwork }) => {
  const [wallImage, setWallImage] = useState(null);
  const [artScale, setArtScale] = useState(0.6);
  const [artRotation, setArtRotation] = useState(0);
  const [artPosition, setArtPosition] = useState({ x: 50, y: 40 });
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);
  const containerRef = useRef(null);

  const handleWallUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setWallImage(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const newX = ((e.clientX - rect.left) / rect.width) * 100;
    const newY = ((e.clientY - rect.top) / rect.height) * 100;

    setArtPosition({
      x: Math.max(10, Math.min(90, newX)),
      y: Math.max(10, Math.min(80, newY)),
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const resetPlacement = () => {
    setArtScale(0.6);
    setArtRotation(0);
    setArtPosition({ x: 50, y: 40 });
  };

  return (
    <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden">
      <div className="p-6 border-b border-stone-200 flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-serif">See it on your wall</h3>
          <p className="text-stone-500 text-sm">Upload a photo of your space</p>
        </div>
        <button
          onClick={() => fileInputRef.current.click()}
          className="flex items-center gap-2 bg-stone-900 text-white px-5 py-2.5 rounded-xl hover:bg-black transition"
        >
          <Upload size={18} />
          Upload Wall Photo
        </button>
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleWallUpload}
          className="hidden"
        />
      </div>

      <div 
        ref={containerRef}
        className="relative aspect-[16/10] bg-stone-100 overflow-hidden cursor-move"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {wallImage ? (
          <img 
            src={wallImage} 
            alt="Your wall" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center flex-col text-stone-400">
            <div className="text-6xl mb-4">🖼️</div>
            <p className="text-lg">Upload a photo of your wall</p>
            <p className="text-sm mt-1">We'll place the artwork realistically</p>
          </div>
        )}

        {/* Artwork Overlay */}
        {wallImage && (
          <div
            className="absolute border-4 border-white shadow-2xl transition-all duration-75"
            style={{
              left: `${artPosition.x}%`,
              top: `${artPosition.y}%`,
              transform: `translate(-50%, -50%) rotate(${artRotation}deg) scale(${artScale})`,
              width: '280px',
              cursor: isDragging ? 'grabbing' : 'grab',
            }}
            onMouseDown={handleMouseDown}
          >
            <img
              src={artwork.images?.[0]?.url}
              alt={artwork.title}
              className="w-full h-auto shadow-xl"
            />
          </div>
        )}
      </div>

      {/* Controls */}
      {wallImage && (
        <div className="p-6 bg-stone-50 border-t border-stone-200">
          <div className="flex flex-wrap gap-6">
            <div>
              <label className="block text-xs text-stone-500 mb-1">SCALE</label>
              <input
                type="range"
                min="0.3"
                max="1.2"
                step="0.05"
                value={artScale}
                onChange={(e) => setArtScale(parseFloat(e.target.value))}
                className="w-48 accent-amber-600"
              />
            </div>

            <div>
              <label className="block text-xs text-stone-500 mb-1">ROTATE</label>
              <input
                type="range"
                min="-15"
                max="15"
                value={artRotation}
                onChange={(e) => setArtRotation(parseInt(e.target.value))}
                className="w-48 accent-amber-600"
              />
            </div>

            <button
              onClick={resetPlacement}
              className="ml-auto text-sm text-stone-500 hover:text-stone-900 flex items-center gap-1"
            >
              <RotateCw size={16} /> Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WallPlacement;
