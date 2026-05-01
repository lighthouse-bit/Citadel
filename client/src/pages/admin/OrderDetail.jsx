// src/pages/admin/OrderDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Package, Truck, CheckCircle, XCircle,
  Clock, User, Mail, Phone, MapPin, CreditCard,
  Save, Loader, ExternalLink, ShoppingBag
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ordersAPI } from '../../services/api';

const OrderDetail = () => {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [order, setOrder]           = useState(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [isSaving, setIsSaving]     = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [notes, setNotes]           = useState('');

  // ── Status options matching your Prisma enum ──────────
  const statusOptions = [
    { value: 'PENDING',    label: 'Pending',    icon: Clock        },
    { value: 'CONFIRMED',  label: 'Confirmed',  icon: CheckCircle  },
    { value: 'PROCESSING', label: 'Processing', icon: Package      },
    { value: 'SHIPPED',    label: 'Shipped',    icon: Truck        },
    { value: 'DELIVERED',  label: 'Delivered',  icon: CheckCircle  },
    { value: 'COMPLETED',  label: 'Completed',  icon: CheckCircle  },
    { value: 'CANCELLED',  label: 'Cancelled',  icon: XCircle      },
  ];

  // ── Fetch order ───────────────────────────────────────
  useEffect(() => {
    const fetchOrder = async () => {
      setIsLoading(true);
      try {
        const response = await ordersAPI.getById(id);
        const data = response.data;
        setOrder(data);
        setTrackingNumber(data.trackingNumber || '');
        setNotes(data.internalNotes || '');
      } catch (error) {
        console.error('Error fetching order:', error);
        toast.error('Failed to load order details');
        navigate('/admin/orders');
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrder();
  }, [id, navigate]);

  // ── Update order status ───────────────────────────────
  const handleStatusChange = async (newStatus) => {
    const oldStatus = order.status;
    setOrder(prev => ({ ...prev, status: newStatus })); // optimistic

    try {
      await ordersAPI.updateStatus(id, { status: newStatus });
      toast.success(`Status updated to ${newStatus.replace('_', ' ').toLowerCase()}`);
    } catch (error) {
      setOrder(prev => ({ ...prev, status: oldStatus })); // revert
      toast.error('Failed to update status');
    }
  };

  // ── Save tracking + notes ─────────────────────────────
  const handleSaveDetails = async () => {
    setIsSaving(true);
    try {
      await ordersAPI.updateStatus(id, {
        trackingNumber,
        internalNotes: notes,
      });
      setOrder(prev => ({ ...prev, trackingNumber, internalNotes: notes }));
      toast.success('Order details saved');
    } catch (error) {
      toast.error('Failed to save details');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Style helpers ─────────────────────────────────────
  const getStatusStyle = (status) => {
    const styles = {
      PENDING:    'bg-yellow-100 text-yellow-800 border-yellow-200',
      CONFIRMED:  'bg-blue-100   text-blue-800   border-blue-200',
      PROCESSING: 'bg-purple-100 text-purple-800 border-purple-200',
      SHIPPED:    'bg-indigo-100 text-indigo-800 border-indigo-200',
      DELIVERED:  'bg-teal-100   text-teal-800   border-teal-200',
      COMPLETED:  'bg-green-100  text-green-800  border-green-200',
      CANCELLED:  'bg-red-100    text-red-800    border-red-200',
    };
    return styles[status] || 'bg-stone-100 text-stone-700 border-stone-200';
  };

  const getPaymentStyle = (paymentStatus) => {
    const styles = {
      UNPAID:     'bg-red-100    text-red-700',
      FULLY_PAID: 'bg-green-100  text-green-700',
      REFUNDED:   'bg-orange-100 text-orange-700',
    };
    return styles[paymentStatus] || 'bg-stone-100 text-stone-700';
  };

  const getPaymentLabel = (paymentStatus) => {
    const labels = {
      UNPAID:     'Unpaid',
      FULLY_PAID: 'Fully Paid',
      REFUNDED:   'Refunded',
    };
    return labels[paymentStatus] || paymentStatus?.replace('_', ' ');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader size={32} className="animate-spin text-amber-600" />
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="space-y-6 pb-12">

      {/* ── Page Header ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4
                      sticky top-0 bg-stone-100 z-10 py-4 border-b border-stone-200">
        <div>
          <button
            onClick={() => navigate('/admin/orders')}
            className="inline-flex items-center gap-2 text-stone-600 
                       hover:text-stone-900 transition-colors mb-2"
          >
            <ArrowLeft size={18} />
            Back to Orders
          </button>
          <h1 className="text-2xl text-stone-900 font-serif">
            Order #{order.orderNumber}
          </h1>
          <p className="text-stone-500 text-sm">
            Placed on {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Payment status */}
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1
                           ${getPaymentStyle(order.paymentStatus)}`}>
            <CreditCard size={12} />
            {getPaymentLabel(order.paymentStatus)}
          </span>
          {/* Order status */}
          <span className={`px-4 py-2 rounded-full text-sm font-medium border 
                           ${getStatusStyle(order.status)}`}>
            {order.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* ✅ Alert banner for unpaid orders */}
      {order.paymentStatus === 'UNPAID' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <CreditCard size={20} className="text-red-500 flex-shrink-0" />
          <div>
            <p className="text-red-800 font-medium text-sm">Payment Pending</p>
            <p className="text-red-600 text-xs mt-0.5">
              This order has not been paid yet. Total due: ${Number(order.total).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {order.paymentStatus === 'FULLY_PAID' && order.status === 'PENDING' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-amber-600 flex-shrink-0" />
          <div>
            <p className="text-amber-800 font-medium text-sm">Payment Received — Action Required</p>
            <p className="text-amber-600 text-xs mt-0.5">
              Payment confirmed. Please update the order status to begin processing.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── LEFT COLUMN ──────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Order Items */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-stone-200">
              <h2 className="text-lg font-semibold text-stone-900">
                Items ({order.items?.length || 0})
              </h2>
            </div>
            <div className="divide-y divide-stone-100">
              {order.items?.map((item) => (
                <div key={item.id} className="p-6 flex gap-4">
                  <div className="w-20 h-20 flex-shrink-0 bg-stone-100 rounded-lg overflow-hidden">
                    {item.artwork?.images?.[0]?.url ? (
                      <img
                        src={item.artwork.images[0].url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag size={24} className="text-stone-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-stone-900">{item.title}</h3>
                    {item.artwork && (
                      <p className="text-sm text-stone-500 mt-0.5">
                        {item.artwork.medium && `${item.artwork.medium} · `}
                        {item.artwork.width && item.artwork.height 
                          ? `${item.artwork.width}×${item.artwork.height} ${item.artwork.unit}` 
                          : ''}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-stone-900">
                      ${Number(item.price).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Order totals */}
            <div className="p-6 bg-stone-50 space-y-2 border-t border-stone-200">
              <div className="flex justify-between text-sm">
                <span className="text-stone-600">Subtotal</span>
                <span className="text-stone-900">${Number(order.subtotal).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-stone-600">Shipping</span>
                <span className="text-stone-900">
                  {Number(order.shippingCost) === 0 
                    ? 'Free' 
                    : `$${Number(order.shippingCost).toLocaleString()}`}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-stone-600">Tax</span>
                <span className="text-stone-900">${Number(order.tax).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold 
                              pt-4 border-t border-stone-200 mt-2">
                <span className="text-stone-900">Total</span>
                <span className="text-amber-700">${Number(order.total).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Update Status */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-2">Update Status</h2>
            <p className="text-stone-500 text-sm mb-4">
              Click a status to update the order immediately.
            </p>

            {/* Status flow */}
            <div className="bg-stone-50 rounded-lg p-3 mb-4">
              <div className="flex flex-wrap gap-2 text-xs">
                {['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'].map((s, i, arr) => (
                  <span key={s} className="flex items-center gap-1">
                    <span className={`px-2 py-0.5 rounded font-medium ${getStatusStyle(s)}`}>
                      {s.replace('_', ' ')}
                    </span>
                    {i < arr.length - 1 && <span className="text-stone-400">→</span>}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleStatusChange(option.value)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg 
                             border transition-all text-sm font-medium ${
                    order.status === option.value
                      ? 'bg-stone-900 text-white border-stone-900 shadow-md'
                      : option.value === 'CANCELLED'
                        ? 'bg-white text-red-600 border-red-200 hover:bg-red-50'
                        : 'bg-white text-stone-600 border-stone-200 hover:border-amber-500 hover:text-amber-700'
                  }`}
                >
                  <option.icon size={15} />
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Logistics & Notes */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">
              Logistics & Notes
            </h2>
            <div className="space-y-4">

              {/* Tracking number */}
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-2">
                  Tracking Number
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Enter tracking number"
                    className="flex-1 px-4 py-2.5 border border-stone-300 rounded-lg
                               focus:outline-none focus:border-amber-500 text-stone-900"
                  />
                  {trackingNumber && (
                    <a
                      href={`https://www.google.com/search?q=${trackingNumber}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 bg-stone-100 rounded-lg text-stone-600 
                                 hover:bg-stone-200 border border-stone-200 transition-colors"
                      title="Track Package"
                    >
                      <ExternalLink size={20} />
                    </a>
                  )}
                </div>
                {order.shippedAt && (
                  <p className="text-xs text-stone-400 mt-1">
                    Shipped on {new Date(order.shippedAt).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Internal notes */}
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-2">
                  Internal Notes
                  <span className="text-stone-400 font-normal ml-1">(admin only)</span>
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Private notes visible only to admins..."
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg
                             focus:outline-none focus:border-amber-500 
                             text-stone-900 resize-none"
                />
              </div>

              {/* Customer notes */}
              {order.customerNotes && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs font-medium text-amber-700 uppercase tracking-wider mb-1">
                    Customer Note
                  </p>
                  <p className="text-stone-700 text-sm">{order.customerNotes}</p>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleSaveDetails}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-stone-900 
                             text-white rounded-lg hover:bg-stone-800 transition-colors 
                             disabled:opacity-50"
                >
                  {isSaving ? (
                    <><Loader size={18} className="animate-spin" /> Saving...</>
                  ) : (
                    <><Save size={18} /> Save Details</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN ─────────────────────────────────── */}
        <div className="space-y-6">

          {/* Customer Info */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Customer</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <User size={20} className="text-amber-700" />
                </div>
                <div>
                  <p className="font-medium text-stone-900">
                    {order.customer?.firstName} {order.customer?.lastName}
                  </p>
                  <span className="text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                    Customer
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-stone-100 flex items-center gap-3 text-sm">
                <Mail size={16} className="text-stone-400 flex-shrink-0" />
                <a
                  href={`mailto:${order.customer?.email}`}
                  className="text-amber-600 hover:text-amber-700 hover:underline truncate"
                >
                  {order.customer?.email}
                </a>
              </div>
              {order.customer?.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone size={16} className="text-stone-400 flex-shrink-0" />
                  <span className="text-stone-600">{order.customer.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Shipping Address</h2>
            {order.shippingAddress ? (
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-stone-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-stone-600 leading-relaxed">
                  <p className="font-medium text-stone-900 mb-1">
                    {order.customer?.firstName} {order.customer?.lastName}
                  </p>
                  <p>{order.shippingAddress.line1}</p>
                  {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                  <p>
                    {order.shippingAddress.city}
                    {order.shippingAddress.state && `, ${order.shippingAddress.state}`}
                    {order.shippingAddress.postalCode && ` ${order.shippingAddress.postalCode}`}
                  </p>
                  <p className="uppercase text-stone-500 text-xs font-medium mt-1">
                    {order.shippingAddress.country}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-stone-400 text-sm italic">No shipping address provided</p>
            )}
          </div>

          {/* Payment Info */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Payment</h2>
            <div className="space-y-3">

              {/* Payment status */}
              <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                <span className="text-stone-600 text-sm">Status</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase 
                                 ${getPaymentStyle(order.paymentStatus)}`}>
                  {getPaymentLabel(order.paymentStatus)}
                </span>
              </div>

              {/* Stripe info */}
              <div className="flex items-center gap-3 text-sm">
                <CreditCard size={16} className="text-stone-400 flex-shrink-0" />
                <span className="text-stone-600">
                  {order.stripePaymentIntentId ? 'Processed via Stripe' : 'Manual Payment'}
                </span>
              </div>

              {order.stripePaymentIntentId && (
                <div className="p-3 bg-stone-50 rounded-lg">
                  <p className="text-xs text-stone-400 font-mono break-all">
                    {order.stripePaymentIntentId}
                  </p>
                </div>
              )}

              {/* Delivery dates */}
              {order.shippedAt && (
                <div className="text-xs text-stone-500 pt-2 border-t border-stone-100">
                  Shipped: {new Date(order.shippedAt).toLocaleDateString()}
                </div>
              )}
              {order.deliveredAt && (
                <div className="text-xs text-stone-500">
                  Delivered: {new Date(order.deliveredAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;