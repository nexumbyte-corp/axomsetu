import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

/**
 * RoleRoute — allows access based on platform user.role.
 */
export const RoleRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    if (user?.role === 'SUPER_ADMIN') {
      return <Navigate to="/admin/subscriptions" replace />;
    }
    return <Navigate to="/app" replace />;
  }

  return children;
};
