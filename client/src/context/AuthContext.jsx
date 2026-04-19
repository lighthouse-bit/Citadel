import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showVerificationBanner, setShowVerificationBanner] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('citadel_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.user) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        
        // Check if user needs to verify email
        if (response.data.user.isVerified === false) {
          setShowVerificationBanner(true);
        }
      } else {
        logout();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      const { token, user } = response.data;

      localStorage.setItem('citadel_token', token);
      setUser(user);
      setIsAuthenticated(true);
      
      // Show banner if not verified
      if (user.isVerified === false) {
        setShowVerificationBanner(true);
      }
      
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, userData);
      const { token, user } = response.data;

      localStorage.setItem('citadel_token', token);
      setUser(user);
      setIsAuthenticated(true);
      setShowVerificationBanner(true); // Always show after registration
      
      // Don't show the generic success toast - the modal will show the verification message
      return { success: true, needsVerification: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Registration failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem('citadel_token');
    setUser(null);
    setIsAuthenticated(false);
    setShowVerificationBanner(false);
  };

  const dismissVerificationBanner = () => {
    setShowVerificationBanner(false);
  };

  const resendVerification = async () => {
    try {
      await axios.post(`${API_URL}/auth/resend-verification`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('citadel_token')}` }
      });
      toast.success('Verification email resent! Check your inbox.');
    } catch (error) {
      toast.error('Failed to resend verification email');
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated,
    isAdmin: user?.role === 'admin',
    isVerified: user?.isVerified ?? false,
    showVerificationBanner,
    login,
    register,
    logout,
    checkAuth,
    dismissVerificationBanner,
    resendVerification,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};