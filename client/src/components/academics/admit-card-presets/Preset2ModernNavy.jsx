import React from 'react';
import { User } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { extractAdmitCardData } from './useAdmitCardData.js';

/**
 * Preset 2: Deep Indigo Professional
 *
 * Sleek, modern institutional design with a deep indigo/navy top header band.
 */
export const Preset2ModernNavy = ({
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
      className={`admit-card-box border-2 border-indigo-900 bg-white rounded-none flex flex-col select-text box-border print:border-2 print:border-indigo-900 overflow-hidden ${
        isPreview ? 'shadow-sm' : ''
      } ${className}`}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        height: isPreview ? 'auto' : '130mm',
        maxHeight: isPreview ? 'auto' : '130mm',
      }}
    >
      {/* 1. HEADER BAND — deep indigo */}
      <div className="bg-indigo-900 text-white px-3 py-2 shrink-0">
        <div className="flex items-center justify-between gap-3">
          {/* Left: School identity */}
          <div className="flex items-center gap-2 min-w-0">
            {data.schoolLogoUrl ? (
              <img
                src={data.schoolLogoUrl}
                alt={data.schoolName}
                className="w-10 h-10 object-contain bg-white rounded p-0.5 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 bg-white rounded flex items-center justify-center font-black text-indigo-900 text-xs uppercase shrink-0">
                {data.schoolInitials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[7.5px] text-indigo-300 leading-none mb-0.5 font-sans">
                Powered by <span className="text-white font-bold">AxomSetu</span>
              </p>
              <h2 className="font-black text-sm uppercase leading-tight truncate">{data.schoolName}</h2>
              {data.locationText && (
                <p className="text-[9px] text-indigo-200 truncate leading-tight">{data.locationText}</p>
              )}
              {(data.contactText || data.codesText) && (
                <p className="text-[8px] text-indigo-300 truncate leading-tight">
                  {[data.contactText, data.codesText].filter(Boolean).join(' | ')}
                </p>
              )}
            </div>
          </div>
          {/* Right: QR code */}
          <div className="bg-white p-1 border border-indigo-600 shrink-0">
            <QRCodeSVG value={data.qrPayload} size={52} level="M" includeMargin={false} />
          </div>
        </div>
      </div>

      {/* 2. EXAM BANNER */}
      <div className="bg-indigo-50 border-y border-indigo-200 px-3 py-1 flex items-center justify-between shrink-0">
        <span className="text-[9px] font-extrabold text-indigo-900 uppercase tracking-wide">
          SESSION: {data.formattedAcademicYear}
        </span>
        <div className="bg-indigo-900 text-white px-2 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-wide">
          ADMIT CARD — {data.formattedExamName}
        </div>
        <span className="text-[9px] font-bold text-indigo-900 font-mono">
          VALID: {data.formattedValidUpto || 'EXAM DATE'}
        </span>
      </div>

      {/* 3. MIDDLE: PHOTO + DETAILS */}
      <div className="px-3 py-1.5 flex gap-3 items-center flex-1 min-h-0">
        {/* Photo column */}
        <div className="shrink-0 flex flex-col items-center">
          <div className="w-20 h-24 border-2 border-indigo-800 overflow-hidden bg-indigo-50">
            {data.photoUrl ? (
              <img src={data.photoUrl} alt={data.studentName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-indigo-50 text-indigo-400 p-1 text-center">
                <User className="w-6 h-6 stroke-[1.5]" />
                <span className="text-[7.5px] font-bold uppercase text-indigo-700 mt-1">AFFIX PHOTO</span>
              </div>
            )}
          </div>
          <div className="w-20 bg-indigo-900 text-white text-center py-0.5 font-mono font-black text-[10.5px] leading-tight">
            ROLL: {data.rollNoVal}
          </div>
        </div>

        {/* Right: Credentials grid */}
        <div className="flex-1 min-w-0 font-sans">
          {/* Name */}
          <div className="col-span-2 border-b border-indigo-100 pb-1 mb-1">
            <span className="text-[8px] text-indigo-600 uppercase font-bold block leading-none">Candidate Name</span>
            <span className="text-sm font-black text-slate-900 uppercase truncate block">{data.studentName}</span>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-1 mb-1">
            <div className="border-b border-indigo-100 pb-1">
              <span className="text-[8px] text-indigo-600 uppercase font-bold block leading-none">Father / Guardian</span>
              <span className="text-[11px] font-bold text-slate-800 uppercase truncate block">{data.guardianName}</span>
            </div>
            <div className="border-b border-indigo-100 pb-1">
              <span className="text-[8px] text-indigo-600 uppercase font-bold block leading-none">Admission No</span>
              <span className="text-[11px] font-mono font-extrabold text-slate-900 block">{data.admissionNo || '—'}</span>
            </div>
          </div>

          {/* Class / Medium / Stream box */}
          <div className="bg-indigo-50 border border-indigo-200 p-1 grid grid-cols-3 gap-1">
            <div>
              <span className="text-[7.5px] text-indigo-700 uppercase font-bold block leading-none">Class & Section</span>
              <span className="text-[11px] font-black text-indigo-950 block leading-tight">
                {data.classNameVal} ({data.sectionNameVal})
              </span>
            </div>
            <div>
              <span className="text-[7.5px] text-indigo-700 uppercase font-bold block leading-none">Medium</span>
              <span className="text-[11px] font-black text-indigo-950 block leading-tight">{data.mediumNameVal}</span>
            </div>
            {data.hasStream && (
              <div>
                <span className="text-[7.5px] text-indigo-700 uppercase font-bold block leading-none">Stream</span>
                <span className="text-[11px] font-black text-indigo-950 block leading-tight">{data.streamNameVal}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. INSTRUCTIONS */}
      <div className="bg-indigo-50 border-l-4 border-indigo-900 mx-3 my-0.5 p-1.5 text-[8.5px] text-slate-800 leading-tight shrink-0">
        <span className="font-extrabold uppercase text-indigo-900 tracking-wide block mb-0.5">
          Examination Instructions:
        </span>
        <ol className="list-decimal list-inside space-y-0.5 font-medium text-slate-700">
          {data.instructions.map((inst, i) => (
            <li key={i}>{inst}</li>
          ))}
        </ol>
      </div>

      {/* 5. FOOTER SIGNATURES */}
      <div className="px-3 py-1 border-t border-indigo-200 flex items-end justify-between shrink-0">
        <div className="flex flex-col items-center w-36">
          <div className="h-4 border-b-2 border-indigo-900 w-full mb-0.5" />
          <span className="text-[8.5px] font-bold text-indigo-900 uppercase tracking-wide">Candidate Signature</span>
        </div>
        <div className="flex flex-col items-center w-36">
          <div className="h-4 border-b-2 border-indigo-900 w-full mb-0.5" />
          <span className="text-[8.5px] font-bold text-indigo-900 uppercase tracking-wide">Exam Controller</span>
        </div>
      </div>
    </div>
  );
};
