// client/src/pages/admin/Commissions.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Eye, Calendar, DollarSign, User, Image } from 'lucide-react';
import { motion } from 'framer-motion';

const Commissions = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Sample commissions data
  const commissions = [
    {
      id: 'COM-001',
      client: { name: 'Victoria Adams', email: 'victoria@email.com', phone: '+1 555-0101' },
      style: 'Realistic Portrait',
      size: '24x36 inches',
      description: 'A family portrait featuring 4 members in a classic setting.',
      estimatedPrice: 2500,
      status: 'in_progress',
      deadline: '2024-02-15',
      createdAt: '2024-01-05',
      referenceImages: 3,
    },
    {
      id: 'COM-002',
      client: { name: 'Robert Blake', email: 'robert@email.com', phone: '+1 555-0102' },
      style: 'Abstract',
      size: '30x40 inches',
      description: 'Abstract piece inspired by ocean waves and movement.',
      estimatedPrice: 1800,
      status: 'pending',
      deadline: '2024-02-20',
      createdAt: '2024-01-10',
      referenceImages: 2,
    },
    {
      id: 'COM-003',
      client: { name: 'Emma Wilson', email: 'emma@email.com', phone: '+1 555-0103' },
      style: 'Watercolor',
      size: '16x20 inches',
      description: 'Botanical illustration of rare flowers.',
      estimatedPrice: 1200,
      status: 'reviewing',
      deadline: '2024-01-30',
      createdAt: '2024-01-02',
      referenceImages: 5,
    },
    {
      id: 'COM-004',
      client: { name: 'David Chen', email: 'david@email.com', phone: '+1 555-0104' },
      style: 'Contemporary',
      size: '36x48 inches',
      description: 'Modern cityscape of downtown Manhattan at night.',
      estimatedPrice: 3500,
      status: 'completed',
      deadline: '2024-01-20',
      createdAt: '2023-12-15',
      referenceImages: 4,
    },
  ];

  const filteredCommissions = commissions.filter(commission => {
    const matchesSearch = 
      commission.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      commission.client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      commission.style.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !filterStatus || commission.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusStyle = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      reviewing: 'bg-amber-100 text-amber-700 border-amber-200',
      accepted: 'bg-blue-100 text-blue-700 border-blue-200',
      in_progress: 'bg-purple-100 text-purple-700 border-purple-200',
      completed: 'bg-green-100 text-green-700 border-green-200',
      cancelled: 'bg-red-100 text-red-700 border-red-200',
    };
    return styles[status] || 'bg-stone-100 text-stone-700 border-stone-200';
  };

  const formatStatus = (status) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: commissions.length, color: 'bg-stone-900' },
          { label: 'Pending', value: commissions.filter(c => c.status === 'pending').length, color: 'bg-yellow-500' },
          { label: 'In Progress', value: commissions.filter(c => c.status === 'in_progress').length, color: 'bg-purple-500' },
          { label: 'Completed', value: commissions.filter(c => c.status === 'completed').length, color: 'bg-green-500' },
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
              placeholder="Search commissions..."
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
            <option value="pending">Pending</option>
            <option value="reviewing">Reviewing</option>
            <option value="accepted">Accepted</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
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
                  <p className="text-sm text-stone-500">{commission.id}</p>
                  <h3 className="text-lg font-semibold text-stone-900">{commission.style}</h3>
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
                  {commission.client.name}
                </div>
                <div className="flex items-center gap-2 text-sm text-stone-600">
                  <DollarSign size={16} className="text-stone-400" />
                  ${commission.estimatedPrice.toLocaleString()}
                </div>
                <div className="flex items-center gap-2 text-sm text-stone-600">
                  <Calendar size={16} className="text-stone-400" />
                  Due: {commission.deadline}
                </div>
                <div className="flex items-center gap-2 text-sm text-stone-600">
                  <Image size={16} className="text-stone-400" />
                  {commission.referenceImages} references
                </div>
              </div>

              {/* Size */}
              <div className="text-sm text-stone-500 mb-4">
                Size: {commission.size}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-stone-200">
                <p className="text-xs text-stone-400">
                  Submitted: {commission.createdAt}
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

      {filteredCommissions.length === 0 && (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
          <Image size={48} className="mx-auto text-stone-300 mb-4" />
          <p className="text-stone-500">No commissions found</p>
        </div>
      )}
    </div>
  );
};

export default Commissions;