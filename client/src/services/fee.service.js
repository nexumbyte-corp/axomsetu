import { api } from './api.js';

export const feeService = {
  // Fee Types
  getFeeTypes: async (params) => {
    return await api.get('/fees/types', { params });
  },
  createFeeType: async (data) => {
    return await api.post('/fees/types', data);
  },
  updateFeeType: async (id, data) => {
    return await api.put(`/fees/types/${id}`, data);
  },
  toggleFeeTypeStatus: async (id) => {
    return await api.patch(`/fees/types/${id}/toggle-status`);
  },
  deleteFeeType: async (id) => {
    return await api.delete(`/fees/types/${id}`);
  },

  // Fee Structures
  getFeeStructures: async (params) => {
    return await api.get('/fees/structures', { params });
  },
  getFeeStructure: async (id) => {
    return await api.get(`/fees/structures/${id}`);
  },
  createFeeStructure: async (data) => {
    return await api.post('/fees/structures', data);
  },
  bulkCreateFeeStructures: async (data) => {
    return await api.post('/fees/structures/bulk', data);
  },
  updateFeeStructure: async (id, data) => {
    return await api.put(`/fees/structures/${id}`, data);
  },
  toggleFeeStructureStatus: async (id) => {
    return await api.patch(`/fees/structures/${id}/toggle-status`);
  },
  deleteFeeStructure: async (id) => {
    return await api.delete(`/fees/structures/${id}`);
  },

  // Student Fee Overrides
  getStudentFeeOverrides: async (studentId, params) => {
    return await api.get(`/fees/students/${studentId}/overrides`, { params });
  },
  upsertStudentFeeOverride: async (studentId, data) => {
    return await api.post(`/fees/students/${studentId}/overrides`, data);
  },
  deleteStudentFeeOverride: async (studentId, overrideId) => {
    return await api.delete(`/fees/students/${studentId}/overrides/${overrideId}`);
  },

  // Fee Generation & History
  previewFeeGeneration: async (data) => {
    return await api.post('/fees/generation/preview', data);
  },
  executeFeeGeneration: async (data) => {
    return await api.post('/fees/generation/execute', data);
  },
  getGenerationHistory: async (params) => {
    return await api.get('/fees/generation/history', { params });
  },
  getGenerationBatchDetails: async (batchId) => {
    return await api.get(`/fees/generation/history/${batchId}`);
  },
};
