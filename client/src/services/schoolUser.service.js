import { api } from './api.js';

export const schoolUserService = {
  /**
   * List all users in the school.
   */
  listUsers: async (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.set(key, val);
      }
    });
    const qs = searchParams.toString();
    return api.get(`/school-users${qs ? `?${qs}` : ''}`);
  },

  /**
   * Get a single user's details.
   */
  getUser: async (membershipId) => {
    return api.get(`/school-users/${membershipId}`);
  },

  /**
   * Create a new school user.
   */
  createUser: async (data) => {
    return api.post('/school-users', data);
  },

  /**
   * Update a school user's profile.
   */
  updateUser: async (membershipId, data) => {
    return api.patch(`/school-users/${membershipId}`, data);
  },

  /**
   * Activate or deactivate a school user.
   */
  updateUserStatus: async (membershipId, isActive, reason) => {
    return api.patch(`/school-users/${membershipId}/status`, { isActive, reason });
  },

  /**
   * Get a user's current permissions.
   */
  getUserPermissions: async (membershipId) => {
    return api.get(`/school-users/${membershipId}/permissions`);
  },

  /**
   * Replace a user's permissions (atomic replace).
   */
  setUserPermissions: async (membershipId, permissions) => {
    return api.put(`/school-users/${membershipId}/permissions`, { permissions });
  },

  /**
   * Get the permission groups definition (for building the permission matrix UI).
   */
  getPermissionGroups: async () => {
    return api.get('/school-users/permission-groups');
  },
};
