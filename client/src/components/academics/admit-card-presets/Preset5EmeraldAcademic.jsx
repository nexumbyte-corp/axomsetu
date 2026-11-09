import React from 'react';
import { User } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { extractAdmitCardData } from './useAdmitCardData.js';

/**
 * Preset 5: Emerald Board Prestige
 *
 * Deep emerald green, formal board examination style.
 */
export const Preset5EmeraldAcademic = ({
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
      className={`admit-card-box border-2 border-emerald-900 bg-white rounded-none flex flex-col select-text box-border print:border-2 print:border-emerald-900 overflow-hidden ${
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
      <div className="flex items-center gap-2.5 border-b-2 border-emerald-900 px-3 py-1.5 shrink-0">
        {/* Logo */}
        {data.schoolLogoUrl ? (
          <img
            src={data.schoolLogoUrl}
            alt={data.schoolName}
            className="w-10 h-10 object-contain rounded-full border-2 border-emerald-800 shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full border-2 border-emerald-800 bg-emerald-50 flex items-center justify-center font-black text-emerald-900 text-xs uppercase shrink-0">
            {data.schoolInitials}
          </div>
        )}
        {/* School info */}
        <div className="flex-1 min-w-0">
          <p className="text-[7.5px] text-emerald-600 leading-none mb-0.5 font-sans">
            Powered by <span className="font-bold text-emerald-900">AxomSetu</span>
          </p>
          <h2 className="font-black uppercase text-emerald-950 text-sm leading-tight truncate">{data.schoolName}</h2>
          {data.locationText && (
            <p className="text-[9px] text-emerald-800 leading-tight truncate">{data.locationText}</p>
          )}
          {(data.contactText || data.codesText) && (
            <p className="text-[8px] text-emerald-700 leading-tight truncate">
              {[data.contactText, data.codesText].filter(Boolean).join(' | ')}
            </p>
          )}
        </div>
        {/* QR code */}
        <div className="border-2 border-emerald-900 p-0.5 shrink-0">
          <QRCodeSVG value={data.qrPayload} size={52} level="M" includeMargin={false} />
        </div>
      </div>

      {/* 2. BANNER */}
      <div className="bg-emerald-900 text-white px-2.5 py-0.5 flex justify-between text-[9.5px] font-bold uppercase tracking-wider shrink-0">
        <span>SESSION: {data.formattedAcademicYear}</span>
        <span className="text-emerald-200 font-extrabold">ADMIT CARD — {data.formattedExamName}</span>
        <span>VALID: {data.formattedValidUpto || 'EXAM DATE'}</span>
      </div>

      {/* 3. CONTENT */}
      <div className="flex gap-2.5 items-center flex-1 px-3 py-1 min-h-0 overflow-hidden">
        {/* Photo col */}
        <div className="shrink-0 flex flex-col items-center">
          <div className="w-20 h-24 border-2 border-emerald-900 bg-emerald-50 overflow-hidden">
            {data.photoUrl ? (
              <img src={data.photoUrl} alt={data.studentName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-emerald-50 text-emerald-500 p-1 text-center">
                <User className="w-6 h-6 stroke-[1.5]" />
                <span className="text-[7.5px] font-bold uppercase text-emerald-800 mt-1">AFFIX PHOTO</span>
              </div>
            )}
          </div>
          <div className="w-20 bg-emerald-800 text-white text-center font-mono font-bold text-[10px] py-0.5 leading-tight">
            ROLL {data.rollNoVal}
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <table className="w-full text-[9px] border-collapse mb-1">
            <tbody>
              <tr className="border-b border-emerald-200">
                <td className="text-[7.5px] text-emerald-700 font-black uppercase pr-2 py-0.5 w-24 leading-none">Candidate Name</td>
                <td className="font-black text-emerald-950 text-[12px] uppercase py-0.5 leading-tight">{data.studentName}</td>
              </tr>
              <tr className="border-b border-emerald-200">
                <td className="text-[7.5px] text-emerald-700 font-black uppercase pr-2 py-0.5 leading-none">Father / Guardian</td>
                <td className="font-bold text-slate-800 uppercase py-0.5 leading-tight">{data.guardianName}</td>
              </tr>
              <tr>
                <td className="text-[7.5px] text-emerald-700 font-black uppercase pr-2 py-0.5 leading-none">Admission No</td>
                <td className="font-mono font-extrabold text-slate-900 py-0.5 leading-tight">{data.admissionNo || '—'}</td>
              </tr>
            </tbody>
          </table>

          {/* Metadata grid */}
          <div className="grid grid-cols-3 gap-1 bg-emerald-50/60 border border-emerald-200 p-1">
            <div>
              <div className="text-[7.5px] text-emerald-700 font-bold uppercase leading-none">Class & Section</div>
              <div className="text-[11px] font-black text-emerald-950 leading-tight">
                {data.classNameVal} ({data.sectionNameVal})
              </div>
            </div>
            <div>
              <div className="text-[7.5px] text-emerald-700 font-bold uppercase leading-none">Medium</div>
              <div className="text-[11px] font-black text-emerald-950 leading-tight">{data.mediumNameVal}</div>
            </div>
            {data.hasStream ? (
              <div>
                <div className="text-[7.5px] text-emerald-700 font-bold uppercase leading-none">Stream</div>
                <div className="text-[11px] font-black text-emerald-950 leading-tight">{data.streamNameVal}</div>
              </div>
            ) : (
              <div>
                <div className="text-[7.5px] text-emerald-700 font-bold uppercase leading-none">Valid Upto</div>
                <div className="text-[11px] font-black text-emerald-950 leading-tight">{data.formattedValidUpto || '—'}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. INSTRUCTIONS */}
      <div className="bg-emerald-50/60 border border-emerald-300 mx-3 my-0.5 p-1 text-[8.5px] leading-tight text-slate-800 shrink-0">
        <div className="font-extrabold uppercase text-emerald-900 tracking-wide block mb-0.5">
          ✓ Examination Instructions:
        </div>
        <ol className="list-decimal list-inside space-y-0.5 font-medium text-slate-700">
          {data.instructions.map((inst, i) => (
            <li key={i}>{inst}</li>
          ))}
        </ol>
      </div>

      {/* 5. FOOTER */}
      <div className="border-t-2 border-emerald-900 pt-1 pb-1.5 flex justify-between items-end px-6 shrink-0">
        <div className="flex flex-col items-center w-32">
          <div className="h-4 border-b border-emerald-900 w-full mb-0.5" />
          <span className="text-[8px] font-bold text-emerald-900 uppercase tracking-wide">Candidate Signature</span>
        </div>
        <div className="border border-emerald-800 px-2 py-0.5 rounded-full">
          <span className="text-[7.5px] font-bold uppercase text-emerald-900 tracking-widest">OFFICIAL STAMP</span>
        </div>
        <div className="flex flex-col items-center w-32">
          <div className="h-4 border-b border-emerald-900 w-full mb-0.5" />
          <span className="text-[8px] font-bold text-emerald-900 uppercase tracking-wide">Exam Controller</span>
        </div>
      </div>
    </div>
  );
};
