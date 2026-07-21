import { useRef, useState } from 'react';
import { ImagePlus, Move, RotateCcw, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

const MAX_WALL_PHOTO_SIZE = 12 * 1024 * 1024;

const WallPlacement = ({ artwork }) => {
  const [wallImage, setWallImage] = useState(null);
  const [artScale, setArtScale] = useState(0.6);
  const [artRotation, setArtRotation] = useState(0);
  const [artPosition, setArtPosition] = useState({ x: 50, y: 43 });
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);
  const containerRef = useRef(null);

  const openFilePicker = () => fileInputRef.current?.click();

  const handleWallUpload = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image of your wall');
      return;
    }
    if (file.size > MAX_WALL_PHOTO_SIZE) {
      toast.error('Wall photos must be smaller than 12MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = ({ target }) => {
      setWallImage(target.result);
      setArtPosition({ x: 50, y: 43 });
    };
    reader.onerror = () => toast.error('That photo could not be opened');
    reader.readAsDataURL(file);
  };

  const updatePosition = (event) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    setArtPosition({
      x: Math.max(10, Math.min(90, x)),
      y: Math.max(12, Math.min(88, y)),
    });
  };

  const startDragging = (event) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setIsDragging(true);
  };

  const stopDragging = (event) => {
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setIsDragging(false);
  };

  const resetPlacement = () => {
    setArtScale(0.6);
    setArtRotation(0);
    setArtPosition({ x: 50, y: 43 });
  };

  const removeWallPhoto = () => {
    setWallImage(null);
    resetPlacement();
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-stone-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700">
            Room preview
          </p>
          <h3 className="font-serif text-2xl leading-tight text-stone-900">See it in your space</h3>
          <p className="mt-1 text-sm text-stone-500">Upload a straight-on photo, then adjust the artwork.</p>
        </div>
        <button
          type="button"
          onClick={openFilePicker}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-black sm:w-auto sm:flex-none"
        >
          <Upload size={17} />
          {wallImage ? 'Replace wall photo' : 'Upload wall photo'}
        </button>
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleWallUpload}
          className="hidden"
          aria-label="Choose a photo of your wall"
        />
      </div>

      <div
        ref={containerRef}
        className={`relative aspect-[4/3] overflow-hidden bg-stone-100 sm:aspect-[16/10] ${
          wallImage ? 'select-none' : ''
        }`}
      >
        {wallImage ? (
          <>
            <img
              src={wallImage}
              alt="Your room preview"
              draggable="false"
              className="h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/65 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur-sm">
              <Move size={13} className="mr-1.5 inline" />
              Drag artwork to reposition
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={openFilePicker}
            className="absolute inset-0 flex w-full flex-col items-center justify-center px-6 text-center transition hover:bg-stone-200/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-600"
          >
            <span className="mb-4 grid h-14 w-14 place-items-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-sm">
              <ImagePlus size={24} strokeWidth={1.6} />
            </span>
            <span className="text-base font-medium text-stone-800">Add a photo of your wall</span>
            <span className="mt-1 text-sm text-stone-500">Use a clear, well-lit photo for the best preview</span>
            <span className="mt-4 text-[11px] text-stone-400">Your photo stays in this browser and is never uploaded</span>
          </button>
        )}

        {wallImage && (
          <div
            role="img"
            aria-label={`${artwork.title} positioned on your wall`}
            className={`absolute p-[3px] ring-1 ring-black/70 ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            style={{
              left: `${artPosition.x}%`,
              top: `${artPosition.y}%`,
              transform: `translate(-50%, -50%) rotate(${artRotation}deg) scale(${artScale})`,
              width: 'clamp(140px, 42%, 280px)',
              touchAction: 'none',
              background: 'linear-gradient(135deg, #393633 0%, #0c0b0a 28%, #24211f 62%, #050505 100%)',
              boxShadow: '0 18px 38px rgba(0, 0, 0, 0.38), 0 4px 10px rgba(0, 0, 0, 0.28), inset 0 0 0 1px rgba(255, 255, 255, 0.12)',
            }}
            onPointerDown={startDragging}
            onPointerMove={updatePosition}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
          >
            <div className="border border-black/80 bg-black">
              <img
                src={artwork.images?.[0]?.url}
                alt=""
                draggable="false"
                className="block h-auto w-full"
              />
            </div>
          </div>
        )}
      </div>

      {wallImage && (
        <div className="border-t border-stone-200 bg-stone-50 p-5 sm:p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 flex items-center justify-between text-xs font-medium text-stone-600">
                Artwork size
                <span className="tabular-nums text-stone-400">{Math.round(artScale * 100)}%</span>
              </span>
              <input
                type="range"
                min="0.3"
                max="1.2"
                step="0.05"
                value={artScale}
                onChange={(event) => setArtScale(Number(event.target.value))}
                className="w-full accent-amber-600"
              />
            </label>

            <label className="block">
              <span className="mb-2 flex items-center justify-between text-xs font-medium text-stone-600">
                Rotation
                <span className="tabular-nums text-stone-400">{artRotation}°</span>
              </span>
              <input
                type="range"
                min="-15"
                max="15"
                value={artRotation}
                onChange={(event) => setArtRotation(Number(event.target.value))}
                className="w-full accent-amber-600"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-stone-200 pt-4">
            <button
              type="button"
              onClick={resetPlacement}
              className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 transition hover:border-stone-300 hover:text-stone-950"
            >
              <RotateCcw size={15} /> Reset placement
            </button>
            <button
              type="button"
              onClick={removeWallPhoto}
              className="ml-auto inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-stone-500 transition hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={15} /> Remove photo
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default WallPlacement;
