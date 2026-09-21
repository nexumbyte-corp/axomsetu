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
  const studentName = displayStudent.name || '—';
  const guardianName = displayStudent.guardianName || '—';
  const admissionNo = displayStudent.admissionNo || '';
  const classNameVal = displayEnrollment.class?.name || '—';
  const sectionNameVal = displayEnrollment.section?.name || '—';
  const mediumNameVal = displayEnrollment.medium?.name || '—';
  const streamNameVal = displayEnrollment.stream?.name || '—';
  const rollNoVal = displayEnrollment.rollNo ?? displayEnrollment.rollNumber ?? '—';

  // QR Code payload: Student Name, Roll, Class & Admission No
  const qrPayload = [
    studentName !== '—' ? studentName : '',
    rollNoVal !== '—' ? `Roll:${rollNoVal}` : '',
    classNameVal !== '—' ? `Class:${classNameVal}` : '',
    admissionNo ? `Adm:${admissionNo}` : '',
  ].filter(Boolean).join(' | ');

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
  const formattedAcademicYear = academicYearName || '2026-2027';

  return (
    <div
      className={`admit-card-box border-2 border-slate-900 bg-white p-3 rounded-none flex flex-col justify-between select-text box-border print:border-2 print:border-slate-900 print:p-3 print:rounded-none ${
        isPreview ? 'shadow-sm' : ''
      } ${className}`}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        height: isPreview ? 'auto' : '130mm',
        maxHeight: isPreview ? 'auto' : '130mm',
        overflow: 'hidden',
      }}
    >
      {/* 1. TOP CENTER LOGO & HIGH-CONTRAST SCHOOL HEADER WITH RIGHT-ALIGNED QR CODE & TOP-LEFT BRANDING */}
      <div className="relative border-b-2 border-slate-900 pb-2 mb-1.5 text-center flex flex-col items-center">
        {/* Top Left Header Corner: Seamless AxomSetu Branding */}
        <div className="absolute left-0 top-0 text-[8px] font-sans font-semibold text-slate-500 uppercase tracking-tight">
          Powered by <strong className="font-extrabold text-slate-800">AxomSetu</strong>
        </div>

        {/* Right Header Corner: Crisp QR Code */}
        <div className="absolute right-0 top-0 shrink-0 bg-white p-0.5 border border-slate-900">
          <QRCodeSVG
            value={qrPayload || 'AXOMSETU ADMIT CARD'}
            size={60}
            level="M"
            includeMargin={false}
          />
        </div>

        {/* Top Center Logo */}
        {school.logoUrl ? (
          <div className="mb-0.5 flex justify-center">
            <img
              src={school.logoUrl}
              alt={school.name || 'School Logo'}
              className="w-11 h-11 object-contain max-h-11"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        ) : (
          <div className="mb-0.5 w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-100 flex items-center justify-center font-black text-slate-900 text-xs uppercase font-serif tracking-widest">
            {school.name ? school.name.substring(0, 2) : 'SCH'}
          </div>
        )}

        {/* School Name in Bold Header */}
        <h2 className="text-lg sm:text-xl font-black font-serif text-slate-900 uppercase tracking-tight leading-tight px-14">
          {school.name || 'SCHOOL NAME'}
        </h2>

        {/* Address & Contacts in High Contrast Dark Text */}
        {locationText && (
          <p className="text-[10px] leading-snug font-serif font-black text-slate-900 mt-0.5 px-14">
            {locationText}
          </p>
        )}

        {(contactText || codesText) && (
          <p className="text-[9px] leading-tight text-slate-900 font-bold mt-0.5 px-14">
            {[contactText, codesText].filter(Boolean).join(' • ')}
          </p>
        )}
      </div>

      {/* 2. HIGH-CONTRAST TITLE BANNER (NO SOLID BLACK BACKGROUND) */}
      <div className="border-y-2 border-slate-900 bg-slate-100 py-1 px-3 text-center mb-1.5 shrink-0">
        <div className="flex items-center justify-between font-serif">
          <span className="text-[9.5px] font-black tracking-wider text-slate-900 uppercase">
            SESSION: {formattedAcademicYear}
          </span>
          <h3 className="text-xs sm:text-sm font-black tracking-widest uppercase text-slate-900">
            ADMIT CARD — {formattedExamName}
          </h3>
          <span className="text-[9.5px] font-black tracking-wider text-slate-900 uppercase">
            OFFICIAL
          </span>
        </div>
      </div>

      {/* 3. STUDENT DETAILS TABLE + PHOTO */}
      <div className="grid grid-cols-12 gap-3 items-start my-0.5 flex-1">
        {/* Left Column: Student Details Table (9 Cols) */}
        <div className="col-span-9 print:col-span-9">
          <table className="w-full text-xs font-serif border-collapse">
            <tbody>
              <tr className="border-b border-slate-300">
                <td className="py-1 font-black text-slate-900 uppercase w-36 whitespace-nowrap pr-2">
                  Student Name:
                </td>
                <td className="py-1 font-black text-slate-900 uppercase text-xs sm:text-sm">
                  {studentName}
                </td>
              </tr>
              <tr className="border-b border-slate-300">
                <td className="py-1 font-black text-slate-900 uppercase w-36 whitespace-nowrap pr-2">
                  Father / Guardian:
                </td>
                <td className="py-1 font-black text-slate-900 uppercase text-xs font-bold">
                  {guardianName}
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="pt-1.5 pb-0">
                  <div className="grid grid-cols-4 gap-1.5 bg-slate-50 p-1.5 rounded-none border-2 border-slate-900 text-xs font-sans">
                    <div>
                      <span className="block text-[9.5px] text-slate-800 font-extrabold uppercase leading-none mb-0.5">
                        Class
                      </span>
                      <span className="font-black text-slate-900 text-xs sm:text-sm block">
                        {classNameVal}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9.5px] text-slate-800 font-extrabold uppercase leading-none mb-0.5">
                        Section
                      </span>
                      <span className="font-black text-slate-900 text-xs sm:text-sm block">
                        {sectionNameVal}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9.5px] text-slate-800 font-extrabold uppercase leading-none mb-0.5">
                        Medium
                      </span>
                      <span className="font-black text-slate-900 text-xs sm:text-sm block">
                        {mediumNameVal}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9.5px] text-slate-800 font-extrabold uppercase leading-none mb-0.5">
                        Roll No
                      </span>
                      <span className="font-mono font-black text-slate-900 text-xs sm:text-sm block">
                        {rollNoVal}
                      </span>
                    </div>
                    {displayEnrollment.class?.hasStream && (
                      <div className="col-span-4 mt-1 pt-1 border-t border-slate-300 flex items-center gap-1.5">
                        <span className="text-[9.5px] text-slate-800 font-extrabold uppercase">
                          Stream:
                        </span>
                        <span className="font-black text-slate-900 text-xs">
                          {streamNameVal}
                        </span>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Right Column: Student Photo Box (3 Cols) */}
        <div className="col-span-3 print:col-span-3 flex flex-col items-center justify-start pt-0.5">
          <div className="w-22 h-26 border-2 border-slate-900 rounded-none bg-slate-50 overflow-hidden flex flex-col items-center justify-center p-0.5">
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
              <User className="w-7 h-7 stroke-[2]" />
              <span className="text-[8px] font-serif font-black text-slate-900 mt-1 uppercase leading-tight">
                AFFIX PHOTO
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. IMPORTANT INSTRUCTIONS FOR CANDIDATES */}
      <div className="my-1 p-1.5 bg-slate-50 border-2 border-slate-900 text-[9px] font-serif leading-tight shrink-0">
        <span className="block font-black uppercase text-slate-900 mb-0.5 tracking-wider text-[8.5px]">
          Important Instructions:
        </span>
        <ol className="list-decimal list-inside text-slate-900 space-y-0.5 font-bold">
          <li>Without a valid Admit Card, no candidate will be allowed to enter the examination hall.</li>
          <li>Candidates must reach the examination hall at least 30 minutes before commencement of exam.</li>
          <li>Mobile phones, smart watches, and unauthorized materials are strictly prohibited inside hall.</li>
        </ol>
      </div>

      {/* 5. FOOTER & SIGNATURE AREA */}
      <div className="mt-1 pt-1 border-t-2 border-slate-900 font-serif shrink-0">
        <div className="flex items-end justify-between px-6">
          {/* Candidate Signature */}
          <div className="flex flex-col items-center w-40">
            <div className="h-5 border-b-2 border-dashed border-slate-900 w-full mb-0.5"></div>
            <span className="text-[9px] font-black text-slate-900 uppercase tracking-wide">
              Candidate Signature
            </span>
          </div>

          {/* Principal Signature */}
          <div className="flex flex-col items-center w-40">
            <div className="h-5 border-b-2 border-dashed border-slate-900 w-full mb-0.5"></div>
            <span className="text-[9px] font-black text-slate-900 uppercase tracking-wide">
              Principal Signature
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
