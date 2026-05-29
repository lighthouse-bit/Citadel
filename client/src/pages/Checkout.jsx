// src/pages/Checkout.jsx

import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
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
  // VERIFY PAYMENT AFTER PAYSTACK REDIRECT
  // =========================================================

  useEffect(() => {
    const reference =
      searchParams.get('reference') ||
      searchParams.get('trxref');

    console.log('Checkout mounted');
    console.log('Reference:', reference);

    // Prevent duplicate verification calls
    if (reference && !hasVerified.current) {
      hasVerified.current = true;

      setStep('verify');

      verifyPayment(reference);
    }
  }, []);

  // =========================================================
  // HANDLE INPUT CHANGES
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
    console.log('Starting verification...');
    console.log('Reference:', reference);

    setVerifying(true);

    try {
      const response = await paymentsAPI.verifyPayment(reference);

      console.log('Verification response:', response.data);

      if (response.data.success) {
        console.log('Payment verified successfully');

        // =================================================
        // CLEAR CART COMPLETELY
        // =================================================

        clearCart();

        // Extra safety
        localStorage.removeItem('citadel_cart');
        sessionStorage.removeItem('citadel_cart');

        // =================================================
        // SAVE ORDER
        // =================================================

        setCompletedOrder(
          response.data.order || response.data.commission
        );

        // =================================================
        // SHOW SUCCESS
        // =================================================

        setStep('success');

        toast.success('Payment successful!');
      } else {
        console.error('Verification failed');

        toast.error('Payment verification failed');

        setStep('failed');
      }
    } catch (err) {
      console.error('Verification error:', err);

      toast.error('Failed to verify payment');

      setStep('failed');
    } finally {
      setVerifying(false);
    }
  };

  // =========================================================
  // HANDLE PAYMENT SUBMIT
  // =========================================================

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();

    try {
      setIsProcessing(true);

      // Your existing payment initialization logic goes here

      // Example:
      //
      // const response = await paymentsAPI.initializePayment({
      //   email: formData.email,
      //   amount: cartTotal,
      //   cartItems,
      //   shippingDetails: formData,
      // });
      //
      // window.location.href = response.data.authorization_url;

    } catch (err) {
      console.error(err);

      toast.error('Failed to initialize payment');
    } finally {
      setIsProcessing(false);
    }
  };

  // =========================================================
  // SUCCESS PAGE
  // =========================================================

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-10 rounded-2xl text-center shadow-lg max-w-md w-full"
        >
          <CheckCircle
            className="text-green-500 mx-auto mb-6"
            size={70}
          />

          <h2 className="text-3xl font-semibold mb-3">
            Payment Successful!
          </h2>

          <p className="text-gray-600 mb-8">
            Your order has been confirmed and your cart has been cleared.
          </p>

          <button
            onClick={() => navigate('/account')}
            className="w-full bg-black text-white py-4 rounded-xl font-medium hover:bg-gray-900 transition"
          >
            View My Orders
          </button>
        </motion.div>
      </div>
    );
  }

  // =========================================================
  // VERIFYING SCREEN
  // =========================================================

  if (verifying || step === 'verify') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader
            className="animate-spin mx-auto mb-4 text-amber-600"
            size={48}
          />

          <p className="text-lg font-medium">
            Verifying your payment...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // FAILED SCREEN
  // =========================================================

  if (step === 'failed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="bg-white p-10 rounded-2xl shadow-lg max-w-md w-full text-center">
          <h2 className="text-3xl font-semibold mb-4 text-red-600">
            Verification Failed
          </h2>

          <p className="text-gray-600 mb-8">
            We could not verify your payment automatically.
          </p>

          <button
            onClick={() => navigate('/account')}
            className="w-full bg-black text-white py-4 rounded-xl font-medium hover:bg-gray-900 transition"
          >
            Go To My Account
          </button>
        </div>
      </div>
    );
  }

  // =========================================================
  // CHECKOUT FORM
  // =========================================================

  return (
    <div className="pt-20 max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12">
      {/* LEFT SIDE */}
      <div>
        <h1 className="text-3xl font-semibold mb-8">
          Checkout
        </h1>

        <form onSubmit={handlePaymentSubmit}>
          {/* YOUR FORM FIELDS */}

          <button
            type="submit"
            disabled={isProcessing}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white py-4 rounded-xl font-medium transition disabled:opacity-70"
          >
            {isProcessing
              ? 'Processing...'
              : `Pay $${cartTotal.toLocaleString()} via Paystack`}
          </button>
        </form>
      </div>

      {/* RIGHT SIDE */}
      <div className="lg:pt-12">
        <h2 className="text-xl font-semibold mb-6">
          Order Summary
        </h2>

        <div className="bg-white border rounded-2xl p-6">
          {cartItems.map((item) => (
            <div
              key={item.id}
              className="flex justify-between py-3 border-b last:border-0"
            >
              <span className="font-medium">
                {item.title}
              </span>

              <span>
                ${parseFloat(item.price).toLocaleString()}
              </span>
            </div>
          ))}

          <div className="flex justify-between text-lg font-bold mt-6 pt-6 border-t">
            <span>Total</span>

            <span>
              ${cartTotal.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;