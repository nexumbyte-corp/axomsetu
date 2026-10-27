import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowLeft, Printer, Download, Loader2 } from 'lucide-react';
import { Badge } from '../ui/Badge.jsx';
import { StudentAvatar } from '../students/StudentAvatar.jsx';

export const StudentSummaryCard = ({
  student,
  outstandingSummary,
  onClearStudent,
  onPrintStatement,
  onDownloadStatement,
  isPrintingStatement = false,
  showLedgerButton = true,
}) => {
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Student Identity & Details */}
        <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
          {onClearStudent && (
            <button
              type="button"
              onClick={onClearStudent}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-xs font-medium transition-colors shadow-2xs shrink-0 cursor-pointer mt-0.5 sm:mt-0"
              title="Select another student"
              aria-label="Back to Student List"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Change</span>
            </button>
          )}

          <StudentAvatar
            name={student.name}
            photoUrl={student.photoUrl}
            size="md"
            className="shrink-0"
          />

          <div className="min-w-0 flex-1">
            {/* Student Name & Badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate leading-tight">
                {student.name}
              </h2>
              <Badge variant={student.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm" className="text-[9px] py-0 px-1.5">
                {student.status || 'ACTIVE'}
              </Badge>
              {isHostelEnrolled && (
                <Badge variant="purple" size="sm" className="text-[9px] py-0 px-1.5">
                  Resident
                </Badge>
              )}
            </div>

            {/* Sub Info Row: Clean inline pills & text */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs mt-1 text-slate-500">
              <span className="font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                {cleanClassName}{sectionName ? ` (${sectionName})` : ''}{streamName ? ` • ${streamName}` : ''}
              </span>

              <span className="font-mono text-[11px]">
                Adm: <span className="font-semibold text-slate-700">{student.admissionNo || 'N/A'}</span>
              </span>

              {rollNo && (
                <span className="font-mono text-[11px]">
                  Roll: <span className="font-medium text-slate-700">{rollNo}</span>
                </span>
              )}

              {mediumName && (
                <span className="text-[11px]">
                  Medium: <span className="text-slate-700">{mediumName}</span>
                </span>
              )}

              <span className="text-[11px] truncate max-w-[150px]">
                Father: <span className="text-slate-700">{fatherName}</span>
              </span>

              {phone !== 'N/A' && (
                <span className="text-[11px] font-mono">
                  Ph: <span className="text-slate-700">{phone}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Financial Dues Summary & Ledger Action */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
            <div>
              <span className="text-[8px] uppercase font-bold text-slate-400 block tracking-wider">Charges</span>
              <span className="font-mono font-bold text-slate-800 text-xs">
                ₹{totalCharges.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
              </span>
            </div>
            <div className="h-6 w-px bg-slate-200/80" />
            <div>
              <span className="text-[8px] uppercase font-bold text-slate-400 block tracking-wider">Paid</span>
              <span className="font-mono font-bold text-emerald-600 text-xs">
                ₹{totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
              </span>
            </div>
            <div className="h-6 w-px bg-slate-200/80" />
            <div>
              <span className="text-[8px] uppercase font-bold text-slate-400 block tracking-wider">Due</span>
              <span className={`font-mono font-extrabold text-xs ${totalOutstanding > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
              </span>
            </div>
          </div>

          {onPrintStatement ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onPrintStatement}
                disabled={isPrintingStatement}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-xs font-semibold text-indigo-700 hover:text-indigo-800 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                title="Print payment receipt statement"
              >
                {isPrintingStatement ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                ) : (
                  <Printer className="w-3.5 h-3.5 text-indigo-600" />
                )}
                <span>Print Statement</span>
              </button>
              {onDownloadStatement && (
                <button
                  type="button"
                  onClick={onDownloadStatement}
                  disabled={isPrintingStatement}
                  className="flex items-center justify-center p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                  title="Download Statement PDF"
                  aria-label="Download Statement PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : showLedgerButton ? (
            <button
              type="button"
              onClick={() => navigate(`/app/students/${student.id}/ledger`)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 hover:text-indigo-600 transition-colors shadow-2xs cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Ledger</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default StudentSummaryCard;
