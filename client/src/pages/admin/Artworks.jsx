import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  Image as ImageIcon,
  Loader
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { artworksAPI } from '../../services/api'; // Correct Import
import toast from 'react-hot-toast';

const Artworks = () => {
  const [artworks, setArtworks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [artworkToDelete, setArtworkToDelete] = useState(null);

  // Fetch Artworks from API
  const fetchArtworks = async () => {
    setIsLoading(true);
    try {
      // Pass 'all' statuses to admin view so we see SOLD/HIDDEN items too
      const response = await artworksAPI.getAll({ 
        limit: 100, // Get more items for admin view
        status: ''  // Clear status filter to get everything
      }); 
      setArtworks(response.data.artworks);
    } catch (error) {
      console.error('Error fetching artworks:', error);
      toast.error('Failed to load artworks');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchArtworks();
  }, []);

  // Client-side filtering for the admin table
  const filteredArtworks = artworks.filter(artwork => {
    const matchesSearch = artwork.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         artwork.medium?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !filterStatus || artwork.status === filterStatus;
    const matchesCategory = !filterCategory || artwork.category === filterCategory;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleDelete = (artwork) => {
    setArtworkToDelete(artwork);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await artworksAPI.delete(artworkToDelete.id);
      setArtworks(prev => prev.filter(a => a.id !== artworkToDelete.id));
      toast.success('Artwork deleted successfully');
      setShowDeleteModal(false);
      setArtworkToDelete(null);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete artwork');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      AVAILABLE: 'bg-green-100 text-green-700',
      SOLD: 'bg-red-100 text-red-700',
      RESERVED: 'bg-yellow-100 text-yellow-700',
      NOT_FOR_SALE: 'bg-stone-100 text-stone-700',
    };
    return styles[status] || 'bg-stone-100 text-stone-700';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 
            className="text-2xl text-stone-900"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Artworks
          </h1>
          <p className="text-stone-500">Manage your artwork collection</p>
        </div>
        <Link
          to="/admin/artworks/new"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 
                   bg-stone-900 text-white text-sm font-medium rounded-lg
                   hover:bg-stone-800 transition-colors"
        >
          <Plus size={18} />
          Add Artwork
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search artworks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg
                       focus:outline-none focus:border-amber-500 text-stone-900"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-stone-300 rounded-lg
                     focus:outline-none focus:border-amber-500 text-stone-700"
          >
            <option value="">All Status</option>
            <option value="AVAILABLE">Available</option>
            <option value="SOLD">Sold</option>
            <option value="RESERVED">Reserved</option>
            <option value="NOT_FOR_SALE">Not for Sale</option>
          </select>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-stone-300 rounded-lg
                     focus:outline-none focus:border-amber-500 text-stone-700"
          >
            <option value="">All Categories</option>
            <option value="PAINTING">Painting</option>
            <option value="DRAWING">Drawing</option>
            <option value="DIGITAL">Digital</option>
            <option value="MIXED_MEDIA">Mixed Media</option>
            <option value="SCULPTURE">Sculpture</option>
            <option value="PHOTOGRAPHY">Photography</option>
          </select>
        </div>
      </div>

      {/* Artworks Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <Loader size={32} className="animate-spin text-amber-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Artwork
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {filteredArtworks.map((artwork) => (
                  <tr key={artwork.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-stone-100 rounded overflow-hidden flex-shrink-0">
                          {artwork.images?.[0] ? (
                            <img
                              src={artwork.images[0].url}
                              alt={artwork.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon size={24} className="text-stone-400" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-stone-900">{artwork.title}</p>
                          <p className="text-sm text-stone-500">{artwork.medium}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-stone-600 capitalize">
                      {artwork.category?.toLowerCase().replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 text-stone-900 font-medium">
                      ${artwork.price?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(artwork.status)}`}>
                        {artwork.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/artwork/${artwork.id}`}
                          target="_blank"
                          className="p-2 hover:bg-stone-100 rounded-lg transition-colors text-stone-600"
                          title="View"
                        >
                          <Eye size={16} />
                        </Link>
                        <Link
                          to={`/admin/artworks/${artwork.id}/edit`}
                          className="p-2 hover:bg-stone-100 rounded-lg transition-colors text-stone-600"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </Link>
                        <button
                          onClick={() => handleDelete(artwork)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && filteredArtworks.length === 0 && (
          <div className="p-12 text-center">
            <ImageIcon size={48} className="mx-auto text-stone-300 mb-4" />
            <p className="text-stone-500">No artworks found</p>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-stone-900 mb-2">
                Delete Artwork
              </h3>
              <p className="text-stone-600 mb-6">
                Are you sure you want to delete "{artworkToDelete?.title}"? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700
                           hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg
                           hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Artworks;