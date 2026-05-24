// src/pages/Checkout.jsx
import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Loader, ShoppingBag, AlertCircle } from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { ordersAPI, paymentsAPI } from '../services/api';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────
// Cart Image Helper
// ─────────────────────────────────────────────────────────
const CartImage = ({ src, alt }) => {
  const fallback =
    "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=200&h=200&fit=crop";

  return (
    <img
      src={src || fallback}
      alt={alt}
      className="w-full h-full object-cover"
      onError={(e) => (e.target.src = fallback)}
    />
  );
};

// ─────────────────────────────────────────────────────────
// Checkout Form
// ─────────────────────────────────────────────────────────
const CheckoutForm = ({ formData, cartItems, cartTotal }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      // 1. Create order
      const orderPayload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        items: cartItems.map((item) => ({ id: item.id })),
        shippingAddress: {
          line1: formData.address,
          city: formData.city,
          state: formData.state || '',
          postalCode: formData.zip,
          country: formData.country,
        },
      };

      const orderRes = await ordersAPI.create(orderPayload);
      const order = orderRes.data;

      // 2. Initialize Paystack
      const paymentRes = await paymentsAPI.createArtworkPayment(order.id);
      const { authorizationUrl, reference } = paymentRes.data;

      // 3. Save pending order as backup
      localStorage.setItem(
        'pending_order',
        JSON.stringify({
          orderId: order.id,
          orderNumber: order.orderNumber,
          reference,
          email: formData.email,
          firstName: formData.firstName,
        })
      );

      // 4. Redirect to Paystack
      window.location.href = authorizationUrl;
    } catch (error) {
      console.error(error);
      toast.error(
        error.response?.data?.error || 'Failed to process order. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handlePayment}>
      <div className="bg-white p-8 rounded-xl border mb-6">
        <h2 className="text-xl mb-6">Contact & Shipping</h2>

        <input
          name="firstName"
          placeholder="First Name"
          value={formData.firstName}
          onChange={formData.onChange}
          className="w-full mb-3 p-3 border rounded-lg"
          required
        />

        <input
          name="lastName"
          placeholder="Last Name"
          value={formData.lastName}
          onChange={formData.onChange}
          className="w-full mb-3 p-3 border rounded-lg"
          required
        />

        <input
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={formData.onChange}
          className="w-full mb-3 p-3 border rounded-lg"
          required
        />

        <input
          name="address"
          placeholder="Address"
          value={formData.address}
          onChange={formData.onChange}
          className="w-full mb-3 p-3 border rounded-lg"
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <input
            name="city"
            placeholder="City"
            value={formData.city}
            onChange={formData.onChange}
            className="p-3 border rounded-lg"
            required
          />

          <input
            name="zip"
            placeholder="ZIP"
            value={formData.zip}
            onChange={formData.onChange}
            className="p-3 border rounded-lg"
            required
          />
        </div>

        <input
          name="country"
          value={formData.country}
          onChange={formData.onChange}
          className="w-full mt-3 p-3 border rounded-lg"
          required
        />
      </div>

      <button
        disabled={isProcessing}
        className="w-full bg-amber-600 hover:bg-amber-700 text-white py-4 rounded-xl font-medium transition disabled:opacity-70"
      >
        {isProcessing ? (
          <span className="flex items-center gap-2 justify-center">
            <Loader className="animate-spin" size={18} />
            Redirecting to Paystack...
          </span>
        ) : (
          <>Pay ${cartTotal.toLocaleString()} via Paystack</>
        )}
      </button>

      <p className="text-center text-xs text-gray-500 mt-4">
        Secured by Paystack • Payments are safe and encrypted
      </p>
    </form>
  );
};

