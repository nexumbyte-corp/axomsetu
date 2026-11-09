import React from 'react';
import { User } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { extractAdmitCardData } from './useAdmitCardData.js';

/**
 * Preset 8: Official Government Board
 *
 * CBSE/state board style — strict numbered compartments, formal serif, black & white.
 */
export const Preset8OfficialBoard = ({
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
      className={`admit-card-box border-2 border-black bg-white rounded-none flex flex-col select-text box-border print:border-2 overflow-hidden font-serif ${
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
      {/* 1. THREE-PARTITION OFFICIAL HEADER */}
      <div className="flex justify-between items-start border-b-2 border-black pb-1.5 shrink-0">
        {/* Left partition */}
        <div className="w-28 shrink-0">
          <span className="text-[7.5px] font-sans font-black uppercase block leading-tight">OFFICIAL RECORD</span>
          {data.codesText && (
            <span className="text-[7px] font-sans text-slate-600 block leading-tight mt-0.5">{data.codesText}</span>
          )}
        </div>

        {/* Center: School info */}
        <div className="flex-1 text-center min-w-0 px-2">
          {data.schoolLogoUrl ? (
            <img
              src={data.schoolLogoUrl}
              alt={data.schoolName}
              className="w-8 h-8 object-contain mx-auto mb-0.5"
            />
          ) : (
            <div className="w-8 h-8 border border-black bg-slate-50 flex items-center justify-center font-black text-xs uppercase mx-auto mb-0.5">
              {data.schoolInitials}
            </div>
          )}
          <h2 className="font-black uppercase text-sm leading-tight">{data.schoolName}</h2>
          {data.locationText && (
            <p className="text-[8px] font-sans leading-tight">{data.locationText}</p>
          )}
          {data.contactText && (
            <p className="text-[7.5px] font-sans text-slate-600 leading-tight">{data.contactText}</p>
          )}
        </div>

        {/* Right: QR + branding */}
        <div className="w-28 flex flex-col items-end shrink-0">
          <div className="border border-black p-0.5">
            <QRCodeSVG value={data.qrPayload} size={48} level="M" includeMargin={false} />
          </div>
          <span className="text-[7px] font-sans text-slate-500 mt-0.5">Powered by AxomSetu</span>
        </div>
      </div>

      {/* 2. FORMAL TITLE */}
      <div className="bg-slate-100 border-y border-black py-0.5 px-3 flex justify-between text-[9px] font-black uppercase font-sans shrink-0">
        <span>ACADEMIC SESSION: {data.formattedAcademicYear}</span>
        <span>CANDIDATE ADMIT CARD / HALL TICKET</span>
        <span>EXAM: {data.formattedExamName}</span>
      </div>

      {/* 3. CONTENT */}
      <div className="flex gap-2 items-stretch flex-1 my-1 min-h-0 overflow-hidden">
        {/* Left: Details table */}
        <div className="flex-1 min-w-0 border border-black divide-y divide-black">
          {/* Row 1: Name + Roll */}
          <div className="grid grid-cols-6 divide-x divide-black">
            <div className="col-span-4 p-1.5">
              <span className="text-[7.5px] font-sans font-bold uppercase text-slate-600 block leading-none">
                1. Candidate's Full Name
              </span>
              <span className="text-[11px] font-black uppercase truncate block leading-tight mt-0.5">
                {data.studentName}
              </span>
            </div>
            <div className="col-span-2 p-1.5 bg-slate-50">
              <span className="text-[7.5px] font-sans font-bold uppercase text-slate-600 block leading-none">
                2. Roll Number
              </span>
              <span className="text-[11px] font-black font-mono block leading-tight mt-0.5">
                {data.rollNoVal}
              </span>
            </div>
          </div>

          {/* Row 2: Guardian + Admission No */}
          <div className="grid grid-cols-6 divide-x divide-black">
            <div className="col-span-3 p-1.5">
              <span className="text-[7.5px] font-sans font-bold uppercase text-slate-600 block leading-none">
                3. Father's / Guardian's Name
              </span>
              <span className="text-[10px] font-bold uppercase truncate block leading-tight mt-0.5">
                {data.guardianName}
              </span>
            </div>
            <div className="col-span-3 p-1.5">
              <span className="text-[7.5px] font-sans font-bold uppercase text-slate-600 block leading-none">
                4. Admission / Reg No
              </span>
              <span className="text-[10px] font-mono font-extrabold block leading-tight mt-0.5">
                {data.admissionNo || '—'}
              </span>
            </div>
          </div>

          {/* Row 3: Class / Medium / Valid */}
          <div className="grid grid-cols-6 divide-x divide-black bg-slate-50">
            <div className="col-span-2 p-1.5">
              <span className="text-[7.5px] font-sans font-bold uppercase text-slate-600 block leading-none">
                5. Class & Section
              </span>
              <span className="text-[10px] font-black block leading-tight mt-0.5">
                {data.classNameVal} ({data.sectionNameVal})
              </span>
            </div>
            <div className="col-span-2 p-1.5">
              <span className="text-[7.5px] font-sans font-bold uppercase text-slate-600 block leading-none">
                6. Medium{data.hasStream ? ' & Stream' : ''}
              </span>
              <span className="text-[10px] font-black block leading-tight mt-0.5">
                {data.mediumNameVal}{data.hasStream ? ` / ${data.streamNameVal}` : ''}
              </span>
            </div>
            <div className="col-span-2 p-1.5">
              <span className="text-[7.5px] font-sans font-bold uppercase text-slate-600 block leading-none">
                7. Valid Upto
              </span>
              <span className="text-[10px] font-mono font-black block leading-tight mt-0.5">
                {data.formattedValidUpto || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Photo */}
        <div className="w-20 shrink-0 border-2 border-black p-0.5 flex flex-col">
          <div className="flex-1 overflow-hidden">
            {data.photoUrl ? (
              <img src={data.photoUrl} alt={data.studentName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-500 p-1 text-center">
                <User className="w-6 h-6 stroke-[1.5]" />
                <span className="text-[7.5px] font-bold uppercase text-slate-700 mt-1 font-sans">AFFIX PHOTO</span>
              </div>
            )}
          </div>
          <div className="text-center mt-0.5">
            <span className="text-[7px] font-sans font-black uppercase">ATTESTED</span>
          </div>
        </div>
      </div>

      {/* 4. INSTRUCTIONS */}
      <div className="border border-black p-1 bg-slate-50 text-[8px] font-sans leading-tight text-slate-800 shrink-0">
        <span className="font-black uppercase block mb-0.5">Examination Discipline &amp; Rules:</span>
        <ol className="list-decimal list-inside space-y-0.5 font-medium">
          {data.instructions.map((inst, i) => (
            <li key={i}>{inst}</li>
          ))}
        </ol>
      </div>

      {/* 5. SIGNATURES */}
      <div className="border-t-2 border-black pt-1 pb-0.5 flex justify-between items-end px-4 shrink-0">
        <div className="flex flex-col items-center w-32">
          <div className="h-5 border-b border-black w-full mb-0.5" />
          <span className="text-[8px] font-sans font-bold uppercase">Candidate Signature</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-14 h-6 border border-dashed border-black flex items-center justify-center mb-0.5">
            <span className="text-[7px] font-sans text-slate-400">SEAL</span>
          </div>
          <span className="text-[7px] font-sans font-bold uppercase">Official Stamp</span>
        </div>
        <div className="flex flex-col items-center w-32">
          <div className="h-5 border-b border-black w-full mb-0.5" />
          <span className="text-[8px] font-sans font-bold uppercase">Exam Controller</span>
        </div>
      </div>
    </div>
  );
};
