import { useEffect, useState } from 'react';
import { Heart, Loader, MailCheck, MousePointerClick, Eye, TriangleAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { wishlistAPI } from '../../services/api';

const WishlistAlerts = () => {
  const [loading, setLoading] = useState(true);
  const [performance, setPerformance] = useState({ sent: 0, failed: 0, opened: 0, clicked: 0, recent: [] });

  useEffect(() => {
    wishlistAPI.getAlertPerformance()
      .then(response => setPerformance(response.data))
      .catch(() => toast.error('Failed to load wishlist alert performance'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader className="animate-spin m-16 mx-auto text-amber-600" />;

  const stats = [
    ['Delivered', performance.sent, MailCheck, 'text-green-600'],
    ['Failed', performance.failed, TriangleAlert, 'text-red-600'],
    ['Open rate', `${Math.round((performance.openRate || 0) * 100)}%`, Eye, 'text-blue-600'],
    ['Click rate', `${Math.round((performance.clickRate || 0) * 100)}%`, MousePointerClick, 'text-amber-600'],
  ];

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-serif text-stone-900">Wishlist Alerts</h1><p className="text-stone-500">Delivery and engagement for consent-based customer alerts.</p></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{stats.map(([label, value, Icon, color]) => <div key={label} className="bg-white border rounded-xl p-5"><Icon size={20} className={color}/><p className="text-2xl font-bold mt-3">{value}</p><p className="text-xs text-stone-500 mt-1">{label} · last 30 days</p></div>)}</div>
    <section className="bg-white border rounded-xl overflow-hidden"><div className="p-5 border-b"><h2 className="font-semibold">Recent alerts</h2></div>{performance.recent?.length ? <div className="divide-y">{performance.recent.map(item => <div key={item.id} className="p-4 flex items-center justify-between gap-4"><div className="flex items-center gap-3"><div className="bg-rose-50 text-rose-600 p-2 rounded-lg"><Heart size={17}/></div><div><b className="text-sm text-stone-900">{item.artwork?.title || 'Artwork'}</b><p className="text-xs text-stone-500">{item.type.replaceAll('_', ' ')} · {new Date(item.createdAt).toLocaleString()}</p></div></div><div className="text-right"><span className={`text-xs font-medium ${item.status === 'SENT' ? 'text-green-700' : item.status === 'FAILED' ? 'text-red-600' : 'text-stone-500'}`}>{item.status}</span><p className="text-[11px] text-stone-400 mt-1">{item.clickedAt ? 'Clicked' : item.openedAt ? 'Opened' : 'No engagement yet'}</p></div></div>)}</div> : <p className="p-10 text-center text-stone-500">No wishlist alerts have been sent yet.</p>}</section>
  </div>;
};

export default WishlistAlerts;
