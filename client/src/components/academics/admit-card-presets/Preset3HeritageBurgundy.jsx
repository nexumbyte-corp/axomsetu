import React from 'react';
import { User } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { extractAdmitCardData } from './useAdmitCardData.js';

/**
 * Preset 3: Heritage Maroon Certificate
 *
 * Formal collegiate/certificate style with deep maroon, parchment feel.
 */
export const Preset3HeritageBurgundy = ({
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

  const romanNumerals = ['I', 'II', 'III', 'IV', 'V'];

  return (
    <div
      className={`admit-card-box border-4 border-double border-red-900 bg-[#fffef8] rounded-none flex flex-col select-text box-border print:border-4 overflow-hidden font-serif ${
        isPreview ? 'shadow-sm' : ''
      } ${className}`}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        height: isPreview ? 'auto' : '130mm',
        maxHeight: isPreview ? 'auto' : '130mm',
      }}
    >
      <div className="border border-red-300/50 p-1.5 h-full flex flex-col flex-1 min-h-0">
        {/* 1. CENTERED HEADER */}
        <div className="relative text-center border-b-2 border-red-900 pb-1 shrink-0">
          <span className="absolute top-0 left-0 text-[7px] text-red-700/60 font-sans">Powered by AxomSetu</span>
          <div className="absolute top-0 right-0">
            <div className="border border-red-800 bg-white p-0.5">
              <QRCodeSVG value={data.qrPayload} size={52} level="M" includeMargin={false} />
            </div>
          </div>

          <div className="flex justify-center mb-0.5">
            {data.schoolLogoUrl ? (
              <img
                src={data.schoolLogoUrl}
                alt={data.schoolName}
                className="w-9 h-9 object-contain rounded-full border-2 border-red-900"
              />
            ) : (
              <div className="w-9 h-9 rounded-full border-2 border-red-900 bg-red-50 flex items-center justify-center font-black text-red-900 text-xs uppercase">
                {data.schoolInitials}
              </div>
            )}
          </div>
          <h2 className="font-black text-base tracking-wider uppercase text-red-950 px-14 leading-tight">
            {data.schoolName}
          </h2>
          {data.locationText && (
            <p className="text-[9px] text-red-800 px-14 leading-tight">{data.locationText}</p>
          )}
          {(data.contactText || data.codesText) && (
            <p className="text-[8px] italic text-red-700 px-14 leading-tight">
              {[data.contactText, data.codesText].filter(Boolean).join(' | ')}
            </p>
          )}
        </div>

        {/* 2. BANNER */}
        <div className="border-y border-red-800 bg-red-900/[0.08] py-0.5 px-3 flex justify-between text-[9px] font-black uppercase tracking-widest text-red-950 shrink-0">
          <span>SESSION: {data.formattedAcademicYear}</span>
          <span>✦ HALL TICKET / ADMIT CARD ✦</span>
          <span>{data.formattedExamName}</span>
        </div>

        {/* 3. MAIN CONTENT */}
        <div className="flex gap-2 flex-1 py-1 min-h-0 overflow-hidden">
          {/* Left: Details */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <table className="w-full text-[9px] border-collapse">
              <tbody>
                <tr className="border-b border-red-200">
                  <td className="text-[7.5px] text-red-800 font-black uppercase pr-1 py-0.5 w-24 leading-none">Candidate Name</td>
                  <td className="font-black text-red-950 text-[11px] uppercase py-0.5 leading-tight">{data.studentName}</td>
                </tr>
                <tr className="border-b border-red-200">
                  <td className="text-[7.5px] text-red-800 font-black uppercase pr-1 py-0.5 leading-none">Father / Guardian</td>
                  <td className="font-bold text-red-950 uppercase py-0.5 leading-tight">{data.guardianName}</td>
                </tr>
              </tbody>
            </table>

            {/* Metadata grid */}
            <div className="grid grid-cols-4 gap-1 mt-1 bg-red-50/40 border border-red-200 p-1">
              <div>
                <span className="text-[7px] text-red-800 font-black uppercase block leading-none">Class</span>
                <span className="text-[10px] font-black text-red-950 block">{data.classNameVal}</span>
              </div>
              <div>
                <span className="text-[7px] text-red-800 font-black uppercase block leading-none">Section</span>
                <span className="text-[10px] font-black text-red-950 block">{data.sectionNameVal}</span>
              </div>
              <div>
                <span className="text-[7px] text-red-800 font-black uppercase block leading-none">Medium</span>
                <span className="text-[10px] font-black text-red-950 block">{data.mediumNameVal}</span>
              </div>
              <div>
                <span className="text-[7px] text-red-800 font-black uppercase block leading-none">Roll No</span>
                <span className="text-[10px] font-mono font-black text-red-950 block">{data.rollNoVal}</span>
              </div>
              {data.hasStream && (
                <div className="col-span-4 border-t border-red-200 mt-0.5 pt-0.5">
                  <span className="text-[7px] text-red-800 font-black uppercase leading-none">Stream: </span>
                  <span className="text-[9px] font-black text-red-950">{data.streamNameVal}</span>
                </div>
              )}
              <div className="col-span-4 border-t border-red-200 mt-0.5 pt-0.5">
                <span className="text-[7px] text-red-800 font-black uppercase leading-none">Valid Upto: </span>
                <span className="text-[9px] font-mono font-black text-red-950">{data.formattedValidUpto || '—'}</span>
                <span className="text-[7px] text-red-800 font-black uppercase leading-none ml-3">Admission No: </span>
                <span className="text-[9px] font-mono font-black text-red-950">{data.admissionNo || '—'}</span>
              </div>
            </div>
          </div>

          {/* Right: Photo */}
          <div className="shrink-0 flex flex-col items-center">
            <div className="w-20 h-24 border-2 border-red-900 bg-white overflow-hidden">
              {data.photoUrl ? (
                <img src={data.photoUrl} alt={data.studentName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 text-red-400 p-1 text-center">
                  <User className="w-6 h-6 stroke-[1.5]" />
                  <span className="text-[7.5px] font-bold uppercase text-red-800 mt-1">AFFIX PHOTO</span>
                </div>
              )}
            </div>
            <span className="text-[7px] text-red-900 uppercase tracking-wide mt-0.5 font-bold font-sans text-center">
              ATTESTED PHOTO
            </span>
          </div>
        </div>

        {/* 4. INSTRUCTIONS */}
        <div className="bg-red-50/40 border border-red-800/40 p-1 text-[8.5px] leading-tight text-slate-800 shrink-0">
          <span className="font-extrabold uppercase text-red-900 tracking-wide block mb-0.5 font-sans">
            Examination Instructions:
          </span>
          <ol className="list-none space-y-0.5 font-sans font-medium text-slate-700">
            {data.instructions.map((inst, i) => (
              <li key={i}><span className="font-black text-red-900">{romanNumerals[i] || i + 1}.</span> {inst}</li>
            ))}
          </ol>
        </div>

        {/* 5. FOOTER SIGNATURES */}
        <div className="border-t-2 border-red-900 pt-1 flex justify-between items-end px-4 shrink-0">
          <div className="flex flex-col items-center w-32">
            <div className="h-4 border-b border-red-900 w-full mb-0.5" />
            <span className="text-[8px] font-bold text-red-900 uppercase tracking-wide font-sans">Candidate Signature</span>
          </div>
          <div className="w-14 h-8 border border-dashed border-red-800 flex items-center justify-center">
            <span className="text-[7px] text-red-700/60 font-sans uppercase">SEAL</span>
          </div>
          <div className="flex flex-col items-center w-32">
            <div className="h-4 border-b border-red-900 w-full mb-0.5" />
            <span className="text-[8px] font-bold text-red-900 uppercase tracking-wide font-sans">Exam Controller</span>
          </div>
        </div>
      </div>
    </div>
  );
};
