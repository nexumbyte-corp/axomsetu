import React from 'react';
import { Badge } from '../ui/Badge.jsx';
import { amountToWords } from '../../utils/numberToWords.js';
import { formatDate } from '../../utils/formatters.js';
import { SchoolReportHeader } from '../common/SchoolReportHeader.jsx';

export const DuesAdviceCard = ({
  student,
  currentAcademic,
  pendingFees = [],
  schoolHeader,
  academicYear,
  copyLabel = 'Official Copy',
}) => {
  if (!student) return null;

  const totalBalance = pendingFees.reduce((sum, f) => sum + Number(f.balance || 0), 0);

  const rawClassName = currentAcademic?.class?.name || student.class?.name || '';
  const cleanClassName = rawClassName.replace(/^Class\s+/i, '').trim();
  const classNameDisplay = cleanClassName ? cleanClassName : (rawClassName || 'N/A');
  const sectionName = currentAcademic?.section?.name || student.section?.name || '';
  const sectionDisplay = sectionName ? ` (${sectionName})` : '';
  const streamName = currentAcademic?.stream?.name || student.stream?.name || '';
  const mediumName = currentAcademic?.medium?.name || student.medium?.name || '';
  const rollNoDisplay = (currentAcademic?.rollNumber ?? currentAcademic?.rollNo ?? student.rollNo ?? student.rollNumber) || null;
  const guardianName = student.guardianName || student.guardian_name || student.fatherName || student.guardian || 'N/A';

  const academicYearName = academicYear?.name || currentAcademic?.academicYear?.name || `${new Date().getFullYear()}–${new Date().getFullYear() + 1}`;

  return (
    <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 sm:p-8 max-w-3xl mx-auto space-y-5 relative overflow-hidden print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none">
      {/* Top Banner Copy Label & Status Badge */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Document Type:</span>
          <span className="font-mono font-black text-rose-700 text-xs">PENDING DUES ADVICE</span>
          <Badge variant={totalBalance > 0 ? 'amber' : 'success'} size="sm">
            {totalBalance > 0 ? 'OUTSTANDING DUES' : 'FULLY SETTLED'}
          </Badge>
        </div>
        <span className="font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[10px] uppercase">
          {copyLabel}
        </span>
      </div>

      {/* Official Centered School Report Header */}
      <SchoolReportHeader
        school={schoolHeader}
        documentTitle="OUTSTANDING FEE DUES STATEMENT"
        academicYear={academicYearName}
      />

      {/* Student & Statement Particulars Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {/* Student Info Box */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5">
          <h4 className="font-bold text-slate-900 uppercase text-[9px] tracking-wider text-indigo-600 border-b border-slate-200 pb-1">
            Student Particulars
          </h4>
          <div className="space-y-0.5 text-slate-700">
            <p className="font-mono text-[11px]">
              Admission No: <span className="font-bold text-slate-900">{student.admissionNo || 'N/A'}</span>
            </p>
            <p className="font-bold text-slate-900 text-xs">{student.name}</p>
            <p className="text-[11px]">
              Guardian Name: <span className="font-semibold text-slate-900">{guardianName}</span>
            </p>
            <p className="font-medium text-[11px]">
              Class: <span className="font-bold text-slate-900">{classNameDisplay}{sectionDisplay}</span>
              {mediumName && (
                <span className="ml-3">
                  Medium: <span className="font-bold text-slate-900">{mediumName}</span>
                </span>
              )}
              {rollNoDisplay && <span className="text-slate-500 font-mono text-[10px] ml-2">| Roll No: {rollNoDisplay}</span>}
            </p>
            {streamName && (
              <p className="font-medium text-[11px]">
                Stream: <span className="font-bold text-slate-900">{streamName}</span>
              </p>
            )}
          </div>
        </div>

        {/* Statement Metadata Box */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5">
          <h4 className="font-bold text-slate-900 uppercase text-[9px] tracking-wider text-indigo-600 border-b border-slate-200 pb-1">
            Statement Metadata
          </h4>
          <div className="space-y-0.5 text-[11px] font-medium text-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-500">Statement Date:</span>
              <span className="font-bold text-slate-900 font-mono">
                {formatDate(new Date())}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Academic Year:</span>
              <span className="font-bold text-slate-900">{academicYearName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Pending Head Items:</span>
              <span className="font-bold font-mono text-slate-900">{pendingFees.length} Items</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Hostel Allocation:</span>
              <span className="font-bold text-purple-700">
                {student.hostel?.enrolled ? `${student.hostel.hostelName} (Room ${student.hostel.roomNumber})` : 'Day Scholar'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Itemized Pending Charges Breakdown Table (Chronological ASC Order) */}
      <div className="space-y-1.5">
        <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-wider">Itemized Pending Dues Breakdown (Chronological Order)</h4>
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[9px] border-b border-slate-200">
              <tr>
                <th className="py-2 px-3 text-center">#</th>
                <th className="py-2 px-3">Fee Head / Particulars</th>
                <th className="py-2 px-3">Month</th>
                <th className="py-2 px-3 text-right">Fee Amount</th>
                <th className="py-2 px-3 text-right">Paid Amount</th>
                <th className="py-2 px-3 text-right">Pending Balance</th>
                <th className="py-2 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {pendingFees.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-4 text-center text-emerald-700 font-semibold bg-emerald-50/50">
                    🎉 All fee charges are fully settled. Zero pending balance.
                  </td>
                </tr>
              ) : (
                pendingFees.map((fee, idx) => (
                  <tr key={fee.id || idx} className="hover:bg-slate-50">
                    <td className="py-2 px-3 text-center font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                    <td className="py-2 px-3 font-bold text-slate-900">{fee.title}</td>
                    <td className="py-2 px-3 text-slate-700 font-semibold font-mono">
                      {fee.month}{fee.year ? ` ${fee.year}` : ''}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-600">
                      ₹{Number(fee.amount || 0).toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-700">
                      ₹{Number(fee.paidAmount || 0).toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-extrabold text-rose-700">
                      ₹{Number(fee.balance || 0).toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <Badge variant={fee.status === 'PARTIAL' ? 'warning' : 'danger'} size="sm">
                        {fee.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Amount in Words & Totals Box */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="space-y-0.5 text-xs">
            <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider block">Outstanding Amount in Words</span>
            <p className="font-bold text-slate-900 italic">{amountToWords(totalBalance)}</p>
          </div>

          <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-right shrink-0 print:bg-slate-900">
            <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Total Pending Dues</span>
            <span className="text-lg font-black font-mono text-rose-400">
              ₹{totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <p className="text-[10px] text-slate-500 border-t border-slate-200 pt-1.5 italic">
          <span className="font-bold text-slate-700 not-italic">Payment Advice:</span> Please clear the outstanding dues at the Accounts Counter or online via AxomSetu.
        </p>
      </div>

      {/* Official Signatory & Seal Section */}
      <div className="pt-16 mt-6 grid grid-cols-2 gap-8 text-xs font-semibold text-slate-700 border-t border-slate-200">
        <div className="text-center space-y-10">
          <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto" />
          <span>Accounts Officer / Prepared By</span>
        </div>

        <div className="text-center space-y-10">
          <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto" />
          <span>Authorized Signatory & Stamp</span>
        </div>
      </div>

      {/* Footer Disclaimer */}
      <div className="text-center text-[9px] text-slate-400 border-t border-slate-100 pt-2">
        This is an official computer-generated fee dues statement. No manual signature required if stamped by school authority.
      </div>
    </div>
  );
};

export default DuesAdviceCard;
