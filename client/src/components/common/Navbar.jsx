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

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { path: '/gallery', label: 'Gallery' },
    { path: '/shop', label: 'Collection' },
    { path: '/commission', label: 'Bespoke' },
    { path: '/about', label: 'Atelier' },
  ];

  return (
    <nav 
      className={`fixed w-full z-50 transition-all duration-700 ${
        scrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-lg py-4' 
          : 'bg-transparent py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link 
            to="/" 
            className="relative group"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              {/* Main logo text */}
              <h1 
                className={`font-display text-3xl tracking-elegant transition-colors duration-500 ${
                  scrolled ? 'text-luxury-charcoal' : 'text-white'
                }`}
              >
                CITADEL
              </h1>
              {/* Subtitle */}
              <span 
                className={`absolute -bottom-4 left-0 font-sans text-[10px] tracking-luxury opacity-70 ${
                  scrolled ? 'text-luxury-bronze' : 'text-luxury-cream'
                }`}
              >
                FINE ART ATELIER
              </span>
              {/* Hover accent */}
              <span className="absolute bottom-0 left-0 w-0 h-px bg-luxury-gold 
                           transition-all duration-500 group-hover:w-full" />
            </motion.div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center">
            {/* Center Links */}
            <div className="flex items-center space-x-12 mr-12">
              {navLinks.map((link, index) => (
                <motion.div
                  key={link.path}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    to={link.path}
                    className="relative group"
                  >
                    <span 
                      className={`font-sans text-xs tracking-luxury uppercase transition-colors duration-300 ${
                        location.pathname === link.path 
                          ? scrolled ? 'text-luxury-gold' : 'text-luxury-champagne'
                          : scrolled 
                            ? 'text-luxury-charcoal hover:text-luxury-gold' 
                            : 'text-white/90 hover:text-white'
                      }`}
                    >
                      {link.label}
                    </span>
                    {/* Active indicator */}
                    {location.pathname === link.path && (
                      <motion.span 
                        layoutId="navbar-indicator"
                        className="absolute -bottom-2 left-0 right-0 h-px bg-luxury-gold"
                      />
                    )}
                    {/* Hover indicator */}
                    <span className={`absolute -bottom-2 left-0 w-0 h-px transition-all duration-300 
                                    group-hover:w-full ${
                                      location.pathname === link.path 
                                        ? 'bg-transparent' 
                                        : 'bg-luxury-gold/50'
                                    }`} />
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Right Icons */}
            <div className="flex items-center space-x-6">
              <Link
                to="/account"
                className={`transition-colors duration-300 ${
                  scrolled 
                    ? 'text-luxury-charcoal hover:text-luxury-gold' 
                    : 'text-white hover:text-luxury-champagne'
                }`}
              >
                <User size={20} strokeWidth={1.5} />
              </Link>
              
              <Link 
                to="/checkout" 
                className="relative group"
              >
                <ShoppingBag 
                  size={20} 
                  strokeWidth={1.5}
                  className={`transition-colors duration-300 ${
                    scrolled 
                      ? 'text-luxury-charcoal group-hover:text-luxury-gold' 
                      : 'text-white group-hover:text-luxury-champagne'
                  }`}
                />
                {cartItems.length > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-luxury-gold 
                                 text-luxury-charcoal text-[10px] font-sans font-medium 
                                 rounded-full flex items-center justify-center">
                    {cartItems.length}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`md:hidden transition-colors duration-300 ${
              scrolled ? 'text-luxury-charcoal' : 'text-white'
            }`}
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
            className="md:hidden bg-white border-t border-luxury-champagne/30"
          >
            <div className="px-6 py-8 space-y-6">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className="block font-sans text-sm tracking-luxury uppercase text-luxury-charcoal 
                           hover:text-luxury-gold transition-colors duration-300"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;