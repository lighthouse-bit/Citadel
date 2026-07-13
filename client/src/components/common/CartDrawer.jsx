import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, ShoppingBag, ArrowRight, AlertTriangle, Loader } from 'lucide-react';
import { useCart } from '../../hooks/useCart';
import { artworksAPI } from '../../services/api';

// Helper image component
const CartImage = ({ src, alt }) => {
  const fallback = "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=200&h=200&fit=crop";
  return (
    <img
      src={src || fallback}
      alt={alt}
      loading="lazy"
      decoding="async"
      className="w-full h-full object-cover"
      onError={(e) => e.target.src = fallback}
    />
  );
};

const CartDrawer = () => {
  const { isCartOpen, closeCart, cartItems, removeFromCart, cartTotal, unavailableCount, isSyncing, addToCart } = useCart();
  const [recommendations, setRecommendations] = useState([]);
  const navigate = useNavigate();
  const drawerRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Prevent background scrolling when cart is open
  useEffect(() => {
    if (isCartOpen) {
      previousFocusRef.current = document.activeElement;
      document.body.style.overflow = 'hidden';
      drawerRef.current?.focus();
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      previousFocusRef.current?.focus?.();
    };
  }, [isCartOpen]);

  useEffect(() => {
    if (!isCartOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeCart();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeCart, isCartOpen]);

  useEffect(() => {
    if (!isCartOpen || !cartItems.length) return;
    artworksAPI.getRecommendations().then(response => {
      const cartIds = new Set(cartItems.map(item => item.id));
      setRecommendations((response.data.artworks || []).filter(item => !cartIds.has(item.id)).slice(0, 2));
    }).catch(() => setRecommendations([]));
  }, [cartItems, isCartOpen]);

  const handleCheckout = () => {
    closeCart();
    navigate('/checkout');
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            aria-hidden="true"
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />

          {/* Drawer */}
          <motion.div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-drawer-title"
            tabIndex="-1"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-stone-50 shadow-2xl z-[70] flex flex-col border-l border-stone-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-stone-200 bg-white">
              <h2 id="cart-drawer-title" className="text-xl font-serif text-stone-900">Your Collection ({cartItems.length})</h2>
              <button 
                onClick={closeCart}
                aria-label="Close cart"
                className="p-2 text-stone-400 hover:text-stone-900 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isSyncing && <div className="flex items-center gap-2 bg-blue-50 text-blue-700 rounded-lg px-4 py-3 text-sm"><Loader size={16} className="animate-spin"/> Synchronizing your cart…</div>}
              {unavailableCount > 0 && <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm"><AlertTriangle size={17} className="mt-0.5 flex-shrink-0"/><span>Remove unavailable artwork before proceeding to checkout.</span></div>}
              {cartItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 bg-stone-200 rounded-full flex items-center justify-center">
                    <ShoppingBag size={24} className="text-stone-400" />
                  </div>
                  <p className="text-stone-500">Your collection is empty.</p>
                  <button 
                    onClick={() => { closeCart(); navigate('/gallery'); }}
                    className="text-amber-700 font-medium hover:text-amber-800 underline underline-offset-4"
                  >
                    Browse Gallery
                  </button>
                </div>
              ) : (
                cartItems.map((item) => (
                  <motion.div 
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`flex gap-4 bg-white p-4 rounded-lg border shadow-sm ${item.isAvailable === false ? 'border-amber-300 opacity-75' : 'border-stone-200'}`}
                  >
                    <div className="w-20 h-20 bg-stone-200 rounded-md overflow-hidden flex-shrink-0">
                      <CartImage 
                        src={item.images?.[0]?.url || item.images?.[0]} 
                        alt={item.title} 
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-serif text-stone-900 line-clamp-1">{item.title}</h3>
                        <p className="text-xs text-stone-500 uppercase tracking-wide mt-1">{item.medium}</p>
                        {item.isAvailable === false && <p className="text-xs text-amber-700 font-semibold mt-1">No longer available</p>}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-stone-900 font-medium">${Number(item.price).toLocaleString()}</p>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          aria-label={`Remove ${item.title} from cart`}
                          className="text-stone-400 hover:text-red-500 transition-colors text-sm flex items-center gap-1"
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
              {recommendations.length > 0 && <div className="border-t border-stone-200 pt-5"><h3 className="font-serif text-stone-900 mb-3">You may also like</h3><div className="space-y-3">{recommendations.map(item => <div key={item.id} className="flex items-center gap-3 bg-white border rounded-lg p-2"><img src={item.images?.[0]?.url} alt={item.title} className="w-14 h-14 object-cover rounded"/><div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{item.title}</p><p className="text-xs text-stone-500">${Number(item.price).toLocaleString()}</p></div><button onClick={() => addToCart(item)} className="text-xs text-amber-700 font-medium px-2">Add</button></div>)}</div></div>}
            </div>

            {/* Footer */}
            {cartItems.length > 0 && (
              <div className="p-6 bg-white border-t border-stone-200 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-stone-500">
                    <span>Subtotal</span>
                    <span>${cartTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-stone-500">
                    <span>Shipping</span>
                    <span>Calculated at checkout</span>
                  </div>
                  <div className="flex justify-between text-lg font-serif text-stone-900 pt-4 border-t border-stone-100">
                    <span>Total</span>
                    <span>${cartTotal.toLocaleString()}</span>
                  </div>
                </div>
                
                <button
                  onClick={handleCheckout}
                  disabled={unavailableCount > 0 || isSyncing}
                  className="w-full btn-luxury-gold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Proceed to Checkout <ArrowRight size={16} />
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;
