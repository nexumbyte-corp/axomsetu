import React, { useState, useEffect } from 'react';
import { GraduationCap } from 'lucide-react';

/**
 * SchoolHeaderLogo Component
 * Dynamically displays the authenticated school's uploaded logo in the global header container.
 * Falls back gracefully to the default AxomSetu GraduationCap icon if no logo is configured or if logo fails to load.
 */
export const SchoolHeaderLogo = ({
  logoUrl,
  schoolName = '',
  className = 'w-8 h-8',
}) => {
  const [hasError, setHasError] = useState(false);

  // Reset error state whenever the logoUrl changes (e.g., school switch, user session change, or logo upload/delete)
  useEffect(() => {
    setHasError(false);
  }, [logoUrl]);

  const showSchoolLogo = Boolean(logoUrl && typeof logoUrl === 'string' && logoUrl.trim() !== '' && !hasError);

  if (showSchoolLogo) {
    return (
      <div
        className={`${className} rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-center p-0.5 overflow-hidden shrink-0 shadow-2xs`}
        title={schoolName ? `${schoolName} Logo` : 'School Logo'}
      >
        <img
          src={logoUrl}
          alt={schoolName ? `${schoolName} logo` : 'School logo'}
          className="w-full h-full object-contain"
          onError={() => setHasError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`${className} rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-xs shrink-0`}
      title="AxomSetu Default Logo"
    >
      <GraduationCap className="w-4 h-4" />
    </div>
  );
};

export default SchoolHeaderLogo;
