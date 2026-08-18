import React from 'react';
import { Eye } from 'lucide-react';

export const StudentDetailsCell = ({ student, onPhotoClick, className = '' }) => {
  if (!student) return <span className="text-slate-400">—</span>;

  const name = student.name || student.studentName || '—';
  const admissionNo = student.admissionNo || student.admission_no || '—';
  const guardianName = student.guardianName || student.guardian_name || 'N/A';
  const photoUrl = student.photoUrl || student.photo_url || null;

  return (
    <div className={`flex items-center space-x-2.5 ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (onPhotoClick) onPhotoClick(student);
        }}
        className="relative group w-9 h-9 rounded-full overflow-hidden border border-slate-200 shadow-2xs shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:opacity-90 transition-all cursor-pointer"
        title="Click to view photo"
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full bg-indigo-50 font-bold text-indigo-700 flex items-center justify-center text-[11px] uppercase">
            {name ? name.slice(0, 2) : 'ST'}
          </div>
        )}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <Eye className="w-3 h-3 text-white" />
        </div>
      </button>

      <div className="space-y-0.5 min-w-0 text-left">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-slate-900 text-xs truncate">{name}</span>
          <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold shrink-0">
            Adm: {admissionNo}
          </span>
        </div>
        <div className="text-[11px] text-slate-500 flex items-center gap-1">
          <span className="font-medium text-slate-400">Guardian:</span>
          <span className="font-semibold text-slate-700">{guardianName}</span>
        </div>
      </div>
    </div>
  );
};
