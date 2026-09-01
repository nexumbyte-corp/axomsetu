import { api } from './api.js';

export const hostelService = {
  getDashboardData: (params) => api.get('/hostel/dashboard', { params }),

  // Hostels
  listHostels: (params) => api.get('/hostel/hostels', { params }),
  getHostelById: (id) => api.get(`/hostel/hostels/${id}`),
  createHostel: (data) => api.post('/hostel/hostels', data),
  updateHostel: (id, data) => api.put(`/hostel/hostels/${id}`, data),
  deleteHostel: (id) => api.delete(`/hostel/hostels/${id}`),

  // Rooms
  listRooms: (params) => api.get('/hostel/rooms', { params }),
  createRoom: (data) => api.post('/hostel/rooms', data),
  bulkCreateRooms: (data) => api.post('/hostel/rooms/bulk', data),
  updateRoom: (id, data) => api.put(`/hostel/rooms/${id}`, data),
  deleteRoom: (id) => api.delete(`/hostel/rooms/${id}`),

  // Beds
  listBeds: (params) => api.get('/hostel/beds', { params }),
  createBed: (data) => api.post('/hostel/beds', data),
  bulkCreateBeds: (data) => api.post('/hostel/beds/bulk', data),
  updateBedStatus: (id, status) => api.patch(`/hostel/beds/${id}/status`, { status }),

  // Fee Config & Monthly Generation
  getFeeConfig: (params) => api.get('/hostel/fees/config', { params }),
  saveFeeConfig: (data) => api.post('/hostel/fees/config', data),
  getEligibleStudentsForBilling: (params) => api.get('/hostel/fees/eligible-students', { params }),
  generateMonthlyFees: (data) => api.post('/hostel/fees/generate', data),

  // Admission
  admitStudent: (data) => api.post('/hostel/admissions', data),

  // Residents
  listResidents: (params) => api.get('/hostel/residents', { params }),
  getResidentDetails: (id) => api.get(`/hostel/residents/${id}`),

  // Transfers & Exits
  transferStudent: (data) => api.post('/hostel/transfers', data),
  exitStudent: (data) => api.post('/hostel/exits', data),

  // Reports
  getReport: (type, params) => api.get(`/hostel/reports/${type}`, { params }),
};
