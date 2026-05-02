import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ==========================================
// AXIOS INSTANCE
// ==========================================
const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('citadel_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
  getAll:      (params) => api.get('/artworks', { params }),
  getById:     (id)     => api.get(`/artworks/${id}`),
  getFeatured: ()       => api.get('/artworks/featured'),

  // ✅ JSON — images uploaded directly to Cloudinary
  create: (data) => api.post('/artworks', data),
  update: (id, data) => api.put(`/artworks/${id}`, data),
  delete: (id) => api.delete(`/artworks/${id}`),
};

// ==========================================
// COMMISSIONS API
// ==========================================
export const commissionsAPI = {
  // ✅ JSON — images uploaded directly to Cloudinary
  create: (data) => api.post('/commissions', data),

  getAll: (params) => {
    if (params && params.scope === 'user') {
      return api.get('/commissions/my-commissions');
    }
    return api.get('/commissions', { params });
  },

  getMyCommissionById: (id) => api.get(`/commissions/my-commissions/${id}`),
  getById:             (id) => api.get(`/commissions/${id}`),
  updateStatus:    (id, data) => api.patch(`/commissions/${id}/status`, data),

  // ✅ JSON — progress image URL from Cloudinary
  // data = { url, publicId, description }
  addProgressImage: (id, data) => api.post(`/commissions/${id}/progress`, data),
};

// ==========================================
// ORDERS API
// ==========================================
export const ordersAPI = {
  create:       (data)     => api.post('/orders', data),
  getAll:       (params)   => api.get('/orders', { params }),
  getById:      (id)       => api.get(`/orders/${id}`),
  updateStatus: (id, data) => api.patch(`/orders/${id}/status`, data),
};

// ==========================================
// PAYMENTS API
// ==========================================
export const paymentsAPI = {
  createArtworkPayment:     (orderId)      => api.post('/payments/artwork-payment',      { orderId }),
  createCommissionDeposit:  (commissionId) => api.post('/payments/commission-deposit',   { commissionId }),
  createCommissionBalance:  (commissionId) => api.post('/payments/commission-balance',   { commissionId }),
};

// ==========================================
// AUTH API
// ==========================================
export const authAPI = {
  register:            (data)  => api.post('/auth/register', data),
  login:               (data)  => api.post('/auth/login', data),
  getProfile:          ()      => api.get('/auth/me'),
  verifyEmail:         (token) => api.get('/auth/verify-email', { params: { token } }),
  resendVerification:  ()      => api.post('/auth/resend-verification'),
};

// ==========================================
// DASHBOARD API (Admin)
// ==========================================
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

// ==========================================
// NOTIFICATIONS API (Admin)
// ==========================================
export const notificationsAPI = {
  getAll:       ()   => api.get('/notifications'),
  markAsRead:   (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: ()  => api.patch('/notifications/read-all'),
};

export default api;