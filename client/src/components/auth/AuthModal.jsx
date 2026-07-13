import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, ArrowRight, Loader, CheckCircle, MailCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import GoogleAuthButton from './GoogleAuthButton';

const AuthModal = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState('login'); // 'login', 'register', 'verification'
  const [isLoading, setIsLoading] = useState(false);
  const { login, register, googleAuth, resendVerification } = useAuth();
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });

  const resetForm = useCallback(() => {
    setFormData({ firstName: '', lastName: '', email: '', password: '' });
    setMode('login');
  }, []);

  const handleClose = useCallback(() => {
    onClose();
    window.setTimeout(resetForm, 300);
  }, [onClose, resetForm]);

  useEffect(() => {
    if (!isOpen) return undefined;

    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => {
      dialogRef.current?.querySelector('button, input, [href], [tabindex]:not([tabindex="-1"])')?.focus();
    }, 0);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') handleClose();
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = [...dialogRef.current.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      )];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, [handleClose, isOpen]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      let result;
      if (mode === 'login') {
        result = await login(formData.email, formData.password);
        if (result.success) {
          onClose();
          resetForm();
        }
      } else {
        result = await register(formData);
        if (result.success && result.needsVerification) {
          // Switch to verification screen instead of closing
          setMode('verification');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setIsLoading(true);
    try {
      await resendVerification();
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleCredential = useCallback(async (credential) => {
    setIsLoading(true);
    try {
      const result = await googleAuth(credential);
      if (result.success) {
        if (result.needsVerification) {
          const [firstName = '', ...lastNameParts] = result.user.name.split(' ');
          setFormData({
            firstName,
            lastName: lastNameParts.join(' '),
            email: result.user.email,
            password: '',
          });
          setMode('verification');
        } else {
          onClose();
          resetForm();
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [googleAuth, onClose, resetForm]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            aria-hidden="true"
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />

          {/* Modal */}
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-dialog-title"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 m-auto z-[70] w-full max-w-md h-fit bg-white rounded-xl shadow-2xl overflow-hidden"
          >
            {/* ========== VERIFICATION SUCCESS SCREEN ========== */}
            {mode === 'verification' ? (
              <div className="p-8 text-center">
                {/* Close Button */}
                <button 
                  onClick={handleClose} 
                  aria-label="Close account dialog"
                  className="absolute top-4 right-4 text-stone-400 hover:text-stone-900"
                >
                  <X size={24} />
                </button>

                {/* Icon */}
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MailCheck size={40} className="text-amber-600" />
                </div>

                {/* Title */}
                <h2
                  id="auth-dialog-title"
                  className="text-2xl text-stone-900 mb-3"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Verify Your Email
                </h2>

                {/* Message */}
                <p className="text-stone-600 mb-2">
                  Welcome to Citadel, <span className="font-medium">{formData.firstName}</span>!
                </p>
                <p className="text-stone-500 text-sm mb-6">
                  We've sent a verification link to:
                </p>
                
                {/* Email Display */}
                <div className="bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 mb-6 inline-flex items-center gap-2">
                  <Mail size={16} className="text-amber-600" />
                  <span className="font-medium text-stone-900">{formData.email}</span>
                </div>

                {/* Instructions */}
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 mb-6 text-left">
                  <p className="text-sm text-amber-800 font-medium mb-2">Next Steps:</p>
                  <ol className="text-sm text-amber-700 space-y-1.5 list-decimal list-inside">
                    <li>Open your email inbox</li>
                    <li>Look for an email from <strong>Citadel Art Atelier</strong></li>
                    <li>Click the <strong>"Verify Account"</strong> button</li>
                    <li>Return here and start exploring!</li>
                  </ol>
                </div>

                {/* Note */}
                <p className="text-xs text-stone-400 mb-6">
                  Can't find the email? Check your <strong>spam</strong> or <strong>promotions</strong> folder.
                </p>

                {/* Actions */}
                <div className="space-y-3">
                  <button
                    onClick={handleResendEmail}
                    disabled={isLoading}
                    className="w-full py-3 border border-stone-300 rounded-lg text-stone-700 
                             hover:bg-stone-50 transition-colors text-sm font-medium
                             disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <Loader size={16} className="animate-spin" />
                    ) : (
                      <Mail size={16} />
                    )}
                    Resend Verification Email
                  </button>
                  
                  <button
                    onClick={handleClose}
                    className="w-full py-3 bg-stone-900 text-white rounded-lg 
                             hover:bg-stone-800 transition-colors text-sm font-medium"
                  >
                    Got it, I'll check my email
                  </button>
                </div>
              </div>
            ) : (
              /* ========== LOGIN / REGISTER FORM ========== */
              <>
                {/* Header */}
                <div className="p-6 border-b border-stone-100 flex justify-between items-center">
                  <h2
                    id="auth-dialog-title"
                    className="text-2xl text-stone-900"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                  </h2>
                  <button onClick={handleClose} aria-label="Close account dialog" className="text-stone-400 hover:text-stone-900">
                    <X size={24} />
                  </button>
                </div>

                {/* Form */}
                <div className="p-8">
                  <GoogleAuthButton
                    onCredential={handleGoogleCredential}
                    disabled={isLoading}
                  />

                  <div className="flex items-center gap-3 my-5">
                    <div className="h-px flex-1 bg-stone-200" />
                    <span className="text-xs uppercase tracking-wider text-stone-400">or</span>
                    <div className="h-px flex-1 bg-stone-200" />
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === 'register' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="auth-first-name" className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">
                            First Name
                          </label>
                          <div className="relative">
                            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                            <input
                              type="text"
                              id="auth-first-name"
                              name="firstName"
                              autoComplete="given-name"
                              required
                              value={formData.firstName}
                              onChange={handleChange}
                              className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg 
                                       focus:border-amber-500 focus:outline-none text-stone-900"
                              placeholder="John"
                            />
                          </div>
                        </div>
                        <div>
                          <label htmlFor="auth-last-name" className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">
                            Last Name
                          </label>
                          <input
                            type="text"
                            id="auth-last-name"
                            name="lastName"
                            autoComplete="family-name"
                            required
                            value={formData.lastName}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg 
                                     focus:border-amber-500 focus:outline-none text-stone-900"
                            placeholder="Doe"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label htmlFor="auth-email" className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">
                        Email
                      </label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                          type="email"
                          id="auth-email"
                          name="email"
                          autoComplete="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg 
                                   focus:border-amber-500 focus:outline-none text-stone-900"
                          placeholder="you@email.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="auth-password" className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                          type="password"
                          id="auth-password"
                          name="password"
                          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                          required
                          minLength={6}
                          value={formData.password}
                          onChange={handleChange}
                          className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg 
                                   focus:border-amber-500 focus:outline-none text-stone-900"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 bg-stone-900 text-white rounded-lg font-medium 
                               hover:bg-stone-800 transition-colors flex items-center justify-center gap-2 mt-6
                               disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <Loader size={18} className="animate-spin" />
                      ) : (
                        <>
                          {mode === 'login' ? 'Sign In' : 'Create Account'}
                          <ArrowRight size={18} />
                        </>
                      )}
                    </button>
                  </form>

                  <div className="mt-6 text-center">
                    <p className="text-stone-500 text-sm">
                      {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
                      <button
                        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                        className="ml-2 text-amber-700 font-medium hover:text-amber-800 underline"
                      >
                        {mode === 'login' ? 'Register' : 'Log in'}
                      </button>
                    </p>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AuthModal;
