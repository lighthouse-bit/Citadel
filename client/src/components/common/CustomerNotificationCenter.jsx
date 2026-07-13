import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, Package, Palette, Heart, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { customerNotificationsAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

const typeIcon = type => {
  if (type === 'ORDER') return <Package size={16} />;
  if (type === 'COMMISSION') return <Palette size={16} />;
  if (type === 'WISHLIST') return <Heart size={16} />;
  return <Bell size={16} />;
};

const relativeTime = value => {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return new Date(value).toLocaleDateString();
};

const CustomerNotificationCenter = ({ buttonClassName = '', mobile = false }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async (quiet = false) => {
    if (!isAuthenticated) return;
    if (!quiet) setLoading(true);
    try {
      const { data } = await customerNotificationsAPI.getAll({ limit: 20 });
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      if (!quiet) toast.error(error.response?.data?.error || 'Could not load notifications');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      setOpen(false);
      return undefined;
    }
    load(true);
    const interval = window.setInterval(() => load(true), 60000);
    const refresh = () => { if (document.visibilityState === 'visible') load(true); };
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [isAuthenticated, load]);

  useEffect(() => {
    const close = event => { if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  if (!isAuthenticated) return null;

  const openNotification = async notification => {
    if (!notification.isRead) {
      await customerNotificationsAPI.markAsRead(notification.id).catch(() => null);
      setNotifications(items => items.map(item => item.id === notification.id ? { ...item, isRead: true } : item));
      setUnreadCount(count => Math.max(0, count - 1));
    }
    setOpen(false);
    if (notification.link) navigate(notification.link);
  };

  const markAll = async () => {
    await customerNotificationsAPI.markAllAsRead();
    setNotifications(items => items.map(item => ({ ...item, isRead: true })));
    setUnreadCount(0);
  };

  const remove = async (event, id) => {
    event.stopPropagation();
    await customerNotificationsAPI.delete(id);
    setNotifications(items => items.filter(item => item.id !== id));
    setUnreadCount(count => Math.max(0, count - (notifications.find(item => item.id === id)?.isRead ? 0 : 1)));
  };

  const clearAll = async () => {
    await customerNotificationsAPI.clearAll();
    setNotifications([]);
    setUnreadCount(0);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(value => !value); if (!open) load(); }}
        className={`relative focus:outline-none ${buttonClassName}`}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
      >
        <Bell size={mobile ? 24 : 20} strokeWidth={1.5} />
        {unreadCount > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-amber-600 text-white text-[9px] font-semibold rounded-full grid place-items-center">{unreadCount > 99 ? '99+' : unreadCount}</span>}
        {mobile && <span className="text-[10px] uppercase tracking-widest">Alerts</span>}
      </button>

      {open && (
        <div className={`fixed md:absolute ${mobile ? 'left-4 right-4' : 'right-4 md:right-0'} top-20 md:top-11 md:w-[390px] max-h-[70vh] bg-white text-stone-900 border border-stone-200 rounded-xl shadow-2xl overflow-hidden z-[80]`}>
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-stone-100">
            <div><h2 className="font-semibold">Notifications</h2><p className="text-xs text-stone-500">{unreadCount} unread</p></div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && <button onClick={markAll} className="p-2 text-stone-500 hover:text-amber-700" title="Mark all as read"><CheckCheck size={17} /></button>}
              {notifications.length > 0 && <button onClick={clearAll} className="p-2 text-stone-500 hover:text-red-600" title="Clear all"><Trash2 size={16} /></button>}
              <button onClick={() => setOpen(false)} className="p-2 text-stone-500 hover:text-stone-900" aria-label="Close notifications"><X size={17} /></button>
            </div>
          </div>
          <div className="overflow-y-auto max-h-[58vh]">
            {loading && !notifications.length ? <p className="p-8 text-center text-sm text-stone-500">Loading notifications…</p> : notifications.length ? notifications.map(notification => (
              <button key={notification.id} onClick={() => openNotification(notification)} className={`w-full text-left flex gap-3 px-4 py-4 border-b border-stone-100 hover:bg-stone-50 ${notification.isRead ? '' : 'bg-amber-50/60'}`}>
                <span className={`mt-0.5 w-8 h-8 rounded-full grid place-items-center flex-none ${notification.isRead ? 'bg-stone-100 text-stone-500' : 'bg-amber-100 text-amber-700'}`}>{typeIcon(notification.type)}</span>
                <span className="min-w-0 flex-1"><span className="block text-sm leading-5">{notification.message}</span><span className="block text-xs text-stone-400 mt-1">{relativeTime(notification.createdAt)}</span></span>
                <span role="button" tabIndex={0} onClick={event => remove(event, notification.id)} className="p-1 text-stone-300 hover:text-red-500" aria-label="Delete notification"><X size={14} /></span>
              </button>
            )) : <div className="p-10 text-center"><Bell size={30} className="mx-auto text-stone-300 mb-3" /><p className="text-sm font-medium">You’re all caught up</p><p className="text-xs text-stone-500 mt-1">Order, commission and wishlist updates will appear here.</p></div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerNotificationCenter;
