// src/context/CartContext.jsx
import { createContext, useContext, useReducer, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';   

const CartContext = createContext();

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_ITEM':
      const existingItem = state.items.find(item => item.id === action.payload.id);
      if (existingItem) {
        toast.error('This artwork is already in your cart');
        return state;
      }
      toast.success('Added to your collection');
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
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { user } = useAuth();   

  // Load cart from localStorage
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

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem('citadel_cart', JSON.stringify(state.items));
  }, [state.items]);

  const addToCart = (item) => {
    if (!user) {
      toast.error("Please sign in to add items to your cart", {
        duration: 5000,
        action: {
          label: "Sign In",
          onClick: () => window.location.href = `/login?redirect=${window.location.pathname}`,
        },
      });
      return;
    }

    dispatch({ type: 'ADD_ITEM', payload: item });
    setIsCartOpen(true);
  };

  const removeFromCart = (id) => {
    dispatch({ type: 'REMOVE_ITEM', payload: id });
  };

  // STRONGER CLEAR CART
  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
    localStorage.removeItem('citadel_cart');     // Direct clear
    sessionStorage.removeItem('citadel_cart');   // Extra safety
    toast.success('Cart cleared');
  };

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  const cartTotal = state.items.reduce((total, item) => total + parseFloat(item.price || 0), 0);

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