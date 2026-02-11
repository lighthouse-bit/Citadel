// client/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    try {
      const token = localStorage.getItem('citadel_token');
      const savedUser = localStorage.getItem('citadel_user');
      
      if (token && savedUser) {
        setUser(JSON.parse(savedUser));
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('citadel_token');
      localStorage.removeItem('citadel_user');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      // Demo login - replace with actual API call
      if (email === 'admin@citadel.com' && password === 'admin123') {
        const mockUser = {
          id: '1',
          name: 'Admin',
          email: 'admin@citadel.com',
          role: 'admin'
        };
        
        localStorage.setItem('citadel_token', 'demo_token');
        localStorage.setItem('citadel_user', JSON.stringify(mockUser));
        
        setUser(mockUser);
        setIsAuthenticated(true);
        
        return { success: true };
      }
      
      return { success: false, error: 'Invalid credentials' };
    } catch (error) {
      return { success: false, error: 'Login failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('citadel_token');
    localStorage.removeItem('citadel_user');
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    isLoading,
    isAuthenticated,
    isAdmin: user?.role === 'admin',
    login,
    logout,
    checkAuth,
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