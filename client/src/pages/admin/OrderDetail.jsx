// client/src/pages/admin/OrderDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
  Loader
} from 'lucide-react';
import toast from 'react-hot-toast';

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [order, setOrder] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const fetchOrder = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setOrder({
        id: id,
        orderNumber: id,
        customer: {
          name: 'Eleanor Whitmore',
          email: 'eleanor@email.com',
          phone: '+1 (555) 123-4567',
        },
        shippingAddress: {
          line1: '123 Art Lane',
          line2: 'Apartment 4B',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'United States',
        },
        items: [
          {
            id: 'item-1',
            title: 'Ethereal Dreams',
            image: 'https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=200&h=200&fit=crop',
            price: 2500,
            medium: 'Oil on Canvas',
            size: '24x36 inches',
          }
        ],
        subtotal: 2500,
        shipping: 0,
        tax: 200,
        total: 2700,
        status: 'processing',
        paymentStatus: 'paid',
        paymentMethod: 'Credit Card (**** 4242)',
        trackingNumber: '',
        notes: '',
        createdAt: '2024-01-15T10:30:00Z',
      });
      
      setIsLoading(false);
    };

    fetchOrder();
  }, [id]);

  const statusOptions = [
    { value: 'pending', label: 'Pending', icon: Clock },
    { value: 'processing', label: 'Processing', icon: Package },
    { value: 'shipped', label: 'Shipped', icon: Truck },
    { value: 'completed', label: 'Completed', icon: CheckCircle },
    { value: 'cancelled', label: 'Cancelled', icon: XCircle },
  ];

  const handleStatusChange = async (newStatus) => {
    setOrder(prev => ({ ...prev, status: newStatus }));
    toast.success(`Order status updated to ${newStatus}`);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setOrder(prev => ({ ...prev, trackingNumber, notes }));
      toast.success('Order updated successfully');
    } catch (error) {
      toast.error('Failed to update order');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusStyle = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      processing: 'bg-blue-100 text-blue-700 border-blue-200',
      shipped: 'bg-purple-100 text-purple-700 border-purple-200',
      completed: 'bg-green-100 text-green-700 border-green-200',
      cancelled: 'bg-red-100 text-red-700 border-red-200',
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

  if (!order) {
    return (
      <div className="text-center py-24">
        <p className="text-stone-500">Order not found</p>
        <Link to="/admin/orders" className="text-amber-600 hover:text-amber-700 mt-4 inline-block">
          Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/admin/orders')}
            className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900 mb-2"
          >
            <ArrowLeft size={18} />
            Back to Orders
          </button>
          <h1 className="text-2xl text-stone-900" style={{ fontFamily: "'Playfair Display', serif" }}>
            Order {order.orderNumber}
          </h1>
        </div>
        <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusStyle(order.status)}`}>
          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-stone-200 p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Order Items</h2>
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-4">
                <img src={item.image} alt={item.title} className="w-24 h-24 object-cover rounded-lg" />
                <div className="flex-1">
                  <h3 className="font-medium text-stone-900">{item.title}</h3>
                  <p className="text-sm text-stone-500">{item.medium}</p>
                  <p className="text-sm text-stone-500">{item.size}</p>
                </div>
                <p className="font-semibold text-stone-900">${item.price.toLocaleString()}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-stone-200 p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Update Status</h2>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleStatusChange(option.value)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                    order.status === option.value
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-white text-stone-600 border-stone-300 hover:border-stone-400'
                  }`}
                >
                  <option.icon size={16} />
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Tracking & Notes</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-stone-600 mb-2">Tracking Number</label>
                <input
                  type="text"
                  value={trackingNumber || order.trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-800"
              >
                {isSaving ? <><Loader size={18} className="animate-spin" />Saving...</> : <><Save size={18} />Save</>}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-stone-200 p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Customer</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User size={20} className="text-amber-600" />
                <p className="font-medium text-stone-900">{order.customer.name}</p>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-stone-400" />
                <a href={`mailto:${order.customer.email}`} className="text-amber-600 text-sm">
                  {order.customer.email}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-stone-400" />
                <span className="text-stone-600 text-sm">{order.customer.phone}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Shipping Address</h2>
            <div className="flex gap-3">
              <MapPin size={18} className="text-stone-400 mt-0.5" />
              <div className="text-sm text-stone-600">
                <p>{order.shippingAddress.line1}</p>
                {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
                <p>{order.shippingAddress.country}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;