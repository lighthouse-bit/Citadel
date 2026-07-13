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
  getAdminStats: () => api.get('/artworks/admin/stats'),
  bulkUpdate: (artworkIds, data) => api.patch('/artworks/admin/bulk', { artworkIds, ...data }),
  exportCsv: (params) => api.get('/artworks/admin/export', { params, responseType: 'blob' }),
  getHistory: (id) => api.get(`/artworks/admin/${id}/history`),
  getAlertAudience: (id, params) => api.get(`/artworks/admin/${id}/alert-audience`, { params }),
  getFacets: () => api.get('/artworks/facets'),
  getSuggestions: q => api.get('/artworks/suggestions', { params: { q } }),
  getRecommendations: () => api.get('/artworks/recommendations'),
  getRecentlyViewed: () => api.get('/artworks/recently-viewed'),
  getRelated: id => api.get(`/artworks/${id}/related`),
  recordView: id => api.post(`/artworks/${id}/view`),
};

export const wishlistAPI = {
  getAll: () => api.get('/wishlist'),
  add: artworkId => api.post(`/wishlist/${artworkId}`),
  remove: artworkId => api.delete(`/wishlist/${artworkId}`),
  getPreferences: () => api.get('/wishlist/preferences'),
  updatePreferences: data => api.patch('/wishlist/preferences', data),
  unsubscribe: token => api.post(`/wishlist/unsubscribe/${encodeURIComponent(token)}`),
  getAlertPerformance: () => api.get('/wishlist/admin/performance'),
};

export const accountAPI = {
  getProfile: () => api.get('/account/profile'),
  updateProfile: data => api.patch('/account/profile', data),
  changePassword: data => api.post('/account/password', data),
  createAddress: data => api.post('/account/addresses', data),
  updateAddress: (id, data) => api.put(`/account/addresses/${id}`, data),
  setDefaultAddress: id => api.patch(`/account/addresses/${id}/default`),
  deleteAddress: id => api.delete(`/account/addresses/${id}`),
};

export const cartAPI = {
  get: () => api.get('/cart'),
  merge: artworkIds => api.post('/cart/merge', { artworkIds }),
  add: artworkId => api.post(`/cart/${artworkId}`),
  remove: artworkId => api.delete(`/cart/${artworkId}`),
  clear: () => api.delete('/cart'),
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
  exportCsv:       (params) => api.get('/commissions/export', { params, responseType: 'blob' }),

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
  track: (orderNumber, email) => email ? api.post('/orders/track', { orderNumber, email }) : api.get(`/orders/track/${encodeURIComponent(orderNumber)}`),
};

// ==========================================
// PAYMENTS API
// ==========================================
export const paymentsAPI = {
  createArtworkPayment:    (orderId, checkoutToken) => api.post('/payments/artwork-payment', { orderId, checkoutToken }),
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
  requestAdminReset: email => api.post('/auth/admin/forgot-password', { email }),
  resetAdminPassword: data => api.post('/auth/admin/reset-password', data),
  changeAdminPassword: data => api.post('/auth/admin/change-password', data),
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
  create:        (data) => api.post('/notifications', data),
  delete:        (id) => api.delete(`/notifications/${id}`),
};

export const customerNotificationsAPI = {
  getAll:         (params) => api.get('/customer-notifications', { params }),
  markAsRead:     (id) => api.patch(`/customer-notifications/${id}/read`),
  markAllAsRead:  () => api.patch('/customer-notifications/read-all'),
  delete:         (id) => api.delete(`/customer-notifications/${id}`),
  clearAll:       () => api.delete('/customer-notifications'),
};

export const supportAPI = {
  getTickets:      (params) => api.get('/support', { params }),
  createTicket:    (data) => api.post('/support', data),
  getTicket:       (id) => api.get(`/support/${id}`),
  reply:           (id, data) => api.post(`/support/${id}/messages`, data),
  close:           (id) => api.patch(`/support/${id}/close`),
};

export const adminSupportAPI = {
  getTickets: (params) => api.get('/admin/support', { params }),
  getTicket:  (id) => api.get(`/admin/support/${id}`),
  update:     (id, data) => api.patch(`/admin/support/${id}`, data),
  reply:      (id, data) => api.post(`/admin/support/${id}/messages`, data),
};

export const marketingAPI = {
  getPromotions: () => api.get('/marketing/promotions'),
  createPromotion: data => api.post('/marketing/promotions', data),
  updatePromotion: (id, data) => api.put(`/marketing/promotions/${id}`, data),
  deletePromotion: id => api.delete(`/marketing/promotions/${id}`),
  validatePromotion: data => api.post('/marketing/promotions/validate', data),
  getTemplates: () => api.get('/marketing/templates'),
  saveTemplate: data => api.post('/marketing/templates', data),
  updateTemplate: (id, data) => api.put(`/marketing/templates/${id}`, data),
  testEmail: data => api.post('/marketing/templates/test', data),
  getCampaigns: () => api.get('/marketing/campaigns'),
  createCampaign: data => api.post('/marketing/campaigns', data),
  sendCampaign: id => api.post(`/marketing/campaigns/${id}/send`),
};

export const reportsAPI = {
  getFinancial: params => api.get('/reports/financial', { params }),
  exportFinancial: params => api.get('/reports/financial/export', { params, responseType: 'blob' }),
};

export const operationsAPI = {
  getHealth: () => api.get('/operations/health'),
  getEvents: resolved => api.get('/operations/events', { params: { resolved } }),
  resolveEvent: id => api.patch(`/operations/events/${id}/resolve`),
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
  exportCsv: (params) => api.get('/customers/export', { params, responseType: 'blob' }),
};

export const auditAPI = {
  getAll: (params) => api.get('/audit-logs', { params }),
};
