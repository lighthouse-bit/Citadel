// client/src/pages/Checkout.jsx
import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { motion } from 'framer-motion';
import { Trash2, CreditCard, Lock } from 'lucide-react';
import { useCart } from '../hooks/useCart';
import toast from 'react-hot-toast';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { cartItems, getTotal, clearCart } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [shippingInfo, setShippingInfo] = useState({
    name: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!stripe || !elements) return;

    setIsProcessing(true);

    try {
      // Create payment intent on backend
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems,
          shipping: shippingInfo,
        }),
      });

      const { clientSecret } = await response.json();

      // Confirm payment
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name: shippingInfo.name,
            email: shippingInfo.email,
          },
        },
      });

      if (error) {
        toast.error(error.message);
      } else if (paymentIntent.status === 'succeeded') {
        toast.success('Payment successful! Order confirmed.');
        clearCart();
        // Redirect to confirmation page
      }
    } catch (error) {
      toast.error('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const cardStyle = {
    style: {
      base: {
        color: '#ffffff',
        fontFamily: 'Inter, sans-serif',
        fontSize: '16px',
        '::placeholder': {
          color: '#6b7280',
        },
      },
      invalid: {
        color: '#ef4444',
      },
    },
  };

  if (cartItems.length === 0) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-serif text-white mb-4">Your cart is empty</h2>
          <a href="/shop" className="btn-primary">
            Browse Shop
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-serif text-white mb-12 text-center">Checkout</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Cart Items */}
          <div>
            <h2 className="text-2xl font-serif text-white mb-6">Your Order</h2>
            <div className="space-y-4">
              {cartItems.map((item) => (
                <CartItem key={item.id} item={item} />
              ))}
            </div>
            
            {/* Order Summary */}
            <div className="mt-8 p-6 bg-citadel-charcoal border border-citadel-gold/20">
              <div className="flex justify-between text-gray-400 mb-2">
                <span>Subtotal</span>
                <span>${getTotal().toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-400 mb-2">
                <span>Shipping</span>
                <span>Calculated at next step</span>
              </div>
              <div className="border-t border-citadel-gold/20 pt-4 mt-4">
                <div className="flex justify-between text-xl">
                  <span className="text-white">Total</span>
                  <span className="text-citadel-gold font-serif">
                    ${getTotal().toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Shipping Information */}
              <div className="bg-citadel-charcoal p-6 border border-citadel-gold/20">
                <h2 className="text-xl font-serif text-white mb-4">Shipping Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Full Name"
                      required
                      value={shippingInfo.name}
                      onChange={(e) => setShippingInfo({...shippingInfo, name: e.target.value})}
                      className="w-full bg-citadel-dark border border-citadel-gold/30 px-4 py-3 
                               text-white focus:border-citadel-gold focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="email"
                      placeholder="Email"
                      required
                      value={shippingInfo.email}
                      onChange={(e) => setShippingInfo({...shippingInfo, email: e.target.value})}
                      className="w-full bg-citadel-dark border border-citadel-gold/30 px-4 py-3 
                               text-white focus:border-citadel-gold focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Address"
                      required
                      value={shippingInfo.address}
                      onChange={(e) => setShippingInfo({...shippingInfo, address: e.target.value})}
                      className="w-full bg-citadel-dark border border-citadel-gold/30 px-4 py-3 
                               text-white focus:border-citadel-gold focus:outline-none"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="City"
                    required
                    value={shippingInfo.city}
                    onChange={(e) => setShippingInfo({...shippingInfo, city: e.target.value})}
                    className="w-full bg-citadel-dark border border-citadel-gold/30 px-4 py-3 
                             text-white focus:border-citadel-gold focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="State/Province"
                    value={shippingInfo.state}
                    onChange={(e) => setShippingInfo({...shippingInfo, state: e.target.value})}
                    className="w-full bg-citadel-dark border border-citadel-gold/30 px-4 py-3 
                             text-white focus:border-citadel-gold focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="ZIP/Postal Code"
                    required
                    value={shippingInfo.zip}
                    onChange={(e) => setShippingInfo({...shippingInfo, zip: e.target.value})}
                    className="w-full bg-citadel-dark border border-citadel-gold/30 px-4 py-3 
                             text-white focus:border-citadel-gold focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Country"
                    required
                    value={shippingInfo.country}
                    onChange={(e) => setShippingInfo({...shippingInfo, country: e.target.value})}
                    className="w-full bg-citadel-dark border border-citadel-gold/30 px-4 py-3 
                             text-white focus:border-citadel-gold focus:outline-none"
                  />
                </div>
              </div>

              {/* Payment */}
              <div className="bg-citadel-charcoal p-6 border border-citadel-gold/20">
                <h2 className="text-xl font-serif text-white mb-4 flex items-center gap-2">
                  <CreditCard size={20} className="text-citadel-gold" />
                  Payment Details
                </h2>
                <div className="bg-citadel-dark border border-citadel-gold/30 p-4">
                  <CardElement options={cardStyle} />
                </div>
                <p className="text-gray-500 text-sm mt-3 flex items-center gap-2">
                  <Lock size={14} />
                  Secured by Stripe. Your payment information is encrypted.
                </p>
              </div>

              <button
                type="submit"
                disabled={!stripe || isProcessing}
                className="w-full btn-primary flex items-center justify-center gap-2
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-citadel-dark border-t-transparent 
                                  rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Complete Order - ${getTotal().toLocaleString()}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

const CartItem = ({ item }) => {
  const { removeFromCart } = useCart();

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex gap-4 p-4 bg-citadel-charcoal border border-citadel-gold/20"
    >
      <img
        src={item.image}
        alt={item.title}
        className="w-24 h-24 object-cover"
      />
      <div className="flex-grow">
        <h3 className="text-white font-serif">{item.title}</h3>
        <p className="text-gray-400 text-sm">{item.size}</p>
        <p className="text-citadel-gold mt-2">${item.price.toLocaleString()}</p>
      </div>
      <button
        onClick={() => removeFromCart(item.id)}
        className="text-gray-400 hover:text-red-500 transition-colors"
      >
        <Trash2 size={18} />
      </button>
    </motion.div>
  );
};

const Checkout = () => {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm />
    </Elements>
  );
};

export default Checkout;