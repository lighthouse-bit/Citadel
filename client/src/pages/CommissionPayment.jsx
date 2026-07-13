// src/pages/CommissionPayment.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, CheckCircle, Loader, AlertCircle } from 'lucide-react';
import { commissionsAPI } from '../services/api';
import api from '../services/api';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────
// Main Commission Payment Page
// ─────────────────────────────────────────────────────────
const CommissionPayment = () => {
  const { id }             = useParams();
  const navigate           = useNavigate();
  const [searchParams]     = useSearchParams();

  const [commission, setCommission] = useState(null);
  const [amounts, setAmounts]       = useState(null);
  const [paymentType, setPaymentType] = useState('deposit');
  const [isLoading, setIsLoading]   = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [succeeded, setSucceeded]   = useState(false);
  const [error, setError]           = useState(null);

  // ── Check if returning from Paystack ─────────────────────
  const isReturningFromPaystack = searchParams.get('reference') ||
                                  searchParams.get('trxref') ||
                                  searchParams.get('status') === 'success';

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        // ── Handle return from Paystack ───────────────────
        if (isReturningFromPaystack) {
          const reference = searchParams.get('reference') ||
                            searchParams.get('trxref');

          if (reference) {
            // Verify payment
            const verifyRes = await api.post('/payments/verify', { reference });

            if (verifyRes.data.success) {
              setSucceeded(true);
              toast.success(
                verifyRes.data.type === 'deposit'
                  ? 'Deposit paid! The artist will begin your commission shortly.'
                  : 'Final payment complete! Your commission is fully paid.'
              );
            } else {
              setError('Payment verification failed. Please contact support.');
            }
          } else {
            setError('Payment reference not found.');
          }
          setIsLoading(false);
          return;
        }

        // ── Normal page load — initialize payment ─────────
        const commRes = await commissionsAPI.getMyCommissionById(id);
        const comm    = commRes.data.commission;

        if (!comm) throw new Error('Commission not found');
        setCommission(comm);

        if (comm.paymentStatus === 'FULLY_PAID') {
          throw new Error('This commission has already been fully paid.');
        }

        if (comm.status !== 'ACCEPTED' && comm.paymentStatus !== 'DEPOSIT_PAID') {
          throw new Error(
            'This commission is not ready for payment yet. ' +
            'It must be accepted by the admin first.'
          );
        }

        const type = comm.paymentStatus === 'DEPOSIT_PAID' ? 'balance' : 'deposit';
        setPaymentType(type);

        // Get payment amounts from backend
        let response;
        if (type === 'deposit') {
          response = await api.post('/payments/commission-deposit', {
            commissionId: id,
          });
        } else {
          response = await api.post('/payments/commission-balance', {
            commissionId: id,
          });
        }

        setAmounts({
          finalPrice:        response.data.finalPrice,
          depositAmount:     response.data.depositAmount,
          balanceAmount:     response.data.balanceAmount,
          depositPercentage: response.data.depositPercentage || 70,
          authorizationUrl:  response.data.authorizationUrl,
          reference:         response.data.reference,
        });

      } catch (err) {
        console.error('Payment init error:', err);
        setError(err.response?.data?.error || err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) init();
  }, [id]);

  // ── Handle Pay Button ─────────────────────────────────────
  const handlePay = () => {
    if (!amounts?.authorizationUrl) return;
    setIsProcessing(true);
    // Redirect to Paystack
    window.location.href = amounts.authorizationUrl;
  };

  // ── Loading ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 bg-stone-50 flex items-center
                      justify-center">
        <div className="text-center">
          <Loader size={32} className="animate-spin text-amber-600 mx-auto mb-4" />
          <p className="text-stone-500">
            {isReturningFromPaystack
              ? 'Verifying your payment...'
              : 'Loading payment details...'}
          </p>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen pt-20 bg-stone-50 flex items-center
                      justify-center px-4">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-red-200
                        max-w-md w-full text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-serif text-stone-900 mb-2">
            Payment Unavailable
          </h2>
          <p className="text-stone-500 mb-6">{error}</p>
          <button
            onClick={() => navigate('/account')}
            className="px-6 py-2 bg-stone-900 text-white rounded-lg
                       hover:bg-stone-800 transition-colors"
          >
            Back to My Account
          </button>
        </div>
      </div>
    );
  }

  // ── Success Screen ────────────────────────────────────────
  if (succeeded) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen pt-20 bg-stone-50 flex items-center
                   justify-center px-4"
      >
        <div className="bg-white p-10 rounded-xl shadow-lg border border-stone-200
                        max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center
                          justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-serif text-stone-900 mb-4">
            {paymentType === 'deposit'
              ? 'Deposit Paid Successfully!'
              : 'Payment Complete!'}
          </h2>
          <p className="text-stone-500 mb-8">
            {paymentType === 'deposit'
              ? 'Your 70% deposit has been received. The artist will begin work on your commission shortly. An invoice has been sent to your email.'
              : 'Your final payment has been received. Your commission is now fully paid. A final invoice has been sent to your email.'}
          </p>
          <button
            onClick={() => navigate('/account')}
            className="w-full px-8 py-3 bg-stone-900 text-white rounded-lg
                       hover:bg-stone-800 transition-colors"
          >
            View My Commissions
          </button>
        </div>
      </motion.div>
    );
  }

  // ── Main Payment Page ─────────────────────────────────────
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
            {paymentType === 'deposit'
              ? '70% Deposit Payment'
              : '30% Final Balance'}
          </h1>
          <p className="text-stone-500 mt-2">
            Commission #{commission?.commissionNumber}
          </p>
        </div>

        {/* Payment Card */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-8">

          {/* Payment Summary */}
          <div className="bg-stone-50 rounded-lg p-6 border border-stone-200 mb-6">
            <h3 className="font-medium text-stone-900 mb-4">Payment Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Commission</span>
                <span className="text-stone-900">
                  #{commission?.commissionNumber}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Style</span>
                <span className="text-stone-900">{commission?.artStyle}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Size</span>
                <span className="text-stone-900">{commission?.size}</span>
              </div>
              {amounts && (
                <>
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
                </>
              )}
            </div>
          </div>

          {/* How It Works */}
          {paymentType === 'deposit' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex gap-3">
                <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-800 font-medium text-sm mb-1">
                    How It Works
                  </p>
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

          {/* Paystack Info */}
          <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#00C3F7] rounded-lg flex items-center
                              justify-center flex-shrink-0">
                <Lock size={18} className="text-white" />
              </div>
              <div>
                <p className="text-stone-900 font-medium text-sm">
                  Pay securely with Paystack
                </p>
                <p className="text-stone-500 text-xs mt-0.5">
                  Cards, bank transfer, USSD and more
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-stone-400 flex items-center gap-1 mb-6">
            <Lock size={12} />
            You will be redirected to Paystack to complete your payment securely.
          </p>

          {/* Pay Button */}
          <button
            onClick={handlePay}
            disabled={isProcessing || !amounts}
            className="w-full py-4 bg-stone-900 text-white rounded-lg font-medium
                       hover:bg-stone-800 transition-colors flex items-center
                       justify-center gap-2 disabled:opacity-50
                       disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader size={18} className="animate-spin" />
                Redirecting to Paystack...
              </>
            ) : (
              <>
                <Lock size={18} />
                Pay ${amounts
                  ? paymentType === 'deposit'
                    ? Number(amounts.depositAmount).toLocaleString()
                    : Number(amounts.balanceAmount).toLocaleString()
                  : '...'
                } via Paystack
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommissionPayment;
