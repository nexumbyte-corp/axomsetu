import axios from 'axios';
import { storage } from '../utils/storage.js';

export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true, // Pass HttpOnly session cookies automatically
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Authorization and Controlled School Context headers if present
api.interceptors.request.use(
  (config) => {
    const token = storage.getAccessToken();
    if (token) {
      if (config.headers?.set) {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    const isAuthRoute =
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register-school') ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/me');

    if (error.response?.status === 401 && !isAuthRoute) {
      const errCode = error.response?.data?.code;

      storage.clearAuth();

      if (errCode === 'SESSION_REVOKED') {
        window.dispatchEvent(
          new CustomEvent('auth:session_revoked', {
            detail: {
              message:
                error.response?.data?.message ||
                'Your session has ended because your account was signed in from another device.',
            },
          })
        );
      } else if (errCode === 'SESSION_EXPIRED') {
        window.dispatchEvent(
          new CustomEvent('auth:session_expired', {
            detail: {
              message:
                error.response?.data?.message ||
                'Your session has expired. Please log in again.',
            },
          })
        );
      } else {
        window.dispatchEvent(new Event('auth:unauthorized'));
      }

      return Promise.reject(extractError(error));
    }

    return Promise.reject(extractError(error));
  }
);

// Helper to format backend errors
function extractError(error) {
  if (error.response?.data) {
    const data = error.response.data;
    const message = data.message || 'An error occurred. Please try again.';
    const customError = new Error(message);
    customError.status = error.response.status;
    customError.code = data.code || null;
    customError.errors = data.errors || null;
    customError.response = error.response;

    const fieldErrors = {};
    if (Array.isArray(data.errors)) {
      data.errors.forEach((errItem) => {
        if (!errItem) return;
        const key =
          errItem.field ||
          (Array.isArray(errItem.path) ? errItem.path.join('.') : errItem.path);
        if (key && errItem.message) {
          fieldErrors[key] = errItem.message;
        }
      });
    }
    customError.fieldErrors = fieldErrors;
    return customError;
  }
  return new Error(error.message || 'Network error. Please check your connection.');
}
