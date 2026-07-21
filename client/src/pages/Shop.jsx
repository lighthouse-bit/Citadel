// client/src/pages/Shop.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Grid, LayoutGrid, ShoppingBag, Search, X, Heart, SlidersHorizontal } from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { artworksAPI } from '../services/api';
import toast from 'react-hot-toast';
import SEO from '../components/common/SEO';
import { useWishlist } from '../hooks/useWishlist';
import { useAuth } from '../hooks/useAuth';
import ArtworkRecommendations from '../components/ArtworkRecommendations';
import { getGuestRecentlyViewed } from '../utils/recentlyViewed';
import ArtworkImage from '../components/common/ArtworkImage';

const filterInputClass = 'w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-amber-500';

const Shop = () => {
  const { addToCart, isInCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { isAuthenticated } = useAuth();
  const [artworks, setArtworks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [facets, setFacets] = useState({ mediums: [], price: {}, years: {} });
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [filters, setFilters] = useState({
    category: '',
    sort: 'createdAt',
    order: 'desc',
    search: '',
    status: 'AVAILABLE', // KEY DIFFERENCE: Only available works
    medium: '',
    minPrice: '',
    maxPrice: '',
    minYear: '',
    maxYear: '',
    minWidth: '',
    maxWidth: '',
    minHeight: '',
    maxHeight: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 1,
  });

  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'PAINTING', label: 'Paintings' },
    { value: 'DRAWING', label: 'Drawings' },
    { value: 'DIGITAL', label: 'Digital Art' },
    { value: 'MIXED_MEDIA', label: 'Mixed Media' },
    { value: 'SCULPTURE', label: 'Sculpture' },
    { value: 'PHOTOGRAPHY', label: 'Photography' },
  ];

  const sortOptions = [
    { value: 'createdAt-desc', label: 'Newest First' },
    { value: 'price-asc', label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' },
    { value: 'title-asc', label: 'Title: A-Z' },
    { value: 'popular-desc', label: 'Most Popular' },
    { value: 'wishlisted-desc', label: 'Most Wishlisted' },
  ];

  useEffect(() => {
    Promise.all([artworksAPI.getFacets(), artworksAPI.getRecommendations()]).then(([facetResponse, recommendationResponse]) => {
      setFacets(facetResponse.data);
      setRecommendations(recommendationResponse.data.artworks || []);
    }).catch(() => {});
    if (isAuthenticated) artworksAPI.getRecentlyViewed().then(response => setRecentlyViewed(response.data || [])).catch(() => setRecentlyViewed(getGuestRecentlyViewed()));
    else setRecentlyViewed(getGuestRecentlyViewed());
  }, [isAuthenticated]);

  useEffect(() => {
    if (filters.search.trim().length < 2) { setSuggestions([]); return undefined; }
    const timer = setTimeout(() => artworksAPI.getSuggestions(filters.search).then(response => setSuggestions(response.data || [])).catch(() => setSuggestions([])), 180);
    return () => clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    const fetchArtworks = async () => {
      setIsLoading(true);
      try {
        const response = await artworksAPI.getAll({
          ...filters,
          page: pagination.page,
          limit: pagination.limit,
        });
        setArtworks(response.data.artworks);
        setPagination(response.data.pagination);
      } catch (error) {
        console.error('Failed to load collection:', error);
        toast.error('Failed to load collection');
      } finally {
        setIsLoading(false);
      }
    };

    const timeout = setTimeout(fetchArtworks, 300);
    return () => clearTimeout(timeout);
  }, [filters, pagination.page]);

  const handleFilterChange = (key, value) => {
    if (key === 'sort') {
      const [sort, order] = value.split('-');
      setFilters(prev => ({ ...prev, sort, order }));
    } else {
      setFilters(prev => ({ ...prev, [key]: value }));
    }
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearSearch = () => {
    setFilters(prev => ({ ...prev, search: '' }));
  };

  return (
    <>
    <SEO
        title="Shop"
        description="Purchase original fine art pieces. Each artwork comes with a certificate of authenticity and worldwide shipping."
        keywords="buy art online, original artwork for sale, fine art shop"
        url="/shop"
      />
    <div className="pt-20 min-h-screen bg-stone-50">
      
      {/* Header */}
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
              Available for Acquisition
            </p>
            <h1 
              className="text-4xl md:text-5xl text-stone-900 mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              The Collection
            </h1>
            <p className="text-stone-600 max-w-2xl mx-auto leading-relaxed">
              Acquire an original piece of fine art. Each work in this collection 
              is available for immediate purchase and will be delivered with a 
              certificate of authenticity.
            </p>
          </motion.div>
        </div>
      </section>

      {(recommendations.length > 0 || recentlyViewed.length > 0) && <div className="max-w-7xl mx-auto px-6">
        <ArtworkRecommendations title={isAuthenticated ? 'Selected for You' : 'Collector Favorites'} subtitle={isAuthenticated ? 'Based on the artwork you view, save and collect.' : 'Popular original works from the collection.'} artworks={recommendations} />
        <ArtworkRecommendations title="Recently Viewed" subtitle="Continue exploring pieces that caught your attention." artworks={recentlyViewed} />
      </div>}

      {/* Filter Bar */}
      <section className="sticky top-20 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Left: Search & Filters */}
            <div className="flex flex-1 flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search collection..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  className="w-full sm:w-64 pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg
                           text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500
                           placeholder-stone-400 text-stone-800"
                />
                {filters.search && (
                  <button 
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    <X size={14} />
                  </button>
                )}
                {showSuggestions && suggestions.length > 0 && <div className="absolute top-full left-0 right-0 sm:w-96 mt-2 bg-white border border-stone-200 rounded-xl shadow-xl overflow-hidden z-50">{suggestions.map(item => <Link key={item.id} to={`/artwork/${item.id}`} className="flex items-center gap-3 p-3 hover:bg-stone-50"><img src={item.images?.[0]?.url} alt="" className="w-10 h-10 rounded object-cover bg-stone-100"/><span className="min-w-0"><b className="text-sm block truncate">{item.title}</b><span className="text-xs text-stone-500">{item.medium || item.category?.toLowerCase().replaceAll('_', ' ')}</span></span></Link>)}</div>}
              </div>

              {/* Category */}
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-amber-700 hidden sm:block" />
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full sm:w-auto px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg 
                           text-sm focus:outline-none focus:border-amber-500 text-stone-700 cursor-pointer"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Sort */}
              <select
                value={`${filters.sort}-${filters.order}`}
                onChange={(e) => handleFilterChange('sort', e.target.value)}
                className="w-full sm:w-auto px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg 
                         text-sm focus:outline-none focus:border-amber-500 text-stone-700 cursor-pointer"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button onClick={() => setShowAdvanced(previous => !previous)} className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border text-sm ${showAdvanced ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-stone-50 border-stone-200 text-stone-700'}`}><SlidersHorizontal size={16}/> More filters</button>
            </div>

            {/* Right: Count & View Toggle */}
            <div className="flex items-center justify-between md:justify-end gap-4">
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wider whitespace-nowrap">
                {pagination.total} {pagination.total === 1 ? 'piece' : 'pieces'} available
              </span>
              
              <div className="flex bg-stone-100 p-1 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === 'grid' ? 'bg-white shadow-sm text-amber-700' : 'text-stone-400'
                  }`}
                >
                  <Grid size={18} />
                </button>
                <button
                  onClick={() => setViewMode('large')}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === 'large' ? 'bg-white shadow-sm text-amber-700' : 'text-stone-400'
                  }`}
                >
                  <LayoutGrid size={18} />
                </button>
              </div>
            </div>
          </div>
          {showAdvanced && <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-4 pt-4 border-t border-stone-100">
            <select value={filters.medium} onChange={event => handleFilterChange('medium', event.target.value)} className={filterInputClass}><option value="">All media</option>{facets.mediums.map(medium => <option key={medium} value={medium}>{medium}</option>)}</select>
            <input type="number" min="0" placeholder={`Min $${facets.price.min || 0}`} value={filters.minPrice} onChange={event => handleFilterChange('minPrice', event.target.value)} className={filterInputClass}/>
            <input type="number" min="0" placeholder={`Max $${facets.price.max || ''}`} value={filters.maxPrice} onChange={event => handleFilterChange('maxPrice', event.target.value)} className={filterInputClass}/>
            <input type="number" placeholder={`From ${facets.years.min || 'year'}`} value={filters.minYear} onChange={event => handleFilterChange('minYear', event.target.value)} className={filterInputClass}/>
            <input type="number" placeholder={`To ${facets.years.max || 'year'}`} value={filters.maxYear} onChange={event => handleFilterChange('maxYear', event.target.value)} className={filterInputClass}/>
            <input type="number" min="0" placeholder="Min width" value={filters.minWidth} onChange={event => handleFilterChange('minWidth', event.target.value)} className={filterInputClass}/>
            <input type="number" min="0" placeholder="Max width" value={filters.maxWidth} onChange={event => handleFilterChange('maxWidth', event.target.value)} className={filterInputClass}/>
            <input type="number" min="0" placeholder="Min height" value={filters.minHeight} onChange={event => handleFilterChange('minHeight', event.target.value)} className={filterInputClass}/>
            <input type="number" min="0" placeholder="Max height" value={filters.maxHeight} onChange={event => handleFilterChange('maxHeight', event.target.value)} className={filterInputClass}/>
            <button onClick={() => { setFilters(previous => ({ ...previous, medium: '', minPrice: '', maxPrice: '', minYear: '', maxYear: '', minWidth: '', maxWidth: '', minHeight: '', maxHeight: '' })); setPagination(previous => ({ ...previous, page: 1 })); }} className="text-sm text-red-600 px-3">Clear details</button>
          </div>}
        </div>
      </section>

      {/* Main Grid */}
      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto">
          
          {isLoading ? (
            <div className={`grid gap-8 ${
              viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'
            }`}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-stone-200 aspect-[3/4] rounded-lg mb-4" />
                  <div className="h-6 bg-stone-200 rounded w-3/4 mb-2" />
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
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="group relative"
                    >
                      <button
                        type="button"
                        onClick={() => toggleWishlist(artwork)}
                        aria-label={isWishlisted(artwork.id) ? `Remove ${artwork.title} from wishlist` : `Save ${artwork.title} to wishlist`}
                        aria-pressed={isWishlisted(artwork.id)}
                        className={`absolute top-3 right-3 z-20 p-2.5 rounded-full shadow-md backdrop-blur transition-colors ${
                          isWishlisted(artwork.id) ? 'bg-red-50 text-red-500' : 'bg-white/90 text-stone-500 hover:text-red-500'
                        }`}
                      >
                        <Heart size={17} fill={isWishlisted(artwork.id) ? 'currentColor' : 'none'} />
                      </button>
                      {/* Image */}
                      <Link to={`/artwork/${artwork.id}`} className="block relative mb-4">
                        <div className={`relative overflow-hidden bg-stone-200 rounded-lg shadow-sm 
                                       group-hover:shadow-xl transition-all duration-500 
                                       ${viewMode === 'grid' ? 'aspect-[3/4]' : 'aspect-[4/3]'}`}>
                          <ArtworkImage
                            src={artwork.images?.[0]?.url}
                            alt={artwork.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            sizes={viewMode === 'grid'
                              ? '(max-width: 767px) calc(100vw - 3rem), (max-width: 1023px) calc(50vw - 3rem), 400px'
                              : '(max-width: 767px) calc(100vw - 3rem), 600px'}
                            loading={index < 3 ? 'eager' : 'lazy'}
                            fetchPriority={index === 0 ? 'high' : 'auto'}
                          />
                          
                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                          
                          {/* View Button (hover) */}
                          <div className="absolute bottom-4 left-0 right-0 flex justify-center 
                                        opacity-0 translate-y-4 group-hover:opacity-100 
                                        group-hover:translate-y-0 transition-all duration-300">
                            <span className="bg-white/95 backdrop-blur text-stone-900 px-4 py-2 
                                           rounded-full text-xs font-medium uppercase tracking-wider shadow-lg">
                              View Details
                            </span>
                          </div>
                        </div>
                      </Link>

                      {/* Info & Cart Action */}
                      <div className="flex justify-between items-start px-1">
                        <div className="flex-1 mr-4">
                          <Link to={`/artwork/${artwork.id}`}>
                            <h3 
                              className="text-lg text-stone-900 mb-1 font-medium 
                                       group-hover:text-amber-700 transition-colors"
                              style={{ fontFamily: "'Playfair Display', serif" }}
                            >
                              {artwork.title}
                            </h3>
                          </Link>
                          <p className="text-stone-500 text-xs uppercase tracking-wide">
                            {artwork.medium}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-stone-900 font-semibold text-lg mb-2">
                            ${Number(artwork.price).toLocaleString()}
                          </p>
                          <button
                            onClick={() => addToCart(artwork)}
                            disabled={isInCart(artwork.id)}
                            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium 
                                      uppercase tracking-wider rounded-lg transition-all duration-300
                                      ${isInCart(artwork.id)
                                        ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                                        : 'bg-stone-900 text-white hover:bg-amber-600'
                                      }`}
                          >
                            <ShoppingBag size={14} />
                            {isInCart(artwork.id) ? 'In Cart' : 'Add to Cart'}
                          </button>
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
                                text-sm font-medium transition-all
                                ${pagination.page === i + 1
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
            /* No Results */
            <div className="text-center py-24 bg-white rounded-xl border border-stone-100 shadow-sm">
              <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search size={24} className="text-stone-400" />
              </div>
              <h3 className="text-lg font-medium text-stone-900 mb-2">No pieces available</h3>
              <p className="text-stone-500 mb-6 max-w-md mx-auto">
                There are currently no artworks matching your search. 
                Check back soon or explore our full gallery.
              </p>
              <Link
                to="/gallery"
                className="text-amber-700 font-medium hover:text-amber-800 underline underline-offset-4"
              >
                View Full Gallery →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Cross-link to Gallery */}
      <section className="py-16 bg-white border-t border-stone-100">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-stone-500 mb-4">
            Looking for sold or archived works?
          </p>
          <Link
            to="/gallery"
            className="text-amber-700 font-medium hover:text-amber-800 transition-colors underline underline-offset-4"
          >
            View our complete Gallery →
          </Link>
        </div>
      </section>
    </div>
    </>
  );
};

export default Shop;
