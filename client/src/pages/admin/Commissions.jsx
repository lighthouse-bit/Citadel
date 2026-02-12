import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Eye, Calendar, DollarSign, User, Image, Loader } from 'lucide-react';
import { motion } from 'framer-motion';
import { commissionsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const Commissions = () => {
  const [commissions, setCommissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Fetch Data from API
  useEffect(() => {
    const fetchCommissions = async () => {
      setIsLoading(true);
      try {
        const response = await commissionsAPI.getAll({ status: filterStatus || undefined });
        setCommissions(response.data.commissions);
      } catch (error) {
        console.error('Error fetching commissions:', error);
        toast.error('Failed to load commissions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommissions();
  }, [filterStatus]);

  // Client-side filtering for search query
  const filteredCommissions = commissions.filter(commission => {
    const query = searchQuery.toLowerCase();
    return (
      commission.commissionNumber?.toLowerCase().includes(query) ||
      commission.client?.firstName?.toLowerCase().includes(query) ||
      commission.client?.lastName?.toLowerCase().includes(query) ||
      commission.client?.email?.toLowerCase().includes(query) ||
      commission.artStyle?.toLowerCase().includes(query)
    );
  });

  const getStatusStyle = (status) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      REVIEWING: 'bg-amber-100 text-amber-700 border-amber-200',
      ACCEPTED: 'bg-blue-100 text-blue-700 border-blue-200',
      IN_PROGRESS: 'bg-purple-100 text-purple-700 border-purple-200',
      COMPLETED: 'bg-green-100 text-green-700 border-green-200',
      CANCELLED: 'bg-red-100 text-red-700 border-red-200',
    };
    return styles[status] || 'bg-stone-100 text-stone-700 border-stone-200';
  };

  const formatStatus = (status) => {
    return status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader size={32} className="animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 
          className="text-2xl text-stone-900"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Commissions
        </h1>
        <p className="text-stone-500">Manage bespoke artwork requests</p>
      </div>

      {/* Stats (Calculated from live data) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: commissions.length, color: 'bg-stone-900' },
          { label: 'Pending', value: commissions.filter(c => c.status === 'PENDING').length, color: 'bg-yellow-500' },
          { label: 'In Progress', value: commissions.filter(c => c.status === 'IN_PROGRESS').length, color: 'bg-purple-500' },
          { label: 'Completed', value: commissions.filter(c => c.status === 'COMPLETED').length, color: 'bg-green-500' },
        ].map((stat, index) => (
          <div key={index} className="bg-white rounded-xl border border-stone-200 p-4">
            <div className="flex items-center justify-between">
              <p className="text-stone-600 text-sm">{stat.label}</p>
              <div className={`w-3 h-3 rounded-full ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold text-stone-900 mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search by client, ID, or style..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg
                       focus:outline-none focus:border-amber-500 text-stone-900"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-stone-300 rounded-lg
                     focus:outline-none focus:border-amber-500 text-stone-700"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="REVIEWING">Reviewing</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Commissions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredCommissions.map((commission, index) => (
          <motion.div
            key={commission.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-stone-500">{commission.commissionNumber}</p>
                  <h3 className="text-lg font-semibold text-stone-900">{commission.artStyle}</h3>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusStyle(commission.status)}`}>
                  {formatStatus(commission.status)}
                </span>
              </div>

              {/* Description */}
              <p className="text-stone-600 text-sm mb-4 line-clamp-2">
                {commission.description}
              </p>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm text-stone-600">
                  <User size={16} className="text-stone-400" />
                  {commission.customer?.firstName} {commission.customer?.lastName}
                </div>
                <div className="flex items-center gap-2 text-sm text-stone-600">
                  <DollarSign size={16} className="text-stone-400" />
                  Est: ${commission.estimatedPrice?.toLocaleString()}
                </div>
                <div className="flex items-center gap-2 text-sm text-stone-600">
                  <Calendar size={16} className="text-stone-400" />
                  Due: {commission.deadline ? new Date(commission.deadline).toLocaleDateString() : 'N/A'}
                </div>
                <div className="flex items-center gap-2 text-sm text-stone-600">
                  <Image size={16} className="text-stone-400" />
                  {commission.referenceImages?.length || 0} refs
                </div>
              </div>

              {/* Size */}
              <div className="text-sm text-stone-500 mb-4">
                Size: {commission.size}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-stone-200">
                <p className="text-xs text-stone-400">
                  Submitted: {new Date(commission.createdAt).toLocaleDateString()}
                </p>
                <Link
                  to={`/admin/commissions/${commission.id}`}
                  className="inline-flex items-center gap-2 text-sm text-amber-600 
                           hover:text-amber-700 font-medium"
                >
                  <Eye size={16} />
                  View Details
                </Link>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {!isLoading && filteredCommissions.length === 0 && (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
          <Image size={48} className="mx-auto text-stone-300 mb-4" />
          <p className="text-stone-500">No commissions found matching your criteria</p>
        </div>
      )}
    </div>
  );
};

export default Commissions;