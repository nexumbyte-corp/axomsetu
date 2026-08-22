import { api } from './api.js';

export const studentService = {
  // 1. Get Students List with Search, Filters, and Pagination
  getStudents: async (params = {}) => {
    return await api.get('/students', { params });
  },
  listStudents: async (params = {}) => {
    return await api.get('/students', { params });
  },

  // 2. Get Student Details by ID (Master + Enrollment History + Fee Structure)
  getStudent: async (studentId, academicYearId = null) => {
    const params = academicYearId ? { academicYearId } : {};
    return await api.get(`/students/${studentId}`, { params });
  },

  // 3. Create Student & Initial Enrollment
  createStudent: async (data) => {
    return await api.post('/students', data);
  },

  // 4. Update Student Master Profile
  updateStudentProfile: async (studentId, data) => {
    return await api.patch(`/students/${studentId}`, data);
  },

  // 5. Update Student Status
  updateStudentStatus: async (studentId, status) => {
    return await api.patch(`/students/${studentId}/status`, { status });
  },

  // 6. Update Academic Enrollment
  updateEnrollment: async (studentId, enrollmentId, data) => {
    return await api.patch(`/students/${studentId}/enrollments/${enrollmentId}`, data);
  },

  // 7. Individual Student Promotion / Repeat
  promoteStudent: async (studentId, data) => {
    return await api.post(`/students/${studentId}/promote`, data);
  },

  // 8. Bulk Student Promotion
  bulkPromoteStudents: async (data) => {
    return await api.post('/students/promote-bulk', data);
  },

  // 9. Upload Student Photo (Cloudinary)
  uploadPhoto: async (formData) => {
    return await api.post('/students/upload-photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // 10. Hard Delete Student (Initial Stage Only)
  deleteStudentHard: async (studentId) => {
    return await api.delete(`/students/${studentId}`);
  },
};

