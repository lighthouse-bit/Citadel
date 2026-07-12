// src/pages/admin/OrderDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Package, Truck, CheckCircle, XCircle,
  Clock, User, Mail, Phone, MapPin, CreditCard,
  Save, Loader, ExternalLink, ShoppingBag, Send,
  Globe, Printer, FileText, RefreshCw, Ban,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ordersAPI } from '../../services/api';

const OrderDetail = () => {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [order, setOrder]             = useState(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [isSaving, setIsSaving]       = useState(false);
  const [isShipping, setIsShipping]   = useState(false);
  const [actionLoading, setActionLoading] = useState('');

  const [shipping, setShipping] = useState({
    carrier:           '',
    trackingNumber:    '',
    trackingUrl:       '',
    estimatedDelivery: '',
  });
  const [notes, setNotes] = useState('');

  const statusOptions = [
    { value: 'PENDING',    label: 'Pending',    icon: Clock        },
    { value: 'CONFIRMED',  label: 'Confirmed',  icon: CheckCircle  },
    { value: 'PROCESSING', label: 'Processing', icon: Package      },
    { value: 'SHIPPED',    label: 'Shipped',    icon: Truck        },
    { value: 'DELIVERED',  label: 'Delivered',  icon: CheckCircle  },
    { value: 'COMPLETED',  label: 'Completed',  icon: CheckCircle  },
    { value: 'CANCELLED',  label: 'Cancelled',  icon: XCircle      },
  ];

  const carriers = [
    { value: '',              label: 'Select carrier...', urlPattern: '' },
    { value: 'DHL',           label: 'DHL Express',       urlPattern: 'https://www.dhl.com/track?trackingNumber=' },
    { value: 'FedEx',         label: 'FedEx',             urlPattern: 'https://www.fedex.com/fedextrack/?trknbr=' },
    { value: 'UPS',           label: 'UPS',               urlPattern: 'https://www.ups.com/track?tracknum=' },
    { value: 'USPS',          label: 'USPS',              urlPattern: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=' },
    { value: 'NIPOST',        label: 'NIPOST (Nigeria)',  urlPattern: '' },
    { value: 'GIG Logistics', label: 'GIG Logistics',     urlPattern: 'https://gigl-go.com/Tracking/' },
    { value: 'Kwik Delivery', label: 'Kwik Delivery',     urlPattern: '' },
    { value: 'Sendbox',       label: 'Sendbox',           urlPattern: 'https://web.sendbox.co/track?tracking_code=' },
    { value: 'ABC Transport', label: 'ABC Transport',     urlPattern: '' },
    { value: 'TopShip',       label: 'TopShip',           urlPattern: '' },
    { value: 'Other',         label: 'Other',             urlPattern: '' },
  ];

  useEffect(() => {
    const fetchOrder = async () => {
      setIsLoading(true);
      try {
        const response = await ordersAPI.getById(id);
        const data = response.data;
        setOrder(data);
        setShipping({
          carrier:           data.carrier        || '',
          trackingNumber:    data.trackingNumber || '',
          trackingUrl:       data.trackingUrl    || '',
          estimatedDelivery: data.estimatedDelivery
            ? new Date(data.estimatedDelivery).toISOString().split('T')[0]
            : '',
        });
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

  useEffect(() => {
    if (shipping.carrier && shipping.trackingNumber) {
      const carrierInfo = carriers.find(c => c.value === shipping.carrier);
      if (carrierInfo?.urlPattern && !shipping.trackingUrl) {
        setShipping(prev => ({
          ...prev,
          trackingUrl: `${carrierInfo.urlPattern}${shipping.trackingNumber}`,
        }));
      }
    }
  }, [shipping.carrier, shipping.trackingNumber]);

  const handleStatusChange = async (newStatus) => {
    const oldStatus = order.status;
    setOrder(prev => ({ ...prev, status: newStatus }));

    try {
      await ordersAPI.updateStatus(id, { status: newStatus });
      const msg = newStatus === 'SHIPPED' || newStatus === 'DELIVERED'
        ? `Status updated to ${newStatus.toLowerCase()} — customer notified`
        : `Status updated to ${newStatus.replace('_', ' ').toLowerCase()}`;
      toast.success(msg);
    } catch {
      setOrder(prev => ({ ...prev, status: oldStatus }));
      toast.error('Failed to update status');
    }
  };

  const handleSaveShipping = async () => {
    setIsSaving(true);
    try {
      await ordersAPI.updateStatus(id, {
        carrier:           shipping.carrier,
        trackingNumber:    shipping.trackingNumber,
        trackingUrl:       shipping.trackingUrl,
        estimatedDelivery: shipping.estimatedDelivery || null,
        internalNotes:     notes,
      });
      setOrder(prev => ({
        ...prev,
        carrier:           shipping.carrier,
        trackingNumber:    shipping.trackingNumber,
        trackingUrl:       shipping.trackingUrl,
        estimatedDelivery: shipping.estimatedDelivery,
        internalNotes:     notes,
      }));
      toast.success('Shipping details saved');
    } catch {
      toast.error('Failed to save details');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkAsShipped = async () => {
    if (!shipping.carrier) {
      toast.error('Please select a carrier first');
      return;
    }
    if (!shipping.trackingNumber) {
      toast.error('Please enter a tracking number');
      return;
    }

    if (!window.confirm('Mark as shipped and notify customer via email?')) return;

    setIsShipping(true);
    try {
      await ordersAPI.updateStatus(id, {
        status:            'SHIPPED',
        carrier:           shipping.carrier,
        trackingNumber:    shipping.trackingNumber,
        trackingUrl:       shipping.trackingUrl,
        estimatedDelivery: shipping.estimatedDelivery || null,
      });

      setOrder(prev => ({
        ...prev,
        status:            'SHIPPED',
        shippedAt:         new Date().toISOString(),
        carrier:           shipping.carrier,
        trackingNumber:    shipping.trackingNumber,
        trackingUrl:       shipping.trackingUrl,
        estimatedDelivery: shipping.estimatedDelivery,
      }));

      toast.success('Order shipped — customer notified by email!');
    } catch {
      toast.error('Failed to mark as shipped');
    } finally {
      setIsShipping(false);
    }
  };

  const handleResend = async (type) => {
    try { setActionLoading(type); await ordersAPI.resendEmail(id, type); toast.success(`${type === 'shipping' ? 'Shipping email' : 'Invoice'} sent`); } catch (error) { toast.error(error.response?.data?.error || 'Email failed'); } finally { setActionLoading(''); }
  };

  const handleCancel = async () => {
    const reason = window.prompt('Enter the cancellation reason:'); if (!reason) return;
    if (!window.confirm('Cancel this order? Paid orders will still require a manual refund.')) return;
    try { setActionLoading('cancel'); const { data } = await ordersAPI.cancel(id, reason); setOrder(prev=>({...prev,status:'CANCELLED'})); toast.success(data.requiresRefund ? 'Cancelled — refund review required' : 'Order cancelled'); } catch (error) { toast.error(error.response?.data?.error || 'Cancellation failed'); } finally { setActionLoading(''); }
  };

  const handlePrint = (type) => { const previous = document.title; document.title = `${type}-${order.orderNumber}`; window.print(); document.title = previous; };

  const getStatusStyle = (status) => {
    const styles = {
      PENDING:    'bg-yellow-100 text-yellow-800 border-yellow-200',
      CONFIRMED:  'bg-blue-100 text-blue-800 border-blue-200',
      PROCESSING: 'bg-purple-100 text-purple-800 border-purple-200',
      SHIPPED:    'bg-indigo-100 text-indigo-800 border-indigo-200',
      DELIVERED:  'bg-teal-100 text-teal-800 border-teal-200',
      COMPLETED:  'bg-green-100 text-green-800 border-green-200',
      CANCELLED:  'bg-red-100 text-red-800 border-red-200',
    };
    return styles[status] || 'bg-stone-100 text-stone-700 border-stone-200';
  };

  const getPaymentStyle = (paymentStatus) => {
    const styles = {
      UNPAID:     'bg-red-100 text-red-700',
      FULLY_PAID: 'bg-green-100 text-green-700',
      REFUNDED:   'bg-orange-100 text-orange-700',
    };
    return styles[paymentStatus] || 'bg-stone-100 text-stone-700';
  };

  const getPaymentLabel = (paymentStatus) => ({
    UNPAID:     'Unpaid',
    FULLY_PAID: 'Fully Paid',
    REFUNDED:   'Refunded',
  }[paymentStatus] || paymentStatus?.replace('_', ' '));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader size={32} className="animate-spin text-amber-600" />
      </div>
    );
  }

  if (!order) return null;

  const isShipped = ['SHIPPED', 'DELIVERED', 'COMPLETED'].includes(order.status);

  return (
    <div className="print-order space-y-6 pb-12">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sticky top-0 bg-stone-100 z-10 py-4 border-b border-stone-200">
        <div>
          <button
            onClick={() => navigate('/admin/orders')}
            className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900 transition-colors mb-2"
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
          <button onClick={()=>handlePrint('invoice')} className="px-3 py-2 bg-white border rounded-lg text-sm flex gap-2"><FileText size={15}/>Invoice</button>
          <button onClick={()=>handlePrint('packing-slip')} className="px-3 py-2 bg-white border rounded-lg text-sm flex gap-2"><Printer size={15}/>Packing slip</button>
          <button disabled={!!actionLoading} onClick={()=>handleResend('invoice')} className="px-3 py-2 bg-white border rounded-lg text-sm flex gap-2"><RefreshCw size={15}/>Resend invoice</button>
          {isShipped && <button disabled={!!actionLoading} onClick={()=>handleResend('shipping')} className="px-3 py-2 bg-white border rounded-lg text-sm flex gap-2"><Send size={15}/>Resend shipping</button>}
          {!['SHIPPED','DELIVERED','CANCELLED'].includes(order.status) && <button disabled={!!actionLoading} onClick={handleCancel} className="px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm flex gap-2"><Ban size={15}/>Cancel</button>}
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 ${getPaymentStyle(order.paymentStatus)}`}>
            <CreditCard size={12} />
            {getPaymentLabel(order.paymentStatus)}
          </span>
          <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusStyle(order.status)}`}>
            {order.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Alert Banners */}
      {order.paymentStatus === 'UNPAID' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <CreditCard size={20} className="text-red-500 flex-shrink-0" />
          <div>
            <p className="text-red-800 font-medium text-sm">Payment Pending</p>
            <p className="text-red-600 text-xs mt-0.5">
              Total due: ${Number(order.total).toLocaleString()}
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
              Update the order status to begin processing.
            </p>
          </div>
        </div>
      )}

      {order.status === 'SHIPPED' && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center gap-3">
          <Truck size={20} className="text-indigo-600 flex-shrink-0" />
          <div>
            <p className="text-indigo-800 font-medium text-sm">Order Shipped — Customer Notified</p>
            <p className="text-indigo-600 text-xs mt-0.5">
              Shipped on {new Date(order.shippedAt).toLocaleDateString()}
              {order.trackingNumber && ` · Tracking: ${order.trackingNumber}`}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN */}
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

            <div className="p-6 bg-stone-50 space-y-2 border-t border-stone-200">
              <div className="flex justify-between text-sm">
                <span className="text-stone-600">Subtotal</span>
                <span className="text-stone-900">${Number(order.subtotal).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-stone-600">
                  Shipping
                  {order.shippingZone && (
                    <span className="text-stone-400 text-xs ml-1">
                      ({order.shippingZone})
                    </span>
                  )}
                </span>
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
              <div className="flex justify-between text-lg font-semibold pt-4 border-t border-stone-200 mt-2">
                <span className="text-stone-900">Total</span>
                <span className="text-amber-700">${Number(order.total).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* ── SHIPPING & TRACKING ──────────────────────── */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
                  <Truck size={20} className="text-amber-600" />
                  Shipping & Tracking
                </h2>
                <p className="text-stone-500 text-sm mt-1">
                  Add carrier and tracking, then notify customer
                </p>
              </div>
              {isShipped && (
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                  <CheckCircle size={12} />
                  Customer Notified
                </span>
              )}
            </div>

            <div className="space-y-4">
              {/* Carrier */}
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-2">
                  Carrier
                </label>
                <select
                  value={shipping.carrier}
                  onChange={(e) => setShipping({ ...shipping, carrier: e.target.value })}
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:outline-none focus:border-amber-500 bg-white"
                >
                  {carriers.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Tracking Number */}
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-2">
                  Tracking Number
                </label>
                <input
                  type="text"
                  value={shipping.trackingNumber}
                  onChange={(e) => setShipping({ ...shipping, trackingNumber: e.target.value })}
                  placeholder="Enter tracking number"
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              {/* Tracking URL */}
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-2">
                  Tracking URL
                  <span className="text-stone-400 font-normal text-xs ml-1">
                    (auto-filled)
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={shipping.trackingUrl}
                    onChange={(e) => setShipping({ ...shipping, trackingUrl: e.target.value })}
                    placeholder="https://..."
                    className="flex-1 px-4 py-2.5 border border-stone-300 rounded-lg focus:outline-none focus:border-amber-500"
                  />
                  {shipping.trackingUrl && (
                    <a
                      href={shipping.trackingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 bg-stone-100 rounded-lg text-stone-600 hover:bg-stone-200 border border-stone-200 transition-colors"
                      title="Test tracking link"
                    >
                      <ExternalLink size={20} />
                    </a>
                  )}
                </div>
              </div>

              {/* Estimated Delivery */}
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-2">
                  Estimated Delivery Date
                </label>
                <input
                  type="date"
                  value={shipping.estimatedDelivery}
                  onChange={(e) => setShipping({ ...shipping, estimatedDelivery: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-stone-100">
                <button
                  onClick={handleSaveShipping}
                  disabled={isSaving}
                  className="flex-1 px-6 py-3 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <><Loader size={18} className="animate-spin" /> Saving...</>
                  ) : (
                    <><Save size={18} /> Save Only</>
                  )}
                </button>

                {!isShipped && (
                  <button
                    onClick={handleMarkAsShipped}
                    disabled={isShipping || !shipping.carrier || !shipping.trackingNumber}
                    className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isShipping ? (
                      <><Loader size={18} className="animate-spin" /> Sending...</>
                    ) : (
                      <><Send size={18} /> Mark as Shipped + Notify</>
                    )}
                  </button>
                )}
              </div>

              {(!shipping.carrier || !shipping.trackingNumber) && !isShipped && (
                <p className="text-xs text-stone-400 text-center">
                  💡 Enter carrier and tracking number to mark as shipped
                </p>
              )}
            </div>
          </div>

          {/* Update Status */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-2">Update Status</h2>
            <p className="text-stone-500 text-sm mb-4">
              Click a status to update. "Shipped" and "Delivered" will email the customer.
            </p>

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
              {statusOptions.map((option) => {
                const isActive = order.status === option.value;
                const isCancel = option.value === 'CANCELLED';
                let btnClass = 'bg-white text-stone-600 border-stone-200 hover:border-amber-500 hover:text-amber-700';
                if (isActive) btnClass = 'bg-stone-900 text-white border-stone-900 shadow-md';
                else if (isCancel) btnClass = 'bg-white text-red-600 border-red-200 hover:bg-red-50';

                return (
                  <button
                    key={option.value}
                    onClick={() => handleStatusChange(option.value)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-all text-sm font-medium ${btnClass}`}
                  >
                    <option.icon size={15} />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Internal Notes */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Internal Notes</h2>
            <div className="space-y-4">
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Private notes visible only to admins..."
                className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:border-amber-500 text-stone-900 resize-none"
              />

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
                  onClick={handleSaveShipping}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50"
                >
                  {isSaving ? (
                    <><Loader size={18} className="animate-spin" /> Saving...</>
                  ) : (
                    <><Save size={18} /> Save Notes</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
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

          {/* Shipping Details */}
          {order.shippingZone && (
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-stone-900 mb-4">Shipping Details</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 flex items-center gap-2">
                    <Globe size={14} /> Zone
                  </span>
                  <span className="font-medium text-stone-900">{order.shippingZone}</span>
                </div>
                {order.shippingSize && (
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Package Size</span>
                    <span className="font-medium text-stone-900 capitalize">{order.shippingSize}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Shipping Cost</span>
                  <span className="font-medium text-stone-900">
                    ${Number(order.shippingCost).toLocaleString()}
                  </span>
                </div>
                {order.carrier && (
                  <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                    <span className="text-stone-500">Carrier</span>
                    <span className="font-medium text-stone-900">{order.carrier}</span>
                  </div>
                )}
                {order.trackingNumber && (
                  <div>
                    <p className="text-stone-500 mb-1">Tracking</p>
                    <p className="font-mono text-xs bg-stone-50 p-2 rounded break-all border border-stone-100">
                      {order.trackingNumber}
                    </p>
                  </div>
                )}
                {order.estimatedDelivery && (
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Est. Delivery</span>
                    <span className="font-medium text-amber-700">
                      {new Date(order.estimatedDelivery).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payment Info */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Payment</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                <span className="text-stone-600 text-sm">Status</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${getPaymentStyle(order.paymentStatus)}`}>
                  {getPaymentLabel(order.paymentStatus)}
                </span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <CreditCard size={16} className="text-stone-400 flex-shrink-0" />
                <span className="text-stone-600">
                  {order.stripePaymentIntentId ? 'Processed via Paystack' : 'Manual Payment'}
                </span>
              </div>

              {order.stripePaymentIntentId && (
                <div className="p-3 bg-stone-50 rounded-lg">
                  <p className="text-xs text-stone-400 font-mono break-all">
                    {order.stripePaymentIntentId}
                  </p>
                </div>
              )}

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

          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Activity timeline</h2>
            <div className="space-y-4">
              {(order.events || []).map(event => (
                <div key={event.id} className="border-l-2 border-amber-400 pl-4">
                  <p className="text-sm font-medium text-stone-900">{event.message}</p>
                  <p className="text-xs text-stone-400 mt-1">{event.admin?.name || 'System'} · {new Date(event.createdAt).toLocaleString()}</p>
                </div>
              ))}
              {!order.events?.length && <p className="text-sm text-stone-400">No recorded activity yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
