import React from 'react';
import { GraduationCap, CheckCircle2, AlertTriangle, Printer } from 'lucide-react';
import { Badge } from '../ui/Badge.jsx';
import { amountToWords } from '../../utils/numberToWords.js';
import { SchoolReportHeader } from '../common/SchoolReportHeader.jsx';

export const ReceiptCard = ({ receipt, schoolHeader, copyLabel = 'Original Copy' }) => {
  if (!receipt) return null;

  const isVoid = receipt.status === 'VOID';
  const school = schoolHeader || receipt.schoolHeader;
  const amount = Number(receipt.receivedAmount || 0);

  const activeEnrollment =
    receipt.student?.enrollments?.find((e) => e.status === 'ACTIVE') ||
    receipt.student?.enrollments?.[0] ||
    receipt.student?.enrollment;

  const rawClassName = activeEnrollment?.class?.name || '';
  const className = rawClassName
    ? rawClassName.startsWith('Class')
      ? rawClassName
      : `Class ${rawClassName}`
    : 'N/A';
  const sectionName = activeEnrollment?.section?.name ? `(${activeEnrollment.section.name})` : '';
  const streamName = activeEnrollment?.stream?.name ? `— ${activeEnrollment.stream.name}` : '';
  const mediumName = activeEnrollment?.medium?.name ? `[${activeEnrollment.medium.name} Medium]` : '';
  const rollNoDisplay = activeEnrollment?.rollNo ? ` | Roll No: ${activeEnrollment.rollNo}` : '';

  const fullClassDisplay = [
    className !== 'N/A' ? `${className} ${sectionName}`.trim() : 'N/A',
    streamName,
    mediumName,
    rollNoDisplay,
  ]
    .filter(Boolean)
    .join(' ');

  const academicYearName =
    receipt.academicYear?.name ||
    activeEnrollment?.academicYear?.name ||
    `${new Date().getFullYear()}–${new Date().getFullYear() + 1}`;

  return (
    <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 sm:p-8 max-w-3xl mx-auto space-y-5 relative overflow-hidden print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none">
      {/* Void Watermark Overlay if VOID */}
      {isVoid && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 opacity-15">
          <span className="text-8xl font-black text-rose-600 uppercase transform -rotate-12 border-8 border-rose-600 px-8 py-4 rounded-3xl">
            VOIDED
          </span>
        </div>
      )}

      {/* Top Banner Copy Label & Receipt Badge */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Receipt No:</span>
          <span className="font-mono font-black text-indigo-700 text-xs">{receipt.receiptNumber}</span>
          <Badge variant={isVoid ? 'danger' : 'success'} size="sm">
            {receipt.status}
          </Badge>
        </div>
        <span className="font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[10px] uppercase">
          {copyLabel}
        </span>
      </div>

      {/* Official Centered School Report Header */}
      <SchoolReportHeader
        school={school}
        documentTitle="FEE MONEY RECEIPT"
        academicYear={academicYearName}
      />

      {/* Receipt & Student Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {/* Student Info Box */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5">
          <h4 className="font-bold text-slate-900 uppercase text-[9px] tracking-wider text-indigo-600 border-b border-slate-200 pb-1">
            Student Particulars
          </h4>
          <div className="space-y-0.5 text-slate-700">
            <p className="font-bold text-slate-900 text-xs">{receipt.student?.name}</p>
            <p className="font-mono text-[11px]">
              Admission No: <span className="font-bold text-slate-900">{receipt.student?.admissionNo}</span>
            </p>
            <p className="font-medium text-[11px]">
              Class: <span className="font-bold text-slate-900">{fullClassDisplay}</span>
            </p>
            {receipt.student?.guardianName && <p className="text-[11px]">Guardian: {receipt.student.guardianName}</p>}
          </div>
        </div>

        {/* Payment Metadata Box */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5">
          <h4 className="font-bold text-slate-900 uppercase text-[9px] tracking-wider text-indigo-600 border-b border-slate-200 pb-1">
            Transaction Details
          </h4>
          <div className="space-y-0.5 text-[11px] font-medium text-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-500">Date:</span>
              <span className="font-bold text-slate-900 font-mono">
                {new Date(receipt.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Mode:</span>
              <span className="font-bold text-slate-900">{receipt.paymentMode}</span>
            </div>
            {receipt.referenceNumber && (
              <div className="flex justify-between">
                <span className="text-slate-500">Ref / UTR No:</span>
                <span className="font-mono font-semibold text-slate-800">{receipt.referenceNumber}</span>
              </div>
            )}
            {receipt.receivedBy && (
              <div className="flex justify-between">
                <span className="text-slate-500">Cashier:</span>
                <span className="font-semibold text-slate-800">{receipt.receivedBy.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Allocations Breakdown Table */}
      <div className="space-y-1.5">
        <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-wider">Fee Heads Breakdown</h4>
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[9px] border-b border-slate-200">
              <tr>
                <th className="py-2 px-3">Fee Head / Particulars</th>
                <th className="py-2 px-3">Month</th>
                <th className="py-2 px-3 text-right">Fee Amount</th>
                <th className="py-2 px-3 text-right">Allocated</th>
                <th className="py-2 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {receipt.allocations?.map((alloc) => (
                <tr key={alloc.id} className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-bold text-slate-900">
                    {alloc.title || alloc.chargeTitle}
                    {alloc.feeType?.name && (
                      <span className="block text-[9px] text-slate-400 font-normal">{alloc.feeType.name}</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-slate-700 font-semibold">
                    {alloc.month}{alloc.year || alloc.charge?.year ? ` ${alloc.year || alloc.charge.year}` : ''}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-600">
                    ₹{Number(alloc.originalAmount || alloc.chargeAmount || alloc.amount || 0).toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                    ₹{Number(alloc.allocatedAmount).toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <Badge variant={alloc.chargeStatus === 'PAID' ? 'success' : 'warning'} size="sm">
                      {alloc.chargeStatus || 'ALLOCATED'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Amount in Words & Totals Box */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="space-y-0.5 text-xs">
            <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider block">Amount in Words</span>
            <p className="font-bold text-slate-900 italic">{amountToWords(amount)}</p>
          </div>

          <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-right shrink-0 print:bg-slate-900">
            <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Total Received</span>
            <span className="text-lg font-black font-mono text-emerald-400">
              ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {receipt.remarks && (
          <p className="text-[11px] text-slate-600 border-t border-slate-200 pt-1.5 italic">
            <span className="font-bold text-slate-800 not-italic">Cashier Note:</span> "{receipt.remarks}"
          </p>
        )}
      </div>

      {/* Official Signatory & Seal Section */}
      <div className="pt-8 grid grid-cols-2 gap-8 text-xs font-semibold text-slate-700 border-t border-slate-200">
        <div className="text-center space-y-8">
          <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto" />
          <span>Cashier / Received By</span>
        </div>

        <div className="text-center space-y-8">
          <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto" />
          <span>Authorized Signatory & Stamp</span>
        </div>
      </div>

      {/* Footer Disclaimer */}
      <div className="text-center text-[9px] text-slate-400 border-t border-slate-100 pt-2">
        This is an official computer-generated fee payment receipt. No manual signature required if stamped by school authority.
      </div>
    </div>
  );
};

export default ReceiptCard;
