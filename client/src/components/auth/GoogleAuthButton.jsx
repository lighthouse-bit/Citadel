import { useEffect, useRef } from 'react';
import { Loader } from 'lucide-react';

const SCRIPT_ID = 'google-identity-services';
const DEFAULT_GOOGLE_CLIENT_ID = '1050404875372-dir2v8sobkf4757c129pjl0hgum3dlak.apps.googleusercontent.com';

const loadGoogleScript = () => new Promise((resolve, reject) => {
  if (window.google?.accounts?.id) {
    resolve();
    return;
  }

  const existing = document.getElementById(SCRIPT_ID);
  if (existing) {
    existing.addEventListener('load', resolve, { once: true });
    existing.addEventListener('error', reject, { once: true });
    return;
  }

  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.defer = true;
  script.onload = resolve;
  script.onerror = reject;
  document.head.appendChild(script);
});

const GoogleAuthButton = ({ onCredential, disabled = false }) => {
  const buttonRef = useRef(null);
  const onCredentialRef = useRef(onCredential);
  // OAuth client IDs are public identifiers. The environment variable allows
  // deployments to override the project default without disabling the button.
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!clientId || disabled || !buttonRef.current) return undefined;

    let cancelled = false;

    loadGoogleScript().then(() => {
      if (cancelled || !buttonRef.current) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: ({ credential }) => onCredentialRef.current(credential),
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 368,
      });
    }).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [clientId, disabled]);

  if (!clientId) return null;

  return (
    <div className="relative min-h-11 flex justify-center">
      <div ref={buttonRef} className={disabled ? 'pointer-events-none opacity-50' : ''} />
      {disabled && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70">
          <Loader size={18} className="animate-spin text-stone-600" />
        </div>
      )}
    </div>
  );
};

export default GoogleAuthButton;
