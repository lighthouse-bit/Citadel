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
  Truck
} from 'lucide-react';
import { ordersAPI, commissionsAPI } from '../services/api';
import toast from 'react-hot-toast';

const Account = () => {
  const { user, logout, isAuthenticated, isLoading: authLoading, isVerified } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

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
        const [ordersRes, commissionsRes] = await Promise.all([
          ordersAPI.getAll({ customerEmail: user.email }),
          commissionsAPI.getAll({ scope: 'user' }),
        ]);

        setOrders(ordersRes.data?.orders || []);
        setCommissions(commissionsRes.data?.commissions || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load your data');
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Status Badge Styles
  const getOrderStatusStyle = (status) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-blue-100 text-blue-800',
      PROCESSING: 'bg-purple-100 text-purple-800',
      SHIPPED: 'bg-indigo-100 text-indigo-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-stone-100 text-stone-800';
  };

  const getCommissionStatusStyle = (status) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      REVIEWING: 'bg-amber-100 text-amber-800',
      ACCEPTED: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-purple-100 text-purple-800',
      REVISION: 'bg-orange-100 text-orange-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-stone-100 text-stone-800';
  };

  const getPaymentStatusStyle = (status) => {
    const styles = {
      UNPAID: 'bg-red-50 text-red-600',
      DEPOSIT_PAID: 'bg-blue-50 text-blue-600',
      FULLY_PAID: 'bg-green-50 text-green-600',
    };
    return styles[status] || 'bg-stone-50 text-stone-600';
  };

  const getOrderStatusIcon = (status) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle size={16} />;
      case 'SHIPPED': return <Truck size={16} />;
      case 'PROCESSING': return <Package size={16} />;
      default: return <Clock size={16} />;
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
            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm text-center mb-6">
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User size={36} className="text-amber-700" />
              </div>
              <h2 
                className="text-xl text-stone-900 mb-1"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {user?.name}
              </h2>
              <p className="text-sm text-stone-500 truncate mb-3">{user?.email}</p>
              
              {/* Verification Status */}
              {isVerified ? (
                <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-3 py-1 rounded-full">
                  <CheckCircle size={12} /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                  <Mail size={12} /> Unverified
                </span>
              )}
            </div>

            {/* Navigation */}
            <div className="space-y-2">
              <button
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                  activeTab === 'orders' 
                    ? 'bg-stone-900 text-white' 
                    : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Package size={18} />
                  <span className="font-medium">Orders</span>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'orders' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'
                }`}>
                  {orders.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('commissions')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                  activeTab === 'commissions' 
                    ? 'bg-stone-900 text-white' 
                    : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Palette size={18} />
                  <span className="font-medium">Commissions</span>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'commissions' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'
                }`}>
                  {commissions.length}
                </span>
              </button>

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
            <h1 
              className="text-3xl text-stone-900 mb-8"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {activeTab === 'orders' ? 'Order History' : 'My Commissions'}
            </h1>

            {dataLoading ? (
              <div className="flex justify-center py-20">
                <Loader size={32} className="animate-spin text-amber-600" />
              </div>
            ) : (
              <>
                {/* ==================== ORDERS TAB ==================== */}
                {activeTab === 'orders' && (
                  <div className="space-y-6">
                    {orders.length > 0 ? (
                      orders.map(order => (
                        <div 
                          key={order.id} 
                          className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden"
                        >
                          {/* Order Header */}
                          <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100">
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <span className="font-semibold text-stone-900">#{order.orderNumber}</span>
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${getOrderStatusStyle(order.status)}`}>
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
                            <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full ${getPaymentStatusStyle(order.paymentStatus)}`}>
                              <CreditCard size={12} />
                              {order.paymentStatus.replace('_', ' ')}
                            </span>
                          </div>

                          {/* Order Items */}
                          <div className="divide-y divide-stone-50">
                            {order.items?.map((item, idx) => (
                              <div key={idx} className="p-6 flex gap-4">
                                <div className="w-16 h-16 bg-stone-100 rounded-lg overflow-hidden flex-shrink-0">
                                  {item.artwork?.images?.[0]?.url ? (
                                    <img 
                                      src={item.artwork.images[0].url} 
                                      alt={item.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-stone-300">
                                      <Image size={24} />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-stone-900">{item.title}</p>
                                  {item.artwork?.medium && (
                                    <p className="text-xs text-stone-500 uppercase tracking-wide mt-1">
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

                          {/* Tracking Info (if shipped) */}
                          {order.trackingNumber && (
                            <div className="px-6 py-3 bg-blue-50 border-t border-blue-100 flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm text-blue-700">
                                <Truck size={16} />
                                <span>Tracking: {order.trackingNumber}</span>
                              </div>
                              <a 
                                href={`https://www.google.com/search?q=${order.trackingNumber}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-blue-600 font-medium hover:underline"
                              >
                                Track Package →
                              </a>
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
                    {commissions.length > 0 ? (
                      commissions.map(comm => (
                        <div 
                          key={comm.id} 
                          className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden"
                        >
                          {/* Commission Header */}
                          <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100">
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <span className="font-semibold text-stone-900">{comm.artStyle}</span>
                                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getCommissionStatusStyle(comm.status)}`}>
                                  {comm.status.replace('_', ' ')}
                                </span>
                              </div>
                              <p className="text-xs text-stone-500">
                                #{comm.commissionNumber} • Submitted on {new Date(comm.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full ${getPaymentStatusStyle(comm.paymentStatus)}`}>
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
                                <p className="text-sm font-medium text-stone-900">{comm.size}</p>
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
                                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-stone-200"
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
                                      className="w-20 h-20 rounded-lg object-cover flex-shrink-0 border border-stone-200"
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Payment Actions */}
                          <div className="px-6 pb-6">
                            {/* CASE 1: Commission accepted, needs 70% deposit */}
                            {comm.status === 'ACCEPTED' && comm.paymentStatus === 'UNPAID' && comm.finalPrice && (
                              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <AlertCircle size={16} className="text-amber-600" />
                                    <p className="text-sm font-medium text-amber-800">Deposit Required</p>
                                  </div>
                                  <p className="text-xs text-amber-700">
                                    Pay 70% deposit (${(Number(comm.finalPrice) * 0.7).toLocaleString()}) to begin work
                                  </p>
                                </div>
                                <Link
                                  to={`/commission/payment/${comm.id}`}
                                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 
                                           bg-amber-600 text-white rounded-lg hover:bg-amber-700 
                                           transition-colors text-sm font-medium whitespace-nowrap"
                                >
                                  <CreditCard size={16} />
                                  Pay Deposit
                                  <ArrowRight size={14} />
                                </Link>
                              </div>
                            )}

                            {/* CASE 2: Deposit paid, work in progress */}
                            {comm.paymentStatus === 'DEPOSIT_PAID' && comm.status !== 'COMPLETED' && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                                <CheckCircle size={18} className="text-blue-600 flex-shrink-0" />
                                <div>
                                  <p className="text-sm font-medium text-blue-800">Deposit Paid</p>
                                  <p className="text-xs text-blue-700">
                                    Your artist is working on your commission. 
                                    Remaining balance of ${Number(comm.balanceAmount || Number(comm.finalPrice) * 0.3).toLocaleString()} due upon completion.
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* CASE 3: Work complete, needs 30% balance */}
                            {comm.status === 'COMPLETED' && comm.paymentStatus === 'DEPOSIT_PAID' && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <CheckCircle size={16} className="text-green-600" />
                                    <p className="text-sm font-medium text-green-800">Commission Complete!</p>
                                  </div>
                                  <p className="text-xs text-green-700">
                                    Pay the remaining 30% balance to finalize your commission
                                  </p>
                                </div>
                                <Link
                                  to={`/commission/payment/${comm.id}`}
                                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 
                                           bg-stone-900 text-white rounded-lg hover:bg-stone-800 
                                           transition-colors text-sm font-medium whitespace-nowrap"
                                >
                                  <CreditCard size={16} />
                                  Pay Balance (${Number(comm.balanceAmount || Number(comm.finalPrice) * 0.3).toLocaleString()})
                                  <ArrowRight size={14} />
                                </Link>
                              </div>
                            )}

                            {/* CASE 4: Fully paid */}
                            {comm.paymentStatus === 'FULLY_PAID' && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                                <CheckCircle size={18} className="text-green-600 flex-shrink-0" />
                                <div>
                                  <p className="text-sm font-medium text-green-800">Fully Paid</p>
                                  <p className="text-xs text-green-700">
                                    Total paid: ${Number(comm.finalPrice).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* CASE 5: Waiting for price / review */}
                            {(comm.status === 'PENDING' || comm.status === 'REVIEWING') && (
                              <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 flex items-center gap-3">
                                <Clock size={18} className="text-stone-500 flex-shrink-0" />
                                <div>
                                  <p className="text-sm font-medium text-stone-700">Under Review</p>
                                  <p className="text-xs text-stone-500">
                                    The artist is reviewing your request. You'll be notified once a price is set.
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

// Empty State Component
const EmptyState = ({ icon, title, description, actionLabel, actionLink }) => (
  <div className="text-center py-16 bg-white rounded-xl border border-stone-200 shadow-sm">
    <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6">
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