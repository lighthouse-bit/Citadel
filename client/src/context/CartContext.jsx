import { createContext, useContext, useReducer, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const CartContext = createContext();

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_ITEM':
      // Prevent duplicates for original art (1 of 1)
      const existingItem = state.items.find(item => item.id === action.payload.id);
      if (existingItem) {
        toast.error('This artwork is already in your cart');
        return state;
      }
      toast.success('Added to collection');
      return { ...state, items: [...state.items, action.payload] };
    
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(item => item.id !== action.payload) };
    
    case 'CLEAR_CART':
      return { ...state, items: [] };
    
    case 'LOAD_CART':
      return { ...state, items: action.payload };
    
    default:
      return state;
  }
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });
  const [isCartOpen, setIsCartOpen] = useState(false); // New State

  // Load from LocalStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('citadel_cart');
    if (savedCart) {
      try {
        dispatch({ type: 'LOAD_CART', payload: JSON.parse(savedCart) });
      } catch (e) {
        console.error("Cart parse error", e);
      }
    }
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('citadel_cart', JSON.stringify(state.items));
  }, [state.items]);

  const addToCart = (item) => {
    dispatch({ type: 'ADD_ITEM', payload: item });
    setIsCartOpen(true); // Auto open cart when adding
  };

  const removeFromCart = (id) => dispatch({ type: 'REMOVE_ITEM', payload: id });
  const clearCart = () => dispatch({ type: 'CLEAR_CART' });
  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  const cartTotal = state.items.reduce((total, item) => total + parseFloat(item.price), 0);

  return (
    <CartContext.Provider value={{
      cartItems: state.items,
      cartTotal,
      isCartOpen,
      openCart,
      closeCart,
      addToCart,
      removeFromCart,
      clearCart,
      isInCart: (id) => state.items.some(item => item.id === id)
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);