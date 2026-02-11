// client/src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';

// Public Pages
import Home from './pages/Home';
import Gallery from './pages/Gallery';
import Shop from './pages/Shop';
import Commission from './pages/Commission';
import About from './pages/About';
import Checkout from './pages/Checkout';
import ArtworkDetail from './pages/ArtworkDetail';

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Artworks from './pages/admin/Artworks';
import ArtworkForm from './pages/admin/ArtworkForm';
import Orders from './pages/admin/Orders';
import Commissions from './pages/admin/Commissions';
import Settings from './pages/admin/Settings';

// Components
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <Router>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={
                <>
                  <Navbar />
                  <Home />
                  <Footer />
                </>
              } />
              <Route path="/gallery" element={
                <>
                  <Navbar />
                  <Gallery />
                  <Footer />
                </>
              } />
              <Route path="/shop" element={
                <>
                  <Navbar />
                  <Shop />
                  <Footer />
                </>
              } />
              <Route path="/artwork/:id" element={
                <>
                  <Navbar />
                  <ArtworkDetail />
                  <Footer />
                </>
              } />
              <Route path="/commission" element={
                <>
                  <Navbar />
                  <Commission />
                  <Footer />
                </>
              } />
              <Route path="/about" element={
                <>
                  <Navbar />
                  <About />
                  <Footer />
                </>
              } />
              <Route path="/checkout" element={
                <>
                  <Navbar />
                  <Checkout />
                  <Footer />
                </>
              } />

              {/* Admin Routes */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="artworks" element={<Artworks />} />
                <Route path="artworks/new" element={<ArtworkForm />} />
                <Route path="artworks/:id/edit" element={<ArtworkForm />} />
                <Route path="orders" element={<Orders />} />
                <Route path="commissions" element={<Commissions />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Routes>
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1C1B19',
                  color: '#fff',
                },
              }}
            />
          </Router>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;