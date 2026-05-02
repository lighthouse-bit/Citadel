import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ==========================================
// AXIOS INSTANCE
// ==========================================
const api = axios.create({
  baseURL: API_URL,
});

// Attach token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('citadel_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiry globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('citadel_token');
      localStorage.removeItem('citadel_user');
    }
    return Promise.reject(error);
  }
);

// ==========================================
// ARTWORKS API
// ==========================================
export const artworksAPI = {
  // Get all artworks with optional filters
  getAll: (params) => api.get('/artworks', { params }),

  // Get a single artwork by ID
  getById: (id) => api.get(`/artworks/${id}`),

  // Get featured artworks (for homepage)
  getFeatured: () => api.get('/artworks/featured'),

  // ✅ Now sends JSON — images already uploaded directly to Cloudinary
  create: (data) => api.post('/artworks', data),

  // ✅ Now sends JSON — images already uploaded directly to Cloudinary
  update: (id, data) => api.put(`/artworks/${id}`, data),

  // Delete artwork (Admin)
  delete: (id) => api.delete(`/artworks/${id}`),
};

// ==========================================
// COMMISSIONS API
// ==========================================
export const commissionsAPI = {
  // Submit new commission request (Public/User)
  // ✅ Still uses multipart/form-data — commission has reference images
  create: (formData) => api.post('/commissions', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

  // Get commissions - handles both Admin (all) and User (own only)
  getAll: (params) => {
    if (params && params.scope === 'user') {
      return api.get('/commissions/my-commissions');
    }
    return api.get('/commissions', { params });
  },

  // Get single commission for logged-in user (used by payment page)
  getMyCommissionById: (id) => api.get(`/commissions/my-commissions/${id}`),

  // Get single commission by ID (Admin only)
  getById: (id) => api.get(`/commissions/${id}`),

  // Update commission status (Admin)
  updateStatus: (id, data) => api.patch(`/commissions/${id}/status`, data),

  // Upload progress image (Admin)
  // ✅ Still uses multipart/form-data — progress images uploaded through backend
  addProgressImage: (id, formData) => api.post(
    `/commissions/${id}/progress`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  ),
};

// ==========================================
// ORDERS API
// ==========================================
export const ordersAPI = {
  // Create new order (User/Guest)
  create: (data) => api.post('/orders', data),

  // Get orders - supports filtering by customerEmail for user dashboard
  getAll: (params) => api.get('/orders', { params }),

  // Get single order by ID
  getById: (id) => api.get(`/orders/${id}`),

  // Update order status or tracking (Admin)
  updateStatus: (id, data) => api.patch(`/orders/${id}/status`, data),
};

// ==========================================
// PAYMENTS API
// ==========================================
export const paymentsAPI = {
  // Artwork: Full 100% payment intent
  createArtworkPayment: (orderId) =>
    api.post('/payments/artwork-payment', { orderId }),

  // Commission: 70% deposit payment intent
  createCommissionDeposit: (commissionId) =>
    api.post('/payments/commission-deposit', { commissionId }),

  // Commission: 30% balance payment intent
  createCommissionBalance: (commissionId) =>
    api.post('/payments/commission-balance', { commissionId }),
};

// ==========================================
// AUTH API
// ==========================================
export const authAPI = {
  // Register new user
  register: (data) => api.post('/auth/register', data),

  // Login
  login: (data) => api.post('/auth/login', data),

  // Get current logged in user profile
  getProfile: () => api.get('/auth/me'),

  // Verify email with token from URL
  verifyEmail: (token) => api.get('/auth/verify-email', { params: { token } }),

  // Resend verification email
  resendVerification: () => api.post('/auth/resend-verification'),
};

// ==========================================
// DASHBOARD API (Admin)
// ==========================================
export const dashboardAPI = {
  // Get stats: revenue, counts, recent activity
  getStats: () => api.get('/dashboard/stats'),
};

// ==========================================
// NOTIFICATIONS API (Admin)
// ==========================================
export const notificationsAPI = {
  // Get all notifications
  getAll: () => api.get('/notifications'),

  // Mark one notification as read
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),

  // Mark ALL notifications as read
  markAllAsRead: () => api.patch('/notifications/read-all'),
};

export default api;