import { api } from './api.js';

export const adminService = {
  // Platform Dashboard
  async getDashboardSummary() {
    return await api.get('/admin/dashboard');
  },

  // Schools Management
  async listSchools(params = {}) {
    return await api.get('/admin/schools', { params });
  },

  async getSchoolDetails(schoolId) {
    return await api.get(`/admin/schools/${schoolId}`);
  },

  async createSchool(data) {
    return await api.post('/admin/schools', data);
  },

  async updateSchool(schoolId, data) {
    return await api.patch(`/admin/schools/${schoolId}`, data);
  },

  async changeSchoolStatus(schoolId, status, reason = null) {
    return await api.patch(`/admin/schools/${schoolId}/status`, { status, reason });
  },

  async addSchoolAdmin(schoolId, data) {
    return await api.post(`/admin/schools/${schoolId}/admins`, data);
  },

  async removeSchoolAdmin(schoolId, adminId) {
    return await api.delete(`/admin/schools/${schoolId}/admins/${adminId}`);
  },

  async changeSchoolOwner(schoolId, newOwnerUserId) {
    return await api.patch(`/admin/schools/${schoolId}/owner`, { newOwnerUserId });
  },

  async listSchoolUsers(schoolId) {
    return await api.get(`/admin/schools/${schoolId}/users`);
  },

  async createSchoolUser(schoolId, data) {
    return await api.post(`/admin/schools/${schoolId}/users`, data);
  },

  async updateSchoolUserStatus(schoolId, adminId, isActive) {
    return await api.patch(`/admin/schools/${schoolId}/users/${adminId}/status`, { isActive });
  },

  // User Management
  async listUsers(params = {}) {
    return await api.get('/admin/users', { params });
  },

  async createSuperAdmin(data) {
    return await api.post('/admin/users/super-admin', data);
  },

  async updateUserProfile(userId, data) {
    return await api.put(`/admin/users/${userId}`, data);
  },

  async changeUserRole(userId, role) {
    return await api.patch(`/admin/users/${userId}/role`, { role });
  },

  async resetUserPassword(userId, newPassword) {
    return await api.post(`/admin/users/${userId}/reset-password`, { newPassword });
  },

  // Business Analytics & Reports
  async getRevenueReport(params = {}) {
    return await api.get('/admin/reports/revenue', { params });
  },

  async getGrowthReport() {
    return await api.get('/admin/reports/growth');
  },

  // Audit Logs
  async listAuditLogs(params = {}) {
    return await api.get('/admin/audit-logs', { params });
  },

  // Platform Settings
  async getSettings() {
    return await api.get('/admin/settings');
  },

  async updateSettings(data) {
    return await api.put('/admin/settings', data);
  },

  async deleteContactPerson(contactPersonId) {
    return await api.delete(`/admin/settings/contact-persons/${contactPersonId}`);
  },
};
