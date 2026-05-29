import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { paymentsAPI } from '../services/api';
import toast from 'react-hot-toast';

const Checkout = () => {
  const { cartItems, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();

  const [step, setStep] = useState('form');
  const [orderId, setOrderId] = useState(null);

  const pollRef = useRef(null);

  // =====================================================
  // START PAYMENT
  // =====================================================
  const handlePayment = async () => {
    try {
      setStep('processing');

      const res = await paymentsAPI.createOrder({
        items: cartItems,
        total: cartTotal,
      });

      const { orderId, authorizationUrl } = res.data;

      setOrderId(orderId);

      window.location.href = authorizationUrl;

    } catch (err) {
      toast.error('Payment failed to start');
      setStep('form');
    }
  };

  // =====================================================
  // POLL BACKEND FOR PAYMENT STATUS
  // =====================================================
  useEffect(() => {
    if (!orderId) return;

    setStep('verifying');

    pollRef.current = setInterval(async () => {
      try {
        const res = await paymentsAPI.checkStatus(orderId);

        if (res.data.paid) {
          clearInterval(pollRef.current);

          clearCart();

          localStorage.removeItem('citadel_cart');

          toast.success('Payment successful');

          setStep('success');

          setTimeout(() => {
            navigate('/account', { replace: true });
          }, 1000);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000);

    return () => clearInterval(pollRef.current);
  }, [orderId]);

  // =====================================================
  // UI STATES
  // =====================================================
  if (step === 'success') {
    return <h1>Payment Successful</h1>;
  }

  if (step === 'verifying') {
    return <h1>Confirming payment...</h1>;
  }

  // =====================================================
  // MAIN UI
  // =====================================================
  return (
    <div>
      <h1>Checkout</h1>

      {cartItems.map(item => (
        <div key={item.id}>
          {item.title} - ${item.price}
        </div>
      ))}

      <h2>Total: ${cartTotal}</h2>

      <button onClick={handlePayment}>
        Pay Now
      </button>
    </div>
  );
};

export default Checkout;