import React from 'react';
import { usePermission } from '../hooks/usePermission.js';
import { AccessDeniedPage } from '../pages/AccessDeniedPage.jsx';

/**
 * PermissionRoute — renders children only if the user has the required permission.
 * OWNER and SCHOOL_ADMIN always pass through.
 * Shows AccessDeniedPage if permission is missing.
 *
 * Usage:
 *   <PermissionRoute permission="PAYROLL_PROCESS">
 *     <ProcessPayrollPage />
 *   </PermissionRoute>
 */
export const PermissionRoute = ({ children, permission, requireAll = false }) => {
  const { can } = usePermission();

  if (permission && !can(permission, { requireAll })) {
    const missingPerm = Array.isArray(permission) ? permission.join(', ') : permission;
    return <AccessDeniedPage missingPermission={missingPerm} />;
  }

  return children;
};
