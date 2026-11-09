import React from 'react';
import { User } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { extractAdmitCardData } from './useAdmitCardData.js';

/**
 * Preset 4: Swiss Grid Monochrome
 *
 * Ultra-clean minimal black/white with structured modular grid cells.
 */
export const Preset4MinimalTech = ({
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
      className={`admit-card-box border border-black bg-white rounded-none flex flex-col select-text box-border print:border print:border-black overflow-hidden font-sans ${
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
      <div className="flex justify-between items-start border-b border-black pb-1.5 px-2 pt-2 shrink-0">
        {/* Left: Branding + School info */}
        <div className="min-w-0">
          <span className="font-mono text-[7.5px] text-slate-500 block mb-0.5">
            Powered by AxomSetu | SESSION: {data.formattedAcademicYear}
          </span>
          <h2 className="text-lg font-black uppercase leading-tight">{data.schoolName}</h2>
          {data.locationText && (
            <p className="text-[9px] text-slate-600 leading-tight">{data.locationText}</p>
          )}
          {(data.contactText || data.codesText) && (
            <p className="text-[8px] text-slate-500 leading-tight">
              {[data.contactText, data.codesText].filter(Boolean).join(' | ')}
            </p>
          )}
        </div>
        {/* Right: Logo + QR */}
        <div className="flex items-start gap-1.5 shrink-0">
          {data.schoolLogoUrl ? (
            <img
              src={data.schoolLogoUrl}
              alt={data.schoolName}
              className="w-10 h-10 object-contain border border-black p-0.5"
            />
          ) : (
            <div className="w-10 h-10 border border-black flex items-center justify-center font-black text-xs uppercase">
              {data.schoolInitials}
            </div>
          )}
          <div className="border border-black p-0.5">
            <QRCodeSVG value={data.qrPayload} size={50} level="M" includeMargin={false} />
          </div>
        </div>
      </div>

      {/* 2. BLACK TITLE STRIP */}
      <div className="bg-black text-white px-2 py-0.5 font-mono text-[9.5px] uppercase flex justify-between shrink-0">
        <span>EXAM // {data.formattedExamName}</span>
        <span>VALID: {data.formattedValidUpto || 'EXAM DATE'}</span>
      </div>

      {/* 3. CONTENT: DETAILS GRID + PHOTO */}
      <div className="flex gap-2 flex-1 my-1 px-2 min-h-0 overflow-hidden">
        {/* Left: Details grid */}
        <div className="flex-1 min-w-0 border border-black divide-y divide-black">
          {/* Row 1: Name + Roll */}
          <div className="grid grid-cols-6 divide-x divide-black">
            <div className="col-span-4 p-1.5">
              <span className="text-[7.5px] font-bold uppercase text-slate-500 block leading-none">Candidate Name</span>
              <span className="text-[11px] font-black text-slate-900 uppercase truncate block leading-tight">
                {data.studentName}
              </span>
            </div>
            <div className="col-span-2 p-1.5 bg-black text-white">
              <span className="text-[7.5px] font-bold uppercase text-slate-400 block leading-none font-mono">Roll No</span>
              <span className="text-[11px] font-black font-mono block leading-tight">{data.rollNoVal}</span>
            </div>
          </div>

          {/* Row 2: Guardian + Admission No */}
          <div className="grid grid-cols-6 divide-x divide-black">
            <div className="col-span-4 p-1.5">
              <span className="text-[7.5px] font-bold uppercase text-slate-500 block leading-none">Father / Guardian</span>
              <span className="text-[10px] font-bold text-slate-800 uppercase truncate block leading-tight">
                {data.guardianName}
              </span>
            </div>
            <div className="col-span-2 p-1.5">
              <span className="text-[7.5px] font-bold uppercase text-slate-500 block leading-none">Admission No</span>
              <span className="text-[10px] font-mono font-extrabold text-slate-900 block leading-tight">
                {data.admissionNo || '—'}
              </span>
            </div>
          </div>

          {/* Row 3: Class/Section + Medium/Stream */}
          <div className="grid grid-cols-6 divide-x divide-black bg-slate-50">
            <div className="col-span-3 p-1.5">
              <span className="text-[7.5px] font-bold uppercase text-slate-500 block leading-none">Class & Section</span>
              <span className="text-[10px] font-black text-slate-900 block leading-tight">
                {data.classNameVal} ({data.sectionNameVal})
              </span>
            </div>
            <div className="col-span-3 p-1.5">
              <span className="text-[7.5px] font-bold uppercase text-slate-500 block leading-none">
                Medium{data.hasStream ? ' & Stream' : ''}
              </span>
              <span className="text-[10px] font-black text-slate-900 block leading-tight">
                {data.mediumNameVal}{data.hasStream ? ` / ${data.streamNameVal}` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Photo */}
        <div className="w-20 shrink-0 border border-black p-0.5 bg-slate-50 flex flex-col">
          <div className="flex-1 overflow-hidden">
            {data.photoUrl ? (
              <img src={data.photoUrl} alt={data.studentName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-500 p-1 text-center">
                <User className="w-6 h-6 stroke-[1.5]" />
                <span className="text-[7.5px] font-bold uppercase text-slate-700 mt-1">AFFIX PHOTO</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. INSTRUCTIONS */}
      <div className="border border-black mx-2 p-1 bg-slate-50 font-mono text-[8px] leading-tight text-slate-800 shrink-0">
        <span className="font-black uppercase block mb-0.5">Instructions:</span>
        <ol className="space-y-0.5">
          {data.instructions.map((inst, i) => (
            <li key={i}><span className="font-black">[{String(i + 1).padStart(2, '0')}]</span> {inst}</li>
          ))}
        </ol>
      </div>

      {/* 5. FOOTER */}
      <div className="border-t border-black pt-1 pb-1.5 font-mono flex justify-between px-6 shrink-0">
        <div className="flex flex-col items-center w-36">
          <div className="h-4 border-b border-black w-full mb-0.5" />
          <span className="text-[8px] font-black uppercase">CANDIDATE SIGN</span>
        </div>
        <div className="flex items-end">
          <span className="text-[8px] font-black uppercase tracking-widest">OFFICIAL ADMIT CARD</span>
        </div>
        <div className="flex flex-col items-center w-36">
          <div className="h-4 border-b border-black w-full mb-0.5" />
          <span className="text-[8px] font-black uppercase">EXAM CONTROLLER</span>
        </div>
      </div>
    </div>
  );
};
