import { api } from './api.js';

export const reportService = {
  /**
   * Generic report fetcher
   */
  async fetchReport(endpoint, params = {}) {
    const cleanParams = {};
    Object.entries(params).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined) {
        cleanParams[k] = v;
      }
    });

    const response = await api.get(endpoint, { params: cleanParams });
    return response;
  },

  /**
   * Auxiliary dropdown options for report filters
   */
  async fetchFilterOptions() {
    try {
      const [classesRes, sectionsRes, mediumsRes, streamsRes, feeTypesRes, staffRes, categoriesRes, fundSourcesRes, studentsRes] =
        await Promise.allSettled([
          api.get('/classes'),
          api.get('/sections'),
          api.get('/mediums'),
          api.get('/streams'),
          api.get('/fees/types'),
          api.get('/staff'),
          api.get('/expense-categories'),
          api.get('/fund-sources'),
          api.get('/students', { params: { limit: 200 } }),
        ]);

      return {
        classes: classesRes.status === 'fulfilled' ? classesRes.value?.data || [] : [],
        sections: sectionsRes.status === 'fulfilled' ? sectionsRes.value?.data || [] : [],
        mediums: mediumsRes.status === 'fulfilled' ? mediumsRes.value?.data || [] : [],
        streams: streamsRes.status === 'fulfilled' ? streamsRes.value?.data || [] : [],
        feeTypes: feeTypesRes.status === 'fulfilled' ? feeTypesRes.value?.data || [] : [],
        staff: staffRes.status === 'fulfilled' ? staffRes.value?.data || [] : [],
        categories: categoriesRes.status === 'fulfilled' ? categoriesRes.value?.data || [] : [],
        fundSources: fundSourcesRes.status === 'fulfilled' ? fundSourcesRes.value?.data || [] : [],
        students: studentsRes.status === 'fulfilled' ? studentsRes.value?.data || [] : [],
      };
    } catch (err) {
      console.error('Failed to load filter options', err);
      return {};
    }
  },

  /**
   * Search student list for student dropdown filter
   */
  async searchStudents(search = '') {
    try {
      const res = await api.get('/students', { params: { search, limit: 20 } });
      return res.data || [];
    } catch {
      return [];
    }
  },

  /**
   * Fetch Individual Staff Advance Ledger Statement
   */
  async fetchIndividualStaffAdvanceLedger(staffId, params = {}) {
    return this.fetchReport('/reports/payroll/individual-advance', { ...params, staffId });
  },
};

