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

  /**
   * Get daily collection metrics and transactions for a specific date
   * @param {object} params - { date, academicYearId }
   */
  async getDailyCollection(params = {}) {
    const response = await api.get('/dashboard/daily-collection', { params });
    return response;
  },
};

