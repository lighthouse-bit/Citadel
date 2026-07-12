import axios from 'axios';
import { API_URL } from '../config/api';


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

  // ✅ Explicit JSON header to ensure Axios sends correctly
  addProgressImage: (id, data) => api.post(
    `/commissions/${id}/progress`,
    data,
    { headers: { 'Content-Type': 'application/json' } }
  ),
};

// ==========================================
// ORDERS API
// ==========================================
export const ordersAPI = {
  create:       (data)     => api.post('/orders', data),
  getAll:       (params)   => api.get('/orders', { params }),
  getById:      (id)       => api.get(`/orders/${id}`),
  updateStatus: (id, data) => api.patch(`/orders/${id}/status`, data),
  bulkUpdateStatus: (orderIds, status) => api.patch('/orders/bulk/status', { orderIds, status }),
  exportCsv: () => api.get('/orders/admin/export', { responseType: 'blob' }),
  resendEmail: (id, type) => api.post(`/orders/${id}/resend-email`, { type }),
  cancel: (id, reason) => api.post(`/orders/${id}/cancel`, { reason }),
};

// ==========================================
// PAYMENTS API
// ==========================================
export const paymentsAPI = {
  createArtworkPayment:    (orderId)      => api.post('/payments/artwork-payment',    { orderId }),
  createCommissionDeposit: (commissionId) => api.post('/payments/commission-deposit', { commissionId }),
  createCommissionBalance: (commissionId) => api.post('/payments/commission-balance', { commissionId }),
  // ✅ New — verify after Paystack redirect
  verifyPayment: (reference) => api.post('/payments/verify', { reference }),
};

// ==========================================
// AUTH API
// ==========================================
export const authAPI = {
  register:           (data)  => api.post('/auth/register', data),
  login:              (data)  => api.post('/auth/login', data),
  getProfile:         ()      => api.get('/auth/me'),
  verifyEmail:        (token) => api.get('/auth/verify-email', { params: { token } }),
  resendVerification: ()      => api.post('/auth/resend-verification'),
};

// ==========================================
// DASHBOARD API (Admin)
// ==========================================
export const dashboardAPI = {
  getStats: (period) => api.get('/dashboard/stats', { params: { period } }),
};

// ==========================================
// NOTIFICATIONS API (Admin)
// ==========================================
export const notificationsAPI = {
  getAll:        ()   => api.get('/notifications'),
  markAsRead:    (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: ()   => api.patch('/notifications/read-all'),
};

// ==========================================
// CONTACT API
// ==========================================
export const contactAPI = {
  send: (data) => api.post('/contact', data),
};

// ==========================================
// SETTINGS API
// ==========================================
export const settingsAPI = {
  get:    ()     => api.get('/settings'),
  update: (data) => api.put('/settings', data),
};


// ==========================================
// ANALYTICS API
// ==========================================
export const analyticsAPI = {
  trackPageView: (data) => api.post('/analytics/pageview', data).catch(() => {}),
  trackEvent:    (data) => api.post('/analytics/event', data).catch(() => {}),
  getSummary:    (period) => api.get('/analytics/summary', { params: { period } }),
};
export default api;

// ==========================================
// SHIPPING API
// ==========================================
export const shippingAPI = {
  // Public — used in checkout
  getZones:  ()     => api.get('/shipping/zones'),
  calculate: (data) => api.post('/shipping/calculate', data),

  // Admin
  getAdminZones: ()       => api.get('/shipping/admin/zones'),
  createZone:    (data)   => api.post('/shipping/admin/zones', data),
  updateZone:    (id, d)  => api.put(`/shipping/admin/zones/${id}`, d),
  deleteZone:    (id)     => api.delete(`/shipping/admin/zones/${id}`),
  upsertRate:    (data)   => api.post('/shipping/admin/rates', data),
  seedDefaults:  ()       => api.post('/shipping/admin/seed'),
};

export const customersAPI = {
  getAll: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  update: (id, data) => api.patch(`/customers/${id}`, data),
};

export const auditAPI = {
  getAll: (params) => api.get('/audit-logs', { params }),
};
