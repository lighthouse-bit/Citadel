// src/pages/Checkout.jsx
import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, CheckCircle, Loader, ShoppingBag } from 'lucide-react';
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

      // 3. Save pending order
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
        error.response?.data?.error || 'Order failed. Please try again.'
      );
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
          className="w-full mb-3 p-3 border"
          required
        />

        <input
          name="lastName"
          placeholder="Last Name"
          value={formData.lastName}
          onChange={formData.onChange}
          className="w-full mb-3 p-3 border"
          required
        />

        <input
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={formData.onChange}
          className="w-full mb-3 p-3 border"
          required
        />

        <input
          name="address"
          placeholder="Address"
          value={formData.address}
          onChange={formData.onChange}
          className="w-full mb-3 p-3 border"
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <input
            name="city"
            placeholder="City"
            value={formData.city}
            onChange={formData.onChange}
            className="p-3 border"
            required
          />

          <input
            name="zip"
            placeholder="ZIP"
            value={formData.zip}
            onChange={formData.onChange}
            className="p-3 border"
            required
          />
        </div>
      </div>

      <button
        disabled={isProcessing}
        className="w-full bg-amber-600 text-white py-4"
      >
        {isProcessing ? (
          <span className="flex items-center gap-2 justify-center">
            <Loader className="animate-spin" size={18} />
            Redirecting...
          </span>
        ) : (
          <>Pay ${cartTotal.toLocaleString()} via Paystack</>
        )}
      </button>
    </form>
  );
};

// ─────────────────────────────────────────────────────────
// Success Handler (NO VERIFY ROUTE ANYMORE)
// ─────────────────────────────────────────────────────────
const PaymentSuccessHandler = ({ onSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const run = () => {
      try {
        const reference =
          searchParams.get('reference') || searchParams.get('trxref');

        if (!reference) {
          setError('Missing payment reference');
          setLoading(false);
          return;
        }

        const pendingOrder = JSON.parse(
          localStorage.getItem('pending_order') || '{}'
        );

        if (!pendingOrder.orderId) {
          setError('Missing order data');
          setLoading(false);
          return;
        }

        // Trust webhook (backend handles real verification)
        localStorage.removeItem('pending_order');

        setTimeout(() => {
          onSuccess(pendingOrder);
        }, 1000);
      } catch (err) {
        setError('Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [searchParams, onSuccess]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="animate-spin" />
        <p className="ml-2">Finalizing payment...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Link to="/checkout" className="underline">
            Try Again
          </Link>
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
    searchParams.get('reference') || searchParams.get('trxref')
      ? 'verify'
      : 'form'
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
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSuccess = (order) => {
    clearCart();
    setCompletedOrder(order);
    setStep('success');
  };

  if (step === 'verify') {
    return <PaymentSuccessHandler onSuccess={handleSuccess} />;
  }

  if (cartItems.length === 0 && step !== 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ShoppingBag size={40} />
        <p>Your cart is empty</p>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-10 rounded-xl text-center"
        >
          <CheckCircle className="text-green-500 mx-auto mb-4" size={50} />

          <h2 className="text-2xl mb-2">Order Confirmed!</h2>

          <p className="text-gray-600">
            Order #{completedOrder?.orderNumber}
          </p>

          <button
            onClick={() => navigate('/account')}
            className="mt-6 bg-black text-white px-6 py-3"
          >
            View Orders
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pt-20 max-w-6xl mx-auto grid grid-cols-2 gap-10">
      <CheckoutForm
        formData={{ ...formData, onChange: handleChange }}
        cartItems={cartItems}
        cartTotal={cartTotal}
      />

      <div>
        <h2 className="text-xl mb-4">Order Summary</h2>

        {cartItems.map((item) => (
          <div key={item.id} className="flex justify-between mb-2">
            <span>{item.title}</span>
            <span>${item.price}</span>
          </div>
        ))}

        <hr className="my-4" />

        <div className="flex justify-between font-bold">
          <span>Total</span>
          <span>${cartTotal.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export default Checkout;