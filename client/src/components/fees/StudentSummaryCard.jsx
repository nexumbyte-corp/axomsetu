import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowLeft } from 'lucide-react';
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
    <div className="bg-white rounded-xl border border-slate-200 p-2 sm:p-2.5 shadow-2xs space-y-1.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
        <div className="flex items-center gap-2">
          {onClearStudent && (
            <button
              type="button"
              onClick={onClearStudent}
              className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-indigo-600 transition-colors shadow-2xs shrink-0"
              title="Back to Student List"
              aria-label="Back to Student List"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
            {student.name ? student.name.charAt(0) : 'S'}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900">{student.name}</h2>
              <Badge variant={student.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm" className="text-[9px] py-0 px-1">
                {student.status || 'ACTIVE'}
              </Badge>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">
              Adm: <span className="font-semibold text-slate-800">{student.admissionNo}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
          <div className="text-right bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg">
            <span className="text-[8px] uppercase font-bold text-slate-400 block tracking-wider">Charges</span>
            <span className="text-xs font-bold font-mono text-slate-900">
              ₹{totalCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="text-right bg-emerald-50/60 border border-emerald-100 px-2 py-0.5 rounded-lg">
            <span className="text-[8px] uppercase font-bold text-emerald-600 block tracking-wider">Paid</span>
            <span className="text-xs font-bold font-mono text-emerald-700">
              ₹{totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="text-right bg-rose-50/60 border border-rose-100 px-2 py-0.5 rounded-lg">
            <span className="text-[8px] uppercase font-bold text-rose-500 block tracking-wider">Dues</span>
            <span className={`text-xs font-extrabold font-mono ${totalOutstanding > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/app/students/${student.id}/ledger`)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-xs font-bold text-indigo-700 transition-colors shadow-2xs shrink-0"
          >
            <FileText className="w-3 h-3" />
            <span>Ledger</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px] border-t border-slate-100 pt-1.5">
        <div className="bg-slate-50/70 p-1 px-2 rounded-lg border border-slate-100 flex items-center justify-between">
          <span className="font-bold text-slate-400 uppercase text-[8px]">Class:</span>
          <span className="font-bold text-slate-900 truncate">
            {className} {sectionName} {streamName ? `(${streamName})` : ''}
          </span>
        </div>

        <div className="bg-slate-50/70 p-1 px-2 rounded-lg border border-slate-100 flex items-center justify-between">
          <span className="font-bold text-slate-400 uppercase text-[8px]">Medium:</span>
          <span className="font-semibold text-slate-800">{mediumName}</span>
        </div>

        <div className="bg-slate-50/70 p-1 px-2 rounded-lg border border-slate-100 flex items-center justify-between">
          <span className="font-bold text-slate-400 uppercase text-[8px]">Father:</span>
          <span className="font-semibold text-slate-800 truncate max-w-[100px]">{fatherName}</span>
        </div>

        <div className="bg-slate-50/70 p-1 px-2 rounded-lg border border-slate-100 flex items-center justify-between">
          <span className="font-bold text-slate-400 uppercase text-[8px]">Phone:</span>
          <span className="font-semibold text-slate-800 font-mono">{student.phone || 'N/A'}</span>
        </div>
      </div>
    </div>
  );
};

export default StudentSummaryCard;
