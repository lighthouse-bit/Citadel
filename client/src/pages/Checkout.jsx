// src/pages/Checkout.jsx

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Loader } from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { paymentsAPI } from '../services/api';
import toast from 'react-hot-toast';

const Checkout = () => {
  const { cartItems, cartTotal, clearCart } = useCart();
  const { user } = useAuth();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const hasVerified = useRef(false);

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

  // =========================================================
  // PAYMENT VERIFICATION (FIXED)
  // =========================================================

  useEffect(() => {
    const reference =
      searchParams.get('reference') ||
      searchParams.get('trxref');

    const error = searchParams.get('error');

    console.log('🔥 Checkout mounted');
    console.log('🔥 Full URL:', window.location.href);
    console.log('🔥 Reference:', reference);
    console.log('🔥 Error:', error);

    // Handle backend error redirect
    if (error) {
      setStep('failed');
      return;
    }

    // Prevent duplicate execution (StrictMode safe)
    if (!reference || hasVerified.current) return;

    hasVerified.current = true;

    verifyPayment(reference);
  }, [searchParams]);

  // =========================================================
  // HANDLE INPUT CHANGE
  // =========================================================

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // =========================================================
  // VERIFY PAYMENT
  // =========================================================

  const verifyPayment = async (reference) => {
    console.log('🚀 VERIFY START:', reference);

    setVerifying(true);
    setStep('verify');

    try {
      const response = await paymentsAPI.verifyPayment(reference);

      console.log('📥 VERIFY RESPONSE:', response.data);

      if (!response.data.success) {
        toast.error('Payment verification failed');
        setStep('failed');
        return;
      }

      // ==============================
      // SAFE CART CLEAR (IMPORTANT FIX)
      // ==============================

      clearCart();

      // extra safety (persisted storage)
      localStorage.removeItem('citadel_cart');
      sessionStorage.removeItem('citadel_cart');

      // allow state flush before navigation
      setTimeout(() => {
        setStep('success');

        toast.success('Payment successful!');

        setTimeout(() => {
          navigate('/account', { replace: true });
        }, 1200);
      }, 100);

      setCompletedOrder(
        response.data.order || response.data.commission || null
      );

    } catch (err) {
      console.error('❌ VERIFY ERROR:', err);

      toast.error('Failed to verify payment');

      setStep('failed');
    } finally {
      setVerifying(false);
    }
  };

  // =========================================================
  // SUCCESS SCREEN
  // =========================================================

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-10 rounded-2xl text-center shadow-lg max-w-md"
        >
          <CheckCircle className="text-green-500 mx-auto mb-6" size={70} />
          <h2 className="text-3xl font-semibold mb-2">
            Payment Successful!
          </h2>

          <p className="text-gray-600 mb-8">
            Your order has been confirmed.
          </p>

          <button
            onClick={() => navigate('/account')}
            className="w-full bg-black text-white py-4 rounded-xl"
          >
            View My Orders
          </button>
        </motion.div>
      </div>
    );
  }

  // =========================================================
  // VERIFY SCREEN
  // =========================================================

  if (verifying || step === 'verify') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="animate-spin" size={48} />
        <p>Verifying payment...</p>
      </div>
    );
  }

  // =========================================================
  // FAILED SCREEN
  // =========================================================

  if (step === 'failed') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h2>Payment Failed</h2>

        <button onClick={() => navigate('/checkout')}>
          Try Again
        </button>
      </div>
    );
  }

  // =========================================================
  // CHECKOUT FORM
  // =========================================================

  return (
    <div className="pt-20 max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12">
      <div>
        <h1 className="text-3xl font-semibold mb-8">Checkout</h1>

        <form onSubmit={(e) => e.preventDefault()}>
          {/* your form stays untouched */}

          <button
            disabled={isProcessing}
            className="w-full bg-amber-600 text-white py-4 rounded-xl"
          >
            Pay ${cartTotal.toLocaleString()}
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-6">Order Summary</h2>

        {cartItems.map((item) => (
          <div key={item.id}>
            {item.title} - ${item.price}
          </div>
        ))}

        <h3>Total: ${cartTotal}</h3>
      </div>
    </div>
  );
};

export default Checkout;