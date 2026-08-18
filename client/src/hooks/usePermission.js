import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';

/**
 * Permission hook — provides access to school-level role and permission helpers.
 *
 * Usage:
 *   const { can, canVoidReceipt, isOwner, isSchoolAdmin } = usePermission();
 *   if (can('FEES_COLLECT')) { ... }
 */
export const usePermission = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('usePermission must be used within AuthProvider');
  }

  const {
    user,
    schoolMembership,
    schoolRole,
    schoolPermissions,
    isOwner,
    isSchoolAdmin,
    hasFullAccess,
    can,
    canVoidReceipt,
    refreshProfile,
  } = context;

  return {
    user,
    schoolMembership,
    schoolRole,
    schoolPermissions,
    isOwner,
    isSchoolAdmin,
    hasFullAccess,
    can,
    canVoidReceipt,
    refreshProfile,
    // Convenience role labels for display
    roleLabel: schoolRole === 'OWNER'
      ? 'Owner'
      : schoolRole === 'SCHOOL_ADMIN'
        ? 'School Admin'
        : schoolRole === 'STAFF'
          ? 'Staff / User'
          : 'User',
  };
};
