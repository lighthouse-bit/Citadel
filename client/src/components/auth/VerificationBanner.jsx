import { Mail, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const VerificationBanner = () => {
  const { showVerificationBanner, dismissVerificationBanner, resendVerification, user } = useAuth();

  if (!showVerificationBanner) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-600 text-white py-3 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Mail size={18} className="flex-shrink-0" />
          <p className="text-sm">
            Please verify your email address (<strong>{user?.email}</strong>) to access all features.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={resendVerification}
            className="text-xs underline hover:no-underline font-medium"
          >
            Resend Email
          </button>
          <button
            onClick={dismissVerificationBanner}
            className="p-1 hover:bg-amber-700 rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerificationBanner;