import { lazy, Suspense, useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { ArtworksProvider } from './context/ArtworksContext';
import { WishlistProvider } from './context/WishlistContext';
import VerificationBanner from './components/auth/VerificationBanner';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import CartDrawer from './components/common/CartDrawer';
import AuthModal from './components/auth/AuthModal';
import RouteMetadata from './components/common/RouteMetadata';
import ImageProtection from './components/common/ImageProtection';
import { trackPageView } from './utils/analytics';

// Each page is its own production chunk. Visitors no longer download the
// entire storefront and admin application before the first screen appears.
const Home = lazy(() => import('./pages/Home'));
const Gallery = lazy(() => import('./pages/Gallery'));
const Shop = lazy(() => import('./pages/Shop'));
const Commission = lazy(() => import('./pages/Commission'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Checkout = lazy(() => import('./pages/Checkout'));
const ArtworkDetail = lazy(() => import('./pages/ArtworkDetail'));
const Account = lazy(() => import('./pages/Account'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const CommissionPayment = lazy(() => import('./pages/CommissionPayment'));
const OrderTracking = lazy(() => import('./pages/OrderTracking'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Unsubscribe = lazy(() => import('./pages/Unsubscribe'));

const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const Artworks = lazy(() => import('./pages/admin/Artworks'));
const ArtworkForm = lazy(() => import('./pages/admin/ArtworkForm'));
const Orders = lazy(() => import('./pages/admin/Orders'));
const OrderDetail = lazy(() => import('./pages/admin/OrderDetail'));
const Commissions = lazy(() => import('./pages/admin/Commissions'));
const CommissionDetail = lazy(() => import('./pages/admin/CommissionDetail'));
const Settings = lazy(() => import('./pages/admin/Settings'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const Shipping = lazy(() => import('./pages/admin/Shipping'));
const Customers = lazy(() => import('./pages/admin/Customers'));
const AuditLog = lazy(() => import('./pages/admin/AuditLog'));
const Marketing = lazy(() => import('./pages/admin/Marketing'));
const Reports = lazy(() => import('./pages/admin/Reports'));
const SystemHealth = lazy(() => import('./pages/admin/SystemHealth'));
const AdminResetPassword = lazy(() => import('./pages/admin/AdminResetPassword'));
const WishlistAlerts = lazy(() => import('./pages/admin/WishlistAlerts'));
const Support = lazy(() => import('./pages/admin/Support'));

const queryClient = new QueryClient();

const RouteTracker = () => {
  const location = useLocation();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      trackPageView(`${location.pathname}${location.search}`, document.title);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [location.pathname, location.search]);

  return null;
};

const RouteLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center" role="status" aria-live="polite">
    <div className="flex flex-col items-center gap-3 text-stone-600">
      <span className="h-8 w-8 rounded-full border-2 border-stone-300 border-t-amber-600 animate-spin" />
      <span className="text-sm tracking-wide">Loading page…</span>
    </div>
  </div>
);

const PublicLayout = ({ children }) => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  useEffect(() => {
    const openAuth = () => setIsAuthOpen(true);
    window.addEventListener('citadel:open-auth', openAuth);
    return () => window.removeEventListener('citadel:open-auth', openAuth);
  }, []);

  return (
    <>
      <ImageProtection />
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <VerificationBanner />
      <Navbar onOpenAuth={() => setIsAuthOpen(true)} />
      <CartDrawer />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <main id="main-content" tabIndex="-1">{children}</main>
      <Footer />
    </>
  );
};

const publicPage = (Page) => <PublicLayout><Page /></PublicLayout>;

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <ArtworksProvider>
          <AuthProvider>
            <WishlistProvider>
            <CartProvider>
              <Router>
                <RouteTracker />
                <RouteMetadata />
                <Suspense fallback={<RouteLoader />}>
                  <Routes>
                    <Route path="/" element={publicPage(Home)} />
                    <Route path="/gallery" element={publicPage(Gallery)} />
                    <Route path="/shop" element={publicPage(Shop)} />
                    <Route path="/artwork/:id" element={publicPage(ArtworkDetail)} />
                    <Route path="/commission" element={publicPage(Commission)} />
                    <Route path="/about" element={publicPage(About)} />
                    <Route path="/contact" element={publicPage(Contact)} />
                    <Route path="/checkout" element={publicPage(Checkout)} />
                    <Route path="/checkout/success" element={publicPage(Checkout)} />
                    <Route path="/track" element={publicPage(OrderTracking)} />
                    <Route path="/track/:orderNumber" element={publicPage(OrderTracking)} />
                    <Route path="/verify-email" element={publicPage(VerifyEmail)} />
                    <Route path="/unsubscribe" element={publicPage(Unsubscribe)} />
                    <Route path="/account" element={publicPage(Account)} />
                    <Route path="/commission/payment/:id" element={publicPage(CommissionPayment)} />

                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route path="/admin/reset-password" element={<AdminResetPassword />} />
                    <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                      <Route index element={<Dashboard />} />
                      <Route path="artworks" element={<Artworks />} />
                      <Route path="artworks/new" element={<ArtworkForm />} />
                      <Route path="artworks/:id/edit" element={<ArtworkForm />} />
                      <Route path="orders" element={<Orders />} />
                      <Route path="orders/:id" element={<OrderDetail />} />
                      <Route path="commissions" element={<Commissions />} />
                      <Route path="commissions/:id" element={<CommissionDetail />} />
                      <Route path="settings" element={<Settings />} />
                      <Route path="shipping" element={<Shipping />} />
                      <Route path="customers" element={<Customers />} />
                      <Route path="audit-log" element={<AuditLog />} />
                      <Route path="marketing" element={<Marketing />} />
                      <Route path="wishlist-alerts" element={<WishlistAlerts />} />
                      <Route path="support" element={<Support />} />
                      <Route path="support/:id" element={<Support />} />
                      <Route path="reports" element={<Reports />} />
                      <Route path="system" element={<SystemHealth />} />
                    </Route>
                    <Route path="*" element={publicPage(NotFound)} />
                  </Routes>
                </Suspense>

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
                    success: { iconTheme: { primary: '#C9A961', secondary: '#1C1B19' } },
                    error: { iconTheme: { primary: '#ef4444', secondary: '#1C1B19' } },
                  }}
                />
              </Router>
            </CartProvider>
            </WishlistProvider>
          </AuthProvider>
        </ArtworksProvider>
      </SettingsProvider>
    </QueryClientProvider>
  );
}

export default App;
