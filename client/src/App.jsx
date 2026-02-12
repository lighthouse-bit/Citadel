import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { ArtworksProvider } from './context/ArtworksContext';

// Layout Components
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import CartDrawer from './components/common/CartDrawer';
import AuthModal from './components/auth/AuthModal';

// Public Pages
import Home from './pages/Home';
import Gallery from './pages/Gallery';
import Shop from './pages/Shop';
import Commission from './pages/Commission';
import About from './pages/About';
import Contact from './pages/Contact';
import Checkout from './pages/Checkout';
import ArtworkDetail from './pages/ArtworkDetail';
import Account from './pages/Account';

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Artworks from './pages/admin/Artworks';
import ArtworkForm from './pages/admin/ArtworkForm';
import Orders from './pages/admin/Orders';
import OrderDetail from './pages/admin/OrderDetail';
import Commissions from './pages/admin/Commissions';
import CommissionDetail from './pages/admin/CommissionDetail';
import Settings from './pages/admin/Settings';
import AdminLogin from './pages/admin/AdminLogin';

// Auth Components
import ProtectedRoute from './components/auth/ProtectedRoute';

const queryClient = new QueryClient();

// Public Layout Wrapper to handle global UI elements
const PublicLayout = ({ children }) => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  return (
    <>
      <Navbar onOpenAuth={() => setIsAuthOpen(true)} />
      <CartDrawer />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <main>
        {children}
      </main>
      <Footer />
    </>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <ArtworksProvider>
          <AuthProvider>
            <CartProvider>
              <Router>
                <Routes>
                  {/* ==================== Public Routes ==================== */}
                  <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
                  <Route path="/gallery" element={<PublicLayout><Gallery /></PublicLayout>} />
                  <Route path="/shop" element={<PublicLayout><Shop /></PublicLayout>} />
                  <Route path="/artwork/:id" element={<PublicLayout><ArtworkDetail /></PublicLayout>} />
                  <Route path="/commission" element={<PublicLayout><Commission /></PublicLayout>} />
                  <Route path="/about" element={<PublicLayout><About /></PublicLayout>} />
                  <Route path="/contact" element={<PublicLayout><Contact /></PublicLayout>} />
                  <Route path="/checkout" element={<PublicLayout><Checkout /></PublicLayout>} />
                  
                  {/* Account Dashboard (Protected via Redirect in Component) */}
                  <Route path="/account" element={<PublicLayout><Account /></PublicLayout>} />

                  {/* ==================== Admin Routes ==================== */}
                  <Route path="/admin/login" element={<AdminLogin />} />
                  
                  <Route path="/admin" element={
                    <ProtectedRoute>
                      <AdminLayout />
                    </ProtectedRoute>
                  }>
                    <Route index element={<Dashboard />} />
                    <Route path="artworks" element={<Artworks />} />
                    <Route path="artworks/new" element={<ArtworkForm />} />
                    <Route path="artworks/:id/edit" element={<ArtworkForm />} />
                    <Route path="orders" element={<Orders />} />
                    <Route path="orders/:id" element={<OrderDetail />} />
                    <Route path="commissions" element={<Commissions />} />
                    <Route path="commissions/:id" element={<CommissionDetail />} />
                    <Route path="settings" element={<Settings />} />
                  </Route>

                  {/* ==================== Fallback ==================== */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                
                {/* Global Toaster */}
                <Toaster 
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#1C1B19',
                      color: '#FAF7F2',
                      borderRadius: '8px',
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                    },
                    success: {
                      iconTheme: { primary: '#C9A961', secondary: '#1C1B19' },
                    },
                    error: {
                      iconTheme: { primary: '#ef4444', secondary: '#1C1B19' },
                    },
                  }}
                />
              </Router>
            </CartProvider>
          </AuthProvider>
        </ArtworksProvider>
      </SettingsProvider>
    </QueryClientProvider>
  );
}

export default App;