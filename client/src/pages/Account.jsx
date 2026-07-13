// client/src/pages/Account.jsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  Package,
  Palette,
  LogOut,
  User,
  Loader,
  CheckCircle,
  Clock,
  CreditCard,
  ArrowRight,
  Image,
  AlertCircle,
  Mail,
  Truck,
  MapPin,
  Search,
  ExternalLink,
  Globe,
  TrendingUp,
  ShoppingBag,
  Heart,
  Trash2,
  BellRing,
  Save,
  UserRoundCog,
} from 'lucide-react';
import { ordersAPI, commissionsAPI, wishlistAPI } from '../services/api';
import toast from 'react-hot-toast';
import { useWishlist } from '../hooks/useWishlist';
import AccountSettings from '../components/AccountSettings';

const Account = () => {
  const { user, logout, isAuthenticated, isLoading: authLoading, isVerified } = useAuth();
  const navigate = useNavigate();
  const { artworks: wishlist, isLoading: wishlistLoading, toggleWishlist } = useWishlist();

  const [activeTab, setActiveTab]   = useState('overview');
  const [orders, setOrders]         = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [searchOrder, setSearchOrder] = useState('');
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    wishlistAvailabilityAlerts: false,
    wishlistPriceAlerts: false,
    newArtworkAlerts: false,
    marketingEmails: false,
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Fetch user data
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setDataLoading(true);
      try {
        const [ordersRes, commissionsRes, preferencesRes] = await Promise.all([
          ordersAPI.getAll({ customerEmail: user.email }),
          commissionsAPI.getAll({ scope: 'user' }),
          wishlistAPI.getPreferences(),
        ]);

        setOrders(ordersRes.data?.orders || []);
        setCommissions(commissionsRes.data?.commissions || []);
        setPreferences(previous => ({ ...previous, ...preferencesRes.data }));
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load your data');
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // ── Compute stats ─────────────────────────────────────
  const stats = {
    totalOrders:      orders.length,
    totalSpent:       orders.reduce(
      (sum, o) => sum + (o.paymentStatus === 'FULLY_PAID' ? Number(o.total) : 0),
      0
    ),
    activeOrders:     orders.filter(o =>
      ['CONFIRMED', 'PROCESSING', 'SHIPPED'].includes(o.status)
    ).length,
    totalCommissions: commissions.length,
    activeCommissions: commissions.filter(c =>
      !['COMPLETED', 'CANCELLED'].includes(c.status)
    ).length,
  };

  // ── Order Search ──────────────────────────────────────
  const handleTrackOrder = (e) => {
    e.preventDefault();
    if (searchOrder.trim()) {
      navigate(`/track/${searchOrder.trim()}`);
    }
  };

  const savePreferences = async () => {
    try {
      setSavingPreferences(true);
      const { data } = await wishlistAPI.updatePreferences(preferences);
      setPreferences(previous => ({ ...previous, ...data }));
      toast.success('Email preferences saved');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save email preferences');
    } finally {
      setSavingPreferences(false);
    }
  };

  // ── Style helpers ─────────────────────────────────────
  const getOrderStatusStyle = (status) => {
    const styles = {
      PENDING:    'bg-yellow-100 text-yellow-800',
      CONFIRMED:  'bg-blue-100 text-blue-800',
      PROCESSING: 'bg-purple-100 text-purple-800',
      SHIPPED:    'bg-indigo-100 text-indigo-800',
      DELIVERED:  'bg-teal-100 text-teal-800',
      COMPLETED:  'bg-green-100 text-green-800',
      CANCELLED:  'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-stone-100 text-stone-800';
  };

  const getCommissionStatusStyle = (status) => {
    const styles = {
      PENDING:     'bg-yellow-100 text-yellow-800',
      REVIEWING:   'bg-amber-100 text-amber-800',
      ACCEPTED:    'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-purple-100 text-purple-800',
      REVISION:    'bg-orange-100 text-orange-800',
      COMPLETED:   'bg-green-100 text-green-800',
      CANCELLED:   'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-stone-100 text-stone-800';
  };

  const getPaymentStatusStyle = (status) => {
    const styles = {
      UNPAID:       'bg-red-50 text-red-600',
      DEPOSIT_PAID: 'bg-blue-50 text-blue-600',
      FULLY_PAID:   'bg-green-50 text-green-600',
    };
    return styles[status] || 'bg-stone-50 text-stone-600';
  };

  const getOrderStatusIcon = (status) => {
    switch (status) {
      case 'COMPLETED':
      case 'DELIVERED':  return <CheckCircle size={16} />;
      case 'SHIPPED':    return <Truck size={16} />;
      case 'PROCESSING': return <Package size={16} />;
      default:           return <Clock size={16} />;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen pt-20 bg-stone-50 flex items-center justify-center">
        <Loader size={32} className="animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 min-h-screen bg-stone-50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row gap-8">

          {/* ==================== SIDEBAR ==================== */}
          <div className="w-full md:w-72 flex-shrink-0">

            {/* Profile Card */}
            <div className="bg-white p-6 rounded-xl border border-stone-200
                            shadow-sm text-center mb-6">
              <div className="w-20 h-20 bg-amber-100 rounded-full
                              flex items-center justify-center mx-auto mb-4">
                <User size={36} className="text-amber-700" />
              </div>
              <h2
                className="text-xl text-stone-900 mb-1"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {user?.name}
              </h2>
              <p className="text-sm text-stone-500 truncate mb-3">{user?.email}</p>

              {isVerified ? (
                <span className="inline-flex items-center gap-1 text-xs
                                 text-green-700 bg-green-100 px-3 py-1 rounded-full">
                  <CheckCircle size={12} /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs
                                 text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                  <Mail size={12} /> Unverified
                </span>
              )}
            </div>

            {/* Navigation */}
            <div className="space-y-2">
              <NavButton
                active={activeTab === 'overview'}
                onClick={() => setActiveTab('overview')}
                icon={<TrendingUp size={18} />}
                label="Overview"
              />

              <NavButton
                active={activeTab === 'orders'}
                onClick={() => setActiveTab('orders')}
                icon={<Package size={18} />}
                label="Orders"
                count={orders.length}
              />

              <NavButton
                active={activeTab === 'commissions'}
                onClick={() => setActiveTab('commissions')}
                icon={<Palette size={18} />}
                label="Commissions"
                count={commissions.length}
              />

              <NavButton
                active={activeTab === 'wishlist'}
                onClick={() => setActiveTab('wishlist')}
                icon={<Heart size={18} />}
                label="Wishlist"
                count={wishlist.length}
              />

              <NavButton
                active={activeTab === 'track'}
                onClick={() => setActiveTab('track')}
                icon={<MapPin size={18} />}
                label="Track Order"
              />

              <NavButton
                active={activeTab === 'settings'}
                onClick={() => setActiveTab('settings')}
                icon={<UserRoundCog size={18} />}
                label="Profile & Addresses"
              />

              <NavButton
                active={activeTab === 'preferences'}
                onClick={() => setActiveTab('preferences')}
                icon={<BellRing size={18} />}
                label="Email Alerts"
              />

              <div className="pt-4">
                <button
                  onClick={() => { logout(); navigate('/'); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg
                           bg-white text-red-600 hover:bg-red-50 transition-colors
                           border border-stone-200"
                >
                  <LogOut size={18} />
                  <span className="font-medium">Sign Out</span>
                </button>
              </div>
            </div>
          </div>

          {/* ==================== MAIN CONTENT ==================== */}
          <div className="flex-1">

            {/* Verification Warning */}
            {!isVerified && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4
                              mb-6 flex items-start gap-3">
                <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-amber-800 font-medium text-sm">
                    Please verify your email
                  </p>
                  <p className="text-amber-700 text-xs mt-1">
                    Check your inbox for the verification link to access all features.
                  </p>
                </div>
              </div>
            )}

            {dataLoading ? (
              <div className="flex justify-center py-20">
                <Loader size={32} className="animate-spin text-amber-600" />
              </div>
            ) : (
              <>
                {/* ==================== OVERVIEW TAB ==================== */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <h1
                      className="text-3xl text-stone-900"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      Welcome back, {user?.name?.split(' ')[0]}
                    </h1>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <StatCard
                        icon={<ShoppingBag size={20} />}
                        label="Total Orders"
                        value={stats.totalOrders}
                        color="bg-blue-500"
                      />
                      <StatCard
                        icon={<TrendingUp size={20} />}
                        label="Total Spent"
                        value={`$${stats.totalSpent.toLocaleString()}`}
                        color="bg-green-500"
                      />
                      <StatCard
                        icon={<Truck size={20} />}
                        label="Active Orders"
                        value={stats.activeOrders}
                        color="bg-indigo-500"
                      />
                      <StatCard
                        icon={<Palette size={20} />}
                        label="Active Commissions"
                        value={stats.activeCommissions}
                        color="bg-amber-500"
                      />
                    </div>

                    {/* Recent Orders */}
                    <div className="bg-white rounded-xl border border-stone-200
                                    shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-stone-200 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-stone-900">
                          Recent Orders
                        </h2>
                        {orders.length > 0 && (
                          <button
                            onClick={() => setActiveTab('orders')}
                            className="text-sm text-amber-600 hover:text-amber-700
                                       flex items-center gap-1"
                          >
                            View All <ArrowRight size={14} />
                          </button>
                        )}
                      </div>

                      {orders.length > 0 ? (
                        <div className="divide-y divide-stone-100">
                          {orders.slice(0, 3).map(order => (
                            <div key={order.id} className="p-4 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center
                                                 justify-center ${getOrderStatusStyle(order.status)}`}>
                                  {getOrderStatusIcon(order.status)}
                                </div>
                                <div>
                                  <p className="font-medium text-stone-900 text-sm">
                                    #{order.orderNumber}
                                  </p>
                                  <p className="text-xs text-stone-500">
                                    {new Date(order.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-stone-900">
                                  ${Number(order.total).toLocaleString()}
                                </span>
                                <Link
                                  to={`/track/${order.orderNumber}`}
                                  className="text-amber-600 hover:text-amber-700"
                                >
                                  <ArrowRight size={16} />
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center">
                          <ShoppingBag size={32} className="text-stone-300 mx-auto mb-2" />
                          <p className="text-sm text-stone-500 mb-3">No orders yet</p>
                          <Link
                            to="/shop"
                            className="text-amber-600 hover:text-amber-700 text-sm"
                          >
                            Browse Collection →
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* Recent Commissions */}
                    <div className="bg-white rounded-xl border border-stone-200
                                    shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-stone-200 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-stone-900">
                          Recent Commissions
                        </h2>
                        {commissions.length > 0 && (
                          <button
                            onClick={() => setActiveTab('commissions')}
                            className="text-sm text-amber-600 hover:text-amber-700
                                       flex items-center gap-1"
                          >
                            View All <ArrowRight size={14} />
                          </button>
                        )}
                      </div>

                      {commissions.length > 0 ? (
                        <div className="divide-y divide-stone-100">
                          {commissions.slice(0, 3).map(comm => (
                            <div key={comm.id} className="p-4 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full
                                                 flex items-center justify-center
                                                 ${getCommissionStatusStyle(comm.status)}`}>
                                  <Palette size={16} />
                                </div>
                                <div>
                                  <p className="font-medium text-stone-900 text-sm">
                                    {comm.artStyle}
                                  </p>
                                  <p className="text-xs text-stone-500">
                                    #{comm.commissionNumber}
                                  </p>
                                </div>
                              </div>
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium
                                               ${getCommissionStatusStyle(comm.status)}`}>
                                {comm.status.replace('_', ' ')}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center">
                          <Palette size={32} className="text-stone-300 mx-auto mb-2" />
                          <p className="text-sm text-stone-500 mb-3">No commissions yet</p>
                          <Link
                            to="/commission"
                            className="text-amber-600 hover:text-amber-700 text-sm"
                          >
                            Start a Commission →
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <QuickAction
                        to="/gallery"
                        icon={<Image size={20} />}
                        title="Browse Gallery"
                        description="Discover new artworks"
                      />
                      <QuickAction
                        to="/commission"
                        icon={<Palette size={20} />}
                        title="Request Commission"
                        description="Order custom artwork"
                      />
                      <QuickAction
                        to="/contact"
                        icon={<Mail size={20} />}
                        title="Contact Support"
                        description="Get help with anything"
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'wishlist' && (
                  <div className="space-y-6">
                    <div>
                      <h1 className="text-3xl text-stone-900" style={{ fontFamily: "'Playfair Display', serif" }}>
                        Saved Artworks
                      </h1>
                      <p className="text-stone-500 text-sm mt-2">
                        Your personal collection of pieces to revisit.
                      </p>
                    </div>

                    {wishlistLoading ? (
                      <div className="flex justify-center py-16"><Loader size={30} className="animate-spin text-amber-600" /></div>
                    ) : wishlist.length ? (
                      <div className="grid sm:grid-cols-2 gap-5">
                        {wishlist.map(artwork => (
                          <article key={artwork.id} className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm group">
                            <Link to={`/artwork/${artwork.id}`} className="block aspect-[4/3] bg-stone-100 overflow-hidden">
                              {artwork.images?.[0]?.url ? (
                                <img src={artwork.images[0].url} alt={artwork.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              ) : (
                                <div className="w-full h-full grid place-items-center text-stone-300"><Image size={32} /></div>
                              )}
                            </Link>
                            <div className="p-4">
                              <div className="flex justify-between gap-4">
                                <div className="min-w-0">
                                  <Link to={`/artwork/${artwork.id}`} className="font-serif text-lg text-stone-900 hover:text-amber-700 line-clamp-1">{artwork.title}</Link>
                                  <p className="text-xs text-stone-500 mt-1 uppercase tracking-wide">{artwork.medium || artwork.category?.replace('_', ' ')}</p>
                                </div>
                                <p className="font-semibold text-stone-900 whitespace-nowrap">${Number(artwork.price).toLocaleString()}</p>
                              </div>
                              <div className="mt-4 pt-4 border-t border-stone-100 flex items-center justify-between">
                                <span className={`text-xs font-medium ${artwork.status === 'AVAILABLE' ? 'text-green-700' : 'text-stone-500'}`}>
                                  {artwork.status?.replace('_', ' ')}
                                </span>
                                <button onClick={() => toggleWishlist(artwork)} className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-red-600" aria-label={`Remove ${artwork.title} from wishlist`}>
                                  <Trash2 size={14} /> Remove
                                </button>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        icon={<Heart size={48} className="text-stone-300" />}
                        title="Your wishlist is empty"
                        description="Save artwork from the gallery or shop and it will appear here."
                        actionLabel="Explore the Gallery"
                        actionLink="/gallery"
                      />
                    )}
                  </div>
                )}

                {activeTab === 'preferences' && (
                  <div className="space-y-6">
                    <div>
                      <h1 className="text-3xl text-stone-900" style={{ fontFamily: "'Playfair Display', serif" }}>Email Alerts</h1>
                      <p className="text-stone-500 text-sm mt-2">Choose the optional updates you want to receive. Order and account-security emails are unaffected.</p>
                    </div>
                    <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100 shadow-sm">
                      {[
                        ['wishlistAvailabilityAlerts', 'Availability alerts', 'Email me when a saved artwork becomes available again.'],
                        ['wishlistPriceAlerts', 'Price-change alerts', 'Email me when the price of a saved artwork changes.'],
                        ['newArtworkAlerts', 'Similar new artwork', 'Email me when a newly published piece resembles artwork I saved.'],
                        ['marketingEmails', 'Studio news and offers', 'Occasional collection news, exhibitions and promotions.'],
                      ].map(([key, title, description]) => (
                        <label key={key} className="flex gap-4 items-start p-5 cursor-pointer hover:bg-stone-50">
                          <input type="checkbox" checked={Boolean(preferences[key])} onChange={event => setPreferences(previous => ({ ...previous, [key]: event.target.checked }))} className="mt-1 h-4 w-4 accent-amber-600" />
                          <span><span className="block font-medium text-stone-900">{title}</span><span className="block text-sm text-stone-500 mt-1">{description}</span></span>
                        </label>
                      ))}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <p className="text-xs text-stone-400">You can change these choices at any time or unsubscribe from an alert email.</p>
                      <button onClick={savePreferences} disabled={savingPreferences} className="inline-flex items-center justify-center gap-2 bg-stone-900 text-white px-5 py-3 rounded-lg disabled:opacity-50">
                        {savingPreferences ? <Loader size={16} className="animate-spin" /> : <Save size={16} />} Save preferences
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'settings' && <AccountSettings />}

                {/* ==================== TRACK ORDER TAB ==================== */}
                {activeTab === 'track' && (
                  <div className="space-y-6">
                    <h1
                      className="text-3xl text-stone-900 mb-2"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      Track Your Order
                    </h1>
                    <p className="text-stone-500 text-sm mb-6">
                      Enter your order number for real-time tracking updates
                    </p>

                    <div className="bg-white rounded-xl border border-stone-200
                                    shadow-sm p-6">
                      <form onSubmit={handleTrackOrder}>
                        <label className="block text-sm font-medium text-stone-600 mb-2">
                          Order Number
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={searchOrder}
                            onChange={(e) => setSearchOrder(e.target.value)}
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
                      </form>
                    </div>

                    {/* Quick Links — recent orders */}
                    {orders.length > 0 && (
                      <div className="bg-white rounded-xl border border-stone-200
                                      shadow-sm p-6">
                        <h3 className="text-sm font-semibold text-stone-600 mb-4 uppercase tracking-wider">
                          Quick Track
                        </h3>
                        <div className="space-y-2">
                          {orders.slice(0, 5).map(order => (
                            <Link
                              key={order.id}
                              to={`/track/${order.orderNumber}`}
                              className="flex items-center justify-between p-3
                                         bg-stone-50 rounded-lg hover:bg-amber-50
                                         transition-colors group"
                            >
                              <div>
                                <p className="font-medium text-stone-900 text-sm">
                                  #{order.orderNumber}
                                </p>
                                <p className="text-xs text-stone-500">
                                  {order.status.replace('_', ' ')}
                                </p>
                              </div>
                              <ArrowRight
                                size={16}
                                className="text-stone-400 group-hover:text-amber-600
                                           transition-colors"
                              />
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ==================== ORDERS TAB ==================== */}
                {activeTab === 'orders' && (
                  <div className="space-y-6">
                    <h1
                      className="text-3xl text-stone-900"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      Order History
                    </h1>

                    {orders.length > 0 ? (
                      orders.map(order => (
                        <div
                          key={order.id}
                          className="bg-white rounded-xl border border-stone-200
                                     shadow-sm overflow-hidden"
                        >
                          {/* Order Header */}
                          <div className="p-6 flex flex-col sm:flex-row sm:items-center
                                          justify-between gap-4 border-b border-stone-100">
                            <div>
                              <div className="flex items-center gap-3 mb-1 flex-wrap">
                                <span className="font-semibold text-stone-900">
                                  #{order.orderNumber}
                                </span>
                                <span className={`inline-flex items-center gap-1
                                                  px-2.5 py-1 text-xs font-medium rounded-full
                                                  ${getOrderStatusStyle(order.status)}`}>
                                  {getOrderStatusIcon(order.status)}
                                  {order.status.replace('_', ' ')}
                                </span>
                              </div>
                              <p className="text-xs text-stone-500">
                                Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </p>
                            </div>
                            <span className={`inline-flex items-center gap-1
                                              px-3 py-1 text-xs font-medium rounded-full
                                              ${getPaymentStatusStyle(order.paymentStatus)}`}>
                              <CreditCard size={12} />
                              {order.paymentStatus.replace('_', ' ')}
                            </span>
                          </div>

                          {/* Order Items */}
                          <div className="divide-y divide-stone-50">
                            {order.items?.map((item, idx) => (
                              <div key={idx} className="p-6 flex gap-4">
                                <div className="w-16 h-16 bg-stone-100 rounded-lg
                                                overflow-hidden flex-shrink-0">
                                  {item.artwork?.images?.[0]?.url ? (
                                    <img
                                      src={item.artwork.images[0].url}
                                      alt={item.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center
                                                    justify-center text-stone-300">
                                      <Image size={24} />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-stone-900">{item.title}</p>
                                  {item.artwork?.medium && (
                                    <p className="text-xs text-stone-500 uppercase
                                                  tracking-wide mt-1">
                                      {item.artwork.medium}
                                    </p>
                                  )}
                                </div>
                                <p className="text-stone-900 font-semibold">
                                  ${Number(item.price).toLocaleString()}
                                </p>
                              </div>
                            ))}
                          </div>

                          {/* Shipping Info (if available) */}
                          {order.shippingZone && (
                            <div className="px-6 py-3 bg-stone-50
                                            border-t border-stone-100 flex items-center
                                            justify-between text-xs text-stone-600">
                              <div className="flex items-center gap-2">
                                <Globe size={12} />
                                <span>Shipping to {order.shippingZone}</span>
                              </div>
                              {Number(order.shippingCost) > 0 && (
                                <span>+${Number(order.shippingCost).toLocaleString()} shipping</span>
                              )}
                              {Number(order.shippingCost) === 0 && (
                                <span className="text-green-600 font-medium">Free shipping</span>
                              )}
                            </div>
                          )}

                          {/* Order Footer */}
                          <div className="p-6 bg-stone-50 flex justify-between items-center">
                            <div className="text-sm text-stone-500">
                              {order.items?.length} {order.items?.length === 1 ? 'item' : 'items'}
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-stone-500 mb-1">Total</p>
                              <p className="text-xl font-semibold text-stone-900">
                                ${Number(order.total).toLocaleString()}
                              </p>
                            </div>
                          </div>

                          {/* ✅ Enhanced Tracking Section */}
                          {order.trackingNumber && (
                            <div className="px-6 py-4 bg-gradient-to-r from-amber-50
                                            to-amber-100 border-t border-amber-200">
                              <div className="flex flex-col sm:flex-row sm:items-center
                                              justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-amber-500 rounded-full
                                                  flex items-center justify-center
                                                  flex-shrink-0">
                                    <Truck size={18} className="text-white" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-stone-900">
                                      {order.carrier || 'Tracking Available'}
                                    </p>
                                    <p className="text-xs text-stone-600 font-mono">
                                      {order.trackingNumber}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {order.trackingUrl && (
                                    <a
                                      href={order.trackingUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-3 py-2 bg-white text-stone-700
                                                 text-xs font-medium rounded-lg
                                                 hover:bg-stone-50 border border-stone-200
                                                 flex items-center gap-1"
                                    >
                                      <ExternalLink size={12} />
                                      Carrier Site
                                    </a>
                                  )}
                                  <Link
                                    to={`/track/${order.orderNumber}`}
                                    className="px-4 py-2 bg-stone-900 text-white
                                               text-xs font-medium rounded-lg
                                               hover:bg-stone-800 flex items-center gap-1"
                                  >
                                    Live Track
                                    <ArrowRight size={12} />
                                  </Link>
                                </div>
                              </div>
                              {order.estimatedDelivery && (
                                <p className="text-xs text-stone-600 mt-2 ml-13">
                                  📅 Estimated delivery:{' '}
                                  <strong>
                                    {new Date(order.estimatedDelivery).toLocaleDateString('en-US', {
                                      weekday: 'short',
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </strong>
                                </p>
                              )}
                            </div>
                          )}

                          {/* Track button even without tracking number */}
                          {!order.trackingNumber && order.status !== 'PENDING' && (
                            <div className="px-6 py-3 border-t border-stone-100 text-center">
                              <Link
                                to={`/track/${order.orderNumber}`}
                                className="inline-flex items-center gap-1 text-sm
                                           text-amber-600 hover:text-amber-700"
                              >
                                <MapPin size={14} />
                                View Order Details
                              </Link>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <EmptyState
                        icon={<Package size={48} className="text-stone-300" />}
                        title="No orders yet"
                        description="When you purchase an artwork, it will appear here."
                        actionLabel="Browse Collection"
                        actionLink="/shop"
                      />
                    )}
                  </div>
                )}

                {/* ==================== COMMISSIONS TAB ==================== */}
                {activeTab === 'commissions' && (
                  <div className="space-y-6">
                    <h1
                      className="text-3xl text-stone-900"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      My Commissions
                    </h1>

                    {commissions.length > 0 ? (
                      commissions.map(comm => (
                        <div
                          key={comm.id}
                          className="bg-white rounded-xl border border-stone-200
                                     shadow-sm overflow-hidden"
                        >
                          {/* Commission Header */}
                          <div className="p-6 flex flex-col sm:flex-row sm:items-center
                                          justify-between gap-4 border-b border-stone-100">
                            <div>
                              <div className="flex items-center gap-3 mb-1 flex-wrap">
                                <span className="font-semibold text-stone-900">
                                  {comm.artStyle}
                                </span>
                                <span className={`px-2.5 py-1 text-xs font-medium rounded-full
                                                  ${getCommissionStatusStyle(comm.status)}`}>
                                  {comm.status.replace('_', ' ')}
                                </span>
                              </div>
                              <p className="text-xs text-stone-500">
                                #{comm.commissionNumber} • Submitted on{' '}
                                {new Date(comm.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <span className={`inline-flex items-center gap-1 px-3 py-1
                                              text-xs font-medium rounded-full
                                              ${getPaymentStatusStyle(comm.paymentStatus)}`}>
                              <CreditCard size={12} />
                              {comm.paymentStatus.replace('_', ' ')}
                            </span>
                          </div>

                          {/* Commission Details */}
                          <div className="p-6">
                            <p className="text-stone-600 text-sm mb-4 leading-relaxed">
                              {comm.description}
                            </p>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                              <div className="bg-stone-50 p-3 rounded-lg">
                                <p className="text-xs text-stone-500 mb-1">Size</p>
                                <p className="text-sm font-medium text-stone-900">
                                  {comm.size}
                                </p>
                              </div>
                              <div className="bg-stone-50 p-3 rounded-lg">
                                <p className="text-xs text-stone-500 mb-1">Estimated</p>
                                <p className="text-sm font-medium text-stone-900">
                                  ${Number(comm.estimatedPrice).toLocaleString()}
                                </p>
                              </div>
                              {comm.finalPrice && (
                                <div className="bg-stone-50 p-3 rounded-lg">
                                  <p className="text-xs text-stone-500 mb-1">Final Price</p>
                                  <p className="text-sm font-medium text-amber-700">
                                    ${Number(comm.finalPrice).toLocaleString()}
                                  </p>
                                </div>
                              )}
                              {comm.deadline && (
                                <div className="bg-stone-50 p-3 rounded-lg">
                                  <p className="text-xs text-stone-500 mb-1">Deadline</p>
                                  <p className="text-sm font-medium text-stone-900">
                                    {new Date(comm.deadline).toLocaleDateString()}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Reference Images */}
                            {comm.referenceImages?.length > 0 && (
                              <div className="mb-4">
                                <p className="text-xs text-stone-500 mb-2">Reference Images</p>
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                  {comm.referenceImages.map((img, idx) => (
                                    <img
                                      key={idx}
                                      src={img.url}
                                      alt={`Reference ${idx + 1}`}
                                      className="w-16 h-16 rounded-lg object-cover
                                                 flex-shrink-0 border border-stone-200"
                                    />
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Progress Images */}
                            {comm.progressImages?.length > 0 && (
                              <div className="mb-4">
                                <p className="text-xs text-stone-500 mb-2">Work in Progress</p>
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                  {comm.progressImages.map((img, idx) => (
                                    <img
                                      key={idx}
                                      src={img.imageUrl || img.url}
                                      alt={`Progress ${idx + 1}`}
                                      className="w-20 h-20 rounded-lg object-cover
                                                 flex-shrink-0 border border-stone-200"
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Payment Actions */}
                          <div className="px-6 pb-6">
                            {/* CASE 1: Commission accepted, needs 70% deposit */}
                            {comm.status === 'ACCEPTED' &&
                             comm.paymentStatus === 'UNPAID' &&
                             comm.finalPrice && (
                              <div className="bg-amber-50 border border-amber-200
                                              rounded-lg p-4 flex flex-col sm:flex-row
                                              sm:items-center justify-between gap-4">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <AlertCircle size={16} className="text-amber-600" />
                                    <p className="text-sm font-medium text-amber-800">
                                      Deposit Required
                                    </p>
                                  </div>
                                  <p className="text-xs text-amber-700">
                                    Pay 70% deposit (${(Number(comm.finalPrice) * 0.7).toLocaleString()})
                                    to begin work
                                  </p>
                                </div>
                                <Link
                                  to={`/commission/payment/${comm.id}`}
                                  className="inline-flex items-center justify-center gap-2
                                             px-6 py-2.5 bg-amber-600 text-white
                                             rounded-lg hover:bg-amber-700 transition-colors
                                             text-sm font-medium whitespace-nowrap"
                                >
                                  <CreditCard size={16} />
                                  Pay Deposit
                                  <ArrowRight size={14} />
                                </Link>
                              </div>
                            )}

                            {/* CASE 2: Deposit paid, work in progress */}
                            {comm.paymentStatus === 'DEPOSIT_PAID' &&
                             comm.status !== 'COMPLETED' && (
                              <div className="bg-blue-50 border border-blue-200
                                              rounded-lg p-4 flex items-center gap-3">
                                <CheckCircle size={18}
                                  className="text-blue-600 flex-shrink-0" />
                                <div>
                                  <p className="text-sm font-medium text-blue-800">
                                    Deposit Paid
                                  </p>
                                  <p className="text-xs text-blue-700">
                                    Your artist is working on your commission.
                                    Remaining balance of $
                                    {Number(comm.balanceAmount ||
                                            Number(comm.finalPrice) * 0.3).toLocaleString()} due
                                    upon completion.
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* CASE 3: Work complete, needs 30% balance */}
                            {comm.status === 'COMPLETED' &&
                             comm.paymentStatus === 'DEPOSIT_PAID' && (
                              <div className="bg-green-50 border border-green-200
                                              rounded-lg p-4 flex flex-col sm:flex-row
                                              sm:items-center justify-between gap-4">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <CheckCircle size={16} className="text-green-600" />
                                    <p className="text-sm font-medium text-green-800">
                                      Commission Complete!
                                    </p>
                                  </div>
                                  <p className="text-xs text-green-700">
                                    Pay the remaining 30% balance to finalize
                                  </p>
                                </div>
                                <Link
                                  to={`/commission/payment/${comm.id}`}
                                  className="inline-flex items-center justify-center gap-2
                                             px-6 py-2.5 bg-stone-900 text-white
                                             rounded-lg hover:bg-stone-800 transition-colors
                                             text-sm font-medium whitespace-nowrap"
                                >
                                  <CreditCard size={16} />
                                  Pay Balance ($
                                  {Number(comm.balanceAmount ||
                                          Number(comm.finalPrice) * 0.3).toLocaleString()})
                                  <ArrowRight size={14} />
                                </Link>
                              </div>
                            )}

                            {/* CASE 4: Fully paid */}
                            {comm.paymentStatus === 'FULLY_PAID' && (
                              <div className="bg-green-50 border border-green-200
                                              rounded-lg p-4 flex items-center gap-3">
                                <CheckCircle size={18}
                                  className="text-green-600 flex-shrink-0" />
                                <div>
                                  <p className="text-sm font-medium text-green-800">
                                    Fully Paid
                                  </p>
                                  <p className="text-xs text-green-700">
                                    Total paid: ${Number(comm.finalPrice).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* CASE 5: Waiting for review */}
                            {(comm.status === 'PENDING' ||
                              comm.status === 'REVIEWING') && (
                              <div className="bg-stone-50 border border-stone-200
                                              rounded-lg p-4 flex items-center gap-3">
                                <Clock size={18}
                                  className="text-stone-500 flex-shrink-0" />
                                <div>
                                  <p className="text-sm font-medium text-stone-700">
                                    Under Review
                                  </p>
                                  <p className="text-xs text-stone-500">
                                    The artist is reviewing your request. You'll be
                                    notified once a price is set.
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyState
                        icon={<Palette size={48} className="text-stone-300" />}
                        title="No commissions yet"
                        description="When you request a custom artwork, it will appear here."
                        actionLabel="Start a Commission"
                        actionLink="/commission"
                      />
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// Sub-Components
// ─────────────────────────────────────────────────────────

const NavButton = ({ active, onClick, icon, label, count }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg
                transition-colors ${
      active
        ? 'bg-stone-900 text-white'
        : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
    }`}
  >
    <div className="flex items-center gap-3">
      {icon}
      <span className="font-medium">{label}</span>
    </div>
    {count !== undefined && (
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
        active ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'
      }`}>
        {count}
      </span>
    )}
  </button>
);

const StatCard = ({ icon, label, value, color }) => (
  <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
    <div className={`w-10 h-10 ${color} rounded-lg flex items-center
                     justify-center mb-3`}>
      <div className="text-white">{icon}</div>
    </div>
    <p className="text-2xl font-bold text-stone-900">{value}</p>
    <p className="text-xs text-stone-500 mt-1">{label}</p>
  </div>
);

const QuickAction = ({ to, icon, title, description }) => (
  <Link
    to={to}
    className="bg-white rounded-xl border border-stone-200 shadow-sm p-5
               hover:border-amber-500 hover:shadow-md transition-all group"
  >
    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center
                    justify-center mb-3 group-hover:bg-amber-200 transition-colors">
      <div className="text-amber-700">{icon}</div>
    </div>
    <p className="font-medium text-stone-900 text-sm mb-1">{title}</p>
    <p className="text-xs text-stone-500">{description}</p>
  </Link>
);

const EmptyState = ({ icon, title, description, actionLabel, actionLink }) => (
  <div className="text-center py-16 bg-white rounded-xl border border-stone-200 shadow-sm">
    <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center
                    justify-center mx-auto mb-6">
      {icon}
    </div>
    <h3
      className="text-xl text-stone-900 mb-2"
      style={{ fontFamily: "'Playfair Display', serif" }}
    >
      {title}
    </h3>
    <p className="text-stone-500 mb-8 max-w-md mx-auto">{description}</p>
    <Link
      to={actionLink}
      className="inline-flex items-center justify-center gap-2 px-8 py-3
               bg-stone-900 text-white rounded-lg hover:bg-stone-800
               transition-colors text-sm font-medium"
    >
      {actionLabel}
      <ArrowRight size={16} />
    </Link>
  </div>
);

export default Account;
