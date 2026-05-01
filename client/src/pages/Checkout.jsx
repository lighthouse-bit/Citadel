// src/pages/Checkout.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, CheckCircle, Loader, ShoppingBag } from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { ordersAPI } from '../services/api';
import api from '../services/api';
import toast from 'react-hot-toast';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// ─────────────────────────────────────────────────────────
// Cart Image Helper
// ─────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────
// Inner Checkout Form (needs Stripe context)
// ─────────────────────────────────────────────────────────
const CheckoutForm = ({ formData, cartItems, cartTotal, onSuccess }) => {
  const stripe                      = useStripe();
  const elements                    = useElements();
  const { user }                    = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);

    try {
      // ── Step 1: Create order in DB ──────────────────────
      const orderPayload = {
        firstName: formData.firstName,
        lastName:  formData.lastName,
        email:     formData.email,
        items:     cartItems.map(item => ({ id: item.id })),
        shippingAddress: {
          line1:      formData.address,
          city:       formData.city,
          state:      formData.state || '',
          postalCode: formData.zip,
          country:    formData.country,
        },
      };

      const orderRes = await ordersAPI.create(orderPayload);
      const order    = orderRes.data;

      // ── Step 2: Create Stripe payment intent ────────────
      const intentRes = await api.post('/payments/artwork-payment', {
        orderId: order.id,
      });

      const { clientSecret } = intentRes.data;

      // ── Step 3: Confirm card payment ────────────────────
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name:  `${formData.firstName} ${formData.lastName}`,
            email: formData.email,
          },
        },
      });

      if (error) {
        toast.error(error.message);
        setIsProcessing(false);
        return;
      }

      if (paymentIntent.status === 'succeeded') {
        // ── Step 4: Confirm payment in DB ─────────────────
        try {
          await api.post(`/orders/${order.id}/confirm-payment`, {
            paymentIntentId: paymentIntent.id,
          });
        } catch (err) {
          console.error('Order confirmation failed:', err.response?.data || err.message);
          // Don't block success - Stripe already charged
        }

        onSuccess(order);
      }

    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error.response?.data?.error || 'Order failed. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <form id="checkout-form" onSubmit={handlePayment}>
      {/* Contact & Shipping Fields */}
      <div className="bg-white p-8 rounded-xl border border-stone-200 shadow-sm mb-6">
        <h2 className="text-xl font-serif text-stone-900 mb-6">Contact & Shipping</h2>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">
                First Name
              </label>
              <input
                type="text"
                name="firstName"
                required
                value={formData.firstName}
                onChange={formData.onChange}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg 
                           focus:outline-none focus:border-amber-500 text-stone-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">
                Last Name
              </label>
              <input
                type="text"
                name="lastName"
                required
                value={formData.lastName}
                onChange={formData.onChange}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg 
                           focus:outline-none focus:border-amber-500 text-stone-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={formData.onChange}
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg 
                         focus:outline-none focus:border-amber-500 text-stone-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">
              Address
            </label>
            <input
              type="text"
              name="address"
              required
              value={formData.address}
              onChange={formData.onChange}
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg 
                         focus:outline-none focus:border-amber-500 text-stone-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">
                City
              </label>
              <input
                type="text"
                name="city"
                required
                value={formData.city}
                onChange={formData.onChange}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg 
                           focus:outline-none focus:border-amber-500 text-stone-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">
                ZIP Code
              </label>
              <input
                type="text"
                name="zip"
                required
                value={formData.zip}
                onChange={formData.onChange}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg 
                           focus:outline-none focus:border-amber-500 text-stone-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">
              Country
            </label>
            <select
              name="country"
              value={formData.country}
              onChange={formData.onChange}
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg 
                         focus:outline-none focus:border-amber-500 text-stone-900"
            >
              <option>United States</option>
              <option>United Kingdom</option>
              <option>Canada</option>
              <option>Australia</option>
              <option>Germany</option>
              <option>France</option>
              <option>Nigeria</option>
              <option>South Africa</option>
              <option>Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payment Section */}
      <div className="bg-white p-8 rounded-xl border border-stone-200 shadow-sm">
        <h2 className="text-xl font-serif text-stone-900 mb-6">Payment</h2>

        {/* Stripe Card Element */}
        <div className="p-4 border border-stone-200 rounded-lg bg-stone-50 mb-4">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize:     '16px',
                  color:        '#1c1b19',
                  fontFamily:   'inherit',
                  '::placeholder': { color: '#9ca3af' },
                },
                invalid: { color: '#ef4444' },
              },
            }}
          />
        </div>

        <p className="text-xs text-stone-400 flex items-center gap-1">
          <Lock size={12} />
          Secured by Stripe. Your payment info is encrypted and never stored.
        </p>

        {/* Submit button inside form */}
        <button
          type="submit"
          disabled={isProcessing || !stripe}
          className="w-full mt-6 bg-amber-600 text-white py-4 rounded-lg font-medium 
                     tracking-wide uppercase hover:bg-amber-700 transition-colors 
                     flex items-center justify-center gap-2 disabled:opacity-50 
                     disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <Loader size={18} className="animate-spin" />
              Processing Payment...
            </>
          ) : (
            <>
              <Lock size={16} />
              Pay ${cartTotal.toLocaleString()}
            </>
          )}
        </button>
      </div>
    </form>
  );
};

