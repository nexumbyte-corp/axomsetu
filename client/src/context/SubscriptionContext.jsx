import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { subscriptionService } from '../services/subscriptionService.js';
import { useAuth } from '../hooks/useAuth.js';
import { StudentLimitModal } from '../components/subscription/StudentLimitModal.jsx';
import { parseStudentLimitError } from '../utils/subscriptionUtils.js';

export const SubscriptionContext = createContext(null);

export const SubscriptionProvider = ({ children }) => {
  const { user } = useAuth();
  const [currentSubData, setCurrentSubData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Student Limit Modal state
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [limitModalData, setLimitModalData] = useState(null);

  const fetchSubscription = useCallback(async () => {
    // Only fetch for logged-in school users
    if (!user || user.role === 'SUPER_ADMIN') {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await subscriptionService.getCurrentSubscription();
      if (res.success) {
        setCurrentSubData(res.data);
      }
    } catch (err) {
      console.error('Failed to load subscription status:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const sub = currentSubData?.subscription;
  const status = currentSubData?.status || sub?.status || 'EXPIRED';
  const remainingDays = currentSubData?.remainingDays || 0;

  // Active check: Status must be ACTIVE and remainingDays > 0
  const isSubscriptionActive = user?.role === 'SUPER_ADMIN' || (status === 'ACTIVE' && remainingDays > 0);

  const showStudentLimitModal = useCallback((customLimitInfo = null) => {
    const parsed = customLimitInfo || parseStudentLimitError(null, sub);
    setLimitModalData(parsed);
    setLimitModalOpen(true);
  }, [sub]);

  const closeStudentLimitModal = useCallback(() => {
    setLimitModalOpen(false);
  }, []);

  useEffect(() => {
    const handleLimitExceededEvent = (e) => {
      const msg = e.detail?.message;
      const parsed = parseStudentLimitError(msg, sub);
      setLimitModalData(parsed);
      setLimitModalOpen(true);
    };

    window.addEventListener('subscription:student_limit_exceeded', handleLimitExceededEvent);
    return () => window.removeEventListener('subscription:student_limit_exceeded', handleLimitExceededEvent);
  }, [sub]);

  return (
    <SubscriptionContext.Provider
      value={{
        currentSubData,
        subscription: sub,
        status,
        remainingDays,
        isSubscriptionActive,
        loading,
        refreshSubscription: fetchSubscription,
        showStudentLimitModal,
        closeStudentLimitModal,
        isStudentLimitModalOpen: limitModalOpen,
      }}
    >
      {children}
      <StudentLimitModal
        isOpen={limitModalOpen}
        onClose={closeStudentLimitModal}
        limitInfo={limitModalData || parseStudentLimitError(null, sub)}
      />
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
