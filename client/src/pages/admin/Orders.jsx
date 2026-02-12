import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Eye, Package, Truck, CheckCircle, XCircle, Clock, Loader } from 'lucide-react';
import { motion } from 'framer-motion';
import { ordersAPI } from '../../services/api';
import toast from 'react-hot-toast';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        const response = await ordersAPI.getAll({ status: filterStatus || undefined });
        setOrders(response.data.orders);
      } catch (error) {
        console.error("Orders load failed", error);
        toast.error('Failed to load orders');
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, [filterStatus]);

  const filteredOrders = orders.filter(order => {
    const query = searchQuery.toLowerCase();
    return (
      order.orderNumber.toLowerCase().includes(query) ||
      order.customer?.email?.toLowerCase().includes(query) ||
      order.customer?.firstName?.toLowerCase().includes(query)
    );
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle size={16} />;
      case 'SHIPPED': return <Truck size={16} />;
      case 'PROCESSING': return <Package size={16} />;
      case 'PENDING': return <Clock size={16} />;
      case 'CANCELLED': return <XCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const getStatusStyle = (status) => {
    const styles = {
      COMPLETED: 'bg-green-100 text-green-700',
      SHIPPED: 'bg-blue-100 text-blue-700',
      PROCESSING: 'bg-purple-100 text-purple-700',
      PENDING: 'bg-yellow-100 text-yellow-700',
      CANCELLED: 'bg-red-100 text-red-700',
    };
    return styles[status] || 'bg-stone-100 text-stone-700';
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader className="animate-spin text-amber-600" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl text-stone-900" style={{ fontFamily: "'Playfair Display', serif" }}>
          Orders
        </h1>
        <p className="text-stone-500">Manage and track all orders</p>
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
              className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-amber-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-amber-500 text-stone-700"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="SHIPPED">Shipped</option>
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
                <th className="px-6 py-4 text-left text-xs font-medium text-stone-500 uppercase">Order</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-stone-500 uppercase">Customer</th>
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
                    <p className="font-medium text-stone-900">{order.orderNumber}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-stone-900">{order.customer?.firstName} {order.customer?.lastName}</p>
                    <p className="text-xs text-stone-500">{order.customer?.email}</p>
                  </td>
                  <td className="px-6 py-4 font-medium text-stone-900">
                    ${Number(order.total).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(order.status)}`}>
                      {getStatusIcon(order.status)}
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-stone-600 text-sm">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      to={`/admin/orders/${order.id}`}
                      className="p-2 hover:bg-stone-100 rounded-lg transition-colors text-stone-600 inline-flex"
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
          <div className="p-12 text-center text-stone-500">No orders found</div>
        )}
      </div>
    </div>
  );
};

export default Orders;