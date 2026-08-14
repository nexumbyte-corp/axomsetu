import React from 'react';
import { School } from 'lucide-react';

export const SchoolReportHeader = ({
  school = {},
  documentTitle = 'FEE MONEY RECEIPT',
  academicYear = '',
}) => {
  if (!school) return null;

  // Build Address string from available parts
  const addressParts = [school.address, school.district, school.state].filter(
    (part) => part && String(part).trim() !== ''
  );
  const addressLine = addressParts.join(', ');

  // Build Contact info line
  const contactParts = [
    school.phone ? `Phone: ${school.phone}` : null,
    school.email ? `Email: ${school.email}` : null,
    school.website ? `Website: ${school.website}` : null,
  ].filter(Boolean);
  const contactLine = contactParts.join(' | ');

  // Build UDISE & Affiliation line
  const codeParts = [
    school.udiseCode ? `UDISE Code: ${school.udiseCode}` : null,
    school.affiliationNo ? `Affiliation/Recognition No.: ${school.affiliationNo}` : null,
  ].filter(Boolean);
  const codeLine = codeParts.join('    ');

  return (
    <div className="text-center space-y-1.5 pb-4 border-b border-slate-200">
      {/* Centered School Logo */}
      <div className="flex justify-center mb-2">
        {school.logoUrl ? (
          <img
            src={school.logoUrl}
            alt={school.name || 'School Logo'}
            className="w-16 h-16 rounded-xl object-contain border border-slate-200 shadow-2xs"
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
            <School className="w-7 h-7" />
          </div>
        )}
      </div>

      {/* School Name */}
      <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight uppercase">
        {school.name || 'SCHOOL NAME'}
      </h1>

      {/* Address & Location */}
      {addressLine && <p className="text-xs font-semibold text-slate-700">{addressLine}</p>}

      {/* PIN Code */}
      {school.pincode && (
        <p className="text-xs font-mono font-bold text-slate-600">PIN: {school.pincode}</p>
      )}

      {/* Contact Phone | Email | Website */}
      {contactLine && <p className="text-[11px] font-medium text-slate-600">{contactLine}</p>}

      {/* UDISE Code & Affiliation/Recognition No. */}
      {codeLine && (
        <p className="text-[11px] font-mono font-bold text-slate-700 pt-1 tracking-wide">
          {codeLine}
        </p>
      )}

      {/* Document Title & Academic Year Header Block */}
      {documentTitle && (
        <div className="pt-3">
          <h2 className="text-sm font-black uppercase text-indigo-700 tracking-wider">
            {documentTitle}
          </h2>
          {academicYear && (
            <p className="text-xs font-bold text-slate-600 mt-0.5">
              Academic Year: {academicYear}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default SchoolReportHeader;
