import { api } from './api.js';

export const staffService = {
  // Overview metrics
  getOverview: async () => {
    return await api.get('/staff/overview');
  },

  // Staff CRUD
  getStaffList: async (params = {}) => {
    return await api.get('/staff', { params });
  },

  getStaff: async (staffId) => {
    return await api.get(`/staff/${staffId}`);
  },

  createStaff: async (data) => {
    return await api.post('/staff', data);
  },

  updateStaff: async (staffId, data) => {
    return await api.patch(`/staff/${staffId}`, data);
  },

  deleteStaff: async (staffId) => {
    return await api.delete(`/staff/${staffId}`);
  },

  // Staff Advance Disbursement
  disburseAdvance: async (staffId, data) => {
    return await api.post(`/staff/${staffId}/advances`, data);
  },

  // Salary Setup (Academic Year & Increments)
  getSalarySetup: async (academicYearId) => {
    return await api.get('/staff/salary-setup', { params: { academicYearId } });
  },

  copyPreviousYearSalary: async (academicYearId) => {
    return await api.post('/staff/salary-setup/copy-previous', { academicYearId });
  },

  saveSalarySetup: async (data) => {
    return await api.post('/staff/salary-setup/save', data);
  },

  // Monthly Payroll Preparation & Attendance
  getMonthlyPayroll: async (params = {}) => {
    return await api.get('/payroll/monthly', { params });
  },

  getSalaryPrepReviewList: async (params = {}) => {
    return await api.get('/payroll/prep-review', { params });
  },

  prepareMonthlyPayroll: async (data) => {
    return await api.post('/payroll/prepare', data);
  },

  updateStaffMonthlyPayroll: async (payrollId, data) => {
    return await api.put(`/payroll/monthly/${payrollId}`, data);
  },

  // Pending Payments & Settlement
  getPendingPayrollsForStaff: async (staffId) => {
    return await api.get('/payroll/pending', { params: { staffId } });
  },

  recordMultiMonthSalaryPayment: async (data) => {
    return await api.post('/payroll/payments', data);
  },

  getSalaryPaymentReceiptData: async (paymentId) => {
    return await api.get(`/payroll/payments/${paymentId}/receipt`);
  },

  getSalaryPaymentHistory: async (params = {}) => {
    return await api.get('/payroll/history', { params });
  },

  getEmployeeSalarySlipPayload: async (data = {}) => {
    return await api.post('/payroll/salary-slip', data);
  },

  // Legacy / Direct Payments
  recordSalaryPayment: async (data) => {
    return await api.post('/staff/salary-payments', data);
  },

  getSalaryPayments: async (params = {}) => {
    return await api.get('/staff/salary-payments', { params });
  },

  getSalaryPayment: async (paymentId) => {
    return await api.get(`/staff/salary-payments/${paymentId}`);
  },

  getPaidMonths: async (staffId, year) => {
    return await api.get(`/staff/${staffId}/paid-months`, { params: { year } });
  },
};
