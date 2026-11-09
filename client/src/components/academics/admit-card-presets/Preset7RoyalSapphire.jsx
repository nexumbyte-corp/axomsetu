import React from 'react';
import { User } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { extractAdmitCardData } from './useAdmitCardData.js';

/**
 * Preset 7: Royal Sapphire Blue
 *
 * Royal blue with top thick bar, structured modern layout.
 */
export const Preset7RoyalSapphire = ({
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
      className={`admit-card-box border-t-4 border-t-blue-900 border-2 border-blue-900 bg-white rounded-none flex flex-col select-text box-border print:border-2 print:border-blue-900 overflow-hidden ${
        isPreview ? 'shadow-sm' : ''
      } ${className}`}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        height: isPreview ? 'auto' : '130mm',
        maxHeight: isPreview ? 'auto' : '130mm',
      }}
    >
      {/* 1. HEADER */}
      <div className="flex items-center justify-between border-b border-blue-200 px-3 pb-1.5 pt-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {data.schoolLogoUrl ? (
            <img
              src={data.schoolLogoUrl}
              alt={data.schoolName}
              className="w-10 h-10 object-contain border border-blue-900 rounded-sm shrink-0"
            />
          ) : (
            <div className="w-10 h-10 border border-blue-900 rounded-sm bg-blue-50 flex items-center justify-center font-black text-blue-900 text-xs uppercase shrink-0">
              {data.schoolInitials}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[7.5px] text-blue-600 leading-none mb-0.5">
              Powered by <span className="font-bold text-blue-900">AxomSetu</span>
            </p>
            <h2 className="font-black uppercase text-blue-950 text-sm leading-tight truncate">{data.schoolName}</h2>
            {data.locationText && (
              <p className="text-[9px] text-blue-800 leading-tight truncate">{data.locationText}</p>
            )}
            {(data.contactText || data.codesText) && (
              <p className="text-[8px] text-blue-700 leading-tight truncate">
                {[data.contactText, data.codesText].filter(Boolean).join(' | ')}
              </p>
            )}
          </div>
        </div>
        <div className="border-2 border-blue-900 p-0.5 shrink-0">
          <QRCodeSVG value={data.qrPayload} size={52} level="M" includeMargin={false} />
        </div>
      </div>

      {/* 2. BLUE RIBBON BANNER */}
      <div className="bg-blue-900 text-white px-3 py-1 flex justify-between text-[9.5px] font-bold uppercase tracking-wider rounded-sm mb-1 shrink-0">
        <span>SESSION: {data.formattedAcademicYear}</span>
        <span className="text-blue-100 font-extrabold">EXAMINATION ADMIT CARD — {data.formattedExamName}</span>
        <span className="text-blue-200">VALID: {data.formattedValidUpto || 'EXAM DATE'}</span>
      </div>

      {/* 3. CONTENT */}
      <div className="flex gap-3 items-start flex-1 px-3 pb-1 min-h-0 overflow-hidden">
        {/* Left: Details */}
        <div className="flex-1 min-w-0">
          {/* Candidate name */}
          <div className="border-l-2 border-blue-900 pl-2 mb-1">
            <span className="text-[8px] text-blue-700 uppercase font-bold block leading-none">Candidate Name</span>
            <span className="text-sm font-black text-blue-950 uppercase truncate block leading-tight">{data.studentName}</span>
          </div>

          {/* Guardian + Admission No */}
          <div className="grid grid-cols-2 gap-2 border-l-2 border-blue-400 pl-2 mb-1">
            <div>
              <span className="text-[8px] text-blue-600 uppercase font-bold block leading-none">Father / Guardian</span>
              <span className="text-[10px] font-bold text-slate-800 uppercase truncate block leading-tight">{data.guardianName}</span>
            </div>
            <div>
              <span className="text-[8px] text-blue-600 uppercase font-bold block leading-none">Admission No</span>
              <span className="text-[10px] font-mono font-extrabold text-slate-900 block leading-tight">{data.admissionNo || '—'}</span>
            </div>
          </div>

          {/* Class / Medium / Roll grid */}
          <div className="grid grid-cols-3 gap-1 bg-blue-50 p-1 border border-blue-200 rounded-sm">
            <div>
              <span className="text-[7.5px] text-blue-700 uppercase font-bold block leading-none">Class</span>
              <span className="text-[11px] font-black text-blue-950 block leading-tight">{data.classNameVal}</span>
            </div>
            <div>
              <span className="text-[7.5px] text-blue-700 uppercase font-bold block leading-none">Section</span>
              <span className="text-[11px] font-black text-blue-950 block leading-tight">{data.sectionNameVal}</span>
            </div>
            <div>
              <span className="text-[7.5px] text-blue-700 uppercase font-bold block leading-none">Roll No</span>
              <span className="text-[11px] font-black text-blue-950 block leading-tight">{data.rollNoVal}</span>
            </div>
            <div className="col-span-2">
              <span className="text-[7.5px] text-blue-700 uppercase font-bold block leading-none">Medium{data.hasStream ? ' & Stream' : ''}</span>
              <span className="text-[11px] font-black text-blue-950 block leading-tight">
                {data.mediumNameVal}{data.hasStream ? ` / ${data.streamNameVal}` : ''}
              </span>
            </div>
            <div>
              <span className="text-[7.5px] text-blue-700 uppercase font-bold block leading-none">Valid Upto</span>
              <span className="text-[9px] font-black text-blue-950 block leading-tight">{data.formattedValidUpto || '—'}</span>
            </div>
          </div>
        </div>

        {/* Right: Photo */}
        <div className="w-20 shrink-0 flex flex-col items-center">
          <div className="w-20 h-24 border-2 border-blue-900 bg-blue-50 overflow-hidden">
            {data.photoUrl ? (
              <img src={data.photoUrl} alt={data.studentName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-blue-50 text-blue-400 p-1 text-center">
                <User className="w-6 h-6 stroke-[1.5]" />
                <span className="text-[7.5px] font-bold uppercase text-blue-700 mt-1">AFFIX PHOTO</span>
              </div>
            )}
          </div>
          <span className="text-[7px] text-blue-900 mt-0.5 uppercase font-bold">CANDIDATE</span>
        </div>
      </div>

      {/* 4. INSTRUCTIONS */}
      <div className="bg-blue-50/60 border border-blue-200 rounded-sm mx-3 p-1 text-[8.5px] leading-tight text-slate-800 shrink-0">
        <span className="font-extrabold uppercase text-blue-900 block mb-0.5">General Exam Hall Guidelines:</span>
        <ol className="list-decimal list-inside space-y-0.5 font-medium text-blue-900">
          {data.instructions.map((inst, i) => (
            <li key={i}>{inst}</li>
          ))}
        </ol>
      </div>

      {/* 5. FOOTER */}
      <div className="border-t border-blue-200 pt-1 pb-1.5 flex justify-between items-end px-6 shrink-0">
        <div className="flex flex-col items-center w-36">
          <div className="h-4 border-b border-blue-900 w-full mb-0.5" />
          <span className="text-[8px] font-bold text-blue-900 uppercase tracking-wide">Candidate Signature</span>
        </div>
        <div className="flex flex-col items-center w-36">
          <div className="h-4 border-b border-blue-900 w-full mb-0.5" />
          <span className="text-[8px] font-bold text-blue-900 uppercase tracking-wide">Exam Controller</span>
        </div>
      </div>
    </div>
  );
};
