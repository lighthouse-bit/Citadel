import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Image, 
  ShoppingBag, 
  Palette, 
  Settings,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Bell,
  Check,
  CheckCheck,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { notificationsAPI } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen]       = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications]   = useState([]);
  const [unreadCount, setUnreadCount]       = useState(0);
  
  const location   = useLocation();
  const navigate   = useNavigate();
  const { user, logout } = useAuth();
  const notifRef   = useRef(null);

  // ── Fetch notifications ───────────────────────────────
  const fetchNotifications = async () => {
    try {
      const response = await notificationsAPI.getAll();
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error('Failed to fetch notifications');
    }
  };

  // Poll every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Mark one as read + navigate ───────────────────────
  const handleMarkAsRead = async (id, link) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      setShowNotifications(false);
      if (link) navigate(link);
    } catch (error) {
      console.error(error);
    }
  };

  // ── Mark all as read ──────────────────────────────────
  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error(error);
    }
  };

  // ── Delete notification ───────────────────────────────
  const handleDelete = async (id, e) => {
    e.stopPropagation(); // prevent triggering parent onClick
    try {
      await notificationsAPI.delete(id);
      const deleted = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (deleted && !deleted.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error(error);
    }
  };

  // ── Format relative time ──────────────────────────────
  const formatTime = (dateStr) => {
    const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (diff < 60)    return 'Just now';
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  // ── Notification type badge style ─────────────────────
  const getTypeStyle = (type) => {
    switch (type) {
      case 'ORDER':      return 'bg-blue-100 text-blue-700';
      case 'COMMISSION': return 'bg-amber-100 text-amber-700';
      case 'SYSTEM':     return 'bg-stone-100 text-stone-600';
      default:           return 'bg-purple-100 text-purple-700';
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const menuItems = [
    { path: '/admin',             icon: LayoutDashboard, label: 'Dashboard',   exact: true },
    { path: '/admin/artworks',    icon: Image,           label: 'Artworks'                },
    { path: '/admin/orders',      icon: ShoppingBag,     label: 'Orders'                  },
    { path: '/admin/commissions', icon: Palette,         label: 'Commissions'             },
    { path: '/admin/settings',    icon: Settings,        label: 'Settings'                },
  ];

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-stone-100">

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside 
        className={`fixed top-0 left-0 h-full bg-stone-900 text-white z-50 
                   transition-all duration-300 ease-in-out
                   ${sidebarOpen ? 'w-64' : 'w-20'}
                   ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-stone-800">
          {sidebarOpen && (
            <Link to="/admin" className="flex items-center gap-2">
              <span className="text-xl font-serif">CITADEL</span>
              <span className="text-[10px] text-amber-500 uppercase tracking-wider">Admin</span>
            </Link>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-stone-800 rounded-lg transition-colors hidden lg:block"
          >
            <ChevronRight 
              size={20} 
              className={`transition-transform duration-300 ${sidebarOpen ? 'rotate-180' : ''}`}
            />
          </button>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 hover:bg-stone-800 rounded-lg transition-colors lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                        ${isActive(item.path, item.exact)
                          ? 'bg-amber-600 text-white'
                          : 'text-stone-400 hover:bg-stone-800 hover:text-white'
                        }`}
            >
              <item.icon size={20} />
              {sidebarOpen && <span className="font-medium">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* User & Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-stone-800">
          {sidebarOpen && (
            <div className="mb-4 px-4">
              <p className="text-white font-medium truncate">{user?.name || 'Admin'}</p>
              <p className="text-stone-500 text-sm truncate">{user?.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg
                     text-stone-400 hover:bg-stone-800 hover:text-white transition-colors"
          >
            <LogOut size={20} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────── */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>

        {/* Top Header */}
        <header className="h-16 bg-white border-b border-stone-200 flex items-center 
                           justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 hover:bg-stone-100 rounded-lg transition-colors lg:hidden"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-lg font-semibold text-stone-900">
              {menuItems.find(item => isActive(item.path, item.exact))?.label || 'Admin'}
            </h1>
          </div>

          <div className="flex items-center gap-4">

            {/* ── Notification Bell ───────────────────────── */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) fetchNotifications(); // refresh on open
                }}
                className="relative p-2 hover:bg-stone-100 rounded-lg transition-colors 
                           text-stone-600 hover:text-amber-600"
              >
                <Bell size={20} />

                {/* Unread badge - shows count now */}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] 
                                   bg-red-500 text-white text-[10px] font-bold rounded-full 
                                   flex items-center justify-center px-1 border-2 border-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* ── Notification Dropdown ─────────────────── */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 8,  scale: 0.96 }}
                    animate={{ opacity: 1, y: 0,  scale: 1    }}
                    exit={{    opacity: 0, y: 8,  scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl 
                               border border-stone-200 overflow-hidden z-50"
                  >
                    {/* Dropdown Header */}
                    <div className="p-4 border-b border-stone-100 flex justify-between 
                                    items-center bg-stone-50">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-stone-900">Notifications</h3>
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-600 
                                           text-xs rounded-full font-medium">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button 
                          onClick={handleMarkAllRead}
                          className="text-xs text-amber-600 hover:text-amber-700 
                                     flex items-center gap-1 font-medium transition-colors"
                        >
                          <CheckCheck size={13} />
                          Mark all read
                        </button>
                      )}
                    </div>

                    {/* Notification List */}
                    <div className="max-h-[420px] overflow-y-auto divide-y divide-stone-50">
                      {notifications.length > 0 ? (
                        notifications.map((notif) => (
                          <div 
                            key={notif.id}
                            onClick={() => handleMarkAsRead(notif.id, notif.link)}
                            className={`flex items-start gap-3 p-4 cursor-pointer 
                                        transition-colors group
                                        ${!notif.isRead 
                                          ? 'bg-amber-50 hover:bg-amber-100' 
                                          : 'bg-white hover:bg-stone-50'
                                        }`}
                          >
                            {/* Unread dot */}
                            <div className="mt-1.5 flex-shrink-0">
                              <div className={`w-2 h-2 rounded-full ${
                                !notif.isRead ? 'bg-amber-500' : 'bg-transparent'
                              }`} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm leading-snug ${
                                !notif.isRead 
                                  ? 'font-medium text-stone-900' 
                                  : 'text-stone-500'
                              }`}>
                                {notif.message}
                              </p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium
                                                 ${getTypeStyle(notif.type)}`}>
                                  {notif.type}
                                </span>
                                <span className="text-xs text-stone-400">
                                  {formatTime(notif.createdAt)}
                                </span>
                              </div>
                            </div>

                            {/* Action buttons - visible on hover */}
                            <div className="flex items-center gap-1 opacity-0 
                                            group-hover:opacity-100 transition-opacity 
                                            flex-shrink-0">
                              {!notif.isRead && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkAsRead(notif.id, null);
                                  }}
                                  title="Mark as read"
                                  className="p-1 text-stone-400 hover:text-green-600
                                             hover:bg-green-50 rounded transition-colors"
                                >
                                  <Check size={13} />
                                </button>
                              )}
                              <button
                                onClick={(e) => handleDelete(notif.id, e)}
                                title="Delete"
                                className="p-1 text-stone-400 hover:text-red-500
                                           hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-10 text-center">
                          <Bell size={32} className="text-stone-200 mx-auto mb-3" />
                          <p className="text-stone-400 text-sm">No notifications yet</p>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                      <div className="p-3 border-t border-stone-100 bg-stone-50 text-center">
                        <p className="text-xs text-stone-400">
                          {notifications.length} total · {unreadCount} unread
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* View Site */}
            <Link
              to="/"
              target="_blank"
              className="text-sm text-stone-600 hover:text-amber-600 
                         transition-colors hidden sm:block"
            >
              View Site →
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;