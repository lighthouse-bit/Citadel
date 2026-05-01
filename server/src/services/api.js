// src/services/api.js
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
  getAll:    (params)         => api.get('/artworks', { params }),
  getById:   (id)             => api.get(`/artworks/${id}`),
  getFeatured: ()             => api.get('/artworks/featured'),
  create:    (formData)       => api.post('/artworks', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update:    (id, formData)   => api.put(`/artworks/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete:    (id)             => api.delete(`/artworks/${id}`),
};

// ==========================================
// COMMISSIONS API
// ==========================================
export const commissionsAPI = {
  // Submit new commission request
  create: (formData) => api.post('/commissions', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  // Get commissions - Admin (all) or User (own)
  getAll: (params) => {
    if (params && params.scope === 'user') {
      return api.get('/commissions/my-commissions');
    }
    return api.get('/commissions', { params });
  },

  // Get single commission for logged-in user (payment page)
  getMyCommissionById: (id) =>
    api.get(`/commissions/my-commissions/${id}`),

  // Get single commission by ID (Admin)
  getById: (id) => api.get(`/commissions/${id}`),

  // Update commission status (Admin)
  updateStatus: (id, data) =>
    api.patch(`/commissions/${id}/status`, data),

  // Upload progress image (Admin)
  addProgressImage: (id, formData) =>
    api.post(`/commissions/${id}/progress`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  // ✅ Confirm payment after Stripe succeeds - updates DB + notifies admin
  confirmPayment: (id, data) =>
    api.post(`/commissions/${id}/confirm-payment`, data),
};

// ==========================================
// ORDERS API
// ==========================================
export const ordersAPI = {
  create:       (data)       => api.post('/orders', data),
  getAll:       (params)     => api.get('/orders', { params }),
  getById:      (id)         => api.get(`/orders/${id}`),
  updateStatus: (id, data)   => api.patch(`/orders/${id}/status`, data),

  confirmPayment: (id, data) => api.post(`/orders/${id}/confirm-payment`, data),
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
  getAll:        ()    => api.get('/notifications'),
  markAsRead:    (id)  => api.patch(`/notifications/${id}/read`),
  markAllAsRead: ()    => api.patch('/notifications/read-all'),
  delete:        (id)  => api.delete(`/notifications/${id}`),
};

export default api;