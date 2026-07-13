import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader, MailX, XCircle } from 'lucide-react';
import { wishlistAPI } from '../services/api';
import SEO from '../components/common/SEO';

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      return;
    }
    wishlistAPI.unsubscribe(token).then(() => setStatus('success')).catch(() => setStatus('error'));
  }, [searchParams]);

  return (
    <div className="min-h-screen pt-28 pb-20 bg-stone-50 px-6 grid place-items-center">
      <SEO title="Email preferences" noIndex />
      <div className="max-w-lg w-full bg-white border border-stone-200 rounded-2xl p-8 text-center shadow-sm">
        {status === 'loading' && <><Loader className="animate-spin text-amber-600 mx-auto mb-5" size={42} /><h1 className="font-serif text-3xl">Updating preferences…</h1></>}
        {status === 'success' && <><CheckCircle className="text-green-600 mx-auto mb-5" size={48} /><h1 className="font-serif text-3xl mb-3">You’re unsubscribed</h1><p className="text-stone-500 mb-7">Optional wishlist, new-artwork and marketing emails have been turned off. Essential account and order messages will continue.</p><Link to="/account" className="inline-flex items-center gap-2 bg-stone-900 text-white px-6 py-3 rounded-lg"><MailX size={17} /> Manage preferences</Link></>}
        {status === 'error' && <><XCircle className="text-red-500 mx-auto mb-5" size={48} /><h1 className="font-serif text-3xl mb-3">Link unavailable</h1><p className="text-stone-500 mb-7">This unsubscribe link is invalid. Sign in to manage your email preferences directly.</p><Link to="/" className="inline-block bg-stone-900 text-white px-6 py-3 rounded-lg">Return home</Link></>}
      </div>
    </div>
  );
};

export default Unsubscribe;
