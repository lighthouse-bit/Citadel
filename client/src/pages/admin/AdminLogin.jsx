// client/src/pages/admin/AdminLogin.jsx
import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  if (isAuthenticated) {
    const from = location.state?.from?.pathname || '/admin';
    navigate(from, { replace: true });
    return null;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Demo login
      if (formData.email === 'admin@citadel.com' && formData.password === 'admin123') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        localStorage.setItem('citadel_token', 'demo_token');
        localStorage.setItem('citadel_user', JSON.stringify({
          id: '1',
          name: 'Admin',
          email: 'admin@citadel.com',
          role: 'admin'
        }));
        
        toast.success('Welcome back!');
        
        const from = location.state?.from?.pathname || '/admin';
        navigate(from, { replace: true });
        window.location.reload();
      } else {
        toast.error('Invalid credentials');
      }
    } catch (error) {
      toast.error('Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-stone-400 hover:text-white 
                   transition-colors mb-8"
        >
          <ArrowLeft size={18} />
          Back to website
        </Link>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 
              className="text-3xl text-stone-900 mb-2"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              CITADEL
            </h1>
            <p className="text-stone-500 text-sm">Admin Dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm text-stone-600 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-stone-300 rounded-lg
                         focus:outline-none focus:border-amber-500 focus:ring-1 
                         focus:ring-amber-500 text-stone-900 transition-colors"
                placeholder="admin@citadel.com"
              />
            </div>

            <div>
              <label className="block text-sm text-stone-600 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 pr-12 border border-stone-300 rounded-lg
                           focus:outline-none focus:border-amber-500 focus:ring-1 
                           focus:ring-amber-500 text-stone-900 transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 
                           hover:text-stone-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-stone-900 text-white rounded-lg font-medium
                       hover:bg-stone-800 transition-colors flex items-center justify-center
                       gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-8 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-800 font-medium mb-2">Demo Credentials:</p>
            <p className="text-sm text-amber-700">Email: admin@citadel.com</p>
            <p className="text-sm text-amber-700">Password: admin123</p>
          </div>
        </div>

        <p className="text-center text-stone-500 text-sm mt-8">
          © {new Date().getFullYear()} Citadel Fine Art. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;