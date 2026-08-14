import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { academicService } from '../services/academic.service.js';
import { storage } from '../utils/storage.js';
import { useAuth } from '../hooks/useAuth.js';

export const AcademicYearContext = createContext(null);

export const AcademicYearProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedId, setSelectedId] = useState(storage.getSelectedAcademicYearId());
  const [isLoading, setIsLoading] = useState(false);

  const isSchoolAdmin = user?.role === 'SCHOOL_ADMIN';

  const fetchYears = useCallback(async () => {
    if (!isAuthenticated || !isSchoolAdmin) return;
    setIsLoading(true);
    try {
      const res = await academicService.getAcademicYears();
      if (res.success && Array.isArray(res.data)) {
        setAcademicYears(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch academic years', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, isSchoolAdmin]);

  useEffect(() => {
    fetchYears();
  }, [fetchYears]);

  // Compute currently selected year object
  const selectedYear = useMemo(() => {
    if (!academicYears.length) return null;
    if (selectedId) {
      const found = academicYears.find((y) => y.id === selectedId);
      if (found) return found;
    }
    // Fallback to current academic year
    const current = academicYears.find((y) => y.isCurrent);
    return current || academicYears[0];
  }, [academicYears, selectedId]);

  const selectAcademicYear = (id) => {
    setSelectedId(id);
    storage.setSelectedAcademicYearId(id);
  };

  const value = {
    academicYears,
    selectedYear,
    selectedYearId: selectedYear?.id || null,
    setSelectedYearId: selectAcademicYear,
    isLoading,
    refetchAcademicYears: fetchYears,
  };

  return <AcademicYearContext.Provider value={value}>{children}</AcademicYearContext.Provider>;
};

export const useAcademicYear = () => {
  const context = React.useContext(AcademicYearContext);
  if (!context) {
    throw new Error('useAcademicYear must be used within an AcademicYearProvider');
  }
  return {
    ...context,
    currentAcademicYear: context.selectedYear,
  };
};

