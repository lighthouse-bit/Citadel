// client/src/pages/Gallery.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Filter, Grid, List } from 'lucide-react';
import { useArtworks } from '../hooks/useArtworks';

const Gallery = () => {
  const [filters, setFilters] = useState({
    category: '',
    status: 'AVAILABLE',
    sort: 'createdAt',
    order: 'desc',
  });
  const [viewMode, setViewMode] = useState('grid');

  const { data, isLoading, error } = useArtworks(filters);

  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'PAINTING', label: 'Paintings' },
    { value: 'DRAWING', label: 'Drawings' },
    { value: 'DIGITAL', label: 'Digital Art' },
    { value: 'MIXED_MEDIA', label: 'Mixed Media' },
  ];

  if (isLoading) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-citadel-gold"></div>
      </div>
    );
  }

  return (
    <div className="pt-20 min-h-screen">
      {/* Header */}
      <section className="py-16 bg-citadel-charcoal">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-serif text-white mb-4">
            Gallery
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Explore the complete collection of original artworks
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="py-8 bg-citadel-dark border-b border-citadel-gold/20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Filter size={20} className="text-citadel-gold" />
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="bg-citadel-charcoal text-white px-4 py-2 rounded border border-citadel-gold/30"
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
                className="bg-citadel-charcoal text-white px-4 py-2 rounded border border-citadel-gold/30"
              >
                <option value="createdAt">Newest First</option>
                <option value="price">Price: Low to High</option>
                <option value="title">Title: A to Z</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'text-citadel-gold' : 'text-gray-400'}`}
              >
                <Grid size={20} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'text-citadel-gold' : 'text-gray-400'}`}
              >
                <List size={20} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Artworks Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          {data?.artworks?.length > 0 ? (
            <div className={`grid ${viewMode === 'grid' 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
              : 'grid-cols-1'} gap-8`}
            >
              {data.artworks.map((artwork, index) => (
                <motion.div
                  key={artwork.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group cursor-pointer"
                >
                  <a href={`/artwork/${artwork.id}`}>
                    <div className="relative overflow-hidden mb-4">
                      <img
                        src={artwork.images?.[0]?.url || '/api/placeholder/400/500'}
                        alt={artwork.title}
                        className="w-full h-[400px] object-cover transition-transform duration-500 
                                 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-citadel-dark/0 group-hover:bg-citadel-dark/40 
                                    transition-colors duration-300 flex items-center justify-center">
                        <span className="text-white opacity-0 group-hover:opacity-100 
                                       transition-opacity duration-300">
                          View Details
                        </span>
                      </div>
                    </div>
                    <h3 className="text-lg font-serif text-white mb-1">{artwork.title}</h3>
                    <p className="text-gray-400 text-sm mb-2">{artwork.medium}</p>
                    <p className="text-citadel-gold">${parseFloat(artwork.price).toLocaleString()}</p>
                  </a>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400">No artworks found</p>
            </div>
          )}

          {/* Pagination */}
          {data?.pagination && data.pagination.pages > 1 && (
            <div className="flex justify-center mt-12 gap-2">
              {[...Array(data.pagination.pages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setFilters({ ...filters, page: i + 1 })}
                  className={`px-4 py-2 ${
                    data.pagination.page === i + 1
                      ? 'bg-citadel-gold text-citadel-dark'
                      : 'bg-citadel-charcoal text-white hover:bg-citadel-gold/20'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Gallery;