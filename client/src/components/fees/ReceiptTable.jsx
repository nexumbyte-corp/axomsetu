import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, FileText } from 'lucide-react';
import { Badge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';

export const ReceiptTable = ({ payments = [], isLoading = false, onSelectReceipt: _onSelectReceipt }) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-2xs">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-2xs space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
          <FileText className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">No Receipts Available</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          No fee payment receipts found matching the current search or filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100/70 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Receipt Number</th>
              <th className="py-3 px-4">Student</th>
              <th className="py-3 px-4 text-right">Amount (₹)</th>
              <th className="py-3 px-4 text-center">Mode</th>
              <th className="py-3 px-4">Payment Date</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {payments.map((p) => {
              const isVoid = p.status === 'VOID';
              const enr =
                p.student?.enrollment ||
                p.student?.enrollments?.find((e) => e.academicYearId === p.academicYear?.id && e.status === 'ACTIVE') ||
                p.student?.enrollments?.find((e) => e.academicYearId === p.academicYear?.id) ||
                p.student?.enrollments?.find((e) => e.status === 'ACTIVE') ||
                p.student?.enrollments?.[0] ||
                p.allocations?.find((a) => a.charge?.studentEnrollment)?.charge?.studentEnrollment;

              const rawClassName = p.className || p.student?.className || enr?.class?.name;
              const className = rawClassName
                ? rawClassName.toLowerCase().startsWith('class')
                  ? rawClassName
                  : `Class ${rawClassName}`
                : null;

              const rawSection = p.sectionName || p.student?.sectionName || enr?.section?.name;
              const sectionName = rawSection
                ? rawSection.toLowerCase().startsWith('sec')
                  ? rawSection
                  : `${rawSection}`
                : null;

              const mediumName = p.mediumName || p.student?.mediumName || enr?.medium?.name || null;
              const streamName = p.streamName || p.student?.streamName || enr?.stream?.name || null;

              return (
                <tr
                  key={p.id}
                  className={`transition-colors ${
                    isVoid ? 'bg-rose-50/30 opacity-75' : 'hover:bg-slate-50/80'
                  }`}
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">
                    {p.receiptNumber}
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-900">{p.studentName || p.student?.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Adm: {p.admissionNo || p.student?.admissionNo}
                    </p>
                    {(className || mediumName || streamName) && (
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-slate-700 mt-1">
                        {className && <span className="font-bold text-slate-900">{className}</span>}
                        {sectionName && <span className="font-semibold text-slate-600">({sectionName})</span>}
                        {streamName && (
                          <Badge variant="indigo" size="sm" className="px-1.5 py-0 text-[10px] font-sans">
                            {streamName}
                          </Badge>
                        )}
                        {mediumName && (
                          <span className="text-slate-500 font-normal">| {mediumName}</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                    ₹{Number(p.receivedAmount || p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <Badge variant="info" size="sm">{p.paymentMode}</Badge>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">
                    {new Date(p.paymentDate).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <Badge variant={isVoid ? 'danger' : 'success'} size="sm">
                      {p.status}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/app/fees/receipts/${p.id}`)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      View
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReceiptTable;
