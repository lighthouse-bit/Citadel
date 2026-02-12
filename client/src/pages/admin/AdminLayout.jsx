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
  Check
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { notificationsAPI } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const notifRef = useRef(null);

  // Poll for notifications every 30 seconds
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await notificationsAPI.getAll();
        setNotifications(response.data.notifications);
        setUnreadCount(response.data.unreadCount);
      } catch (error) {
        console.error('Failed to fetch notifications');
      }
    };

    fetchNotifications(); // Initial fetch
    const interval = setInterval(fetchNotifications, 30000); // Poll

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

  const handleMarkAsRead = async (id, link) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      setShowNotifications(false);
      if (link) navigate(link);
    } catch (error) {
      console.error(error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const menuItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { path: '/admin/artworks', icon: Image, label: 'Artworks' },
    { path: '/admin/orders', icon: ShoppingBag, label: 'Orders' },
    { path: '/admin/commissions', icon: Palette, label: 'Commissions' },
    { path: '/admin/settings', icon: Settings, label: 'Settings' },
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

      {/* Sidebar */}
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

      {/* Main Content */}
      <div 
        className={`transition-all duration-300 
                   ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}
      >
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-6 sticky top-0 z-30">
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
            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 hover:bg-stone-100 rounded-lg transition-colors text-stone-600 hover:text-amber-600"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
                )}
              </button>

              {/* Notification Dropdown */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-stone-200 overflow-hidden z-50"
                  >
                    <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50">
                      <h3 className="font-semibold text-stone-900">Notifications</h3>
                      {unreadCount > 0 && (
                        <button 
                          onClick={handleMarkAllRead}
                          className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1"
                        >
                          <Check size={12} /> Mark all read
                        </button>
                      )}
                    </div>
                    
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((notif) => (
                          <div 
                            key={notif.id}
                            onClick={() => handleMarkAsRead(notif.id, notif.link)}
                            className={`p-4 border-b border-stone-50 hover:bg-stone-50 cursor-pointer transition-colors ${
                              !notif.isRead ? 'bg-amber-50/50' : ''
                            }`}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                notif.type === 'ORDER' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-purple-100 text-purple-700'
                              }`}>
                                {notif.type}
                              </span>
                              <span className="text-xs text-stone-400">
                                {new Date(notif.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className={`text-sm ${!notif.isRead ? 'font-medium text-stone-900' : 'text-stone-600'}`}>
                              {notif.message}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-stone-500 text-sm">
                          No notifications yet
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* View Site */}
            <Link
              to="/"
              target="_blank"
              className="text-sm text-stone-600 hover:text-amber-600 transition-colors hidden sm:block"
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