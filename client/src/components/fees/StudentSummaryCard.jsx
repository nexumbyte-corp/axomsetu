import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, X } from 'lucide-react';
import { Badge } from '../ui/Badge.jsx';

export const StudentSummaryCard = ({ student, outstandingSummary, onClearStudent }) => {
  const navigate = useNavigate();

  if (!student) return null;

  const activeEnrollment =
    student.enrollments?.find((e) => e.status === 'ACTIVE') ||
    student.enrollments?.[0] ||
    student.enrollment;

  const rawClassName = activeEnrollment?.class?.name;
  const className = rawClassName
    ? rawClassName.toLowerCase().startsWith('class')
      ? rawClassName
      : `Class ${rawClassName}`
    : 'Class N/A';

  const sectionName = activeEnrollment?.section?.name ? `Sec ${activeEnrollment.section.name}` : '';
  const streamName = activeEnrollment?.stream?.name ? activeEnrollment.stream.name : null;
  const mediumName = activeEnrollment?.medium?.name || 'N/A';
  const fatherName = student.fatherName || student.guardianName || 'N/A';

  const totalCharges = Number(outstandingSummary?.totalCharges || 0);
  const totalPaid = Number(outstandingSummary?.totalPaid || 0);
  const totalOutstanding = Number(outstandingSummary?.totalOutstanding ?? outstandingSummary?.outstanding ?? 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
            {student.name ? student.name.charAt(0) : 'S'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">{student.name}</h2>
              <Badge variant={student.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm">
                {student.status || 'ACTIVE'}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 font-mono">
              Adm: <span className="font-semibold text-slate-800">{student.admissionNo}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <div className="text-right bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
            <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Total Charges</span>
            <span className="text-xs font-bold font-mono text-slate-900">
              ₹{totalCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="text-right bg-emerald-50/60 border border-emerald-100 px-2.5 py-1 rounded-lg">
            <span className="text-[9px] uppercase font-bold text-emerald-600 block tracking-wider">Total Paid</span>
            <span className="text-xs font-bold font-mono text-emerald-700">
              ₹{totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="text-right bg-rose-50/60 border border-rose-100 px-2.5 py-1 rounded-lg">
            <span className="text-[9px] uppercase font-bold text-rose-500 block tracking-wider">Total Dues</span>
            <span className={`text-xs font-extrabold font-mono ${totalOutstanding > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/app/students/${student.id}/ledger`)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-xs font-bold text-indigo-700 transition-colors shadow-2xs shrink-0"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Ledger</span>
          </button>

          {onClearStudent && (
            <button
              type="button"
              onClick={onClearStudent}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-2xs shrink-0"
            >
              <X className="w-3.5 h-3.5 text-slate-500" />
              <span>Change</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] border-t border-slate-100 pt-2">
        <div className="bg-slate-50/70 p-1.5 px-2 rounded-lg border border-slate-100 flex items-center justify-between">
          <span className="font-bold text-slate-400 uppercase text-[9px]">Class & Stream:</span>
          <span className="font-bold text-slate-900 truncate">
            {className} {sectionName} {streamName ? `(${streamName})` : ''}
          </span>
        </div>

        <div className="bg-slate-50/70 p-1.5 px-2 rounded-lg border border-slate-100 flex items-center justify-between">
          <span className="font-bold text-slate-400 uppercase text-[9px]">Medium:</span>
          <span className="font-semibold text-slate-800">{mediumName}</span>
        </div>

        <div className="bg-slate-50/70 p-1.5 px-2 rounded-lg border border-slate-100 flex items-center justify-between">
          <span className="font-bold text-slate-400 uppercase text-[9px]">Father / Guardian:</span>
          <span className="font-semibold text-slate-800 truncate max-w-[110px]">{fatherName}</span>
        </div>

        <div className="bg-slate-50/70 p-1.5 px-2 rounded-lg border border-slate-100 flex items-center justify-between">
          <span className="font-bold text-slate-400 uppercase text-[9px]">Phone:</span>
          <span className="font-semibold text-slate-800 font-mono">{student.phone || 'N/A'}</span>
        </div>
      </div>
    </div>
  );
};

export default StudentSummaryCard;
