import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Package, 
  Truck, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  CreditCard, 
  Save, 
  Loader,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ordersAPI } from '../../services/api';

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Local state for editable fields
  const [trackingNumber, setTrackingNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Status options matching backend enums
  const statusOptions = [
    { value: 'PENDING', label: 'Pending', icon: Clock },
    { value: 'PROCESSING', label: 'Processing', icon: Package },
    { value: 'SHIPPED', label: 'Shipped', icon: Truck },
    { value: 'COMPLETED', label: 'Completed', icon: CheckCircle },
    { value: 'CANCELLED', label: 'Cancelled', icon: XCircle },
  ];

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

  const handleStatusChange = async (newStatus) => {
    // Optimistic update
    const oldStatus = order.status;
    setOrder(prev => ({ ...prev, status: newStatus }));

    try {
      await ordersAPI.updateStatus(id, { status: newStatus });
      toast.success(`Order status updated to ${newStatus.toLowerCase()}`);
    } catch (error) {
      // Revert on failure
      setOrder(prev => ({ ...prev, status: oldStatus }));
      toast.error('Failed to update status');
    }
  };

  const handleSaveDetails = async () => {
    setIsSaving(true);
    try {
      await ordersAPI.updateStatus(id, { 
        trackingNumber, 
        internalNotes: notes 
      });
      toast.success('Order details saved successfully');
    } catch (error) {
      toast.error('Failed to save details');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusStyle = (status) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      PROCESSING: 'bg-blue-100 text-blue-800 border-blue-200',
      SHIPPED: 'bg-purple-100 text-purple-800 border-purple-200',
      COMPLETED: 'bg-green-100 text-green-800 border-green-200',
      CANCELLED: 'bg-red-100 text-red-800 border-red-200',
    };
    return styles[status] || 'bg-stone-100 text-stone-700 border-stone-200';
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sticky top-0 bg-stone-100 z-10 py-4 border-b border-stone-200">
        <div>
          <button
            onClick={() => navigate('/admin/orders')}
            className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900 
                     transition-colors mb-2"
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
        
        <div className="flex items-center gap-3">
          <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusStyle(order.status)}`}>
            {order.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Order Items */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-stone-200">
              <h2 className="text-lg font-semibold text-stone-900">Items ({order.items.length})</h2>
            </div>
            <div className="divide-y divide-stone-200">
              {order.items.map((item) => (
                <div key={item.id} className="p-6 flex gap-4">
                  <div className="w-20 h-20 flex-shrink-0 bg-stone-100 rounded-lg overflow-hidden">
                    <img
                      src={item.artwork?.images?.[0]?.url || '/placeholder.jpg'}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-stone-900">{item.title}</h3>
                    {item.artwork && (
                      <p className="text-sm text-stone-500">
                        {item.artwork.medium} • {item.artwork.width}x{item.artwork.height} {item.artwork.unit}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-stone-900">${Number(item.price).toLocaleString()}</p>
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
                <span className="text-stone-600">Shipping</span>
                <span className="text-stone-900">
                  {Number(order.shippingCost) === 0 ? 'Free' : `$${Number(order.shippingCost).toLocaleString()}`}
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

          {/* Update Status */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Update Status</h2>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleStatusChange(option.value)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                    order.status === option.value
                      ? 'bg-stone-900 text-white border-stone-900 shadow-md'
                      : 'bg-white text-stone-600 border-stone-300 hover:border-amber-500 hover:text-amber-700'
                  }`}
                >
                  <option.icon size={16} />
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Logistics & Notes */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Logistics & Notes</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-stone-600 mb-2">Tracking Number</label>
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
                      className="p-2.5 bg-stone-100 rounded-lg text-stone-600 hover:bg-stone-200 border border-stone-200"
                      title="Track Package"
                    >
                      <ExternalLink size={20} />
                    </a>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-stone-600 mb-2">Internal Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Private notes visible only to admins..."
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg
                           focus:outline-none focus:border-amber-500 text-stone-900 resize-none"
                />
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={handleSaveDetails}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-stone-900 text-white 
                           rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Save Details
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (1/3) */}
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
                  <span className="text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded">Customer</span>
                </div>
              </div>
              <div className="pt-2 border-t border-stone-100 flex items-center gap-3 text-sm">
                <Mail size={16} className="text-stone-400" />
                <a href={`mailto:${order.customer?.email}`} className="text-amber-600 hover:text-amber-700 hover:underline">
                  {order.customer?.email}
                </a>
              </div>
              {order.customer?.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone size={16} className="text-stone-400" />
                  <span className="text-stone-600">{order.customer.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Shipping Address</h2>
            <div className="flex items-start gap-3">
              <MapPin size={18} className="text-stone-400 mt-0.5" />
              <div className="text-sm text-stone-600 leading-relaxed">
                <p className="font-medium text-stone-900 mb-1">
                  {order.customer?.firstName} {order.customer?.lastName}
                </p>
                <p>{order.shippingAddress?.line1}</p>
                {order.shippingAddress?.line2 && <p>{order.shippingAddress.line2}</p>}
                <p>
                  {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.postalCode}
                </p>
                <p className="uppercase text-stone-500 text-xs font-medium mt-1">
                  {order.shippingAddress?.country}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Payment</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                <span className="text-stone-600 text-sm">Status</span>
                <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  order.paymentStatus === 'FULLY_PAID' || order.paymentStatus === 'PAID'
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {order.paymentStatus.replace('_', ' ')}
                </span>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <CreditCard size={16} className="text-stone-400" />
                <span className="text-stone-600">
                  {order.stripePaymentIntentId ? 'Processed via Stripe' : 'Manual Payment'}
                </span>
              </div>
              
              {order.stripePaymentIntentId && (
                <div className="text-xs text-stone-400 font-mono break-all">
                  ID: {order.stripePaymentIntentId}
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