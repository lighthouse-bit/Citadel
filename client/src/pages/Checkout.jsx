// src/pages/Checkout.jsx
import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Loader, ShoppingBag } from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { paymentsAPI } from '../services/api';
import toast from 'react-hot-toast';

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

  // FIX: safer reference extraction (no dependency issues)
  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');

    if (reference && step !== 'success') {
      setStep('verify');
      verifyPayment(reference);
    }
  }, [searchParams.toString()]); // FIXED

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const verifyPayment = async (reference) => {
    setVerifying(true);

    try {
      const response = await paymentsAPI.verifyPayment(reference);

      if (response.data.success) {
        clearCart();
        localStorage.removeItem('citadel_cart');
        sessionStorage.removeItem('citadel_cart');

        setCompletedOrder(response.data.order || response.data.commission);
        setStep('success');

        toast.success('Payment Successful!');
      } else {
        toast.error('Payment verification failed');
        navigate('/checkout');
      }
    } catch (err) {
      console.error('Verification error:', err);
      toast.error('Failed to verify payment');
      navigate('/checkout');
    } finally {
      setVerifying(false);
    }
  };

  // ✅ FIXED: THIS WAS EMPTY BEFORE (THIS WAS YOUR MAIN BUG)
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();

    try {
      setIsProcessing(true);

      const response = await paymentsAPI.initializePayment({
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        address: formData.address,
        cartItems,
        total: cartTotal,
      });

      // redirect to Paystack
      window.location.href = response.data.authorizationUrl;

    } catch (err) {
      console.error(err);
      toast.error('Failed to initialize payment');
    } finally {
      setIsProcessing(false);
    }
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
          <p className="text-gray-600 mb-8">Your order has been confirmed and cart cleared.</p>
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

  // Verifying
  if (verifying || step === 'verify') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-amber-600" size={48} />
          <p className="text-lg font-medium">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12">
      <div>
        <h1 className="text-3xl font-semibold mb-8">Checkout</h1>

        <form onSubmit={handlePaymentSubmit}>
          <button
            disabled={isProcessing}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white py-4 rounded-xl font-medium transition disabled:opacity-70"
          >
            {isProcessing
              ? 'Processing...'
              : `Pay $${cartTotal.toLocaleString()} via Paystack`}
          </button>
        </form>
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