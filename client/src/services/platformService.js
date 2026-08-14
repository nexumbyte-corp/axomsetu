import { api } from './api.js';

export const platformService = {
  /**
   * Fetch Super Admin configured platform contact support details.
   */
  async getContactInfo() {
    return await api.get('/platform/contact');
  },
};
