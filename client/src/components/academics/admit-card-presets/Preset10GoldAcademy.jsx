import React from 'react';
import { User } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { extractAdmitCardData } from './useAdmitCardData.js';

/**
 * Preset 10: Gold Academy Prestige
 *
 * Elite academy: deep charcoal/black outer, warm amber inner, serif typography.
 */
export const Preset10GoldAcademy = ({
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
      className={`admit-card-box border-2 border-stone-900 bg-[#fffefc] rounded-none flex flex-col select-text box-border print:border-2 overflow-hidden font-serif ${
        isPreview ? 'shadow-sm' : ''
      } ${className}`}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        height: isPreview ? 'auto' : '130mm',
        maxHeight: isPreview ? 'auto' : '130mm',
        padding: '10px',
      }}
    >
      {/* Inner amber wrapper */}
      <div className="border border-amber-700/60 p-2 h-full flex flex-col flex-1 min-h-0">
        {/* 1. CENTERED HEADER */}
        <div className="relative text-center border-b border-amber-700/60 pb-1 shrink-0">
          <span className="absolute top-0 left-0 text-[7.5px] text-stone-500 font-sans">Powered by AxomSetu</span>
          <div className="absolute top-0 right-0">
            <div className="border border-amber-800 bg-white p-0.5">
              <QRCodeSVG value={data.qrPayload} size={50} level="M" includeMargin={false} />
            </div>
          </div>

          <div className="flex justify-center mb-0.5">
            {data.schoolLogoUrl ? (
              <img
                src={data.schoolLogoUrl}
                alt={data.schoolName}
                className="w-9 h-9 object-contain"
              />
            ) : (
              <div className="w-8 h-8 rounded-full border-2 border-amber-800 bg-amber-50 flex items-center justify-center font-black text-amber-900 text-xs uppercase">
                {data.schoolInitials}
              </div>
            )}
          </div>
          <h2 className="font-black text-base tracking-widest uppercase text-stone-900 px-14 leading-tight">
            {data.schoolName}
          </h2>
          {data.locationText && (
            <p className="text-[9px] text-stone-700 px-14 leading-tight">{data.locationText}</p>
          )}
          {(data.contactText || data.codesText) && (
            <p className="text-[8px] font-sans text-amber-900 px-14 leading-tight">
              {[data.contactText, data.codesText].filter(Boolean).join(' | ')}
            </p>
          )}
        </div>

        {/* 2. CHARCOAL-GOLD BANNER */}
        <div className="bg-stone-900 text-amber-300 px-3 py-0.5 my-1 flex justify-between text-[9px] tracking-widest uppercase shrink-0">
          <span>SESSION: {data.formattedAcademicYear}</span>
          <span className="text-white font-bold">OFFICIAL ADMIT CARD — {data.formattedExamName}</span>
          <span>VALID: {data.formattedValidUpto || '—'}</span>
        </div>

        {/* 3. CONTENT */}
        <div className="flex gap-3 items-center flex-1 min-h-0 overflow-hidden">
          {/* Left: Details */}
          <div className="flex-1 min-w-0">
            <table className="w-full text-[9px] border-collapse">
              <tbody>
                <tr className="border-b border-amber-200">
                  <td className="text-[7.5px] text-amber-800 font-black uppercase pr-2 py-0.5 w-24 leading-none">Candidate</td>
                  <td className="font-black text-stone-900 text-[12px] uppercase py-0.5 leading-tight">{data.studentName}</td>
                </tr>
                <tr className="border-b border-amber-200">
                  <td className="text-[7.5px] text-amber-800 font-black uppercase pr-2 py-0.5 leading-none">Guardian</td>
                  <td className="font-bold text-stone-800 uppercase py-0.5 leading-tight">{data.guardianName}</td>
                </tr>
                <tr>
                  <td className="text-[7.5px] text-amber-800 font-black uppercase pr-2 py-0.5 leading-none">Admission No</td>
                  <td className="font-mono font-extrabold text-stone-900 py-0.5 leading-tight">{data.admissionNo || '—'}</td>
                </tr>
              </tbody>
            </table>

            {/* 4-col grid */}
            <div className="grid grid-cols-4 gap-1 mt-1 bg-amber-50/60 border border-amber-700/40 p-1">
              <div>
                <span className="text-[7px] text-amber-800 font-black uppercase block leading-none">Class</span>
                <span className="text-[10px] font-black text-stone-900 block leading-tight">{data.classNameVal}</span>
              </div>
              <div>
                <span className="text-[7px] text-amber-800 font-black uppercase block leading-none">Section</span>
                <span className="text-[10px] font-black text-stone-900 block leading-tight">{data.sectionNameVal}</span>
              </div>
              <div>
                <span className="text-[7px] text-amber-800 font-black uppercase block leading-none">Medium</span>
                <span className="text-[10px] font-black text-stone-900 block leading-tight">{data.mediumNameVal}</span>
              </div>
              <div className="bg-stone-900 text-amber-300 p-0.5 text-center">
                <span className="text-[6.5px] font-black uppercase block leading-none">ROLL</span>
                <span className="text-[10px] font-mono font-black text-white block leading-tight">{data.rollNoVal}</span>
              </div>
              {data.hasStream && (
                <div className="col-span-4 border-t border-amber-200 pt-0.5 mt-0.5">
                  <span className="text-[7px] text-amber-800 font-black uppercase leading-none">Stream: </span>
                  <span className="text-[9px] font-black text-stone-900">{data.streamNameVal}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Photo */}
          <div className="w-20 shrink-0 flex flex-col items-center">
            <div className="w-20 h-24 border-2 border-stone-900 p-0.5 bg-white overflow-hidden">
              {data.photoUrl ? (
                <img src={data.photoUrl} alt={data.studentName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-amber-50 text-amber-400 p-1 text-center">
                  <User className="w-6 h-6 stroke-[1.5]" />
                  <span className="text-[7.5px] font-bold uppercase text-amber-900 mt-1 font-sans">AFFIX PHOTO</span>
                </div>
              )}
            </div>
            <span className="text-[7px] text-amber-900 uppercase tracking-widest mt-0.5 font-sans font-bold text-center">
              CANDIDATE PASS
            </span>
          </div>
        </div>

        {/* 4. INSTRUCTIONS */}
        <div className="bg-amber-50/50 border border-amber-300/80 p-1 text-[8.5px] leading-tight text-slate-800 mt-1 shrink-0">
          <span className="font-extrabold uppercase text-amber-900 tracking-wide block mb-0.5 font-sans">
            Examination Code of Conduct:
          </span>
          <ol className="list-decimal list-inside space-y-0.5 font-sans font-medium text-[8px] text-slate-700">
            {data.instructions.map((inst, i) => (
              <li key={i}>{inst}</li>
            ))}
          </ol>
        </div>

        {/* 5. SIGNATURES */}
        <div className="border-t border-amber-700/60 pt-1 flex justify-between items-end px-6 shrink-0">
          <div className="flex flex-col items-center w-32">
            <div className="h-4 border-b border-stone-900 w-full mb-0.5" />
            <span className="text-[8px] font-bold text-amber-900 uppercase tracking-wide font-sans">Candidate Signature</span>
          </div>
          <div className="flex flex-col items-center w-32">
            <div className="h-4 border-b border-stone-900 w-full mb-0.5" />
            <span className="text-[8px] font-bold text-amber-900 uppercase tracking-wide font-sans">Exam Controller</span>
          </div>
        </div>
      </div>
    </div>
  );
};
