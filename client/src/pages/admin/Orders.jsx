// src/pages/admin/Orders.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, Eye, Package, Truck, CheckCircle, 
  XCircle, Clock, Loader, CreditCard, ShoppingBag, RefreshCw,
  Download, AlertTriangle, ChevronLeft, ChevronRight
} from 'lucide-react';
import { motion as Motion } from 'framer-motion';
import { ordersAPI } from '../../services/api';
import toast from 'react-hot-toast';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('PROCESSING');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [stalledOnly, setStalledOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const response = await ordersAPI.getAll({ 
        status: filterStatus || undefined,
        paymentStatus: paymentStatus || undefined,
        search: searchQuery || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        stalled: stalledOnly || undefined,
        page,
        limit: 20,
      });
      setOrders(response.data.orders || response.data);
      setPagination(response.data.pagination || { page: 1, pages: 1, total: response.data.orders?.length || 0 });
      setSelectedIds([]);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Orders load failed', error);
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load and filter change
  useEffect(() => {
    fetchOrders();
  }, [filterStatus, paymentStatus, searchQuery, dateFrom, dateTo, stalledOnly, page]);

  // Auto-refresh every 8 seconds
  useEffect(() => {
    const interval = setInterval(fetchOrders, 8000);
    return () => clearInterval(interval);
  }, [filterStatus, paymentStatus, searchQuery, dateFrom, dateTo, stalledOnly, page]);

  const handleBulkUpdate = async () => {
    if (!selectedIds.length || !window.confirm(`Update ${selectedIds.length} orders to ${bulkStatus}? Shipping, delivery, and cancellation must be handled individually.`)) return;
    try { await ordersAPI.bulkUpdateStatus(selectedIds, bulkStatus); toast.success('Orders updated'); fetchOrders(); } catch { toast.error('Bulk update failed'); }
  };

  const handleExport = async () => {
    try { const response = await ordersAPI.exportCsv(); const url = URL.createObjectURL(response.data); const link = document.createElement('a'); link.href = url; link.download = `orders-${new Date().toISOString().slice(0,10)}.csv`; link.click(); URL.revokeObjectURL(url); } catch { toast.error('Export failed'); }
  };

  // Client-side search
  const filteredOrders = orders.filter(order => {
    const query = searchQuery.toLowerCase();
    return (
      order.orderNumber?.toLowerCase().includes(query) ||
      order.customer?.email?.toLowerCase().includes(query) ||
      order.customer?.firstName?.toLowerCase().includes(query) ||
      order.customer?.lastName?.toLowerCase().includes(query)
    );
  });

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

  if (isLoading && orders.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <Loader size={32} className="animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1
            className="text-2xl text-stone-900"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Orders
          </h1>
          <p className="text-stone-500">Last updated: {lastUpdated.toLocaleTimeString()}</p>
        </div>
        <div className="flex gap-2"><button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg"><Download size={16}/>Export CSV</button><button onClick={fetchOrders} className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"><RefreshCw size={16}/>Refresh</button></div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total',      value: orders.length,                                          color: 'bg-stone-900'  },
          { label: 'Pending',    value: orders.filter(o => o.status === 'PENDING').length,      color: 'bg-yellow-500' },
          { label: 'Confirmed',  value: orders.filter(o => o.status === 'CONFIRMED').length,    color: 'bg-blue-500'   },
          { label: 'Processing', value: orders.filter(o => o.status === 'PROCESSING').length,   color: 'bg-purple-500' },
          { label: 'Paid',       value: orders.filter(o => o.paymentStatus === 'FULLY_PAID').length, color: 'bg-green-500' },
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
          <select value={paymentStatus} onChange={e=>setPaymentStatus(e.target.value)} className="px-4 py-2 border border-stone-300 rounded-lg">
            <option value="">All Payments</option><option value="UNPAID">Unpaid</option><option value="FULLY_PAID">Paid</option><option value="REFUNDED">Refunded</option>
          </select>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="px-3 py-2 border rounded-lg" title="From date"/>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="px-3 py-2 border rounded-lg" title="To date"/>
          <label className="flex items-center gap-2 px-3 text-sm"><input type="checkbox" checked={stalledOnly} onChange={e=>setStalledOnly(e.target.checked)}/>Stalled only</label>
        </div>
      </div>

      {selectedIds.length > 0 && <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3"><b>{selectedIds.length} selected</b><select value={bulkStatus} onChange={e=>setBulkStatus(e.target.value)} className="border rounded-lg px-3 py-2"><option value="PENDING">Pending</option><option value="CONFIRMED">Confirmed</option><option value="PROCESSING">Processing</option></select><button onClick={handleBulkUpdate} className="bg-stone-900 text-white px-4 py-2 rounded-lg">Apply status</button></div>}

      {/* Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="px-4 py-4"><input type="checkbox" checked={orders.length>0&&selectedIds.length===orders.length} onChange={e=>setSelectedIds(e.target.checked?orders.map(o=>o.id):[])}/></th>
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
                  <Motion.tr
                    key={order.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className="hover:bg-stone-50 transition-colors"
                  >
                    <td className="px-4"><input type="checkbox" checked={selectedIds.includes(order.id)} onChange={e=>setSelectedIds(ids=>e.target.checked?[...ids,order.id]:ids.filter(id=>id!==order.id))}/></td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-stone-900 text-sm">
                        {order.orderNumber}
                      </p>
                      {order.isStalled && <span className="inline-flex items-center gap-1 text-xs text-red-600 mt-1"><AlertTriangle size={12}/>Stalled</span>}
                      <p className="text-xs text-stone-400 mt-0.5">
                        {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-stone-900 text-sm font-medium">
                        {order.customer?.firstName} {order.customer?.lastName}
                      </p>
                      <p className="text-xs text-stone-400">{order.customer?.email}</p>
                    </td>

                    <td className="px-6 py-4 font-semibold text-stone-900">
                      ${Number(order.total).toLocaleString()}
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full 
                                       text-xs font-medium ${getPaymentStyle(order.paymentStatus)}`}>
                        <CreditCard size={11} />
                        {getPaymentLabel(order.paymentStatus)}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 
                                       rounded-full text-xs font-medium 
                                       ${getStatusStyle(order.status)}`}>
                        {getStatusIcon(order.status)}
                        {formatStatus(order.status)}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-stone-500 text-sm">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>

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
                  </Motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-16 text-center">
                    <ShoppingBag size={40} className="mx-auto text-stone-300 mb-3" />
                    <p className="text-stone-500">No orders found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex items-center justify-between"><p className="text-sm text-stone-500">{pagination.total} orders</p><div className="flex items-center gap-2"><button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="p-2 border rounded disabled:opacity-40"><ChevronLeft size={17}/></button><span className="text-sm">Page {pagination.page} of {pagination.pages || 1}</span><button disabled={page>=pagination.pages} onClick={()=>setPage(p=>p+1)} className="p-2 border rounded disabled:opacity-40"><ChevronRight size={17}/></button></div></div>
    </div>
  );
};

export default Orders;
