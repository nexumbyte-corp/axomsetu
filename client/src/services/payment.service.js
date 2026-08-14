import { api } from './api.js';

export const paymentService = {
  // Collect Payment
  collectPayment: async (data) => {
    return await api.post('/payments', data);
  },

  // Get Payments History with Search, Filters, & Pagination
  getPayments: async (params = {}) => {
    return await api.get('/payments', { params });
  },

  // Instant Search Receipts
  searchReceipts: async (params = {}) => {
    return await api.get('/payments/search', { params });
  },

  // Get Receipt Details
  getReceiptDetails: async (id) => {
    return await api.get(`/payments/${id}`);
  },

  // Get Receipt Reprint Data
  getReceiptReprint: async (id) => {
    return await api.get(`/payments/${id}/reprint`);
  },

  // Void Payment
  voidPayment: async (id, data = {}) => {
    return await api.post(`/payments/${id}/void`, data);
  },

  // Get Financial Dashboard Metrics
  getDashboardSummary: async (params = {}) => {
    return await api.get('/payments/dashboard', { params });
  },

  // Get Single Student Payments History
  getStudentPayments: async (studentId) => {
    return await api.get(`/students/${studentId}/payments`);
  },

  // Get Single Student Outstanding Dues
  getStudentOutstanding: async (studentId) => {
    return await api.get(`/students/${studentId}/outstanding`);
  },

  // Get Single Student Derived Ledger
  getStudentLedger: async (studentId, params = {}) => {
    return await api.get(`/students/${studentId}/ledger`, { params });
  },

  // Reports
  getDailyCollection: async (params = {}) => {
    return await api.get('/reports/daily-collection', { params });
  },
  getMonthlyCollection: async (params = {}) => {
    return await api.get('/reports/monthly-collection', { params });
  },
  getClassCollection: async (params = {}) => {
    return await api.get('/reports/class-collection', { params });
  },
  getDuesReport: async (params = {}) => {
    return await api.get('/reports/dues', { params });
  },
  exportPayments: async (params = {}) => {
    return await api.get('/reports/payments/export', { params });
  },
};
