import { useContext } from 'react';
import { AcademicYearContext } from '../context/AcademicYearContext.jsx';

export const useAcademicYear = () => {
  const context = useContext(AcademicYearContext);
  if (!context) {
    throw new Error('useAcademicYear must be used within an AcademicYearProvider');
  }
  return context;
};
