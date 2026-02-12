import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, CheckCircle, Loader } from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { ordersAPI } from '../services/api';
import toast from 'react-hot-toast';

// Helper image component
const CartImage = ({ src, alt }) => {
  const fallback = "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=200&h=200&fit=crop";
  return (
    <img
      src={src || fallback}
      alt={alt}
      className="w-full h-full object-cover"
      onError={(e) => e.target.src = fallback}
    />
  );
};

const Checkout = () => {
  const { cartItems, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState(1); // 1: Details, 2: Payment, 3: Success

  // Form State
  const [formData, setFormData] = useState({
    email: user?.email || '',
    firstName: user?.name?.split(' ')[0] || '',
    lastName: user?.name?.split(' ')[1] || '',
    address: '',
    city: '',
    zip: '',
    country: 'United States',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      // 1. Create Order Payload
      const orderPayload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        items: cartItems.map(item => ({ id: item.id })), // Send IDs
        shippingAddress: {
          line1: formData.address,
          city: formData.city,
          postalCode: formData.zip,
          country: formData.country,
        }
      };

      // 2. Call API
      await ordersAPI.create(orderPayload);

      // 3. Simulate Payment (Success)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      clearCart();
      setStep(3);
      toast.success('Order placed successfully!');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || 'Order failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (cartItems.length === 0 && step !== 3) {
    return (
      <div className="min-h-screen pt-20 bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-serif text-stone-900 mb-4">Your collection is empty</h2>
          <Link to="/gallery" className="text-amber-700 hover:text-amber-800 underline">
            Return to Gallery
          </Link>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="min-h-screen pt-20 bg-stone-50 flex items-center justify-center px-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-xl shadow-lg border border-stone-200 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={32} />
          </div>
          <h2 className="text-3xl font-serif text-stone-900 mb-2">Order Confirmed</h2>
          <p className="text-stone-500 mb-8">
            Thank you for your purchase, {formData.firstName}. We'll send a confirmation email to {formData.email} shortly.
          </p>
          <Link 
            to="/"
            className="w-full inline-flex justify-center items-center px-6 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors"
          >
            Return Home
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen bg-stone-50 pb-24">
      <div className="max-w-7xl mx-auto px-6">
        <h1 className="text-4xl font-serif text-stone-900 mb-12 text-center">Secure Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          
          {/* Left Column: Form */}
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-xl border border-stone-200 shadow-sm">
              <h2 className="text-xl font-serif text-stone-900 mb-6">Contact & Shipping</h2>
              <form id="checkout-form" onSubmit={handlePayment} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      required
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      required
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">Address</label>
                  <input
                    type="text"
                    name="address"
                    required
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">City</label>
                    <input
                      type="text"
                      name="city"
                      required
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">ZIP Code</label>
                    <input
                      type="text"
                      name="zip"
                      required
                      value={formData.zip}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </form>
            </div>

            <div className="bg-white p-8 rounded-xl border border-stone-200 shadow-sm">
              <h2 className="text-xl font-serif text-stone-900 mb-6">Payment Method</h2>
              <div className="p-4 border border-stone-200 rounded-lg bg-stone-50 flex items-center justify-between">
                <span className="text-stone-600">Credit / Debit Card</span>
                <div className="flex gap-2">
                  <div className="w-8 h-5 bg-stone-300 rounded"></div>
                  <div className="w-8 h-5 bg-stone-300 rounded"></div>
                </div>
              </div>
              <p className="text-xs text-stone-400 mt-4 flex items-center gap-1">
                <Lock size={12} /> Payments are secure and encrypted.
              </p>
            </div>
          </div>

          {/* Right Column: Summary */}
          <div>
            <div className="bg-white p-8 rounded-xl border border-stone-200 shadow-sm sticky top-28">
              <h2 className="text-xl font-serif text-stone-900 mb-6">Order Summary</h2>
              
              <div className="space-y-6 mb-8 max-h-80 overflow-y-auto pr-2">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-16 h-16 rounded-md overflow-hidden bg-stone-200 flex-shrink-0">
                      <CartImage 
                        src={item.images?.[0]?.url || item.images?.[0]} 
                        alt={item.title} 
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-stone-900">{item.title}</h3>
                      <p className="text-xs text-stone-500 uppercase">{item.medium}</p>
                    </div>
                    <p className="text-stone-900">${item.price.toLocaleString()}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-6 border-t border-stone-100">
                <div className="flex justify-between text-stone-500">
                  <span>Subtotal</span>
                  <span>${cartTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-stone-500">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
                <div className="flex justify-between text-xl font-serif text-stone-900 pt-4 border-t border-stone-200">
                  <span>Total</span>
                  <span>${cartTotal.toLocaleString()}</span>
                </div>
              </div>

              <button
                type="submit"
                form="checkout-form"
                disabled={isProcessing}
                className="w-full mt-8 bg-amber-600 text-white py-4 rounded-lg font-medium tracking-wide uppercase 
                         hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>Processing...</>
                ) : (
                  <>Complete Order <ArrowRight size={16} /></>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Checkout;