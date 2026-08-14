import { api } from './api.js';

export const financeService = {
  // Finance Overview & Unified Ledger
  getOverview: async (params = {}) => {
    return await api.get('/finance/overview', { params });
  },

  getTransactions: async (params = {}) => {
    return await api.get('/finance/transactions', { params });
  },

  getTransactionById: async (id) => {
    return await api.get(`/finance/transactions/${id}`);
  },

  recordOpeningBalance: async (data) => {
    return await api.post('/finance/opening-balance', data);
  },

  backfillLedger: async () => {
    return await api.post('/finance/backfill');
  },

  // Expenses
  getExpenses: async (params = {}) => {
    return await api.get('/expenses', { params });
  },

  getExpenseById: async (id) => {
    return await api.get(`/expenses/${id}`);
  },

  createExpense: async (data) => {
    return await api.post('/expenses', data);
  },

  cancelExpense: async (id, data = {}) => {
    return await api.patch(`/expenses/${id}/cancel`, data);
  },

  // Expense Categories
  getExpenseCategories: async (params = {}) => {
    return await api.get('/expense-categories', { params });
  },

  createExpenseCategory: async (data) => {
    return await api.post('/expense-categories', data);
  },

  updateExpenseCategory: async (id, data) => {
    return await api.put(`/expense-categories/${id}`, data);
  },

  toggleExpenseCategoryStatus: async (id, isActive) => {
    return await api.patch(`/expense-categories/${id}/status`, { isActive });
  },

  deleteExpenseCategory: async (id) => {
    return await api.delete(`/expense-categories/${id}`);
  },

  // Funds
  getFunds: async (params = {}) => {
    return await api.get('/funds', { params });
  },

  getFundById: async (id) => {
    return await api.get(`/funds/${id}`);
  },

  addFund: async (data) => {
    return await api.post('/funds', data);
  },

  cancelFund: async (id, data = {}) => {
    return await api.patch(`/funds/${id}/cancel`, data);
  },

  // Fund Sources
  getFundSources: async (params = {}) => {
    return await api.get('/fund-sources', { params });
  },

  createFundSource: async (data) => {
    return await api.post('/fund-sources', data);
  },

  updateFundSource: async (id, data) => {
    return await api.put(`/fund-sources/${id}`, data);
  },

  toggleFundSourceStatus: async (id, isActive) => {
    return await api.patch(`/fund-sources/${id}/status`, { isActive });
  },

  deleteFundSource: async (id) => {
    return await api.delete(`/fund-sources/${id}`);
  },
};
