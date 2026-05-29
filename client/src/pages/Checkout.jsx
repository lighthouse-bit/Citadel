// src/pages/Checkout.jsx

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Loader } from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { paymentsAPI } from '../services/api';
import toast from 'react-hot-toast';

const Checkout = () => {
  const { cartItems, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const hasVerified = useRef(false);

  const [step, setStep] = useState('form');

  console.log('🔥 CHECKOUT LOADED');

  useEffect(() => {
    const reference = searchParams.get('reference');
    const error = searchParams.get('error');

    console.log('URL:', window.location.href);
    console.log('REFERENCE:', reference);
    console.log('ERROR:', error);

    if (error) {
      setStep('failed');
      return;
    }

    if (!reference || hasVerified.current) return;

    hasVerified.current = true;

    verifyPayment(reference);
  }, [searchParams]);

  const verifyPayment = async (reference) => {
    console.log('🔥 VERIFY START:', reference);

    setStep('verify');

    try {
      const res = await paymentsAPI.verifyPayment(reference);

      console.log('🔥 VERIFY RESPONSE:', res.data);

      if (!res.data.success) {
        toast.error('Payment failed');
        setStep('failed');
        return;
      }

      // CLEAR CART (CRITICAL)
      clearCart();
      localStorage.removeItem('citadel_cart');

      toast.success('Payment successful');

      setStep('success');

      setTimeout(() => {
        navigate('/account', { replace: true });
      }, 1200);

    } catch (err) {
      console.error(err);

      toast.error('Verification error');

      setStep('failed');
    }
  };

  // =====================
  // SUCCESS
  // =====================
  if (step === 'success') {
    return (
      <div>
        <CheckCircle size={60} color="green" />
        <h1>Payment Successful</h1>
      </div>
    );
  }

  // =====================
  // VERIFYING
  // =====================
  if (step === 'verify') {
    return (
      <div>
        <Loader className="animate-spin" />
        <p>Verifying payment...</p>
      </div>
    );
  }

  // =====================
  // FAILED
  // =====================
  if (step === 'failed') {
    return (
      <div>
        <h1>Payment Failed</h1>
        <button onClick={() => navigate('/checkout')}>
          Try Again
        </button>
      </div>
    );
  }

  // =====================
  // NORMAL CHECKOUT
  // =====================
  return (
    <div>
      <h1>Checkout</h1>

      {cartItems.map(item => (
        <div key={item.id}>
          {item.title} - ${item.price}
        </div>
      ))}

      <h2>Total: ${cartTotal}</h2>
    </div>
  );
};

export default Checkout;