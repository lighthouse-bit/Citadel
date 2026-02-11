// client/src/pages/admin/Dashboard.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown,
  Image, 
  ShoppingBag, 
  Palette, 
  DollarSign,
  ArrowRight,
  Eye
} from 'lucide-react';
import { motion } from 'framer-motion';

const Dashboard = () => {
  // Sample data - would come from API
  const stats = [
    {
      label: 'Total Revenue',
      value: '$48,250',
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      color: 'bg-green-500'
    },
    {
      label: 'Artworks',
      value: '24',
      change: '+3',
      trend: 'up',
      icon: Image,
      color: 'bg-blue-500'
    },
    {
      label: 'Orders',
      value: '18',
      change: '+5',
      trend: 'up',
      icon: ShoppingBag,
      color: 'bg-purple-500'
    },
    {
      label: 'Commissions',
      value: '7',
      change: '+2',
      trend: 'up',
      icon: Palette,
      color: 'bg-amber-500'
    },
  ];

  const recentOrders = [
    { id: 'ORD-001', customer: 'Eleanor Whitmore', artwork: 'Ethereal Dreams', amount: 2500, status: 'completed', date: '2024-01-15' },
    { id: 'ORD-002', customer: 'James Mitchell', artwork: 'Urban Symphony', amount: 1800, status: 'processing', date: '2024-01-14' },
    { id: 'ORD-003', customer: 'Sarah Chen', artwork: 'Nature\'s Whisper', amount: 3200, status: 'pending', date: '2024-01-13' },
    { id: 'ORD-004', customer: 'Michael Ross', artwork: 'Abstract Emotions', amount: 2800, status: 'shipped', date: '2024-01-12' },
  ];

  const recentCommissions = [
    { id: 'COM-001', client: 'Victoria Adams', style: 'Realistic Portrait', status: 'in_progress', deadline: '2024-02-15' },
    { id: 'COM-002', client: 'Robert Blake', style: 'Abstract', status: 'pending', deadline: '2024-02-20' },
    { id: 'COM-003', client: 'Emma Wilson', style: 'Watercolor', status: 'reviewing', deadline: '2024-01-30' },
  ];

  const getStatusBadge = (status) => {
    const styles = {
      completed: 'bg-green-100 text-green-700',
      processing: 'bg-blue-100 text-blue-700',
      pending: 'bg-yellow-100 text-yellow-700',
      shipped: 'bg-purple-100 text-purple-700',
      in_progress: 'bg-blue-100 text-blue-700',
      reviewing: 'bg-amber-100 text-amber-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return styles[status] || 'bg-stone-100 text-stone-700';
  };

  const formatStatus = (status) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-8">
      {/* Welcome Message */}
      <div className="bg-gradient-to-r from-stone-900 to-stone-800 rounded-xl p-8 text-white">
        <h2 
          className="text-2xl mb-2"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Welcome back, Admin
        </h2>
        <p className="text-stone-400">
          Here's what's happening with your gallery today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon size={20} className="text-white" />
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium
                            ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {stat.trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                {stat.change}
              </div>
            </div>
            <p className="text-2xl font-bold text-stone-900 mb-1">{stat.value}</p>
            <p className="text-stone-500 text-sm">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-stone-200 flex items-center justify-between">
            <h3 
              className="text-lg text-stone-900"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Recent Orders
            </h3>
            <Link 
              to="/admin/orders"
              className="text-sm text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Order</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-stone-900">{order.id}</p>
                      <p className="text-sm text-stone-500">{order.artwork}</p>
                    </td>
                    <td className="px-6 py-4 text-stone-600">{order.customer}</td>
                    <td className="px-6 py-4 text-stone-900 font-medium">
                      ${order.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(order.status)}`}>
                        {formatStatus(order.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Commissions */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-stone-200 flex items-center justify-between">
            <h3 
              className="text-lg text-stone-900"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Active Commissions
            </h3>
            <Link 
              to="/admin/commissions"
              className="text-sm text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-stone-200">
            {recentCommissions.map((commission) => (
              <div key={commission.id} className="p-6 hover:bg-stone-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-stone-900">{commission.client}</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(commission.status)}`}>
                    {formatStatus(commission.status)}
                  </span>
                </div>
                <p className="text-sm text-stone-500 mb-2">{commission.style}</p>
                <p className="text-xs text-stone-400">Deadline: {commission.deadline}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
        <h3 
          className="text-lg text-stone-900 mb-6"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/admin/artworks/new"
            className="p-4 border border-stone-200 rounded-lg hover:border-amber-500 
                     hover:shadow-md transition-all text-center group"
          >
            <Image size={24} className="mx-auto mb-2 text-stone-400 group-hover:text-amber-600" />
            <p className="font-medium text-stone-900">Add Artwork</p>
          </Link>
          <Link
            to="/admin/orders"
            className="p-4 border border-stone-200 rounded-lg hover:border-amber-500 
                     hover:shadow-md transition-all text-center group"
          >
            <ShoppingBag size={24} className="mx-auto mb-2 text-stone-400 group-hover:text-amber-600" />
            <p className="font-medium text-stone-900">Manage Orders</p>
          </Link>
          <Link
            to="/admin/commissions"
            className="p-4 border border-stone-200 rounded-lg hover:border-amber-500 
                     hover:shadow-md transition-all text-center group"
          >
            <Palette size={24} className="mx-auto mb-2 text-stone-400 group-hover:text-amber-600" />
            <p className="font-medium text-stone-900">View Commissions</p>
          </Link>
          <Link
            to="/"
            target="_blank"
            className="p-4 border border-stone-200 rounded-lg hover:border-amber-500 
                     hover:shadow-md transition-all text-center group"
          >
            <Eye size={24} className="mx-auto mb-2 text-stone-400 group-hover:text-amber-600" />
            <p className="font-medium text-stone-900">View Website</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;