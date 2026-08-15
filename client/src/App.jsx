import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './components/ui/Toast.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { AcademicYearProvider } from './context/AcademicYearContext.jsx';
import { AppRoutes } from './routes/AppRoutes.jsx';

import { ErrorBoundary } from './components/ui/ErrorBoundary.jsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 3 * 60 * 1000, // 3 minutes stale time for smooth sub-second page transitions
      gcTime: 10 * 60 * 1000, // 10 minutes cache persistence
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

export default function App() {
  React.useEffect(() => {
    const handleGlobalWheel = (e) => {
      if (
        document.activeElement &&
        document.activeElement.tagName === 'INPUT' &&
        document.activeElement.type === 'number'
      ) {
        e.preventDefault();
      }
    };

    window.addEventListener('wheel', handleGlobalWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', handleGlobalWheel);
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ToastProvider>
            <AuthProvider>
              <AcademicYearProvider>
                <AppRoutes />
              </AcademicYearProvider>
            </AuthProvider>
          </ToastProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
