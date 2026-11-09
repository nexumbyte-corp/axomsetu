import React from 'react';
import { User } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { extractAdmitCardData } from './useAdmitCardData.js';

/**
 * Preset 6: Split Sidebar Dark Card
 *
 * Dual-column: left dark sidebar with photo/QR, right white body with details.
 */
export const Preset6SplitCompact = ({
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
      className={`admit-card-box border-2 border-slate-900 bg-white rounded-none flex flex-row select-text box-border print:border-2 overflow-hidden ${
        isPreview ? 'shadow-sm' : ''
      } ${className}`}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        height: isPreview ? 'auto' : '130mm',
        maxHeight: isPreview ? 'auto' : '130mm',
      }}
    >
      {/* LEFT DARK SIDEBAR */}
      <div className="w-[28%] bg-slate-900 text-white p-2 flex flex-col justify-between items-center border-r-2 border-slate-900 shrink-0">
        {/* Top: Logo + label */}
        <div className="flex flex-col items-center gap-1">
          {data.schoolLogoUrl ? (
            <img
              src={data.schoolLogoUrl}
              alt={data.schoolName}
              className="w-8 h-8 object-contain bg-white rounded-sm p-0.5"
            />
          ) : (
            <div className="w-8 h-8 bg-white rounded-sm flex items-center justify-center font-black text-slate-900 text-xs uppercase">
              {data.schoolInitials}
            </div>
          )}
          <span className="text-[7px] text-slate-400 uppercase tracking-wider font-sans">CANDIDATE ID</span>
        </div>

        {/* Center: Photo + Roll */}
        <div className="flex flex-col items-center">
          <div className="w-20 h-24 border-2 border-white bg-slate-800 overflow-hidden">
            {data.photoUrl ? (
              <img src={data.photoUrl} alt={data.studentName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-700 text-slate-400 p-1 text-center">
                <User className="w-6 h-6 stroke-[1.5]" />
                <span className="text-[7.5px] font-bold uppercase text-slate-300 mt-1">AFFIX PHOTO</span>
              </div>
            )}
          </div>
          <div className="bg-white text-slate-900 font-mono font-black text-xs py-0.5 w-20 text-center mt-1 leading-tight">
            ROLL {data.rollNoVal}
          </div>
        </div>

        {/* Bottom: QR + branding */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="bg-white p-0.5">
            <QRCodeSVG value={data.qrPayload} size={48} level="M" includeMargin={false} />
          </div>
          <span className="text-[6.5px] text-slate-500 font-sans">Powered by AxomSetu</span>
        </div>
      </div>

      {/* RIGHT BODY */}
      <div className="w-[72%] p-2.5 flex flex-col justify-between min-w-0">
        {/* School name & info */}
        <div className="border-b border-slate-200 pb-1 mb-1 shrink-0">
          <h2 className="font-black text-sm uppercase text-slate-900 leading-tight truncate">{data.schoolName}</h2>
          {data.locationText && (
            <p className="text-[9px] text-slate-600 leading-tight truncate">{data.locationText}</p>
          )}
          {(data.contactText || data.codesText) && (
            <p className="text-[8px] text-slate-500 leading-tight truncate">
              {[data.contactText, data.codesText].filter(Boolean).join(' | ')}
            </p>
          )}
        </div>

        {/* Exam strip */}
        <div className="bg-slate-100 border border-slate-300 px-2 py-0.5 my-0.5 flex justify-between text-[8.5px] font-extrabold shrink-0">
          <span className="text-slate-700">SESSION: {data.formattedAcademicYear}</span>
          <span className="text-slate-900 uppercase">ADMIT CARD — {data.formattedExamName}</span>
          <span className="text-slate-700">VALID: {data.formattedValidUpto || '—'}</span>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 flex-1 items-start mt-1 text-xs min-h-0">
          <div className="col-span-2 border-b border-slate-200 pb-1">
            <span className="text-[8px] text-slate-500 uppercase font-bold block leading-none">Candidate Name</span>
            <span className="text-sm font-black text-slate-900 uppercase truncate block">{data.studentName}</span>
          </div>
          <div>
            <span className="text-[8px] text-slate-500 uppercase font-bold block leading-none">Father / Guardian</span>
            <span className="text-[10px] font-bold text-slate-800 uppercase truncate block leading-tight">{data.guardianName}</span>
          </div>
          <div>
            <span className="text-[8px] text-slate-500 uppercase font-bold block leading-none">Admission No</span>
            <span className="text-[10px] font-mono font-extrabold text-slate-900 block leading-tight">{data.admissionNo || '—'}</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-1 mt-0.5">
            <span className="text-[7.5px] text-slate-500 uppercase font-bold block leading-none">Class & Section</span>
            <span className="text-[10px] font-black text-slate-900 block leading-tight">
              {data.classNameVal} ({data.sectionNameVal})
            </span>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-1 mt-0.5">
            <span className="text-[7.5px] text-slate-500 uppercase font-bold block leading-none">
              Medium{data.hasStream ? ' & Stream' : ''}
            </span>
            <span className="text-[10px] font-black text-slate-900 block leading-tight">
              {data.mediumNameVal}{data.hasStream ? ` / ${data.streamNameVal}` : ''}
            </span>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-slate-50 border border-slate-200 text-[7.5px] p-1 leading-tight text-slate-700 mt-1 shrink-0">
          <span className="font-extrabold uppercase text-slate-900 block mb-0.5">Instructions:</span>
          <ol className="list-decimal list-inside space-y-0.5">
            {data.instructions.map((inst, i) => (
              <li key={i}>{inst}</li>
            ))}
          </ol>
        </div>

        {/* Footer signatures */}
        <div className="border-t border-slate-200 pt-1 flex justify-between items-end px-1 shrink-0">
          <div className="flex flex-col items-center w-28">
            <div className="h-4 border-b border-slate-800 w-full mb-0.5" />
            <span className="text-[8px] font-bold text-slate-800 uppercase">Candidate Signature</span>
          </div>
          <div className="flex flex-col items-center w-28">
            <div className="h-4 border-b border-slate-800 w-full mb-0.5" />
            <span className="text-[8px] font-bold text-slate-800 uppercase">Exam Controller</span>
          </div>
        </div>
      </div>
    </div>
  );
};
