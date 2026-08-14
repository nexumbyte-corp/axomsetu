import { api } from './api.js';

export const authService = {
  login: async (credentials) => {
    // POST /api/v1/auth/login
    return await api.post('/auth/login', credentials);
  },

  registerSchool: async (schoolData) => {
    // POST /api/v1/auth/register-school
    return await api.post('/auth/register-school', schoolData);
  },

  getMe: async () => {
    // GET /api/v1/auth/me
    return await api.get('/auth/me');
  },

  logout: async () => {
    // POST /api/v1/auth/logout
    return await api.post('/auth/logout');
  },

  updateProfile: async (data) => {
    // PATCH /api/v1/auth/profile
    return await api.patch('/auth/profile', data);
  },

  changePassword: async (data) => {
    // POST /api/v1/auth/change-password
    return await api.post('/auth/change-password', data);
  },
};

