// client/src/pages/admin/AdminLayout.jsx
import { useState } from 'react';
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
  Bell
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

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

  const handleLogout = () => {
    logout();
    navigate('/');
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
              <span 
                className="text-xl text-white"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                CITADEL
              </span>
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
              <p className="text-stone-500 text-sm truncate">{user?.email || 'admin@citadel.com'}</p>
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
            <div>
              <h1 className="text-lg font-semibold text-stone-900">
                {menuItems.find(item => isActive(item.path, item.exact))?.label || 'Admin'}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button className="relative p-2 hover:bg-stone-100 rounded-lg transition-colors">
              <Bell size={20} className="text-stone-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full" />
            </button>
            
            {/* View Site */}
            <Link
              to="/"
              target="_blank"
              className="text-sm text-stone-600 hover:text-amber-600 transition-colors"
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