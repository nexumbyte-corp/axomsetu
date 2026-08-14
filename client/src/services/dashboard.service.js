import { api } from './api.js';

export const dashboardService = {
  /**
   * Get main dashboard summary metrics
   * @param {object} params - { academicYearId }
   */
  async getSummary(params = {}) {
    const response = await api.get('/dashboard/summary', { params });
    return response;
  },
};
