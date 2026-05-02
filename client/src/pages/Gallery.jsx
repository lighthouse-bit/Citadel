// src/pages/Gallery.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Grid, LayoutGrid, ShoppingBag, Eye, Search, X, ImageOff } from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { artworksAPI } from '../services/api';
import toast from 'react-hot-toast';
import SEO from '../components/common/SEO';

// ─────────────────────────────────────────────────────────
// Artwork Image Component
// ─────────────────────────────────────────────────────────
const ArtworkImage = ({ src, alt, className = "" }) => {
  const FALLBACK = "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=800&h=1000&fit=crop";
  const [imageSrc, setImageSrc]   = useState(src || FALLBACK);
  const [hasError, setHasError]   = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setImageSrc(src || FALLBACK);
    setHasError(false);
    setIsLoading(true);
  }, [src]);

  return (
    <div className={`relative overflow-hidden bg-stone-200 ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-stone-200 animate-pulse flex items-center justify-center z-10">
          <div className="w-8 h-8 border-2 border-stone-300 border-t-amber-600 rounded-full animate-spin" />
        </div>
      )}
      <img
        src={imageSrc}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-500 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        onError={() => { setHasError(true); setImageSrc(FALLBACK); setIsLoading(false); }}
        onLoad={() => setIsLoading(false)}
        loading="lazy"
      />
      {hasError && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-100 text-stone-400">
          <ImageOff size={24} />
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// Status Badge Component
// ─────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  if (status === 'AVAILABLE') return null;

  const styles = {
    SOLD:         'bg-stone-900 text-white',
    RESERVED:     'bg-amber-500 text-white',
    NOT_FOR_SALE: 'bg-stone-600 text-white',
  };

  const labels = {
    SOLD:         'Sold',
    RESERVED:     'Reserved',
    NOT_FOR_SALE: 'Not For Sale',
  };

  return (
    <div className="absolute top-4 left-4 z-10">
      <span className={`px-3 py-1 text-xs tracking-wider uppercase 
                        font-semibold rounded-sm shadow-md ${styles[status] || 'bg-stone-700 text-white'}`}>
        {labels[status] || status.replace('_', ' ')}
      </span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// Sold Overlay Component
// ─────────────────────────────────────────────────────────
const SoldOverlay = ({ status }) => {
  if (status === 'AVAILABLE') return null;

  return (
    <div className={`absolute inset-0 z-[5] transition-opacity duration-300 ${
      status === 'SOLD'         ? 'bg-black/35' :
      status === 'RESERVED'     ? 'bg-amber-900/20' :
      status === 'NOT_FOR_SALE' ? 'bg-stone-900/20' : ''
    }`} />
  );
};

// ─────────────────────────────────────────────────────────
// Main Gallery Component
// ─────────────────────────────────────────────────────────
const Gallery = () => {
  const { addToCart, isInCart } = useCart();

  const [artworks, setArtworks]   = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode]   = useState('grid');

  const [filters, setFilters] = useState({
    category: '',
    status:   '',       // ✅ Empty = show ALL statuses (available + sold + reserved)
    sort:     'createdAt',
    order:    'desc',
    search:   '',
  });

  const [pagination, setPagination] = useState({
    page:  1,
    limit: 12,
    total: 0,
    pages: 1,
  });

  const categories = [
    { value: '',            label: 'All Works'    },
    { value: 'PAINTING',    label: 'Paintings'    },
    { value: 'DRAWING',     label: 'Drawings'     },
    { value: 'DIGITAL',     label: 'Digital Art'  },
    { value: 'MIXED_MEDIA', label: 'Mixed Media'  },
    { value: 'SCULPTURE',   label: 'Sculpture'    },
    { value: 'PHOTOGRAPHY', label: 'Photography'  },
  ];

  const sortOptions = [
    { value: 'createdAt-desc', label: 'Newest First'        },
    { value: 'price-asc',      label: 'Price: Low to High'  },
    { value: 'price-desc',     label: 'Price: High to Low'  },
    { value: 'title-asc',      label: 'Title: A-Z'          },
  ];

  // ✅ Availability filter options - separate from sort/category
  const availabilityOptions = [
    { value: '',            label: 'All Pieces'   },
    { value: 'AVAILABLE',   label: 'Available'    },
    { value: 'SOLD',        label: 'Sold'         },
    { value: 'RESERVED',    label: 'Reserved'     },
  ];

  // ── Fetch artworks ────────────────────────────────────
  useEffect(() => {
    const fetchArtworks = async () => {
      setIsLoading(true);
      try {
        const response = await artworksAPI.getAll({
          ...filters,
          page:  pagination.page,
          limit: pagination.limit,
        });
        setArtworks(response.data.artworks);
        setPagination(response.data.pagination);
      } catch (error) {
        console.error('Error fetching artworks:', error);
        toast.error('Failed to load artworks.');
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchArtworks, 300);
    return () => clearTimeout(timeoutId);
  }, [filters, pagination.page, pagination.limit]);

  // ── Handlers ──────────────────────────────────────────
  const handleFilterChange = (key, value) => {
    if (key === 'sort') {
      const [sort, order] = value.split('-');
      setFilters(prev => ({ ...prev, sort, order }));
    } else {
      setFilters(prev => ({ ...prev, [key]: value }));
    }
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      status:   '',
      sort:     'createdAt',
      order:    'desc',
      search:   '',
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters = filters.category || filters.status || filters.search;

  // ── Add to cart handler ───────────────────────────────
  const handleAddToCart = (e, artwork) => {
    e.preventDefault();
    e.stopPropagation();
    if (artwork.status !== 'AVAILABLE') return;
    addToCart(artwork);
    toast.success(`${artwork.title} added to cart`);
  };

  return (
    <>
    <SEO
      title="Gallery"
      description="Browse our curated collection of original fine art paintings, drawings and mixed media works."
      keywords="art gallery, original paintings, fine art collection, buy artwork"
      url="/gallery"
    />
    <div className="pt-20 min-h-screen bg-stone-50">

      {/* ── Header ───────────────────────────────────────── */}
      <section className="py-16 bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p
              className="text-xs tracking-widest uppercase text-amber-700 mb-4"
              style={{ letterSpacing: '0.2em' }}
            >
              The Collection
            </p>
            <h1
              className="text-4xl md:text-5xl text-stone-900 mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Gallery
            </h1>
            <p className="text-stone-600 max-w-2xl mx-auto leading-relaxed">
              Explore our curated collection of original artworks, each piece 
              selected for its exceptional quality and artistic merit.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Filter Bar ───────────────────────────────────── */}
      <section className="sticky top-20 z-40 bg-white/95 backdrop-blur-md 
                          border-b border-stone-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

            {/* Left: Filters */}
            <div className="flex flex-1 flex-col sm:flex-row gap-3 flex-wrap">

              {/* Search */}
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search title, medium..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full sm:w-56 pl-9 pr-8 py-2 bg-stone-50 border border-stone-200 
                             rounded-lg text-sm focus:outline-none focus:border-amber-500 
                             placeholder-stone-400 text-stone-800"
                />
                {filters.search && (
                  <button
                    onClick={() => handleFilterChange('search', '')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Category */}
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-amber-700 hidden sm:block flex-shrink-0" />
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm
                             focus:outline-none focus:border-amber-500 text-stone-700"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* ✅ Availability filter */}
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm
                           focus:outline-none focus:border-amber-500 text-stone-700"
              >
                {availabilityOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              {/* Sort */}
              <select
                value={`${filters.sort}-${filters.order}`}
                onChange={(e) => handleFilterChange('sort', e.target.value)}
                className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm
                           focus:outline-none focus:border-amber-500 text-stone-700"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              {/* Clear filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium 
                             text-red-600 hover:text-red-700 border border-red-200 
                             hover:border-red-300 rounded-lg bg-red-50 transition-colors"
                >
                  <X size={13} />
                  Clear
                </button>
              )}
            </div>

            {/* Right: Count + View toggle */}
            <div className="flex items-center justify-between md:justify-end gap-4 
                            border-t md:border-t-0 border-stone-100 pt-3 md:pt-0">
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wider whitespace-nowrap">
                {pagination.total} {pagination.total === 1 ? 'Work' : 'Works'}
              </span>

              <div className="flex bg-stone-100 p-1 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === 'grid'
                      ? 'bg-white shadow-sm text-amber-700'
                      : 'text-stone-400 hover:text-stone-600'
                  }`}
                  title="Grid View"
                >
                  <Grid size={17} />
                </button>
                <button
                  onClick={() => setViewMode('large')}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === 'large'
                      ? 'bg-white shadow-sm text-amber-700'
                      : 'text-stone-400 hover:text-stone-600'
                  }`}
                  title="Large View"
                >
                  <LayoutGrid size={17} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Grid ────────────────────────────────────── */}
      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto">

          {/* Loading skeletons */}
          {isLoading ? (
            <div className={`grid gap-8 ${
              viewMode === 'grid'
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                : 'grid-cols-1 md:grid-cols-2'
            }`}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-stone-200 aspect-[3/4] rounded-lg mb-4" />
                  <div className="h-5 bg-stone-200 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-stone-200 rounded w-1/2" />
                </div>
              ))}
            </div>

          ) : artworks.length > 0 ? (
            <>
              <div className={`grid gap-8 ${
                viewMode === 'grid'
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                  : 'grid-cols-1 md:grid-cols-2'
              }`}>
                <AnimatePresence>
                  {artworks.map((artwork, index) => (
                    <motion.article
                      key={artwork.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, delay: index * 0.04 }}
                      className="group"
                    >
                      {/* ── Image Block ─────────────────── */}
                      <Link
                        to={`/artwork/${artwork.id}`}
                        className="block relative mb-4"
                      >
                        <div className="relative overflow-hidden bg-stone-200 rounded-lg 
                                        shadow-sm group-hover:shadow-xl transition-all duration-500">

                          {/* Image */}
                          <div className={viewMode === 'grid' ? 'aspect-[3/4]' : 'aspect-[4/3]'}>
                            <ArtworkImage
                              src={artwork.images?.[0]?.url}
                              alt={artwork.title}
                              className="w-full h-full"
                            />
                          </div>

                          {/* ✅ Sold/Reserved overlay */}
                          <SoldOverlay status={artwork.status} />

                          {/* Hover overlay - only for available */}
                          {artwork.status === 'AVAILABLE' && (
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 
                                            transition-colors duration-300 z-[6]" />
                          )}

                          {/* ✅ Status badge */}
                          <StatusBadge status={artwork.status} />

                          {/* Hover action - only for available */}
                          {artwork.status === 'AVAILABLE' && (
                            <div className="absolute bottom-4 left-0 right-0 flex justify-center 
                                            opacity-0 translate-y-4 group-hover:opacity-100 
                                            group-hover:translate-y-0 transition-all duration-300 z-[7]">
                              <span className="bg-white/95 backdrop-blur text-stone-900 px-4 py-2 
                                               rounded-full text-xs font-medium uppercase tracking-wider 
                                               shadow-lg flex items-center gap-2">
                                <Eye size={13} /> View Details
                              </span>
                            </div>
                          )}

                          {/* ✅ Sold - centered text on hover */}
                          {artwork.status === 'SOLD' && (
                            <div className="absolute inset-0 flex items-center justify-center z-[7]">
                              <span className="text-white text-lg font-serif opacity-0 
                                               group-hover:opacity-100 transition-opacity duration-300
                                               drop-shadow-lg">
                                This piece has found its home
                              </span>
                            </div>
                          )}
                        </div>
                      </Link>

                      {/* ── Info Block ──────────────────── */}
                      <div className="flex justify-between items-start px-1">
                        <div className="flex-1 min-w-0 mr-3">
                          <h3
                            className="text-lg text-stone-900 mb-1 font-medium 
                                       group-hover:text-amber-700 transition-colors truncate"
                            style={{ fontFamily: "'Playfair Display', serif" }}
                          >
                            {artwork.title}
                          </h3>
                          <p className="text-stone-500 text-xs uppercase tracking-wide">
                            {artwork.medium}
                          </p>
                        </div>

                        <div className="text-right flex-shrink-0">
                          {/* Price display */}
                          {artwork.status === 'SOLD' ? (
                            <p className="text-stone-400 line-through text-sm">
                              ${Number(artwork.price).toLocaleString()}
                            </p>
                          ) : artwork.status === 'NOT_FOR_SALE' ? (
                            <p className="text-stone-500 text-sm">Not for sale</p>
                          ) : (
                            <p className="text-stone-900 font-semibold">
                              ${Number(artwork.price).toLocaleString()}
                            </p>
                          )}

                          {/* ✅ Add to cart - only for AVAILABLE */}
                          {artwork.status === 'AVAILABLE' && (
                            <button
                              onClick={(e) => handleAddToCart(e, artwork)}
                              disabled={isInCart(artwork.id)}
                              className="mt-2 text-xs font-medium text-amber-600 
                                         hover:text-amber-800 disabled:text-stone-400 
                                         disabled:cursor-not-allowed transition-colors 
                                         flex items-center justify-end gap-1 ml-auto"
                            >
                              <ShoppingBag size={13} />
                              {isInCart(artwork.id) ? 'In Cart' : 'Add'}
                            </button>
                          )}

                          {/* ✅ Reserved labeld gdg */}
                          {artwork.status === 'RESERVED' && (
                            <p className="mt-2 text-xs font-medium text-amber-600">
                              Reserved
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.article>
                  ))}
                </AnimatePresence>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="mt-16 flex justify-center gap-2">
                  {[...Array(pagination.pages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setPagination(prev => ({ ...prev, page: i + 1 }));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`w-10 h-10 rounded-full flex items-center justify-center 
                                  text-sm font-medium transition-all ${
                        pagination.page === i + 1
                          ? 'bg-stone-900 text-white shadow-md scale-110'
                          : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </>

          ) : (
            // Empty state
            <div className="text-center py-24 bg-white rounded-xl border border-stone-100 shadow-sm">
              <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center 
                              justify-center mx-auto mb-4">
                <Search size={24} className="text-stone-400" />
              </div>
              <h3 className="text-lg font-medium text-stone-900 mb-2">No artworks found</h3>
              <p className="text-stone-500 mb-6 max-w-md mx-auto">
                We couldn't find any pieces matching your current filters. 
                Try adjusting your search terms or clearing filters.
              </p>
              <button
                onClick={clearFilters}
                className="text-amber-700 font-medium hover:text-amber-800 
                           underline underline-offset-4"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
    </>
  );
};

export default Gallery;