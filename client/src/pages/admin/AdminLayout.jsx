// src/pages/admin/AdminLayout.jsx
import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Image,
  ShoppingBag,
  Palette,
  Settings,
  Truck,                       // ✅ Added
  Menu,
  X,
  LogOut,
  ChevronRight,
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Users,
  ClipboardList,
  Megaphone,
  LineChart,
  HeartPulse,
  Heart,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { notificationsAPI } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen]             = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen]       = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications]         = useState([]);
  const [unreadCount, setUnreadCount]             = useState(0);

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
    e.stopPropagation();
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

  // ✅ Menu items with Shipping added
  const menuSections = [
    {
      label: 'Overview',
      items: [
        { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
      ],
    },
    {
      label: 'Management',
      items: [
        { path: '/admin/artworks', icon: Image, label: 'Artworks' },
        { path: '/admin/orders', icon: ShoppingBag, label: 'Orders' },
        { path: '/admin/customers', icon: Users, label: 'Customers' },
        { path: '/admin/commissions', icon: Palette, label: 'Commissions' },
        { path: '/admin/support', icon: MessageSquare, label: 'Support' },
        { path: '/admin/shipping', icon: Truck, label: 'Shipping' },
      ],
    },
    {
      label: 'Growth & insights',
      items: [
        { path: '/admin/marketing', icon: Megaphone, label: 'Marketing' },
        { path: '/admin/wishlist-alerts', icon: Heart, label: 'Wishlist Alerts' },
        { path: '/admin/reports', icon: LineChart, label: 'Reports' },
      ],
    },
    {
      label: 'Administration',
      items: [
        { path: '/admin/system', icon: HeartPulse, label: 'System Health' },
        { path: '/admin/settings', icon: Settings, label: 'Settings' },
        { path: '/admin/audit-log', icon: ClipboardList, label: 'Audit Log' },
      ],
    },
  ];
  const menuItems = menuSections.flatMap((section) => section.items);
  const showSidebarLabels = sidebarOpen || mobileMenuOpen;

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
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside
        aria-label="Admin navigation"
        className={`fixed top-0 left-0 h-full bg-stone-900 text-white z-50 flex flex-col
                   transition-all duration-300 ease-in-out
                   w-64 ${sidebarOpen ? 'lg:w-64' : 'lg:w-20'}
                   ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo */}
        <div className="h-16 flex-none flex items-center justify-between px-4 border-b border-stone-800">
          {showSidebarLabels && (
            <Link to="/admin" className="flex items-center gap-2">
              <span className="text-xl font-serif">CITADEL</span>
              <span className="text-[10px] text-amber-500 uppercase tracking-wider">
                Admin
              </span>
            </Link>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-expanded={sidebarOpen}
            className="p-2 hover:bg-stone-800 rounded-lg transition-colors hidden lg:block"
          >
            <ChevronRight
              size={20}
              className={`transition-transform duration-300 ${sidebarOpen ? 'rotate-180' : ''}`}
            />
          </button>
          <button
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close admin menu"
            className="p-2 hover:bg-stone-800 rounded-lg transition-colors lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-4">
          <div className="space-y-5">
            {menuSections.map((section, sectionIndex) => (
              <section key={section.label} aria-label={section.label}>
                {showSidebarLabels ? (
                  <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-600">
                    {section.label}
                  </p>
                ) : sectionIndex > 0 ? (
                  <div className="mx-2 mb-2 border-t border-stone-800" aria-hidden="true" />
                ) : null}
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      title={!showSidebarLabels ? item.label : undefined}
                      onClick={() => setMobileMenuOpen(false)}
                      aria-current={isActive(item.path, item.exact) ? 'page' : undefined}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                                  transition-all duration-200 ${
                        isActive(item.path, item.exact)
                          ? 'bg-amber-600 text-white shadow-sm shadow-amber-950/20'
                          : 'text-stone-400 hover:bg-stone-800 hover:text-white'
                      } ${sidebarOpen ? '' : 'lg:justify-center'}`}
                    >
                      <item.icon size={19} className="flex-none" />
                      {showSidebarLabels && <span className="font-medium truncate">{item.label}</span>}
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </nav>

        {/* User & Logout */}
        <div className="flex-none p-3 border-t border-stone-800 bg-stone-900">
          {showSidebarLabels && (
            <div className="mb-2 px-3 py-2 rounded-lg bg-stone-800/60">
              <p className="text-sm text-white font-medium truncate">{user?.name || 'Admin'}</p>
              <p className="text-stone-500 text-xs truncate mt-0.5">{user?.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            title={!showSidebarLabels ? 'Logout' : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm
                       text-stone-400 hover:bg-stone-800 hover:text-white transition-colors
                       ${sidebarOpen ? '' : 'lg:justify-center'}`}
          >
            <LogOut size={19} className="flex-none" />
            {showSidebarLabels && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────── */}
      <div className={`transition-all duration-300 ${
        sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
      }`}>

        {/* Top Header */}
        <header className="h-16 bg-white border-b border-stone-200 flex items-center
                           justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open admin menu"
              aria-expanded={mobileMenuOpen}
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
                  if (!showNotifications) fetchNotifications();
                }}
                className="relative p-2 hover:bg-stone-100 rounded-lg transition-colors
                           text-stone-600 hover:text-amber-600"
                aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
                aria-expanded={showNotifications}
                aria-controls="admin-notifications"
              >
                <Bell size={20} />

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
                    id="admin-notifications"
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
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                handleMarkAsRead(notif.id, notif.link);
                              }
                            }}
                            role="button"
                            tabIndex="0"
                            className={`w-full text-left flex items-start gap-3 p-4 cursor-pointer
                                        transition-colors group ${
                              !notif.isRead
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

                            {/* Action buttons */}
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
        <main id="admin-main-content" className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
