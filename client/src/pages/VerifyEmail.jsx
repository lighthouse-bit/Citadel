import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const hasRun = useRef(false); // Prevent double-call in React Strict Mode

  useEffect(() => {
    // Prevent running twice in React 18 Strict Mode
    if (hasRun.current) return;
    hasRun.current = true;

    const token = searchParams.get('token');

    console.log('🔍 VerifyEmail Page Loaded');
    console.log('  Raw search params:', window.location.search);
    console.log('  Extracted token:', token);
    console.log('  Token length:', token?.length);

    if (!token) {
      console.log('  ❌ No token in URL');
      setStatus('error');
      return;
    }

    const verify = async () => {
      try {
        console.log('  📡 Calling API:', `${API_URL}/auth/verify-email?token=${token}`);
        
        const response = await axios.get(`${API_URL}/auth/verify-email`, {
          params: { token: token } // Let axios handle the encoding
        });
        
        console.log('  ✅ Response:', response.data);

        if (response.data.message === 'Email already verified') {
          setStatus('already');
        } else {
          setStatus('success');
        }
      } catch (error) {
        console.error('  ❌ Error:', error.response?.data || error.message);
        setStatus('error');
      }
    };

    verify();
  }, [searchParams]);

  return (
    <div className="pt-32 pb-20 min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white p-10 rounded-xl shadow-lg border border-stone-200 text-center">
        
        {/* Loading */}
        {status === 'loading' && (
          <>
            <Loader size={48} className="animate-spin text-amber-600 mx-auto mb-6" />
            <h2 className="text-2xl text-stone-900 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              Verifying Your Account
            </h2>
            <p className="text-stone-500">Please wait...</p>
          </>
        )}

        {/* Success */}
        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} className="text-green-500" />
            </div>
            <h2 className="text-2xl text-stone-900 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              Account Verified!
            </h2>
            <p className="text-stone-500 mb-8">
              Your email has been successfully verified. Welcome to the Citadel Atelier.
            </p>
            <Link to="/" className="w-full inline-flex justify-center items-center px-6 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-800">
              Go to Homepage
            </Link>
          </>
        )}

        {/* Already Verified */}
        {status === 'already' && (
          <>
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} className="text-blue-500" />
            </div>
            <h2 className="text-2xl text-stone-900 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              Already Verified
            </h2>
            <p className="text-stone-500 mb-8">Your email was already verified. You're all set!</p>
            <Link to="/" className="w-full inline-flex justify-center items-center px-6 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-800">
              Go to Homepage
            </Link>
          </>
        )}

        {/* Error */}
        {status === 'error' && (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle size={40} className="text-red-500" />
            </div>
            <h2 className="text-2xl text-stone-900 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              Verification Failed
            </h2>
            <p className="text-stone-500 mb-4">The verification link is invalid or has expired.</p>
            <ul className="text-stone-500 text-sm text-left mb-8 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-amber-600 mt-0.5">•</span>
                The link may have already been used
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 mt-0.5">•</span>
                A newer verification email may have been sent
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 mt-0.5">•</span>
                The link might have been truncated by your email client
              </li>
            </ul>
            <Link to="/" className="w-full inline-flex justify-center items-center px-6 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-800">
              Back to Citadel
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;