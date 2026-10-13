const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const ACADEMIC_YEAR_KEY = 'selected_academic_year';
const ADMIT_CARD_EXAM_NAME_KEY = 'admit_card_exam_name';
const SCHOOL_CONTEXT_KEY = 'school_context';

let inMemoryAccessToken = null;
let inMemoryRefreshToken = null;

export const storage = {
  getAccessToken: () => inMemoryAccessToken || localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY),
  setAccessToken: (token) => {
    inMemoryAccessToken = token || null;
    try {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
        sessionStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      // Ignore storage restrictions
    }
  },

  getRefreshToken: () => inMemoryRefreshToken || localStorage.getItem(REFRESH_TOKEN_KEY) || sessionStorage.getItem(REFRESH_TOKEN_KEY),
  setRefreshToken: (token) => {
    inMemoryRefreshToken = token || null;
    try {
      if (token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, token);
        sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
      } else {
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        sessionStorage.removeItem(REFRESH_TOKEN_KEY);
      }
    } catch {
      // Ignore storage restrictions
    }
  },

  clearAuth: () => {
    inMemoryAccessToken = null;
    inMemoryRefreshToken = null;
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch {
      // Ignore storage restrictions
    }
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

  getSchoolContext: () => {
    try {
      const data = localStorage.getItem(SCHOOL_CONTEXT_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  setSchoolContext: (context) => {
    try {
      if (context) localStorage.setItem(SCHOOL_CONTEXT_KEY, JSON.stringify(context));
      else localStorage.removeItem(SCHOOL_CONTEXT_KEY);
    } catch {
      // Ignore storage restrictions
    }
  },
  clearSchoolContext: () => {
    try {
      localStorage.removeItem(SCHOOL_CONTEXT_KEY);
    } catch {
      // Ignore storage restrictions
    }
  },
};
