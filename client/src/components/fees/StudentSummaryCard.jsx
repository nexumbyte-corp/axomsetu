import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowLeft, User, Phone, Home } from 'lucide-react';
import { Badge } from '../ui/Badge.jsx';
import { StudentAvatar } from '../students/StudentAvatar.jsx';

export const StudentSummaryCard = ({ student, outstandingSummary, onClearStudent }) => {
  const navigate = useNavigate();

  if (!student) return null;

  const activeEnrollment =
    student.enrollments?.find((e) => e.status === 'ACTIVE') ||
    student.enrollments?.[0] ||
    student.enrollment;

  const rawClassName = (activeEnrollment?.class?.name || student.class?.name || '').trim();
  const cleanClassName = rawClassName
    ? /^class/i.test(rawClassName)
      ? rawClassName
      : `Class ${rawClassName}`
    : 'Class N/A';

  const sectionName = (activeEnrollment?.section?.name || student.section?.name || '').trim();
  const streamName = (activeEnrollment?.stream?.name || student.stream?.name || '').trim();
  const rawMedium = (activeEnrollment?.medium?.name || student.medium?.name || '').trim();
  const mediumName = rawMedium ? rawMedium.replace(/\s*medium$/i, '').trim() : '';

  const fatherName = (student.fatherName || student.guardianName || '').trim() || 'N/A';
  const phone = (student.phone || student.mobile || student.guardianPhone || student.fatherPhone || '').trim() || 'N/A';
  const rollNo = activeEnrollment?.rollNumber ?? student.rollNo ?? null;
  const hostelInfo = student.hostel;
  const isHostelEnrolled = Boolean(hostelInfo?.enrolled || student.isHostelResident);

  const totalCharges = Number(outstandingSummary?.totalCharges || 0);
  const totalPaid = Number(outstandingSummary?.totalPaid || 0);
  const totalOutstanding = Number(outstandingSummary?.totalOutstanding ?? outstandingSummary?.outstanding ?? 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-2.5 sm:p-3 shadow-2xs space-y-2">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        {/* Left: Student Identity & Details */}
        <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
          {onClearStudent && (
            <button
              type="button"
              onClick={onClearStudent}
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-indigo-600 transition-colors shadow-2xs shrink-0 cursor-pointer mt-0.5 sm:mt-0"
              title="Back to Student List"
              aria-label="Back to Student List"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <StudentAvatar
            name={student.name}
            photoUrl={student.photoUrl}
            size="md"
            className="shrink-0 ring-2 ring-indigo-50"
          />

          <div className="min-w-0 flex-1">
            {/* Student Name & Badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 truncate leading-tight">
                {student.name}
              </h2>
              <Badge variant={student.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm" className="text-[9px] py-0 px-1.5 font-bold">
                {student.status || 'ACTIVE'}
              </Badge>
              {isHostelEnrolled && (
                <Badge variant="purple" size="sm" className="text-[9px] py-0 px-1.5 font-bold">
                  Resident
                </Badge>
              )}
            </div>

            {/* Sub Info Row: Clean inline pills & text */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs mt-1 text-slate-600">
              <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                {cleanClassName}{sectionName ? ` (${sectionName})` : ''}{streamName ? ` • ${streamName}` : ''}
              </span>

              <span className="text-slate-500 font-mono text-[11px]">
                Adm: <span className="font-bold text-slate-800">{student.admissionNo || 'N/A'}</span>
              </span>

              {rollNo && (
                <span className="text-slate-500 font-mono text-[11px]">
                  Roll: <span className="font-semibold text-slate-700">{rollNo}</span>
                </span>
              )}

              {mediumName && (
                <span className="text-slate-500 text-[11px]">
                  Medium: <span className="font-semibold text-slate-700">{mediumName}</span>
                </span>
              )}

              <span className="text-slate-500 text-[11px] truncate max-w-[160px]">
                Father: <span className="font-semibold text-slate-700">{fatherName}</span>
              </span>

              <span className="text-slate-500 text-[11px] font-mono">
                Ph: <span className="font-semibold text-slate-700">{phone}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Financial Dues Summary & Ledger Action */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
          <div className="flex items-center gap-1.5">
            <div className="text-right bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
              <span className="text-[8px] uppercase font-bold text-slate-400 block tracking-wider">Charges</span>
              <span className="text-xs font-bold font-mono text-slate-900">
                ₹{totalCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="text-right bg-emerald-50/70 border border-emerald-200/70 px-2.5 py-1 rounded-lg">
              <span className="text-[8px] uppercase font-bold text-emerald-600 block tracking-wider">Paid</span>
              <span className="text-xs font-bold font-mono text-emerald-700">
                ₹{totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="text-right bg-rose-50/70 border border-rose-200/70 px-2.5 py-1 rounded-lg">
              <span className="text-[8px] uppercase font-bold text-rose-500 block tracking-wider">Dues</span>
              <span className={`text-xs font-extrabold font-mono ${totalOutstanding > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/app/students/${student.id}/ledger`)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-xs font-bold text-indigo-700 transition-colors shadow-2xs shrink-0 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>Ledger</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentSummaryCard;
