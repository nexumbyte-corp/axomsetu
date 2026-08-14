import React from 'react';
import { Modal } from '../../components/ui/Modal.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Printer, CheckCircle2, Building, Calendar, CreditCard, User } from 'lucide-react';

export const SalarySlipModal = ({ isOpen, onClose, payment }) => {
  if (!payment) return null;

  const handlePrint = () => {
    window.print();
  };

  const monthsText = Array.isArray(payment.months) ? payment.months.join(', ') : payment.months;
  const staff = payment.staff || {};
  const school = payment.school || {};

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Salary Slip - ${payment.paymentNumber}`}
      size="lg"
    >
      <div className="space-y-6 printable-area">
        {/* Header Header Bar */}
        <div className="border-b border-slate-200 pb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">{school.name || 'School Workspace'}</h2>
            <p className="text-xs text-slate-500">{school.address || 'Official Salary Disbursement Voucher'}</p>
          </div>
          <div className="text-right">
            <span className="inline-block px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-mono font-bold">
              Voucher #{payment.paymentNumber}
            </span>
            <p className="text-[11px] text-slate-500 mt-1">
              Date: {new Date(payment.paymentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Staff & Payment Details Grid */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
          <div>
            <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-indigo-600" /> Employee Information
            </h4>
            <p className="text-slate-900 font-bold text-sm">{staff.name}</p>
            <p className="text-slate-600">Emp ID: <span className="font-mono font-semibold">{staff.employeeId}</span></p>
            <p className="text-slate-600">Role: {staff.role} ({staff.department || 'General'})</p>
            {staff.designation && <p className="text-slate-600">Designation: {staff.designation}</p>}
          </div>

          <div>
            <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-indigo-600" /> Payment & Period Info
            </h4>
            <p className="text-slate-900 font-semibold">Months Paid: <span className="text-indigo-700 font-bold">{monthsText} ({payment.year})</span></p>
            <p className="text-slate-600">Payment Mode: <span className="font-bold text-slate-800">{payment.paymentMode}</span></p>
            {payment.referenceNo && <p className="text-slate-600">Ref / Txn #: {payment.referenceNo}</p>}
            {staff.bankAccountNo && (
              <p className="text-slate-500 text-[11px] mt-1">
                Bank: {staff.bankName || 'Bank'} ({staff.bankAccountNo})
              </p>
            )}
          </div>
        </div>

        {/* Financial Breakdown Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Component Description</th>
                <th className="py-2.5 px-4 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              <tr>
                <td className="py-2.5 px-4 font-medium">
                  Base Monthly Salary ({payment.months?.length || 1} month{payment.months?.length > 1 ? 's' : ''})
                </td>
                <td className="py-2.5 px-4 text-right font-mono font-semibold">
                  ₹{Number(payment.baseSalary).toLocaleString('en-IN')}
                </td>
              </tr>
              {Number(payment.allowances) > 0 && (
                <tr className="bg-emerald-50/50">
                  <td className="py-2.5 px-4 text-emerald-800 font-medium">+ Allowances / Bonus</td>
                  <td className="py-2.5 px-4 text-right font-mono font-semibold text-emerald-700">
                    + ₹{Number(payment.allowances).toLocaleString('en-IN')}
                  </td>
                </tr>
              )}
              {Number(payment.deductions) > 0 && (
                <tr className="bg-red-50/50">
                  <td className="py-2.5 px-4 text-red-800 font-medium">- Other Deductions (PF / Absence / Tax)</td>
                  <td className="py-2.5 px-4 text-right font-mono font-semibold text-red-700">
                    - ₹{Number(payment.deductions).toLocaleString('en-IN')}
                  </td>
                </tr>
              )}
              {Number(payment.advanceDeducted) > 0 && (
                <tr className="bg-amber-50/50">
                  <td className="py-2.5 px-4 text-amber-900 font-medium">- Advance Salary Recovery</td>
                  <td className="py-2.5 px-4 text-right font-mono font-semibold text-amber-800">
                    - ₹{Number(payment.advanceDeducted).toLocaleString('en-IN')}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-slate-900 text-white font-bold border-t-2 border-slate-900">
              <tr>
                <td className="py-3 px-4 text-sm">NET PAID SALARY</td>
                <td className="py-3 px-4 text-right text-base font-extrabold text-emerald-400 font-mono">
                  ₹{Number(payment.netSalary).toLocaleString('en-IN')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {payment.remarks && (
          <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 border border-slate-200">
            <span className="font-bold text-slate-800">Remarks: </span>
            {payment.remarks}
          </div>
        )}

        {/* Footer Signature placeholder */}
        <div className="pt-8 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
          <div>
            <p className="font-semibold text-slate-600">Authorized Signatory</p>
            <p className="text-[9px]">Computer generated salary voucher</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-slate-600">Employee Signature</p>
            <p className="text-[9px]">Received Payment Acknowledgement</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 no-print border-t border-slate-200">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" onClick={handlePrint} icon={Printer}>
            Print Salary Slip
          </Button>
        </div>
      </div>
    </Modal>
  );
};
