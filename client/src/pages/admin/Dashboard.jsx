// src/pages/admin/Dashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, Image as ImageIcon, ShoppingBag, 
  Palette, DollarSign, ArrowRight, Eye, Loader, CreditCard
} from 'lucide-react';
import { motion } from 'framer-motion';
import { dashboardAPI } from '../../services/api';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [data, setData]         = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await dashboardAPI.getStats();
        setData(response.data);
      } catch (error) {
        console.error('Dashboard error:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader size={32} className="animate-spin text-amber-600" />
      </div>
    );
  }

  const stats = data ? [
    { label: 'Total Revenue', value: `$${Number(data.stats.revenue).toLocaleString()}`, icon: DollarSign,  color: 'bg-green-500',  trend: '+12%' },
    { label: 'Artworks',      value: data.stats.artworks,                               icon: ImageIcon,   color: 'bg-blue-500',   trend: '+3'   },
    { label: 'Orders',        value: data.stats.orders,                                 icon: ShoppingBag, color: 'bg-purple-500', trend: '+5'   },
    { label: 'Commissions',   value: data.stats.commissions,                            icon: Palette,     color: 'bg-amber-500',  trend: '+2'   },
  ] : [];

  // ── Status badge for orders ───────────────────────────
  const getOrderStatusBadge = (status) => {
    const styles = {
      PENDING:    'bg-yellow-100 text-yellow-700',
      CONFIRMED:  'bg-blue-100   text-blue-700',
      PROCESSING: 'bg-blue-100   text-blue-700',
      SHIPPED:    'bg-purple-100 text-purple-700',
      DELIVERED:  'bg-green-100  text-green-700',
      CANCELLED:  'bg-red-100    text-red-700',
    };
    return styles[status] || 'bg-stone-100 text-stone-700';
  };

  // ── Status badge for commissions ──────────────────────
  const getCommissionStatusBadge = (status) => {
    const styles = {
      PENDING:     'bg-yellow-100 text-yellow-700',
      REVIEWING:   'bg-amber-100  text-amber-700',
      ACCEPTED:    'bg-blue-100   text-blue-700',
      IN_PROGRESS: 'bg-purple-100 text-purple-700',
      REVISION:    'bg-orange-100 text-orange-700',
      COMPLETED:   'bg-green-100  text-green-700',
      CANCELLED:   'bg-red-100    text-red-700',
    };
    return styles[status] || 'bg-stone-100 text-stone-700';
  };

  // ── Payment badge ─────────────────────────────────────
  const getPaymentBadge = (paymentStatus) => {
    const styles = {
      UNPAID:       'bg-red-100   text-red-600',
      DEPOSIT_PAID: 'bg-blue-100  text-blue-700',
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

  return (
    <div className="space-y-8">

      {/* Welcome */}
      <div className="bg-gradient-to-r from-stone-900 to-stone-800 rounded-xl p-8 text-white shadow-lg">
        <h2
          className="text-2xl mb-2"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Overview
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
              <div className={`p-3 rounded-lg ${stat.color} shadow-sm`}>
                <stat.icon size={20} className="text-white" />
              </div>
              <div className="flex items-center gap-1 text-sm font-medium text-green-600 
                              bg-green-50 px-2 py-0.5 rounded">
                <TrendingUp size={14} />
                {stat.trend}
              </div>
            </div>
            <p className="text-3xl font-bold text-stone-900 mb-1">{stat.value}</p>
            <p className="text-stone-500 text-sm font-medium">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-stone-200 flex items-center justify-between">
            <h3 className="text-lg text-stone-900 font-semibold">Recent Orders</h3>
            <Link
              to="/admin/orders"
              className="text-sm text-amber-600 hover:text-amber-700 flex items-center gap-1 font-medium"
            >
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full">
              <thead className="bg-stone-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Order</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {data?.recentOrders?.length > 0 ? (
                  data.recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-stone-50 transition-colors group">
                      <td className="px-6 py-4">
                        <Link to={`/admin/orders/${order.id}`} className="block">
                          <p className="font-medium text-stone-900 group-hover:text-amber-700 transition-colors text-sm">
                            {order.orderNumber}
                          </p>
                          <p className="text-xs text-stone-400 truncate max-w-[120px]">
                            {order.items?.[0]?.artwork?.title || 'Unknown Item'}
                          </p>
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-stone-600">
                        <p>{order.customer?.firstName} {order.customer?.lastName}</p>
                        {/* ✅ Payment status on orders */}
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium
                                         ${getPaymentBadge(order.paymentStatus)}`}>
                          {getPaymentLabel(order.paymentStatus)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-stone-900 font-medium">
                        ${Number(order.total).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase 
                                         ${getOrderStatusBadge(order.status)}`}>
                          {formatStatus(order.status)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-stone-500 text-sm">
                      No recent orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Commissions */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-stone-200 flex items-center justify-between">
            <h3 className="text-lg text-stone-900 font-semibold">Recent Commissions</h3>
            <Link
              to="/admin/commissions"
              className="text-sm text-amber-600 hover:text-amber-700 flex items-center gap-1 font-medium"
            >
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-stone-100 flex-1">
            {data?.recentCommissions?.length > 0 ? (
              data.recentCommissions.map((commission) => (
                <Link
                  key={commission.id}
                  to={`/admin/commissions/${commission.id}`}
                  className="block p-5 hover:bg-stone-50 transition-colors group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-stone-900 group-hover:text-amber-700 
                                   transition-colors text-sm">
                        {commission.customer?.firstName} {commission.customer?.lastName}
                      </p>
                      <p className="text-xs text-stone-500">{commission.artStyle} · {commission.size}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {/* Commission status */}
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase 
                                       ${getCommissionStatusBadge(commission.status)}`}>
                        {formatStatus(commission.status)}
                      </span>
                      {/* ✅ Payment status */}
                      <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1
                                       ${getPaymentBadge(commission.paymentStatus)}`}>
                        <CreditCard size={9} />
                        {getPaymentLabel(commission.paymentStatus)}
                      </span>
                    </div>
                  </div>

                  {/* Price info */}
                  {commission.finalPrice && (
                    <div className="text-xs text-stone-500 mt-1">
                      Total: <span className="font-medium text-stone-700">
                        ${Number(commission.finalPrice).toLocaleString()}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-xs text-stone-400 mt-2">
                    <span>{new Date(commission.createdAt).toLocaleDateString()}</span>
                    <span>
                      {commission.deadline 
                        ? `Due: ${new Date(commission.deadline).toLocaleDateString()}`
                        : 'No deadline'
                      }
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center text-stone-500 text-sm">
                No recent commissions found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-stone-900 mb-6">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { to: '/admin/artworks/new', icon: ImageIcon,   label: 'Add Artwork'     },
            { to: '/admin/orders',       icon: ShoppingBag, label: 'Manage Orders'   },
            { to: '/admin/commissions',  icon: Palette,     label: 'View Requests'   },
            { to: '/',  target: '_blank', icon: Eye,        label: 'View Website'    },
          ].map((action) => (
            <Link
              key={action.label}
              to={action.to}
              target={action.target}
              className="p-4 border border-stone-200 rounded-lg hover:border-amber-500
                         hover:shadow-md transition-all text-center group bg-stone-50 hover:bg-white"
            >
              <action.icon size={24} className="mx-auto mb-2 text-stone-400 
                                                group-hover:text-amber-600 transition-colors" />
              <p className="font-medium text-stone-900 text-sm">{action.label}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;