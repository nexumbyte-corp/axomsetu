import React from 'react';
import { User } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

/**
 * High-Contrast Classic Admit Card Template Component
 * 
 * Optimized for ultra-clear readability when saving as PDF or printing.
 * Uses high-contrast black typography, distinct borders, and razor-sharp formatting.
 */
export const AdmitCardTemplate = ({
  school = {},
  academicYearName = '',
  examName = '',
  student = null,
  enrollment = null,
  isPreview = false,
  className = '',
}) => {
  // Fallback student data for live preview
  const displayStudent = student || {
    name: 'JOHN DOE',
    guardianName: 'ROBERT DOE',
    admissionNo: 'ADM-2026-001',
    photoUrl: null,
  };

  const displayEnrollment = enrollment || {
    rollNo: '01',
    rollNumber: '01',
    class: { name: 'Class X', hasStream: false },
    section: { name: 'Section A' },
    medium: { name: 'English' },
    stream: null,
  };

  // Safe field value formatters
  const studentName = displayStudent.name || '';
  const guardianName = displayStudent.guardianName || '';
  const admissionNo = displayStudent.admissionNo || '';
  const classNameVal = displayEnrollment.class?.name || '';
  const sectionNameVal = displayEnrollment.section?.name || '';
  const mediumNameVal = displayEnrollment.medium?.name || '';
  const streamNameVal = displayEnrollment.stream?.name || '';
  const rollNoVal = displayEnrollment.rollNo ?? displayEnrollment.rollNumber ?? '';

  // QR Code payload: ONLY Student Name and Admission Number (e.g. "John Doe ADM-2026-001")
  const qrPayload = [studentName, admissionNo].filter(Boolean).join(' ');

  // Location string formatting
  const locationParts = [];
  if (school.address) locationParts.push(school.address);
  if (school.district) locationParts.push(school.district);
  if (school.state) locationParts.push(school.state);
  if (school.pincode) locationParts.push(`PIN: ${school.pincode}`);
  const locationText = locationParts.join(', ');

  // Contact string formatting
  const contactParts = [];
  if (school.phone) contactParts.push(`Ph: ${school.phone}`);
  if (school.email) contactParts.push(`Email: ${school.email}`);
  const contactText = contactParts.join(' | ');

  // Affiliation / UDISE formatting
  const codeParts = [];
  if (school.udiseCode) codeParts.push(`UDISE: ${school.udiseCode}`);
  if (school.affiliationNo) codeParts.push(`Affiliation No: ${school.affiliationNo}`);
  const codesText = codeParts.join(' | ');

  const formattedExamName = (examName || 'EXAMINATION').toUpperCase();
  const formattedAcademicYear = academicYearName || '2025-2026';

  return (
    <div
      className={`admit-card-box border-2 border-slate-900 bg-white p-3.5 sm:p-4 rounded-none flex flex-col justify-between select-text print:border-2 print:border-slate-900 print:p-4 print:rounded-none ${
        isPreview ? 'shadow-sm' : ''
      } ${className}`}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        minHeight: isPreview ? 'auto' : '134mm',
        maxHeight: isPreview ? 'auto' : '138mm',
      }}
    >
      {/* 1. TOP CENTER LOGO & HIGH-CONTRAST SCHOOL HEADER WITH RIGHT-ALIGNED QR CODE & TOP-LEFT BRANDING */}
      <div className="relative border-b-2 border-slate-900 pb-2.5 mb-2 text-center flex flex-col items-center">
        
        {/* Top Left Header Corner: Seamless AxomSetu Branding */}
        <div className="absolute left-0 top-0 text-[8.5px] font-sans font-medium text-slate-500 uppercase tracking-tight">
          Powered by <strong className="font-extrabold text-slate-800">AxomSetu</strong>
        </div>

        {/* Right Header Corner: Crisp QR Code */}
        <div className="absolute right-0 top-0 shrink-0 bg-white p-0.5 border border-slate-900">
          <QRCodeSVG
            value={qrPayload || 'AXOMSETU ADMIT CARD'}
            size={74}
            level="M"
            includeMargin={false}
          />
        </div>

        {/* Top Center Logo */}
        {school.logoUrl ? (
          <div className="mb-1 flex justify-center">
            <img
              src={school.logoUrl}
              alt={school.name || 'School Logo'}
              className="w-14 h-14 object-contain max-h-14"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        ) : (
          <div className="mb-1 w-12 h-12 rounded-full border-2 border-slate-900 bg-slate-100 flex items-center justify-center font-black text-slate-900 text-xs uppercase font-serif tracking-widest">
            {school.name ? school.name.substring(0, 2) : 'SCH'}
          </div>
        )}

        {/* School Name in Bold Header */}
        <h2 className="text-xl sm:text-2xl font-black font-serif text-slate-900 uppercase tracking-tight leading-tight px-16">
          {school.name || 'SCHOOL NAME'}
        </h2>

        {/* Address & Contacts in High Contrast Dark Text */}
        {locationText && (
          <p className="text-[11px] leading-snug font-serif font-black text-slate-900 mt-0.5 px-16">
            {locationText}
          </p>
        )}

        {(contactText || codesText) && (
          <p className="text-[10px] leading-tight text-slate-900 font-bold mt-0.5 px-16">
            {[contactText, codesText].filter(Boolean).join(' • ')}
          </p>
        )}
      </div>

      {/* 2. HIGH-CONTRAST TITLE BANNER (NO SOLID BLACK BACKGROUND) */}
      <div className="border-y-2 border-slate-900 bg-slate-100/90 py-1.5 px-3.5 text-center mb-2">
        <div className="flex items-center justify-between font-serif">
          <span className="text-[10px] font-black tracking-wider text-slate-900 uppercase">
            SESSION: {formattedAcademicYear}
          </span>
          <h3 className="text-xs sm:text-sm font-black tracking-widest uppercase text-slate-900">
            ADMIT CARD — {formattedExamName}
          </h3>
          <span className="text-[10px] font-black tracking-wider text-slate-900 uppercase">
            OFFICIAL
          </span>
        </div>
      </div>

      {/* 3. STUDENT DETAILS TABLE + PHOTO */}
      <div className="grid grid-cols-12 gap-3.5 items-start my-1 flex-1">
        {/* Left Column: Student Details Table (9 Cols) */}
        <div className="col-span-9 sm:col-span-9 print:col-span-9">
          <table className="w-full text-xs font-serif border-collapse">
            <tbody>
              <tr className="border-b-2 border-slate-300">
                <td className="py-1.5 font-black text-slate-900 uppercase w-32">Student Name:</td>
                <td className="py-1.5 font-black text-slate-900 uppercase text-xs sm:text-sm">
                  {studentName}
                </td>
              </tr>
              <tr className="border-b-2 border-slate-300">
                <td className="py-1.5 font-black text-slate-900 uppercase">Father/Guardian:</td>
                <td className="py-1.5 font-black text-slate-900 uppercase">
                  {guardianName}
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="pt-2 pb-0">
                  <div className="grid grid-cols-4 gap-2 bg-slate-100 p-2 rounded-none border-2 border-slate-900 text-xs font-sans">
                    <div>
                      <span className="block text-[10px] text-slate-900 font-extrabold uppercase">Class</span>
                      <span className="font-black text-slate-900 text-xs sm:text-sm">{classNameVal}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-900 font-extrabold uppercase">Section</span>
                      <span className="font-black text-slate-900 text-xs sm:text-sm">{sectionNameVal}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-900 font-extrabold uppercase">Medium</span>
                      <span className="font-black text-slate-900 text-xs sm:text-sm">{mediumNameVal}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-900 font-extrabold uppercase">Roll No</span>
                      <span className="font-mono font-black text-slate-900 text-xs sm:text-sm">
                        {rollNoVal}
                      </span>
                    </div>
                    {displayEnrollment.class?.hasStream && (
                      <div className="col-span-4 mt-1.5 pt-1.5 border-t-2 border-slate-400">
                        <span className="text-[10px] text-slate-900 font-extrabold uppercase mr-1.5">Stream:</span>
                        <span className="font-black text-slate-900 text-xs sm:text-sm">{streamNameVal}</span>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Right Column: Student Photo Box (3 Cols) */}
        <div className="col-span-3 sm:col-span-3 print:col-span-3 flex flex-col items-center justify-start pt-0.5">
          <div className="w-24 h-28 border-2 border-slate-900 rounded-none bg-slate-50 overflow-hidden flex flex-col items-center justify-center p-0.5">
            {displayStudent.photoUrl ? (
              <img
                src={displayStudent.photoUrl}
                alt={studentName || 'Student Photo'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-700 p-1 text-center"
              style={{ display: displayStudent.photoUrl ? 'none' : 'flex' }}
            >
              <User className="w-8 h-8 stroke-[2]" />
              <span className="text-[8.5px] font-serif font-black text-slate-900 mt-1 uppercase leading-tight">
                AFFIX PHOTO
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. IMPORTANT INSTRUCTIONS FOR CANDIDATES */}
      <div className="my-1.5 p-2 bg-slate-100/90 border-2 border-slate-900 text-[9.5px] font-serif leading-snug">
        <span className="block font-black uppercase text-slate-900 mb-0.5 tracking-wider text-[9px]">
          Important Instructions:
        </span>
        <ol className="list-decimal list-inside text-slate-900 space-y-0.5 font-extrabold">
          <li>Without a valid Admit Card, no candidate will be allowed to enter the examination hall.</li>
          <li>Candidates must reach the examination hall at least 30 minutes before commencement of exam.</li>
          <li>Mobile phones, smart watches, and unauthorized materials are strictly prohibited inside hall.</li>
        </ol>
      </div>

      {/* 5. FOOTER & SIGNATURE AREA */}
      <div className="mt-1.5 pt-1.5 border-t-2 border-slate-900 font-serif">
        <div className="flex items-end justify-between px-6">
          {/* Candidate Signature */}
          <div className="flex flex-col items-center w-44">
            <div className="h-6 border-b-2 border-dashed border-slate-900 w-full mb-1"></div>
            <span className="text-[10px] font-black text-slate-900 uppercase tracking-wide">Candidate Signature</span>
          </div>

          {/* Principal Signature */}
          <div className="flex flex-col items-center w-44">
            <div className="h-6 border-b-2 border-dashed border-slate-900 w-full mb-1"></div>
            <span className="text-[10px] font-black text-slate-900 uppercase tracking-wide">Principal Signature</span>
          </div>
        </div>
      </div>
    </div>
  );
};
