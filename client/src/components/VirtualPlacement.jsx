// src/components/VirtualPlacement.jsx
import { useState, useRef } from 'react';
import '@google/model-viewer';

const VirtualPlacement = ({ artwork }) => {
  const [mode, setMode] = useState('wall'); // 'wall' or 'room'
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const modelViewerRef = useRef(null);

  const handleARClick = async () => {
    if (modelViewerRef.current) {
      try {
        await modelViewerRef.current.activateAR();
      } catch {
        alert("AR is not supported on this device. Try on mobile.");
      }
    }
  };

  return (
    <div className="bg-black rounded-3xl overflow-hidden">
      <div className="p-6 border-b border-gray-800 flex justify-between items-center">
        <h3 className="text-xl font-semibold text-white">See it in your space</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('wall')}
            className={`px-4 py-2 rounded-full text-sm ${mode === 'wall' ? 'bg-white text-black' : 'bg-gray-800 text-white'}`}
          >
            Wall View
          </button>
          <button
            onClick={handleARClick}
            className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-full text-sm font-medium"
          >
            Try in AR
          </button>
        </div>
      </div>

      <div className="relative aspect-video bg-gray-950">
        <model-viewer
          ref={modelViewerRef}
          src={artwork.modelUrl || "/models/frame.glb"} // You can use a simple frame model
          alt={artwork.title}
          ar
          ar-modes="webxr scene-viewer quick-look"
          camera-controls
          shadow-intensity="1"
          exposure="0.8"
          environment-intensity="0.6"
          style={{ width: '100%', height: '100%' }}
        >
          {/* Overlay the actual artwork as texture */}
          <img 
            slot="poster" 
            src={artwork.images?.[0]?.url} 
            alt={artwork.title}
          />
        </model-viewer>
      </div>

      {/* Controls */}
      <div className="p-6 bg-gray-900 text-white">
        <div className="flex gap-6">
          <div>
            <label className="block text-sm mb-2">Scale</label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={scale}
              onChange={(e) => setScale(e.target.value)}
              className="w-48"
            />
            <span className="text-xs ml-2">{scale}x</span>
          </div>

          <div>
            <label className="block text-sm mb-2">Rotation</label>
            <input
              type="range"
              min="0"
              max="360"
              value={rotation}
              onChange={(e) => setRotation(e.target.value)}
              className="w-48"
            />
            <span className="text-xs ml-2">{rotation}°</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VirtualPlacement;
