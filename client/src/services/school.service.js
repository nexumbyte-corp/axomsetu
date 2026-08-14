import { api } from './api.js';

export const schoolService = {
  getSchools: async (params = {}) => {
    // GET /api/v1/admin/schools
    return await api.get('/admin/schools', { params });
  },

  createSchool: async (data) => {
    // POST /api/v1/admin/schools
    return await api.post('/admin/schools', data);
  },

  getSchoolDetails: async (schoolId) => {
    // GET /api/v1/admin/schools/:schoolId
    return await api.get(`/admin/schools/${schoolId}`);
  },

  updateSchool: async (schoolId, data) => {
    // PATCH /api/v1/admin/schools/:schoolId
    return await api.patch(`/admin/schools/${schoolId}`, data);
  },

  changeSchoolStatus: async (schoolId, status) => {
    // PATCH /api/v1/admin/schools/:schoolId/status
    return await api.patch(`/admin/schools/${schoolId}/status`, { status });
  },

  getTenantProfile: async () => {
    // GET /api/v1/schools/profile
    return await api.get('/schools/profile');
  },

  updateTenantProfile: async (data) => {
    // PATCH /api/v1/schools/profile
    return await api.patch('/schools/profile', data);
  },

  uploadTenantLogo: async (formData) => {
    // POST /api/v1/schools/logo
    return await api.post('/schools/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteTenantLogo: async () => {
    // DELETE /api/v1/schools/logo
    return await api.delete('/schools/logo');
  },
};

