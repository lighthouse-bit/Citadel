// src/pages/admin/Commissions.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, Eye, Calendar, DollarSign, 
  User, Image, Loader, CreditCard 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { commissionsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const Commissions = () => {
  const [commissions, setCommissions]   = useState([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [searchQuery, setSearchQuery]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    const fetchCommissions = async () => {
      setIsLoading(true);
      try {
        const response = await commissionsAPI.getAll({ 
          status: filterStatus || undefined 
        });
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

  // ── Client-side search filter ─────────────────────────
  const filteredCommissions = commissions.filter(commission => {
    const query = searchQuery.toLowerCase();
    return (
      commission.commissionNumber?.toLowerCase().includes(query) ||
      commission.customer?.firstName?.toLowerCase().includes(query) || // ✅ fixed: client → customer
      commission.customer?.lastName?.toLowerCase().includes(query)  || // ✅ fixed
      commission.customer?.email?.toLowerCase().includes(query)     || // ✅ fixed
      commission.artStyle?.toLowerCase().includes(query)
    );
  });

  // ── Status styles ─────────────────────────────────────
  const getStatusStyle = (status) => {
    const styles = {
      PENDING:     'bg-yellow-100 text-yellow-700  border-yellow-200',
      REVIEWING:   'bg-amber-100  text-amber-700   border-amber-200',
      ACCEPTED:    'bg-blue-100   text-blue-700    border-blue-200',
      IN_PROGRESS: 'bg-purple-100 text-purple-700  border-purple-200',
      REVISION:    'bg-orange-100 text-orange-700  border-orange-200',
      COMPLETED:   'bg-green-100  text-green-700   border-green-200',
      CANCELLED:   'bg-red-100    text-red-700     border-red-200',
    };
    return styles[status] || 'bg-stone-100 text-stone-700 border-stone-200';
  };

  // ── Payment status styles ─────────────────────────────
  const getPaymentStyle = (paymentStatus) => {
    const styles = {
      UNPAID:       'bg-red-100  text-red-600',
      DEPOSIT_PAID: 'bg-blue-100 text-blue-700',
      FULLY_PAID:   'bg-green-100 text-green-700',
    };
    return styles[paymentStatus] || 'bg-stone-100 text-stone-600';
  };

  const getPaymentLabel = (paymentStatus) => {
    const labels = {
      UNPAID:       'Unpaid',
      DEPOSIT_PAID: 'Deposit Paid',
      FULLY_PAID:   'Fully Paid',
    };
    return labels[paymentStatus] || paymentStatus;
  };

  const formatStatus = (status) => 
    status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';

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

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total',       value: commissions.length,                                            color: 'bg-stone-900'  },
          { label: 'Pending',     value: commissions.filter(c => c.status === 'PENDING').length,        color: 'bg-yellow-500' },
          { label: 'In Progress', value: commissions.filter(c => c.status === 'IN_PROGRESS').length,    color: 'bg-purple-500' },
          { label: 'Completed',   value: commissions.filter(c => c.status === 'COMPLETED').length,      color: 'bg-green-500'  },
          { label: 'Deposit Due', value: commissions.filter(c => c.paymentStatus === 'UNPAID' && c.status === 'ACCEPTED').length, color: 'bg-blue-500' },
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
            <option value="REVISION">Revision</option>
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
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden"
          >
            <div className="p-6">
              {/* Card Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-stone-400 font-mono">
                    {commission.commissionNumber}
                  </p>
                  <h3 className="text-lg font-semibold text-stone-900">
                    {commission.artStyle}
                  </h3>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border 
                                   ${getStatusStyle(commission.status)}`}>
                    {formatStatus(commission.status)}
                  </span>
                  {/* ✅ Payment status badge */}
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1
                                   ${getPaymentStyle(commission.paymentStatus)}`}>
                    <CreditCard size={10} />
                    {getPaymentLabel(commission.paymentStatus)}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-stone-600 text-sm mb-4 line-clamp-2">
                {commission.description}
              </p>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-stone-600">
                  <User size={15} className="text-stone-400 flex-shrink-0" />
                  <span className="truncate">
                    {commission.customer?.firstName} {commission.customer?.lastName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-stone-600">
                  <DollarSign size={15} className="text-stone-400 flex-shrink-0" />
                  {commission.finalPrice 
                    ? <span className="font-medium text-stone-900">
                        ${Number(commission.finalPrice).toLocaleString()}
                      </span>
                    : <span className="text-stone-400 italic text-xs">
                        Est: ${Number(commission.estimatedPrice).toLocaleString()}
                      </span>
                  }
                </div>
                <div className="flex items-center gap-2 text-sm text-stone-600">
                  <Calendar size={15} className="text-stone-400 flex-shrink-0" />
                  {commission.deadline 
                    ? new Date(commission.deadline).toLocaleDateString() 
                    : 'No deadline'}
                </div>
                <div className="flex items-center gap-2 text-sm text-stone-600">
                  <Image size={15} className="text-stone-400 flex-shrink-0" />
                  {commission.referenceImages?.length || 0} reference{commission.referenceImages?.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* ✅ Payment progress bar for accepted commissions */}
              {commission.status === 'ACCEPTED' && commission.paymentStatus === 'UNPAID' && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-700 font-medium">
                    ⏳ Awaiting 70% deposit from client
                  </p>
                </div>
              )}

              {commission.paymentStatus === 'DEPOSIT_PAID' && (
                <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-xs text-purple-700 font-medium">
                    ✅ Deposit received — work in progress
                  </p>
                </div>
              )}

              {commission.paymentStatus === 'FULLY_PAID' && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs text-green-700 font-medium">
                    ✅ Fully paid — commission complete
                  </p>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-stone-100">
                <p className="text-xs text-stone-400">
                  {new Date(commission.createdAt).toLocaleDateString()}
                </p>
                <Link
                  to={`/admin/commissions/${commission.id}`}
                  className="inline-flex items-center gap-1.5 text-sm text-amber-600
                             hover:text-amber-700 font-medium"
                >
                  <Eye size={15} />
                  View Details
                </Link>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty state */}
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