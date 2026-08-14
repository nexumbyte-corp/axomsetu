import React, { createContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/auth.service.js';
import { storage } from '../utils/storage.js';
import { toast } from '../components/ui/Toast.jsx';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Fetch current profile via HttpOnly session cookie or stored access token
  const initAuth = useCallback(async () => {
    try {
      const res = await authService.getMe();
      if (res.success && res.data) {
        setUser(res.data);
      } else {
        storage.clearAuth();
        setUser(null);
      }
    } catch (err) {
      storage.clearAuth();
      setUser(null);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    initAuth();

    const handleUnauthorized = () => {
      setUser(null);
    };

    const handleSessionRevoked = (e) => {
      setUser(null);
      const msg = e.detail?.message || 'Your session has ended because your account was signed in from another device.';
      toast.error(msg);
    };

    const handleSessionExpired = (e) => {
      setUser(null);
      const msg = e.detail?.message || 'Your session has expired. Please log in again.';
      toast.error(msg);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    window.addEventListener('auth:session_revoked', handleSessionRevoked);
    window.addEventListener('auth:session_expired', handleSessionExpired);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
      window.removeEventListener('auth:session_revoked', handleSessionRevoked);
      window.removeEventListener('auth:session_expired', handleSessionExpired);
    };
  }, [initAuth]);

  const login = async (credentials) => {
    const res = await authService.login(credentials);
    if (res.success && res.data) {
      const { user: userData, accessToken, refreshToken } = res.data;
      if (accessToken) storage.setAccessToken(accessToken);
      if (refreshToken) storage.setRefreshToken(refreshToken);
      setUser(userData);
      return res.data;
    }
    throw new Error(res.message || 'Login failed');
  };

  const registerSchool = async (schoolData) => {
    const res = await authService.registerSchool(schoolData);
    return res;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      // Ignore logout backend errors if token already invalid
    } finally {
      storage.clearAuth();
      storage.clearSelectedAcademicYearId();
      setUser(null);
    }
  };

  const refreshProfile = async () => {
    try {
      const res = await authService.getMe();
      if (res.success && res.data) {
        setUser(res.data);
        return res.data;
      }
    } catch (err) {
      // Ignore
    }
  };

  // ── School membership helpers ────────────────────────────────────────────────
  // The primary school membership is always schoolAdmins[0]
  const schoolMembership = user?.schoolAdmins?.[0] || null;
  const schoolRole = schoolMembership?.isOwner ? 'OWNER' : (schoolMembership?.schoolRole || null);
  const schoolPermissions = schoolMembership?.permissions || [];
  const isOwner = schoolRole === 'OWNER' || Boolean(schoolMembership?.isOwner);
  const isSchoolAdmin = schoolRole === 'SCHOOL_ADMIN';
  const hasFullAccess = isOwner || isSchoolAdmin;

  /**
   * Check if the current user has a specific permission.
   * OWNER and SCHOOL_ADMIN always return true.
   * STAFF returns true only if the permission is in their list.
   */
  const can = useCallback(
    (permission) => {
      if (!user) return false;
      if (hasFullAccess) return true;
      return schoolPermissions.includes(permission);
    },
    [user, hasFullAccess, schoolPermissions]
  );

  /**
   * Check if the user can void receipts.
   * Hard rule: only OWNER or SCHOOL_ADMIN.
   */
  const canVoidReceipt = isOwner || isSchoolAdmin;

  const value = {
    user,
    isAuthenticated: !!user,
    isInitializing,
    // School-level access
    schoolMembership,
    schoolRole,
    schoolPermissions,
    isOwner,
    isSchoolAdmin,
    hasFullAccess,
    can,
    canVoidReceipt,
    // Actions
    login,
    registerSchool,
    logout,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
