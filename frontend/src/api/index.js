import api from './client';

export const authApi = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  getProfile: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

export const transactionsApi = {
  getAll: (params) => api.get('/transactions', { params }),
  getById: (id) => api.get(`/transactions/${id}`),
  create: (data) => api.post('/transactions', data),
  importCsv: (formData) => api.post('/transactions/import-csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

export const alertsApi = {
  getAll: (params) => api.get('/alerts', { params }),
  getById: (id) => api.get(`/alerts/${id}`),
  review: (id, data) => api.put(`/alerts/${id}/review`, data),
  assign: (id, reviewerId) => api.put(`/alerts/${id}/assign`, { reviewer_id: reviewerId }),
};

export const rulesApi = {
  getAll: () => api.get('/rules'),
  getById: (id) => api.get(`/rules/${id}`),
  update: (id, data) => api.put(`/rules/${id}`, data),
  create: (data) => api.post('/rules', data),
};

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getCharts: () => api.get('/dashboard/charts'),
  getRecentSuspicious: () => api.get('/dashboard/recent-suspicious'),
};

export const usersApi = {
  getAll: (params) => api.get('/users', { params }),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  deactivate: (id) => api.delete(`/users/${id}`),
};

export const auditApi = {
  getAll: (params) => api.get('/audit-logs', { params }),
};

export const configApi = {
  getThresholds: () => api.get('/config/thresholds'),
  updateThresholds: (data) => api.put('/config/thresholds', data),
};
