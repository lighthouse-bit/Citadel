import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { cartAPI } from '../services/api';
import { trackAddToCart } from '../utils/analytics';

const CartContext = createContext();
const STORAGE_KEY = 'citadel_cart';

const loadGuestCart = () => {
  const params = new URLSearchParams(window.location.search);
  if (params.has('reference') || params.has('trxref')) {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    return [];
  }
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value.filter(item => item?.id).slice(0, 20).map(item => ({ ...item, isAvailable: item.status === 'AVAILABLE' && item.isAvailable !== false })) : [];
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
};

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(loadGuestCart);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const previousCustomerId = useRef(null);
  const isCustomer = isAuthenticated && user?.role === 'customer';

  const synchronize = useCallback(async customerId => {
    setIsSyncing(true);
    try {
      const guestItems = loadGuestCart();
      const { data } = await cartAPI.merge(guestItems.map(item => item.id));
      setItems(data.items || []);
      localStorage.removeItem(STORAGE_KEY);
      if (data.unavailableCount) toast(`${data.unavailableCount} cart item${data.unavailableCount === 1 ? ' is' : 's are'} no longer available`, { icon: '!' });
      previousCustomerId.current = customerId;
    } catch {
      toast.error('Your cart could not be synchronized');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (isCustomer) {
      if (previousCustomerId.current !== user.id) synchronize(user.id);
      return;
    }
    if (previousCustomerId.current) {
      previousCustomerId.current = null;
      localStorage.removeItem(STORAGE_KEY);
      setItems([]);
    }
  }, [authLoading, isCustomer, synchronize, user?.id]);

  useEffect(() => {
    if (authLoading || isCustomer) return;
    if (items.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    else localStorage.removeItem(STORAGE_KEY);
  }, [authLoading, isCustomer, items]);

  const addToCart = useCallback(async item => {
    if (item.status !== 'AVAILABLE') return toast.error('This artwork is not available');
    if (items.some(existing => existing.id === item.id)) return toast.error('This artwork is already in your cart');
    if (items.length >= 20) return toast.error('Your cart can contain up to 20 artworks');
    if (isSyncing) return toast('Please wait while your cart synchronizes');

    const optimistic = { ...item, isAvailable: true };
    setItems(previous => [...previous, optimistic]);
    setIsCartOpen(true);
    trackAddToCart(item);
    toast.success(isCustomer ? 'Added to your collection' : 'Added to your guest cart');

    if (isCustomer) {
      try {
        const { data } = await cartAPI.add(item.id);
        setItems(previous => previous.map(existing => existing.id === item.id ? data : existing));
      } catch (error) {
        setItems(previous => previous.filter(existing => existing.id !== item.id));
        toast.error(error.response?.data?.error || 'Could not save this cart item');
      }
    }
  }, [isCustomer, isSyncing, items]);

  const removeFromCart = useCallback(async id => {
    const removed = items.find(item => item.id === id);
    setItems(previous => previous.filter(item => item.id !== id));
    if (isCustomer) {
      try { await cartAPI.remove(id); }
      catch (error) {
        if (removed) setItems(previous => [...previous, removed]);
        toast.error(error.response?.data?.error || 'Could not remove this cart item');
      }
    }
  }, [isCustomer, items]);

  const clearCart = useCallback(async () => {
    const previous = items;
    setItems([]);
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    if (isCustomer) {
      try { await cartAPI.clear(); }
      catch {
        setItems(previous);
        toast.error('Could not clear your synchronized cart');
      }
    }
  }, [isCustomer, items]);

  const refreshCart = useCallback(async () => {
    if (!isCustomer) return;
    try {
      const { data } = await cartAPI.get();
      setItems(data.items || []);
    } catch { toast.error('Could not refresh your cart'); }
  }, [isCustomer]);

  const openCart = useCallback(() => {
    setIsCartOpen(true);
    if (isCustomer) refreshCart();
  }, [isCustomer, refreshCart]);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  const cartTotal = useMemo(() => items.reduce((total, item) => total + (item.isAvailable === false ? 0 : Number(item.price || 0)), 0), [items]);
  const unavailableCount = useMemo(() => items.filter(item => item.isAvailable === false).length, [items]);
  const value = useMemo(() => ({
    cartItems: items,
    cartTotal,
    unavailableCount,
    isSyncing,
    isCartOpen,
    openCart,
    closeCart,
    addToCart,
    removeFromCart,
    clearCart,
    refreshCart,
    isInCart: id => items.some(item => item.id === id),
  }), [addToCart, cartTotal, clearCart, closeCart, isCartOpen, isSyncing, items, openCart, refreshCart, removeFromCart, unavailableCount]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => useContext(CartContext);
