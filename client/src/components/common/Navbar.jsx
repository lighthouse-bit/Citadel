import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ShoppingBag, User } from 'lucide-react';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = ({ onOpenAuth }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { cartItems, openCart } = useCart();
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isHomePage = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const navLinks = [
    { path: '/gallery', label: 'Gallery' },
    { path: '/shop', label: 'Collection' },
    { path: '/commission', label: 'Bespoke' },
    { path: '/about', label: 'Atelier' },
  ];

  const handleUserClick = () => {
    if (isAuthenticated) {
      navigate('/account');
    } else {
      // Trigger the Auth Modal via prop from App.jsx
      onOpenAuth();
    }
  };

  const getTextColor = () => {
    if (scrolled) return 'text-stone-900';
    if (isHomePage) return 'text-white';
    return 'text-stone-900';
  };

  const getHoverColor = () => {
    if (scrolled) return 'hover:text-amber-700';
    if (isHomePage) return 'hover:text-amber-200';
    return 'hover:text-amber-700';
  };

  const getActiveColor = () => {
    if (scrolled) return 'text-amber-700';
    if (isHomePage) return 'text-amber-200';
    return 'text-amber-700';
  };

  return (
    <nav 
      className={`fixed w-full z-50 transition-all duration-500 ${
        scrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-sm py-4' 
          : isHomePage 
            ? 'bg-transparent py-6' 
            : 'bg-white/95 backdrop-blur-md py-4 border-b border-stone-100'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex justify-between items-center">
          
          {/* Logo */}
          <Link to="/" className="relative group z-50">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              <h1 
                className={`font-serif text-2xl md:text-3xl tracking-wider transition-colors duration-300 ${getTextColor()}`}
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                CITADEL
              </h1>
              <span 
                className={`absolute -bottom-3 left-0 text-[9px] tracking-widest transition-colors duration-300 ${
                  scrolled || !isHomePage ? 'text-amber-700' : 'text-amber-200'
                }`}
                style={{ letterSpacing: '0.25em' }}
              >
                FINE ART
              </span>
            </motion.div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center z-50">
            <div className="flex items-center space-x-10 mr-10">
              {navLinks.map((link, index) => (
                <motion.div
                  key={link.path}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    to={link.path}
                    className={`relative text-xs tracking-widest uppercase transition-colors duration-300 ${
                      location.pathname === link.path 
                        ? getActiveColor()
                        : `${getTextColor()} ${getHoverColor()}`
                    }`}
                    style={{ letterSpacing: '0.15em' }}
                  >
                    {link.label}
                    {location.pathname === link.path && (
                      <motion.span 
                        layoutId="navbar-indicator"
                        className="absolute -bottom-1 left-0 right-0 h-px bg-amber-600"
                      />
                    )}
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Right Icons */}
            <div className="flex items-center space-x-2 border-l pl-6 border-white/20">
              {/* User Button */}
              <button
                onClick={handleUserClick}
                className={`p-2 transition-colors duration-300 focus:outline-none ${getTextColor()} ${getHoverColor()}`}
                aria-label="Account"
              >
                <User size={20} strokeWidth={1.5} />
              </button>
              
              {/* Cart Button */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  openCart();
                }}
                className={`relative group p-2 focus:outline-none transition-colors duration-300 ${getTextColor()} ${getHoverColor()}`}
                aria-label="Open Cart"
              >
                <ShoppingBag size={20} strokeWidth={1.5} />
                {cartItems.length > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-amber-600 
                                 text-white text-[9px] font-medium rounded-full 
                                 flex items-center justify-center shadow-sm">
                    {cartItems.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`md:hidden z-50 p-2 transition-colors duration-300 ${isOpen ? 'text-stone-900' : getTextColor()}`}
          >
            {isOpen ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="absolute top-0 left-0 w-full bg-white shadow-xl md:hidden border-b border-stone-200 z-40"
          >
            <div className="pt-24 pb-8 px-6 space-y-6 flex flex-col items-center text-center">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`block text-sm tracking-widest uppercase transition-colors duration-300 ${
                    location.pathname === link.path 
                      ? 'text-amber-700 font-medium' 
                      : 'text-stone-600 hover:text-amber-700'
                  }`}
                  style={{ letterSpacing: '0.15em' }}
                >
                  {link.label}
                </Link>
              ))}
              
              <div className="w-12 h-px bg-stone-200 my-4" />
              
              <div className="flex items-center space-x-8">
                <button 
                  onClick={() => {
                    setIsOpen(false);
                    handleUserClick();
                  }}
                  className="text-stone-600 hover:text-amber-700 flex flex-col items-center gap-1"
                >
                  <User size={24} strokeWidth={1.5} />
                  <span className="text-[10px] uppercase tracking-widest">
                    {isAuthenticated ? 'Account' : 'Sign In'}
                  </span>
                </button>
                
                <button 
                  onClick={() => {
                    setIsOpen(false);
                    openCart();
                  }}
                  className="text-stone-600 hover:text-amber-700 flex flex-col items-center gap-1 relative"
                >
                  <div className="relative">
                    <ShoppingBag size={24} strokeWidth={1.5} />
                    {cartItems.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-600 rounded-full border border-white" />
                    )}
                  </div>
                  <span className="text-[10px] uppercase tracking-widest">Cart</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;