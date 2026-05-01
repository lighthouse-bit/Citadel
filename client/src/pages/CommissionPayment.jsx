import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { motion } from 'framer-motion';
import { Lock, CheckCircle, Loader, AlertCircle } from 'lucide-react';
import { paymentsAPI, commissionsAPI } from '../services/api';
import api from '../services/api'; // ✅ import the raw axios instance too
import toast from 'react-hot-toast';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// ─────────────────────────────────────────────────────────
// Inner Payment Form Component
// ─────────────────────────────────────────────────────────
const PaymentForm = ({ commission, paymentType, clientSecret, amounts }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement),
        billing_details: {
          email: commission.customer?.email,
          name:  `${commission.customer?.firstName} ${commission.customer?.lastName}`,
        },
      },
    });

    if (error) {
      toast.error(error.message);
      setIsProcessing(false);
      return;
    }

    if (paymentIntent.status === 'succeeded') {
      // ✅ Use raw api instance directly - bypasses any import cache issue
      try {
        const response = await api.post(
          `/commissions/${commission.id}/confirm-payment`,
          {
            paymentIntentId: paymentIntent.id,
            paymentType,     // 'deposit' or 'balance'
          }
        );
        console.log('DB updated successfully:', response.data);
      } catch (err) {
        console.error('DB update failed:', err.response?.data || err.message);
        toast.error(
          'Payment received but status update failed. Please contact support with your payment ID: ' 
          + paymentIntent.id
        );
      }

      setSucceeded(true);
      toast.success(
        paymentType === 'deposit'
          ? 'Deposit paid! The artist will begin your commission shortly.'
          : 'Final payment complete! Your commission is fully paid.'
      );
    }
  };

  // ── Success Screen ────────────────────────────────────
  if (succeeded) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-green-500" />
        </div>
        <h2 className="text-2xl font-serif text-stone-900 mb-4">
          {paymentType === 'deposit' ? 'Deposit Paid Successfully!' : 'Payment Complete!'}
        </h2>
        <p className="text-stone-500 mb-8">
          {paymentType === 'deposit'
            ? 'Your 70% deposit has been received. The artist will begin work on your commission shortly.'
            : 'Your final payment has been received. Your commission is now fully paid.'}
        </p>
        <button
          onClick={() => navigate('/account')}
          className="px-8 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors"
        >
          View My Commissions
        </button>
      </motion.div>
    );
  }

  // ── Payment Form ──────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Summary */}
      <div className="bg-stone-50 rounded-lg p-6 border border-stone-200">
        <h3 className="font-medium text-stone-900 mb-4">Payment Summary</h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-stone-500">Commission</span>
            <span className="text-stone-900">#{commission.commissionNumber}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-stone-500">Style</span>
            <span className="text-stone-900">{commission.artStyle}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-stone-500">Total Price</span>
            <span className="text-stone-900">
              ${Number(amounts.finalPrice).toLocaleString()}
            </span>
          </div>
          <div className="border-t border-stone-200 pt-3">
            <div className="flex justify-between font-semibold">
              <span className="text-stone-900">
                {paymentType === 'deposit'
                  ? `Deposit (${amounts.depositPercentage}%)`
                  : 'Remaining Balance (30%)'}
              </span>
              <span className="text-amber-700 text-xl">
                ${paymentType === 'deposit'
                  ? Number(amounts.depositAmount).toLocaleString()
                  : Number(amounts.balanceAmount).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      {paymentType === 'deposit' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-800 font-medium text-sm mb-1">How It Works</p>
              <ul className="text-amber-700 text-sm space-y-1">
                <li>• Pay 70% deposit today to begin the commission</li>
                <li>• Artist starts work after deposit is confirmed</li>
                <li>• You'll receive progress updates throughout</li>
                <li>• Pay the remaining 30% upon completion</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Card Input */}
      <div className="bg-white rounded-lg p-6 border border-stone-200">
        <h3 className="font-medium text-stone-900 mb-4">Card Details</h3>
        <div className="p-4 border border-stone-200 rounded-lg bg-stone-50">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#1c1b19',
                  '::placeholder': { color: '#9ca3af' },
                },
                invalid: { color: '#ef4444' },
              },
            }}
          />
        </div>
        <p className="text-xs text-stone-400 mt-3 flex items-center gap-1">
          <Lock size={12} /> Secured by Stripe. Your payment info is encrypted.
        </p>
      </div>

      <button
        type="submit"
        disabled={isProcessing || !stripe}
        className="w-full py-4 bg-stone-900 text-white rounded-lg font-medium
                   hover:bg-stone-800 transition-colors flex items-center justify-center gap-2
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <>
            <Loader size={18} className="animate-spin" />
            Processing Payment...
          </>
        ) : (
          <>
            <Lock size={18} />
            Pay ${paymentType === 'deposit'
              ? Number(amounts.depositAmount).toLocaleString()
              : Number(amounts.balanceAmount).toLocaleString()}
          </>
        )}
      </button>
    </form>
  );
};

