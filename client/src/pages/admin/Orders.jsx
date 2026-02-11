// client/src/pages/admin/Orders.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Eye, Package, Truck, CheckCircle, XCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const Orders = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Sample orders data
  const orders = [
    { 
      id: 'ORD-001', 
      customer: { name: 'Eleanor Whitmore', email: 'eleanor@email.com' },
      items: [{ title: 'Ethereal Dreams', price: 2500 }],
      total: 2500,
      status: 'completed',
      paymentStatus: 'paid',
      date: '2024-01-15',
      shippingAddress: '123 Art Lane, New York, NY 10001'
    },
    { 
      id: 'ORD-002', 
      customer: { name: 'James Mitchell', email: 'james@email.com' },
      items: [{ title: 'Urban Symphony', price: 1800 }],
      total: 1800,
      status: 'shipped',
      paymentStatus: 'paid',
      date: '2024-01-14',
      shippingAddress: '456 Gallery St, Los Angeles, CA 90001'
    },
    { 
      id: 'ORD-003', 
      customer: { name: 'Sarah Chen', email: 'sarah@email.com' },
      items: [{ title: 'Nature\'s Whisper', price: 3200 }],
      total: 3200,
      status: 'processing',
      paymentStatus: 'paid',
      date: '2024-01-13',
      shippingAddress: '789 Canvas Ave, Chicago, IL 60601'
    },
    { 
      id: 'ORD-004', 
      customer: { name: 'Michael Ross', email: 'michael@email.com' },
      items: [{ title: 'Abstract Emotions', price: 2800 }],
      total: 2800,
      status: 'pending',
      paymentStatus: 'pending',
      date: '2024-01-12',
      shippingAddress: '321 Brush Blvd, Miami, FL 33101'
    },
  ];

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !filterStatus || order.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle size={16} />;
      case 'shipped': return <Truck size={16} />;
      case 'processing': return <Package size={16} />;
      case 'pending': return <Clock size={16} />;
      case 'cancelled': return <XCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const getStatusStyle = (status) => {
    const styles = {
      completed: 'bg-green-100 text-green-700',
      shipped: 'bg-blue-100 text-blue-700',
      processing: 'bg-purple-100 text-purple-700',
      pending: 'bg-yellow-100 text-yellow-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return styles[status] || 'bg-stone-100 text-stone-700';
  };

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: orders.length, color: 'bg-stone-900' },
          { label: 'Pending', value: orders.filter(o => o.status === 'pending').length, color: 'bg-yellow-500' },
          { label: 'Processing', value: orders.filter(o => o.status === 'processing').length, color: 'bg-purple-500' },
          { label: 'Completed', value: orders.filter(o => o.status === 'completed').length, color: 'bg-green-500' },
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
              placeholder="Search orders..."
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
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-stone-500 uppercase">Order</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-stone-500 uppercase">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-stone-500 uppercase">Items</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-stone-500 uppercase">Total</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-stone-500 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-stone-500 uppercase">Date</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-stone-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {filteredOrders.map((order, index) => (
                <motion.tr 
                  key={order.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-stone-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <p className="font-medium text-stone-900">{order.id}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-stone-900">{order.customer.name}</p>
                    <p className="text-sm text-stone-500">{order.customer.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    {order.items.map((item, i) => (
                      <p key={i} className="text-stone-600">{item.title}</p>
                    ))}
                  </td>
                  <td className="px-6 py-4 font-medium text-stone-900">
                    ${order.total.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full 
                                   text-xs font-medium ${getStatusStyle(order.status)}`}>
                      {getStatusIcon(order.status)}
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-stone-600">{order.date}</td>
                  <td className="px-6 py-4">
                    <Link
                      to={`/admin/orders/${order.id}`}
                      className="p-2 hover:bg-stone-100 rounded-lg transition-colors 
                               text-stone-600 inline-flex"
                    >
                      <Eye size={18} />
                    </Link>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="p-12 text-center">
            <Package size={48} className="mx-auto text-stone-300 mb-4" />
            <p className="text-stone-500">No orders found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;