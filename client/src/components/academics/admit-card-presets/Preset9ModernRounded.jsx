import React from 'react';
import { User } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { extractAdmitCardData } from './useAdmitCardData.js';

/**
 * Preset 9: Modern Rounded Soft
 *
 * Contemporary, clean with rounded corners, indigo accents, modern SaaS-school style.
 */
export const Preset9ModernRounded = ({
  school = {},
  academicYearName = '',
  examName = '',
  validUpto = '',
  student = null,
  enrollment = null,
  isPreview = false,
  className = '',
}) => {
  const data = extractAdmitCardData({
    school,
    academicYearName,
    examName,
    validUpto,
    student,
    enrollment,
  });

  return (
    <div
      className={`admit-card-box border-2 border-indigo-200 bg-white rounded-xl flex flex-col select-text box-border print:border-2 print:border-indigo-200 overflow-hidden font-sans ${
        isPreview ? 'shadow-sm' : ''
      } ${className}`}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        height: isPreview ? 'auto' : '130mm',
        maxHeight: isPreview ? 'auto' : '130mm',
        padding: '12px',
      }}
    >
      {/* 1. HEADER */}
      <div className="flex items-center justify-between pb-1.5 border-b border-indigo-100 shrink-0">
        {/* Left: Logo + School info */}
        <div className="flex items-center gap-2 min-w-0">
          {data.schoolLogoUrl ? (
            <img
              src={data.schoolLogoUrl}
              alt={data.schoolName}
              className="w-10 h-10 object-contain rounded-lg border border-indigo-100 bg-indigo-50/50 shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg border border-indigo-100 bg-indigo-50/50 flex items-center justify-center font-black text-indigo-700 text-xs uppercase shrink-0">
              {data.schoolInitials}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[7.5px] text-slate-500 leading-none mb-0.5">
              Powered by <span className="font-semibold">AxomSetu</span>
            </p>
            <h2 className="font-extrabold text-slate-900 uppercase text-sm leading-tight truncate">{data.schoolName}</h2>
            {data.locationText && (
              <p className="text-[9px] text-slate-500 leading-tight truncate">{data.locationText}</p>
            )}
            {(data.contactText || data.codesText) && (
              <p className="text-[8px] text-slate-400 leading-tight truncate">
                {[data.contactText, data.codesText].filter(Boolean).join(' | ')}
              </p>
            )}
          </div>
        </div>
        {/* Right: QR */}
        <div className="p-1 rounded-lg border border-indigo-200 bg-indigo-50/30 shrink-0">
          <QRCodeSVG value={data.qrPayload} size={50} level="M" includeMargin={false} />
        </div>
      </div>

      {/* 2. PILL BADGE BANNER */}
      <div className="flex items-center justify-between gap-1.5 py-0.5 px-1 bg-slate-50 border border-slate-200 rounded-lg my-1 shrink-0">
        <div className="bg-white border border-slate-200 px-2 py-0.5 rounded-md text-[8.5px] text-slate-600 shrink-0">
          SESSION {data.formattedAcademicYear}
        </div>
        <div className="bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-md text-[9.5px] text-indigo-700 font-black whitespace-nowrap overflow-hidden text-ellipsis">
          ADMIT CARD • {data.formattedExamName}
        </div>
        <div className="bg-white border border-slate-200 px-2 py-0.5 rounded-md text-[8.5px] text-slate-600 font-mono shrink-0">
          VALID: {data.formattedValidUpto || 'EXAM DATE'}
        </div>
      </div>

      {/* 3. CONTENT */}
      <div className="flex gap-3 items-center flex-1 min-h-0 overflow-hidden">
        {/* Left: Photo col */}
        <div className="w-20 shrink-0 flex flex-col items-center">
          <div className="w-20 h-24 rounded-lg border-2 border-indigo-200 bg-indigo-50/40 overflow-hidden">
            {data.photoUrl ? (
              <img src={data.photoUrl} alt={data.studentName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-indigo-50 text-indigo-400 p-1 text-center">
                <User className="w-6 h-6 stroke-[1.5]" />
                <span className="text-[7.5px] font-bold uppercase text-indigo-700 mt-1">AFFIX PHOTO</span>
              </div>
            )}
          </div>
          <div className="text-[7.5px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full mt-1">
            VERIFIED
          </div>
        </div>

        {/* Right: Details */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Candidate Name */}
          <div className="border-b border-slate-100 pb-1">
            <span className="text-[8px] text-slate-400 uppercase font-bold block leading-none">Candidate Name</span>
            <span className="text-sm font-black uppercase text-slate-900 truncate block leading-tight">{data.studentName}</span>
          </div>

          {/* Guardian + Admission No */}
          <div className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-1">
            <div>
              <span className="text-[8px] text-slate-400 uppercase font-bold block leading-none">Father / Guardian</span>
              <span className="text-[10px] font-bold text-slate-800 uppercase truncate block leading-tight">{data.guardianName}</span>
            </div>
            <div>
              <span className="text-[8px] text-slate-400 uppercase font-bold block leading-none">Admission No</span>
              <span className="text-[10px] font-mono font-extrabold text-slate-900 block leading-tight">{data.admissionNo || '—'}</span>
            </div>
          </div>

          {/* Class / Medium / Roll */}
          <div className="grid grid-cols-3 gap-1">
            <div className="bg-slate-50 border border-slate-200 rounded-md p-1">
              <span className="text-[7.5px] text-slate-500 uppercase font-bold block leading-none">Class & Sec</span>
              <span className="text-[10px] font-black text-slate-900 block leading-tight">
                {data.classNameVal} ({data.sectionNameVal})
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-md p-1">
              <span className="text-[7.5px] text-slate-500 uppercase font-bold block leading-none">
                {data.hasStream ? 'Stream' : 'Medium'}
              </span>
              <span className="text-[10px] font-black text-slate-900 block leading-tight">
                {data.hasStream ? data.streamNameVal : data.mediumNameVal}
              </span>
            </div>
            <div className="bg-indigo-600 text-white rounded-md p-1">
              <span className="text-[7.5px] text-indigo-200 uppercase font-bold block leading-none">Roll No</span>
              <span className="text-[10px] font-mono font-black block leading-tight">{data.rollNoVal}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. INSTRUCTIONS */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-[8.5px] leading-tight text-slate-700 mt-1 shrink-0">
        <span className="font-extrabold uppercase text-slate-900 block mb-0.5">Important Rules:</span>
        <ol className="list-decimal list-inside space-y-0.5 font-medium">
          {data.instructions.map((inst, i) => (
            <li key={i}>{inst}</li>
          ))}
        </ol>
      </div>

      {/* 5. FOOTER */}
      <div className="border-t border-slate-100 pt-1 flex justify-between items-end px-6 shrink-0">
        <div className="flex flex-col items-center w-32">
          <div className="h-4 border-b border-indigo-300 w-full mb-0.5" />
          <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wide">Student Signature</span>
        </div>
        <div className="flex flex-col items-center w-32">
          <div className="h-4 border-b border-indigo-300 w-full mb-0.5" />
          <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wide">Exam Controller</span>
        </div>
      </div>
    </div>
  );
};
