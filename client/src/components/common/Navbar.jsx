// client/src/components/common/Navbar.jsx
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ShoppingBag, User } from 'lucide-react';
import { useCart } from '../../hooks/useCart';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { cartItems } = useCart();
  const location = useLocation();

  // Check if we're on the home page (hero has dark background)
  const isHomePage = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const navLinks = [
    { path: '/gallery', label: 'Gallery' },
    { path: '/shop', label: 'Collection' },
    { path: '/commission', label: 'Bespoke' },
    { path: '/about', label: 'Atelier' },
  ];

  // Determine text color based on page and scroll state
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
            : 'bg-white/95 backdrop-blur-md py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="relative group">
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
                style={{ letterSpacing: '0.2em' }}
              >
                FINE ART
              </span>
            </motion.div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center">
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

            {/* Icons */}
            <div className="flex items-center space-x-5">
              <Link
                to="/account"
                className={`transition-colors duration-300 ${getTextColor()} ${getHoverColor()}`}
              >
                <User size={20} strokeWidth={1.5} />
              </Link>
              
              <Link to="/checkout" className="relative">
                <ShoppingBag 
                  size={20} 
                  strokeWidth={1.5}
                  className={`transition-colors duration-300 ${getTextColor()} ${getHoverColor()}`}
                />
                {cartItems.length > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-amber-600 
                                 text-white text-[10px] font-medium rounded-full 
                                 flex items-center justify-center">
                    {cartItems.length}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`md:hidden transition-colors duration-300 ${getTextColor()}`}
          >
            {isOpen ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-stone-200"
          >
            <div className="px-6 py-8 space-y-6">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`block text-sm tracking-widest uppercase transition-colors duration-300 ${
                    location.pathname === link.path 
                      ? 'text-amber-700' 
                      : 'text-stone-700 hover:text-amber-700'
                  }`}
                  style={{ letterSpacing: '0.15em' }}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-stone-200 flex items-center space-x-6">
                <Link to="/account" className="text-stone-700 hover:text-amber-700">
                  <User size={20} strokeWidth={1.5} />
                </Link>
                <Link to="/checkout" className="relative text-stone-700 hover:text-amber-700">
                  <ShoppingBag size={20} strokeWidth={1.5} />
                  {cartItems.length > 0 && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-amber-600 
                                   text-white text-[10px] font-medium rounded-full 
                                   flex items-center justify-center">
                      {cartItems.length}
                    </span>
                  )}
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;