import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { Spinner } from '../components/ui/Spinner.jsx';

/**
 * GuestRoute — route guard for public auth pages (e.g., /login).
 * If the session is currently being initialized, renders a loading spinner.
 * If the user is already authenticated, redirects them to their main system dashboard.
 * If the user is unauthenticated, renders children (e.g. LoginPage).
 */
export const GuestRoute = ({ children }) => {
  const { isAuthenticated, isInitializing, user } = useAuth();

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Spinner size="lg" label="Initializing session..." />
      </div>
    );
  }

  if (isAuthenticated) {
    const mainSystemPath = user?.role === 'SUPER_ADMIN' ? '/admin/dashboard' : '/app';
    return <Navigate to={mainSystemPath} replace />;
  }

  return children;
};
