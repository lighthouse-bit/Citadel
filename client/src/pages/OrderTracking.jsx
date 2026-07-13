// client/src/pages/OrderTracking.jsx
import { useCallback, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Package, Truck, CheckCircle, Clock, MapPin,
  ExternalLink, Loader, ShoppingBag, Search, AlertCircle,
  Mail, Activity, RefreshCw,
} from 'lucide-react';
import api, { ordersAPI } from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

const OrderTracking = () => {
  const { orderNumber } = useParams();
  const { isAuthenticated } = useAuth();
  const [order, setOrder]                       = useState(null);
  const [liveTracking, setLiveTracking]         = useState(null);
  const [isLoading, setIsLoading]               = useState(true);
  const [isLoadingTracking, setIsLoadingTracking] = useState(false);
  const [error, setError]                       = useState(null);
  const [searchInput, setSearchInput]           = useState(orderNumber || '');
  const [emailInput, setEmailInput]             = useState(() => sessionStorage.getItem('citadel_tracking_email') || '');

  // ── Fetch order by order number ─────────────────────────
  const fetchOrder = useCallback(async (number, email = '') => {
    if (!number) {
      setIsLoading(false);
      return;
    }
    if (!isAuthenticated && !email.trim()) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await ordersAPI.track(number, isAuthenticated ? undefined : email.trim().toLowerCase());
      setOrder(response.data);
    } catch (err) {
      console.error('Order tracking error:', err);
      if (err.response?.status === 404) {
        setError('The order number and email did not match our records.');
      } else {
        setError('Could not load order. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // ── Fetch live tracking from 17track ────────────────────
  const fetchLiveTracking = useCallback(async (orderNum, accessToken) => {
    setIsLoadingTracking(true);
    try {
      const response = await api.get(`/tracking/${orderNum}`, { params: { token: accessToken || undefined } });
      if (response.data.hasTracking) {
        setLiveTracking(response.data.tracking);
      }
    } catch (err) {
      console.error('Live tracking error:', err);
    } finally {
      setIsLoadingTracking(false);
    }
  }, []);

  useEffect(() => {
    const savedEmail = sessionStorage.getItem('citadel_tracking_email') || '';
    if (orderNumber && (isAuthenticated || savedEmail)) {
      fetchOrder(orderNumber, savedEmail);
    } else {
      setIsLoading(false);
    }
  }, [fetchOrder, orderNumber, isAuthenticated]);

  // ── Fetch live tracking after order loads ───────────────
  useEffect(() => {
    if (order?.trackingNumber && order?.carrier) {
      fetchLiveTracking(order.orderNumber, order.trackingAccessToken);
    }
  }, [fetchLiveTracking, order]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim() && (isAuthenticated || emailInput.trim())) {
      if (!isAuthenticated) sessionStorage.setItem('citadel_tracking_email', emailInput.trim().toLowerCase());
      window.location.href = `/track/${searchInput.trim()}`;
    }
  };

  const handleRefreshTracking = () => {
    if (order?.orderNumber) {
      fetchLiveTracking(order.orderNumber, order.trackingAccessToken);
      toast.success('Refreshing tracking...');
    }
  };

  // ── Status timeline steps ───────────────────────────────
  const getTimelineSteps = (currentStatus) => {
    const allSteps = [
      { id: 'CONFIRMED',  label: 'Order Confirmed',  icon: CheckCircle, description: 'Your payment was received' },
      { id: 'PROCESSING', label: 'Processing',       icon: Package,     description: 'We are preparing your artwork' },
      { id: 'SHIPPED',    label: 'Shipped',          icon: Truck,       description: 'Your order is on the way' },
      { id: 'DELIVERED',  label: 'Delivered',        icon: CheckCircle, description: 'Your artwork has arrived' },
    ];

    const statusOrder = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'];
    const currentIndex = statusOrder.indexOf(currentStatus);

    return allSteps.map(step => {
      const stepIndex = statusOrder.indexOf(step.id);
      return {
        ...step,
        completed: currentIndex >= stepIndex,
        active:    currentStatus === step.id,
      };
    });
  };

  // ── Loading ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <Loader size={32} className="animate-spin text-amber-600 mx-auto mb-3" />
          <p className="text-stone-600">Loading your order...</p>
        </div>
      </div>
    );
  }

  // ── No order number or error — Show search form ─────────
  if (!order || error) {
    return (
      <div className="min-h-screen pt-24 pb-16 bg-stone-50">
        <div className="max-w-2xl mx-auto px-6">

          {/* Header */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center
                            justify-center mx-auto mb-4">
              <Package size={32} className="text-amber-600" />
            </div>
            <h1
              className="text-3xl text-stone-900 mb-2"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Track Your Order
            </h1>
            <p className="text-stone-600">
              Enter the details from your confirmation email to see real-time status
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6
                            flex items-center gap-3">
              <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Search Form */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-8">
            <form onSubmit={handleSearch}>
              <label className="block text-sm font-medium text-stone-600 mb-2">
                Order Number
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="e.g., ORD-123456"
                  className="flex-1 px-4 py-3 border border-stone-300 rounded-lg
                             focus:outline-none focus:border-amber-500
                             font-mono text-stone-900"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-stone-900 text-white rounded-lg
                             hover:bg-stone-800 transition-colors
                             flex items-center gap-2"
                >
                  <Search size={18} />
                  Track
                </button>
              </div>
              {!isAuthenticated && (
                <div className="mt-4">
                  <label htmlFor="tracking-email" className="block text-sm font-medium text-stone-600 mb-2">Checkout Email</label>
                  <input id="tracking-email" type="email" value={emailInput} onChange={event => setEmailInput(event.target.value)} placeholder="you@example.com" autoComplete="email" required className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:border-amber-500 text-stone-900" />
                </div>
              )}
              <p className="text-xs text-stone-400 mt-2">
                Your order number and checkout email are in your confirmation message.
              </p>
            </form>

            <div className="mt-6 pt-6 border-t border-stone-100 text-center">
              <p className="text-sm text-stone-500">
                Need help? Email us at{' '}
                <a href="mailto:contact@highmarc.com"
                   className="text-amber-600 hover:text-amber-700">
                  contact@highmarc.com
                </a>
              </p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/"
              className="text-sm text-stone-500 hover:text-amber-600
                         transition-colors"
            >
              ← Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Order found — Show tracking details ─────────────────
  if (!order) return null;

  const timelineSteps = getTimelineSteps(order.status);
  const isCancelled   = order.status === 'CANCELLED';

  return (
    <div className="min-h-screen pt-24 pb-16 bg-stone-50">
      <div className="max-w-4xl mx-auto px-6 space-y-6">

        {/* Order Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-stone-200 shadow-sm p-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                Order Number
              </p>
              <h1 className="text-2xl text-stone-900 font-serif">
                {order.orderNumber}
              </h1>
              <p className="text-stone-500 text-sm mt-1">
                Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </p>
            </div>
            <div>
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                isCancelled
                  ? 'bg-red-100 text-red-700'
                  : order.status === 'DELIVERED' || order.status === 'COMPLETED'
                    ? 'bg-green-100 text-green-700'
                    : order.status === 'SHIPPED'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-amber-100 text-amber-700'
              }`}>
                {order.status.replace('_', ' ')}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Cancelled Banner */}
        {isCancelled && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4
                          flex items-center gap-3">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
            <div>
              <p className="text-red-800 font-medium text-sm">
                This Order Has Been Cancelled
              </p>
              <p className="text-red-600 text-xs mt-0.5">
                Please contact us if you have any questions
              </p>
            </div>
          </div>
        )}

        {/* Status Timeline */}
        {!isCancelled && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl border border-stone-200 shadow-sm p-6"
          >
            <h2 className="text-lg font-semibold text-stone-900 mb-6">
              Order Progress
            </h2>

            <div className="relative">
              {/* Progress line (desktop) */}
              <div className="absolute top-5 left-5 right-5 h-0.5 bg-stone-200
                              hidden sm:block">
                <div
                  className="h-full bg-amber-500 transition-all duration-500"
                  style={{
                    width: `${(timelineSteps.filter(s => s.completed).length - 1) /
                              (timelineSteps.length - 1) * 100}%`,
                  }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 relative">
                {timelineSteps.map((step) => (
                  <div key={step.id} className="text-center sm:text-center">
                    <div className="flex sm:flex-col items-center sm:items-center gap-3 sm:gap-0">
                      <div className={`w-10 h-10 rounded-full flex items-center
                                      justify-center mb-0 sm:mb-3 transition-all
                                      flex-shrink-0 z-10 ${
                        step.completed
                          ? step.active
                            ? 'bg-amber-500 text-white ring-4 ring-amber-100'
                            : 'bg-amber-500 text-white'
                          : 'bg-stone-100 text-stone-400'
                      }`}>
                        <step.icon size={18} />
                      </div>
                      <div className="text-left sm:text-center">
                        <p className={`text-sm font-medium ${
                          step.completed ? 'text-stone-900' : 'text-stone-400'
                        }`}>
                          {step.label}
                        </p>
                        <p className="text-xs text-stone-500 mt-0.5
                                      hidden sm:block">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Tracking Info Card */}
        {order.trackingNumber && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl
                       border border-amber-200 p-6"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-500 rounded-xl
                              flex items-center justify-center flex-shrink-0">
                <Truck size={24} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-stone-900 mb-3">
                  Tracking Information
                </h3>

                <div className="space-y-2 text-sm">
                  {order.carrier && (
                    <div className="flex items-center justify-between">
                      <span className="text-stone-600">Carrier</span>
                      <span className="font-medium text-stone-900">
                        {order.carrier}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-stone-600">Tracking Number</span>
                    <span className="font-mono font-medium text-stone-900
                                     bg-white px-2 py-1 rounded text-xs">
                      {order.trackingNumber}
                    </span>
                  </div>

                  {order.estimatedDelivery && (
                    <div className="flex items-center justify-between">
                      <span className="text-stone-600">Estimated Delivery</span>
                      <span className="font-medium text-amber-700">
                        {new Date(order.estimatedDelivery).toLocaleDateString('en-US', {
                          weekday: 'short', month: 'short', day: 'numeric',
                        })}
                      </span>
                    </div>
                  )}

                  {order.shippedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-stone-600">Shipped On</span>
                      <span className="text-stone-900">
                        {new Date(order.shippedAt).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric',
                        })}
                      </span>
                    </div>
                  )}

                  {order.deliveredAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-stone-600">Delivered On</span>
                      <span className="text-green-700 font-medium">
                        {new Date(order.deliveredAt).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                </div>

                {order.trackingUrl && (
                  <a
                    href={order.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 px-5 py-2.5
                               bg-stone-900 text-white rounded-lg
                               hover:bg-stone-800 transition-colors text-sm"
                  >
                    Track on {order.carrier} <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── LIVE TRACKING UPDATES (from 17track) ──────── */}
        {liveTracking?.events?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-xl border border-stone-200 shadow-sm p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
                <Activity size={18} className="text-amber-600" />
                Live Tracking Updates
              </h2>
              <button
                onClick={handleRefreshTracking}
                disabled={isLoadingTracking}
                className="text-xs text-amber-600 hover:text-amber-700
                           flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw size={12} className={isLoadingTracking ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            {/* Current Status */}
            {liveTracking.status && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <p className="text-xs text-amber-700 uppercase tracking-wider font-medium mb-1">
                  Current Status
                </p>
                <p className="text-stone-900 font-semibold">
                  {liveTracking.statusText || liveTracking.status}
                </p>
                {liveTracking.location && (
                  <p className="text-stone-600 text-sm mt-1 flex items-center gap-1">
                    <MapPin size={12} /> {liveTracking.location}
                  </p>
                )}
              </div>
            )}

            {/* Events Timeline */}
            <div className="space-y-4">
              {liveTracking.events.map((event, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                      index === 0
                        ? 'bg-amber-500 ring-4 ring-amber-100'
                        : 'bg-stone-300'
                    }`} />
                    {index < liveTracking.events.length - 1 && (
                      <div className="w-0.5 flex-1 bg-stone-200 mt-1
                                      min-h-[20px]" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="text-sm font-medium text-stone-900">
                      {event.description || event.status}
                    </p>
                    {event.location && (
                      <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-1">
                        <MapPin size={10} /> {event.location}
                      </p>
                    )}
                    {event.date && (
                      <p className="text-xs text-stone-400 mt-1">
                        {new Date(event.date).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Live tracking loading */}
        {isLoadingTracking && !liveTracking && order.trackingNumber && (
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 text-center">
            <Loader size={20} className="animate-spin text-amber-600 mx-auto mb-2" />
            <p className="text-sm text-stone-500">Loading live tracking updates...</p>
          </div>
        )}

        {/* Order Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border border-stone-200 shadow-sm
                     overflow-hidden"
        >
          <div className="p-6 border-b border-stone-200">
            <h2 className="text-lg font-semibold text-stone-900">
              Your Order ({order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'items'})
            </h2>
          </div>

          <div className="divide-y divide-stone-100">
            {order.items?.map((item) => (
              <div key={item.id} className="p-6 flex gap-4">
                <div className="w-20 h-20 flex-shrink-0 bg-stone-100
                                rounded-lg overflow-hidden">
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
                      {item.artwork.medium && `${item.artwork.medium}`}
                      {item.artwork.width && item.artwork.height &&
                        ` · ${item.artwork.width}×${item.artwork.height} ${item.artwork.unit}`}
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

          {/* Totals */}
          <div className="p-6 bg-stone-50 space-y-2 border-t border-stone-200">
            <div className="flex justify-between text-sm">
              <span className="text-stone-600">Subtotal</span>
              <span className="text-stone-900">
                ${Number(order.subtotal).toLocaleString()}
              </span>
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
            {Number(order.tax) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-600">Tax</span>
                <span className="text-stone-900">
                  ${Number(order.tax).toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between text-lg font-semibold
                            pt-3 border-t border-stone-200 mt-2">
              <span className="text-stone-900">Total</span>
              <span className="text-amber-700">
                ${Number(order.total).toLocaleString()}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Shipping Address */}
        {order.shippingAddress && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl border border-stone-200 shadow-sm p-6"
          >
            <h2 className="text-lg font-semibold text-stone-900 mb-4
                           flex items-center gap-2">
              <MapPin size={18} className="text-amber-600" />
              Shipping To
            </h2>
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
          </motion.div>
        )}

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-stone-100 rounded-xl p-6 text-center"
        >
          <Mail size={24} className="text-stone-400 mx-auto mb-3" />
          <h3 className="font-medium text-stone-900 mb-1">Need Help?</h3>
          <p className="text-sm text-stone-600 mb-3">
            Contact us about your order
          </p>
          <a
            href={`mailto:contact@highmarc.com?subject=Order ${order.orderNumber}`}
            className="inline-flex items-center gap-2 px-5 py-2.5
                       bg-stone-900 text-white rounded-lg
                       hover:bg-stone-800 transition-colors text-sm"
          >
            <Mail size={14} />
            Email Support
          </a>
        </motion.div>

        {/* Back Link */}
        <div className="text-center pt-4">
          <Link
            to="/"
            className="text-sm text-stone-500 hover:text-amber-600 transition-colors"
          >
            ← Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;
