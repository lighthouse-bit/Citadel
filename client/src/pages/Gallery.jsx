// client/src/pages/Gallery.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Filter, Grid, LayoutGrid, ShoppingBag } from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { sampleArtworks } from '../data/sampleArtworks';

const Gallery = () => {
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    sort: 'featured',
  });
  const [viewMode, setViewMode] = useState('grid');
  const { addToCart, isInCart } = useCart();

  // Filter and sort artworks
  const filteredArtworks = sampleArtworks.filter(artwork => {
    if (filters.category && artwork.category !== filters.category) return false;
    if (filters.status === 'AVAILABLE' && artwork.status !== 'AVAILABLE') return false;
    return true;
  }).sort((a, b) => {
    if (filters.sort === 'featured') return b.featured - a.featured;
    if (filters.sort === 'price-low') return a.price - b.price;
    if (filters.sort === 'price-high') return b.price - a.price;
    if (filters.sort === 'title') return a.title.localeCompare(b.title);
    return 0;
  });

  const categories = [
    { value: '', label: 'All Works' },
    { value: 'PAINTING', label: 'Paintings' },
    { value: 'DRAWING', label: 'Drawings' },
    { value: 'DIGITAL', label: 'Digital Art' },
    { value: 'MIXED_MEDIA', label: 'Mixed Media' },
  ];

  return (
    <div className="pt-20 min-h-screen bg-stone-50">
      {/* Header */}
      <section className="py-16 bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p 
            className="text-xs tracking-widest uppercase text-amber-700 mb-4"
            style={{ letterSpacing: '0.2em' }}
          >
            The Collection
          </p>
          <h1 
            className="text-4xl md:text-5xl text-stone-900 mb-4"
            style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}
          >
            Gallery
          </h1>
          <p className="text-stone-600 max-w-2xl mx-auto">
            Explore our curated collection of original artworks, each piece selected 
            for its exceptional quality and artistic merit.
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="py-6 bg-white border-b border-stone-200 sticky top-20 z-40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Filter size={18} className="text-amber-700" />
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="bg-stone-50 text-stone-700 px-4 py-2 border border-stone-200 
                         focus:outline-none focus:border-amber-600 text-sm"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              <select
                value={filters.sort}
                onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
                className="bg-stone-50 text-stone-700 px-4 py-2 border border-stone-200 
                         focus:outline-none focus:border-amber-600 text-sm"
              >
                <option value="featured">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="title">Alphabetical</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-stone-500 text-sm mr-2">
                {filteredArtworks.length} works
              </span>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${
                  viewMode === 'grid' ? 'text-amber-700' : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                <Grid size={20} />
              </button>
              <button
                onClick={() => setViewMode('large')}
                className={`p-2 transition-colors ${
                  viewMode === 'large' ? 'text-amber-700' : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                <LayoutGrid size={20} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Artworks */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-6">
          {filteredArtworks.length > 0 ? (
            <div className={`grid gap-8 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                : 'grid-cols-1 md:grid-cols-2'
            }`}>
              {filteredArtworks.map((artwork, index) => (
                <motion.article
                  key={artwork.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.5 }}
                  className="group"
                >
                  <Link to={`/artwork/${artwork.id}`}>
                    <div className="relative overflow-hidden bg-stone-100 mb-4">
                      <div className={viewMode === 'grid' ? 'aspect-[3/4]' : 'aspect-[4/3]'}>
                        <img
                          src={artwork.images[0]}
                          alt={artwork.title}
                          className="w-full h-full object-cover transition-transform duration-700 
                                   group-hover:scale-105"
                        />
                      </div>
                      
                      {/* Hover Actions */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 
                                    transition-all duration-300 flex items-center justify-center">
                        <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <span className="bg-white text-stone-900 px-4 py-2 text-xs tracking-widest uppercase">
                            View Details
                          </span>
                        </div>
                      </div>
                      
                      {/* Status Badge */}
                      {artwork.status === 'SOLD' && (
                        <div className="absolute top-4 left-4">
                          <span className="bg-stone-900 text-white px-3 py-1 text-xs tracking-wider uppercase">
                            Sold
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                  
                  {/* Details */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 
                        className="text-lg text-stone-900 mb-1 group-hover:text-amber-700 transition-colors"
                        style={{ fontFamily: "'Playfair Display', serif" }}
                      >
                        {artwork.title}
                      </h3>
                      <p className="text-stone-500 text-sm">{artwork.medium}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-amber-700 font-medium">
                        {artwork.status === 'SOLD' 
                          ? 'Sold' 
                          : new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'USD',
                              minimumFractionDigits: 0,
                            }).format(artwork.price)
                        }
                      </p>
                      {artwork.status === 'AVAILABLE' && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            addToCart(artwork);
                          }}
                          disabled={isInCart(artwork.id)}
                          className="mt-2 text-xs text-stone-500 hover:text-amber-700 
                                   disabled:text-stone-300 transition-colors flex items-center gap-1"
                        >
                          <ShoppingBag size={14} />
                          {isInCart(artwork.id) ? 'Added' : 'Add to Cart'}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          ) : (
            <div className="text-center py-24">
              <p className="text-stone-500">No artworks found matching your criteria.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Gallery;