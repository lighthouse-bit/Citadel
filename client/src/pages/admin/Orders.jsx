// src/pages/admin/Orders.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, Eye, Package, Truck, CheckCircle, 
  XCircle, Clock, Loader, CreditCard, ShoppingBag
} from 'lucide-react';
import { motion } from 'framer-motion';
import { ordersAPI } from '../../services/api';
import toast from 'react-hot-toast';

const Orders = () => {
  const [orders, setOrders]           = useState([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        const response = await ordersAPI.getAll({ 
          status: filterStatus || undefined 
        });
        setOrders(response.data.orders);
      } catch (error) {
        console.error('Orders load failed', error);
        toast.error('Failed to load orders');
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, [filterStatus]);

  // ── Client-side search ────────────────────────────────
  const filteredOrders = orders.filter(order => {
    const query = searchQuery.toLowerCase();
    return (
      order.orderNumber?.toLowerCase().includes(query) ||
      order.customer?.email?.toLowerCase().includes(query) ||
      order.customer?.firstName?.toLowerCase().includes(query) ||
      order.customer?.lastName?.toLowerCase().includes(query)
    );
  });

  // ── Status icon ───────────────────────────────────────
  const getStatusIcon = (status) => {
    switch (status) {
      case 'COMPLETED':  return <CheckCircle size={14} />;
      case 'DELIVERED':  return <CheckCircle size={14} />;
      case 'SHIPPED':    return <Truck size={14} />;
      case 'PROCESSING': return <Package size={14} />;
      case 'CONFIRMED':  return <Package size={14} />;
      case 'PENDING':    return <Clock size={14} />;
      case 'CANCELLED':  return <XCircle size={14} />;
      default:           return <Clock size={14} />;
    }
  };

  // ── Order status style ────────────────────────────────
  const getStatusStyle = (status) => {
    const styles = {
      PENDING:    'bg-yellow-100 text-yellow-700',
      CONFIRMED:  'bg-blue-100   text-blue-700',
      PROCESSING: 'bg-purple-100 text-purple-700',
      SHIPPED:    'bg-indigo-100 text-indigo-700',
      DELIVERED:  'bg-teal-100   text-teal-700',
      COMPLETED:  'bg-green-100  text-green-700',
      CANCELLED:  'bg-red-100    text-red-700',
    };
    return styles[status] || 'bg-stone-100 text-stone-700';
  };

  // ── Payment status style ──────────────────────────────
  const getPaymentStyle = (paymentStatus) => {
    const styles = {
      UNPAID:     'bg-red-100   text-red-600',
      FULLY_PAID: 'bg-green-100 text-green-700',
      REFUNDED:   'bg-orange-100 text-orange-700',
    };
    return styles[paymentStatus] || 'bg-stone-100 text-stone-600';
  };

  const getPaymentLabel = (paymentStatus) => {
    const labels = {
      UNPAID:     'Unpaid',
      FULLY_PAID: 'Paid',
      REFUNDED:   'Refunded',
    };
    return labels[paymentStatus] || paymentStatus;
  };

  const formatStatus = (status) =>
    status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || '';

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
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
          Orders
        </h1>
        <p className="text-stone-500">Manage and track all orders</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total',      value: orders.length,                                          color: 'bg-stone-900'  },
          { label: 'Pending',    value: orders.filter(o => o.status === 'PENDING').length,      color: 'bg-yellow-500' },
          { label: 'Processing', value: orders.filter(o => o.status === 'PROCESSING').length,   color: 'bg-purple-500' },
          { label: 'Shipped',    value: orders.filter(o => o.status === 'SHIPPED').length,      color: 'bg-indigo-500' },
          { label: 'Completed',  value: orders.filter(o => o.status === 'COMPLETED').length,    color: 'bg-green-500'  },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl border border-stone-200 p-4">
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
              placeholder="Search by order number, name or email..."
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
            <option value="CONFIRMED">Confirmed</option>
            <option value="PROCESSING">Processing</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider">Order</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider">Payment</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order, index) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className="hover:bg-stone-50 transition-colors"
                  >
                    {/* Order number */}
                    <td className="px-6 py-4">
                      <p className="font-medium text-stone-900 text-sm">
                        {order.orderNumber}
                      </p>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
                      </p>
                    </td>

                    {/* Customer */}
                    <td className="px-6 py-4">
                      <p className="text-stone-900 text-sm font-medium">
                        {order.customer?.firstName} {order.customer?.lastName}
                      </p>
                      <p className="text-xs text-stone-400">{order.customer?.email}</p>
                    </td>

                    {/* Total */}
                    <td className="px-6 py-4 font-semibold text-stone-900">
                      ${Number(order.total).toLocaleString()}
                    </td>

                    {/* ✅ Payment status */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full 
                                       text-xs font-medium ${getPaymentStyle(order.paymentStatus)}`}>
                        <CreditCard size={11} />
                        {getPaymentLabel(order.paymentStatus)}
                      </span>
                    </td>

                    {/* Order status */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 
                                       rounded-full text-xs font-medium 
                                       ${getStatusStyle(order.status)}`}>
                        {getStatusIcon(order.status)}
                        {formatStatus(order.status)}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 text-stone-500 text-sm">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className="p-2 hover:bg-amber-50 hover:text-amber-700 rounded-lg 
                                   transition-colors text-stone-500 inline-flex"
                        title="View order"
                      >
                        <Eye size={18} />
                      </Link>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-16 text-center">
                    <ShoppingBag size={40} className="mx-auto text-stone-300 mb-3" />
                    <p className="text-stone-500">No orders found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Orders;