import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('citadel_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Artworks API
export const artworksAPI = {
  getAll: (params) => api.get('/artworks', { params }),
  getById: (id) => api.get(`/artworks/${id}`),
  getFeatured: () => api.get('/artworks/featured'),
  create: (formData) => api.post('/artworks', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id, formData) => api.put(`/artworks/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => api.delete(`/artworks/${id}`),
};

// Commissions API
export const commissionsAPI = {
  create: (formData) => api.post('/commissions', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getAll: (params) => {
    // If specifically asking for user data, hit the secure 'my-commissions' endpoint
    if (params && params.scope === 'user') {
      return api.get('/commissions/my-commissions');
    }
    // Otherwise, hit the general endpoint (admin guarded on backend)
    return api.get('/commissions', { params });
  },
  getById: (id) => api.get(`/commissions/${id}`),
  updateStatus: (id, data) => api.patch(`/commissions/${id}/status`, data),
  addProgressImage: (id, formData) => api.post(`/commissions/${id}/progress`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

// Orders API
export const ordersAPI = {
  create: (data) => api.post('/orders', data),
  getAll: (params) => {
    // Orders currently filter by email query param, but backend should ideally use token
    return api.get('/orders', { params });
  },
  getById: (id) => api.get(`/orders/${id}`),
  updateStatus: (id, data) => api.patch(`/orders/${id}/status`, data),
};

// Payments API
export const paymentsAPI = {
  createIntent: (data) => api.post('/payments/create-intent', data),
  commissionPayment: (data) => api.post('/payments/commission-payment', data),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

// Notifications API
export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
};

export default api;