// ─────────────────────────────────────────────────────────
// Main Commission Payment Page
// ─────────────────────────────────────────────────────────
const CommissionPayment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [commission, setCommission]     = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [amounts, setAmounts]           = useState(null);
  const [paymentType, setPaymentType]   = useState('deposit');
  const [isLoading, setIsLoading]       = useState(true);
  const [error, setError]               = useState(null);

  useEffect(() => {
    const initPayment = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch commission directly by ID
        const commRes = await commissionsAPI.getMyCommissionById(id);
        const comm = commRes.data.commission;

        if (!comm) throw new Error('Commission not found');
        setCommission(comm);

        // 2. Check commission is payable
        if (comm.paymentStatus === 'FULLY_PAID') {
          throw new Error('This commission has already been fully paid.');
        }

        if (comm.status !== 'ACCEPTED' && comm.paymentStatus !== 'DEPOSIT_PAID') {
          throw new Error(
            'This commission is not ready for payment yet. ' +
            'It must be accepted by the admin first.'
          );
        }

        // 3. Determine payment type
        const type = comm.paymentStatus === 'DEPOSIT_PAID' ? 'balance' : 'deposit';
        setPaymentType(type);

        // 4. Create payment intent using raw api call
        let response;
        if (type === 'deposit') {
          response = await api.post('/payments/commission-deposit', { 
            commissionId: id 
          });
        } else {
          response = await api.post('/payments/commission-balance', { 
            commissionId: id 
          });
        }

        setClientSecret(response.data.clientSecret);
        setAmounts({
          finalPrice:        response.data.finalPrice,
          depositAmount:     response.data.depositAmount,
          balanceAmount:     response.data.balanceAmount,
          depositPercentage: response.data.depositPercentage || 70,
        });

      } catch (err) {
        console.error('Payment init error:', err);
        setError(err.response?.data?.error || err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) initPayment();
  }, [id]);

  // ── Loading ───────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 bg-stone-50 flex items-center justify-center">
        <Loader size={32} className="animate-spin text-amber-600" />
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen pt-20 bg-stone-50 flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-red-200 max-w-md w-full text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-serif text-stone-900 mb-2">Payment Unavailable</h2>
          <p className="text-stone-500 mb-6">{error}</p>
          <button
            onClick={() => navigate('/account')}
            className="px-6 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors"
          >
            Back to My Account
          </button>
        </div>
      </div>
    );
  }

  // ── Main Page ─────────────────────────────────────────
  return (
    <div className="min-h-screen pt-24 pb-16 bg-stone-50">
      <div className="max-w-2xl mx-auto px-6">

        {/* Header */}
        <div className="text-center mb-10">
          <p
            className="text-xs tracking-widest uppercase text-amber-700 mb-3"
            style={{ letterSpacing: '0.2em' }}
          >
            Secure Payment
          </p>
          <h1
            className="text-3xl text-stone-900"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {paymentType === 'deposit' ? '70% Deposit Payment' : '30% Final Balance'}
          </h1>
          <p className="text-stone-500 mt-2">
            Commission #{commission?.commissionNumber}
          </p>
        </div>

        {/* Payment Card */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-8">
          {clientSecret && amounts && commission ? (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <PaymentForm
                commission={commission}
                paymentType={paymentType}
                clientSecret={clientSecret}
                amounts={amounts}
              />
            </Elements>
          ) : (
            <div className="text-center py-8 text-stone-500">
              Unable to initialize payment. Please try again.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default CommissionPayment;