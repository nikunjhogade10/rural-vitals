import api from './api';

export const authService = {
  login: (employeeId: string, password: string) =>
    api.postPublic('/auth/login', { employeeId, password }),

  me: () => api.get('/auth/me'),

  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),

  changePassword: (oldPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { oldPassword, newPassword }),
};

export const dashboardService = {
  getSummary: () => api.get('/dashboard/summary'),
  getRecentCases: (limit = 5) => api.get(`/dashboard/recent-cases?limit=${limit}`),
};

export const patientService = {
  list: (params: Record<string, string | number> = {}) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return api.get(`/patients${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => api.get(`/patients/${id}`),
  create: (data: Record<string, unknown>) => api.post('/patients', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/patients/${id}`, data),
};

export const visitService = {
  list: (params: Record<string, string | number> = {}) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return api.get(`/visits${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => api.get(`/visits/${id}`),
  create: (data: Record<string, unknown>) => api.post('/visits', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/visits/${id}`, data),
  review: (id: string, data: Record<string, unknown>) => api.post(`/visits/${id}/review`, data),
};

export const vitalService = {
  getByVisit: (visitId: string) => api.get(`/vitals/${visitId}`),
  create: (data: Record<string, unknown>) => api.post('/vitals', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/vitals/${id}`, data),
};

export const notificationService = {
  list: (params: Record<string, string | boolean> = {}) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return api.get(`/notifications${qs ? `?${qs}` : ''}`);
  },
  markRead: (id: string) => api.patch(`/notifications/${id}/read`, {}),
  markAllRead: () => api.post('/notifications/read-all', {}),
  dismiss: (id: string) => api.delete(`/notifications/${id}`),
};

export const syncService = {
  push: (items: unknown[]) => api.post('/sync/push', { items }),
  pull: (since?: string) => api.get(`/sync/pull${since ? `?since=${since}` : ''}`),
  summary: () => api.get('/sync/summary'),
  history: () => api.get('/sync/history'),
  retry: () => api.post('/sync/retry', {}),
};

export const settingsService = {
  get: () => api.get('/settings'),
  update: (data: Record<string, unknown>) => api.patch('/settings', data),
};

export const i18nService = {
  getLanguages: () => api.get('/i18n/languages'),
  getTranslations: (locale: string, screen?: string) =>
    api.get(`/i18n/translations/${locale}${screen ? `?screen=${screen}` : ''}`),
};

export const facilityService = {
  list: () => api.get('/facilities'),
  get: (id: string) => api.get(`/facilities/${id}`),
};

export const userService = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data: Record<string, unknown>) => api.patch('/users/profile', data),
};