// ─────────────────────────────────────────────────────────
// Payment Success Handler (FIXED & COMPLETE)
// ─────────────────────────────────────────────────────────
const PaymentSuccessHandler = ({ onSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const reference = searchParams.get('reference') || searchParams.get('trxref');

        if (!reference) {
          setError('Missing payment reference. Please contact support.');
          return;
        }

        const pendingOrderStr = localStorage.getItem('pending_order');
        const pendingOrder = pendingOrderStr ? JSON.parse(pendingOrderStr) : {};

        if (!pendingOrder.orderId) {
          setError('Order information is missing. Please check your orders.');
          return;
        }

        // === CRITICAL: Verify with backend ===
        const response = await paymentsAPI.verifyPayment(reference);

        if (response.data.success) {
          localStorage.removeItem('pending_order');
          onSuccess(pendingOrder);
        } else {
          setError('Payment verification failed. Please contact support.');
        }
      } catch (err) {
        console.error('Verification failed:', err);
        setError(
          err.response?.data?.error ||
            'Failed to verify payment. If your card was charged, please contact support.'
        );
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [searchParams, onSuccess]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-amber-600" size={48} />
          <p className="text-lg font-medium">Verifying your payment...</p>
          <p className="text-sm text-gray-500 mt-2">Please do not close or refresh this page</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-6">
          <AlertCircle className="text-red-500 mx-auto mb-4" size={60} />
          <h2 className="text-2xl font-semibold mb-2">Payment Verification Issue</h2>
          <p className="text-gray-600 mb-8">{error}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/account"
              className="bg-black text-white px-8 py-3.5 rounded-xl font-medium"
            >
              View My Orders
            </Link>
            <button
              onClick={() => navigate('/shop')}
              className="border border-gray-300 px-8 py-3.5 rounded-xl font-medium"
            >
              Browse More Art
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// ─────────────────────────────────────────────────────────
// Main Checkout Page
// ─────────────────────────────────────────────────────────
const Checkout = () => {
  const { cartItems, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState(
    searchParams.get('reference') || searchParams.get('trxref') ? 'verify' : 'form'
  );

  const [completedOrder, setCompletedOrder] = useState(null);

  const [formData, setFormData] = useState({
    email: user?.email || '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'United States',
  });

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSuccess = (order) => {
    clearCart();
    setCompletedOrder(order);
    setStep('success');
  };

  // Success Page
  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-10 rounded-2xl text-center shadow-lg max-w-md"
        >
          <CheckCircle className="text-green-500 mx-auto mb-6" size={70} />
          <h2 className="text-3xl font-semibold mb-2">Payment Successful!</h2>
          <p className="text-gray-600 mb-8">
            Order #{completedOrder?.orderNumber} has been confirmed.
          </p>
          <button
            onClick={() => navigate('/account')}
            className="w-full bg-black text-white py-4 rounded-xl font-medium hover:bg-gray-900"
          >
            View My Orders
          </button>
        </motion.div>
      </div>
    );
  }

  // Verification Handler
  if (step === 'verify') {
    return <PaymentSuccessHandler onSuccess={handleSuccess} />;
  }

  // Empty Cart
  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag size={60} className="mx-auto text-gray-300 mb-4" />
          <p className="text-xl mb-4">Your cart is empty</p>
          <Link to="/shop" className="text-amber-600 underline">
            Browse Artworks
          </Link>
        </div>
      </div>
    );
  }

  // Main Checkout
  return (
    <div className="pt-20 max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12">
      <div>
        <h1 className="text-3xl font-semibold mb-8">Checkout</h1>
        <CheckoutForm
          formData={{ ...formData, onChange: handleChange }}
          cartItems={cartItems}
          cartTotal={cartTotal}
        />
      </div>

      <div className="lg:pt-12">
        <h2 className="text-xl font-semibold mb-6">Order Summary</h2>
        <div className="bg-white border rounded-2xl p-6">
          {cartItems.map((item) => (
            <div
              key={item.id}
              className="flex justify-between py-3 border-b last:border-0"
            >
              <span className="font-medium">{item.title}</span>
              <span>${parseFloat(item.price).toLocaleString()}</span>
            </div>
          ))}

          <div className="flex justify-between text-lg font-bold mt-6 pt-6 border-t">
            <span>Total</span>
            <span>${cartTotal.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;