// ─────────────────────────────────────────────────────────
// Main Checkout Page
// ─────────────────────────────────────────────────────────
const Checkout = () => {
  const { cartItems, cartTotal, clearCart } = useCart();
  const { user }                            = useAuth();
  const navigate                            = useNavigate();
  const [step, setStep]                     = useState(1); // 1: Form, 2: Success
  const [completedOrder, setCompletedOrder] = useState(null);

  // Form state - lifted up so summary can read it
  const [formData, setFormData] = useState({
    email:     user?.email || '',
    firstName: user?.name?.split(' ')[0] || '',
    lastName:  user?.name?.split(' ')[1] || '',
    address:   '',
    city:      '',
    state:     '',
    zip:       '',
    country:   'United States',
  });

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Called when payment succeeds
  const handleSuccess = (order) => {
    clearCart();
    setCompletedOrder(order);
    setStep(2);
    toast.success('Order placed successfully!');
  };

  // ── Empty cart ──────────────────────────────────────────
  if (cartItems.length === 0 && step !== 2) {
    return (
      <div className="min-h-screen pt-20 bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag size={48} className="mx-auto text-stone-300 mb-4" />
          <h2 className="text-2xl font-serif text-stone-900 mb-4">
            Your collection is empty
          </h2>
          <Link
            to="/gallery"
            className="text-amber-700 hover:text-amber-800 underline"
          >
            Return to Gallery
          </Link>
        </div>
      </div>
    );
  }

  // ── Success Screen ──────────────────────────────────────
  if (step === 2) {
    return (
      <div className="min-h-screen pt-20 bg-stone-50 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-10 rounded-xl shadow-lg border border-stone-200 
                     max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center 
                          justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-500" />
          </div>

          <h2 className="text-3xl font-serif text-stone-900 mb-3">
            Order Confirmed!
          </h2>

          {completedOrder && (
            <p className="text-amber-700 font-medium mb-2">
              Order #{completedOrder.orderNumber}
            </p>
          )}

          <p className="text-stone-500 mb-8">
            Thank you, {formData.firstName}! We'll send a confirmation 
            to <span className="font-medium text-stone-700">{formData.email}</span> shortly.
          </p>

          <div className="space-y-3">
            {user && (
              <button
                onClick={() => navigate('/account')}
                className="w-full px-6 py-3 bg-stone-900 text-white rounded-lg 
                           hover:bg-stone-800 transition-colors"
              >
                View My Orders
              </button>
            )}
            <Link
              to="/"
              className="w-full inline-flex justify-center items-center px-6 py-3 
                         border border-stone-200 text-stone-700 rounded-lg 
                         hover:bg-stone-50 transition-colors"
            >
              Return Home
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Main Checkout ───────────────────────────────────────
  return (
    <div className="pt-24 min-h-screen bg-stone-50 pb-24">
      <div className="max-w-7xl mx-auto px-6">

        <h1 className="text-4xl font-serif text-stone-900 mb-12 text-center">
          Secure Checkout
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">

          {/* ── Left: Form ─────────────────────────────────── */}
          <Elements stripe={stripePromise}>
            <CheckoutForm
              formData={{ ...formData, onChange: handleChange }}
              cartItems={cartItems}
              cartTotal={cartTotal}
              onSuccess={handleSuccess}
            />
          </Elements>

          {/* ── Right: Order Summary ────────────────────────── */}
          <div>
            <div className="bg-white p-8 rounded-xl border border-stone-200 
                            shadow-sm sticky top-28">
              <h2 className="text-xl font-serif text-stone-900 mb-6">
                Order Summary
              </h2>

              {/* Cart items */}
              <div className="space-y-4 mb-6 max-h-80 overflow-y-auto pr-2">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-16 h-16 rounded-lg overflow-hidden 
                                    bg-stone-100 flex-shrink-0">
                      <CartImage
                        src={item.images?.[0]?.url || item.images?.[0]}
                        alt={item.title}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-stone-900 text-sm truncate">
                        {item.title}
                      </h3>
                      <p className="text-xs text-stone-500 uppercase mt-0.5">
                        {item.medium}
                      </p>
                    </div>
                    <p className="text-stone-900 font-medium flex-shrink-0">
                      ${Number(item.price).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-3 pt-5 border-t border-stone-100">
                <div className="flex justify-between text-stone-500 text-sm">
                  <span>Subtotal</span>
                  <span>${cartTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-stone-500 text-sm">
                  <span>Shipping</span>
                  <span className="text-green-600 font-medium">Free</span>
                </div>
                <div className="flex justify-between text-stone-500 text-sm">
                  <span>Tax</span>
                  <span>$0.00</span>
                </div>
                <div className="flex justify-between text-xl font-serif 
                                text-stone-900 pt-4 border-t border-stone-200">
                  <span>Total</span>
                  <span className="text-amber-700">
                    ${cartTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Security badges */}
              <div className="mt-6 pt-4 border-t border-stone-100">
                <p className="text-xs text-stone-400 flex items-center justify-center gap-1">
                  <Lock size={11} />
                  256-bit SSL encryption · Powered by Stripe
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;