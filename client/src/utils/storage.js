const TOKEN_KEY = 'school_saas_access_token';
const REFRESH_TOKEN_KEY = 'school_saas_refresh_token';
const ACADEMIC_YEAR_KEY = 'school_saas_selected_academic_year';
const ADMIT_CARD_EXAM_NAME_KEY = 'axomsetu_admit_card_exam_name';

export const storage = {
  getAccessToken: () => localStorage.getItem(TOKEN_KEY),
  setAccessToken: (token) => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  },

  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setRefreshToken: (token) => {
    if (token) localStorage.setItem(REFRESH_TOKEN_KEY, token);
    else localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  clearAuth: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  getSelectedAcademicYearId: () => localStorage.getItem(ACADEMIC_YEAR_KEY),
  setSelectedAcademicYearId: (id) => {
    if (id) localStorage.setItem(ACADEMIC_YEAR_KEY, id);
    else localStorage.removeItem(ACADEMIC_YEAR_KEY);
  },
  clearSelectedAcademicYearId: () => {
    localStorage.removeItem(ACADEMIC_YEAR_KEY);
  },

  getAdmitCardExamName: () => localStorage.getItem(ADMIT_CARD_EXAM_NAME_KEY) || '',
  setAdmitCardExamName: (name) => {
    if (name) localStorage.setItem(ADMIT_CARD_EXAM_NAME_KEY, name);
    else localStorage.removeItem(ADMIT_CARD_EXAM_NAME_KEY);
  },
};


