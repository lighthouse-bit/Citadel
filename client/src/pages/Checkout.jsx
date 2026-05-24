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
// Checkout Form Component
// ─────────────────────────────────────────────────────────
const CheckoutForm = ({ formData, cartItems, cartTotal, onSubmit, isProcessing }) => {
  return (
    <form onSubmit={onSubmit}>
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
// Main Checkout Page
// ─────────────────────────────────────────────────────────
const Checkout = () => {
  const { cartItems, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState('form');
  const [completedOrder, setCompletedOrder] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [verifying, setVerifying] = useState(false);

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

  // Handle redirect from Paystack
  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    if (reference) {
      setStep('verify');
      verifyPayment(reference);
    }
  }, [searchParams]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Verify payment after Paystack redirect
  const verifyPayment = async (reference) => {
    setVerifying(true);
    try {
      const response = await paymentsAPI.verifyPayment(reference);

      if (response.data.success) {
        clearCart();
        setCompletedOrder(response.data.order || response.data.commission);
        setStep('success');
        toast.success('Payment confirmed successfully!');
      } else {
        toast.error('Payment verification failed');
        setStep('form');
      }
    } catch (err) {
      console.error('Verification error:', err);
      toast.error(
        err.response?.data?.error || 
        'Failed to verify payment. Please check your orders or contact support.'
      );
      setStep('form');
    } finally {
      setVerifying(false);
    }
  };

  // Handle payment initiation
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
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

      const paymentRes = await paymentsAPI.createArtworkPayment(order.id);
      const { authorizationUrl } = paymentRes.data;

      // Save pending order
      localStorage.setItem(
        'pending_order',
        JSON.stringify({
          orderId: order.id,
          orderNumber: order.orderNumber,
          email: formData.email,
        })
      );

      window.location.href = authorizationUrl;
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || 'Failed to process payment');
    } finally {
      setIsProcessing(false);
    }
  };

  // Loading / Verifying State
  if (verifying || step === 'verify') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-amber-600" size={48} />
          <p className="text-lg font-medium">Verifying your payment...</p>
          <p className="text-sm text-gray-500 mt-2">Please do not refresh this page</p>
        </div>
      </div>
    );
  }

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
            Your order has been confirmed.
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

  // Main Checkout Page
  return (
    <div className="pt-20 max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12">
      <div>
        <h1 className="text-3xl font-semibold mb-8">Checkout</h1>
        <CheckoutForm
          formData={{ ...formData, onChange: handleChange }}
          cartItems={cartItems}
          cartTotal={cartTotal}
          onSubmit={handlePaymentSubmit}
          isProcessing={isProcessing}
        />
      </div>

      <div className="lg:pt-12">
        <h2 className="text-xl font-semibold mb-6">Order Summary</h2>
        <div className="bg-white border rounded-2xl p-6">
          {cartItems.map((item) => (
            <div key={item.id} className="flex justify-between py-3 border-b last:border-0">
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