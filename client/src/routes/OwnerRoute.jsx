import React from 'react';
import { usePermission } from '../hooks/usePermission.js';
import { AccessDeniedPage } from '../pages/AccessDeniedPage.jsx';

/**
 * OwnerRoute — renders children strictly if the current user is the School Owner (isOwner === true).
 * Otherwise renders AccessDeniedPage.
 */
export const OwnerRoute = ({ children }) => {
  const { isOwner } = usePermission();

  if (!isOwner) {
    return <AccessDeniedPage missingPermission="SCHOOL_OWNER_REQUIRED" />;
  }

  return children;
};
