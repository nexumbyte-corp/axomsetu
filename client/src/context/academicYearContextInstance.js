import { createContext } from 'react';

/**
 * Pure Context instance definition for Academic Year.
 * Kept in an isolated file without React components or hooks so that
 * Vite Hot Module Replacement (Fast Refresh) never invalidates or re-creates
 * the Context object reference during live development updates.
 */
export const AcademicYearContext = createContext(null);
