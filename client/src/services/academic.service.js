import { api } from './api.js';

export const academicService = {
  // Academic Years
  getAcademicYears: async () => {
    return await api.get('/academic-years');
  },
  getCurrentAcademicYear: async () => {
    return await api.get('/academic-years/current');
  },
  lockAcademicYear: async (id) => {
    return await api.patch(`/academic-years/${id}/lock`);
  },
  unlockAcademicYear: async (id) => {
    return await api.patch(`/academic-years/${id}/unlock`);
  },

  // Classes
  getClasses: async () => {
    return await api.get('/classes');
  },
  addClass: async (data) => {
    return await api.post('/classes', data);
  },
  updateClass: async (id, data) => {
    return await api.patch(`/classes/${id}`, data);
  },
  deleteClass: async (id) => {
    return await api.delete(`/classes/${id}`);
  },

  // Mediums
  getMediums: async () => {
    return await api.get('/mediums');
  },
  addMedium: async (data) => {
    return await api.post('/mediums', data);
  },
  updateMedium: async (id, data) => {
    return await api.patch(`/mediums/${id}`, data);
  },

  // Sections
  getSections: async () => {
    return await api.get('/sections');
  },
  addSection: async (data) => {
    return await api.post('/sections', data);
  },
  updateSection: async (id, data) => {
    return await api.patch(`/sections/${id}`, data);
  },

  // Streams
  getStreams: async () => {
    return await api.get('/streams');
  },
  addStream: async (data) => {
    return await api.post('/streams', data);
  },
  updateStream: async (id, data) => {
    return await api.patch(`/streams/${id}`, data);
  },
};
