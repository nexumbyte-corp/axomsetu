import React, { useState } from 'react';
import { Trash2, Pencil } from 'lucide-react';
import { Checkbox } from '../ui/Checkbox.jsx';
import { Badge } from '../ui/Badge.jsx';
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx';
import { Modal } from '../ui/Modal.jsx';
import { usePermission } from '../../hooks/usePermission.js';

import { DocumentActions } from '../documents/DocumentActions.jsx';

const WhatsAppIcon = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984 0 1.764.459 3.487 1.333 5.006L2 22l5.133-1.339c1.462.798 3.109 1.218 4.873 1.218 5.509 0 9.994-4.477 9.995-9.983C22.002 6.39 17.519 2 12.012 2zm0 18.293c-1.517 0-3.003-.404-4.306-1.17l-.309-.183-3.197.835.852-3.111-.202-.321c-.848-1.349-1.296-2.909-1.296-4.512 0-4.636 3.778-8.411 8.418-8.411 4.638 0 8.413 3.775 8.414 8.411 0 4.637-3.776 8.462-8.374 8.462zm4.61-6.312c-.253-.127-1.493-.737-1.724-.821-.231-.085-.399-.127-.567.127-.168.254-.649.821-.796.99-.147.169-.295.19-.547.063-.253-.127-1.069-.394-2.036-1.257-.753-.671-1.261-1.501-1.408-1.754-.147-.253-.016-.39.111-.516.114-.113.253-.296.379-.444.127-.148.168-.253.253-.422.084-.169.042-.317-.021-.444-.063-.127-.567-1.371-.777-1.877-.204-.492-.412-.425-.567-.433-.146-.008-.314-.009-.482-.009-.168 0-.441.063-.672.317-.231.254-.882.863-.882 2.105 0 1.242.903 2.441 1.029 2.61.126.169 1.776 2.712 4.303 3.803.601.259 1.07.414 1.435.53.604.192 1.155.165 1.59.101.485-.072 1.493-.61 1.703-1.2 0.21-.59.21-1.096.147-1.203-.063-.106-.231-.169-.484-.296z" />
  </svg>
);

export const OutstandingChargesTable = ({
  student = null,
  schoolHeader = null,
  academicYear = null,
  charges = [],
  selectedChargeIds = [],
  paymentAmounts = {},
  onToggleCharge,
  onToggleAll,
  onUpdatePaymentAmount,
  onDeleteCharge,
  onUpdateChargeAmount,
  onShareWhatsApp,
  isSharingWhatsApp = false,
  isDeleting = false,
  isUpdating = false,
  isLoading = false,
}) => {
  const [chargeToDelete, setChargeToDelete] = useState(null);
  const [chargeToEdit, setChargeToEdit] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editError, setEditError] = useState('');
  const { isOwner, isSchoolAdmin, hasFullAccess } = usePermission();
  const canManageCharge = isOwner || isSchoolAdmin || hasFullAccess;

  const payableCharges = charges.filter(
    (c) => c.status === 'UNPAID' || c.status === 'PARTIAL'
  );

  const isAllSelected =
    payableCharges.length > 0 &&
    payableCharges.every((c) => selectedChargeIds.includes(c.id));

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return <Badge variant="success" size="sm">PAID</Badge>;
      case 'PARTIAL':
        return <Badge variant="warning" size="sm">PARTIAL</Badge>;
      case 'WAIVED':
        return <Badge variant="neutral" size="sm">WAIVED</Badge>;
      case 'VOID':
        return <Badge variant="neutral" size="sm">VOID</Badge>;
      default:
        return <Badge variant="danger" size="sm">UNPAID</Badge>;
    }
  };

  const handleConfirmDelete = async () => {
    if (!chargeToDelete || !onDeleteCharge) return;
    try {
      await onDeleteCharge(chargeToDelete);
    } finally {
      setChargeToDelete(null);
    }
  };

  const handleConfirmEdit = async (e) => {
    e?.preventDefault();
    if (!chargeToEdit || !onUpdateChargeAmount) return;
    const parsed = parseFloat(editAmount);
    if (isNaN(parsed) || parsed < 0) {
      setEditError('Please enter a valid non-negative amount.');
      return;
    }
    setEditError('');
    try {
      await onUpdateChargeAmount(chargeToEdit, parsed);
      setChargeToEdit(null);
    } catch {
      // toast error handled by caller
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2 shadow-2xs">
        <div className="h-4 w-36 bg-slate-200 rounded animate-pulse" />
        <div className="space-y-1.5 pt-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-9 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (charges.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 text-center shadow-2xs space-y-1">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto font-bold text-sm">
          ✓
        </div>
        <h3 className="text-xs font-bold text-slate-900">No Outstanding Charges</h3>
        <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
          All fee charges for this student have been cleared.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="shrink-0 px-3 py-2 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
          <h3 className="text-xs font-bold text-slate-900">Fee Dues</h3>

          <div className="flex items-center gap-2">
            {student && charges.length > 0 && (
              <DocumentActions
                templateId="duesAdvice"
                data={{
                  student,
                  currentAcademic:
                    student.enrollments?.find((e) => e.status === 'ACTIVE') ||
                    student.enrollments?.[0] ||
                    student.enrollment,
                  pendingFees: charges,
                  schoolHeader,
                  academicYear,
                }}
                filename={`Dues_Slip_${student.admissionNo || 'Student'}.pdf`}
                title={`Pending Dues Statement - ${student.name}`}
                variant="printOnly"
                size="xs"
              />
            )}

            {onShareWhatsApp && (
              <button
                type="button"
                disabled={isSharingWhatsApp}
                onClick={onShareWhatsApp}
                className="inline-flex items-center justify-center p-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
                title="Share Outstanding Fee Statement on WhatsApp"
                aria-label="Share Outstanding Fee Statement on WhatsApp"
              >
                <WhatsAppIcon className="w-4 h-4 text-emerald-600 shrink-0" />
              </button>
            )}

            {payableCharges.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Checkbox
                  checked={isAllSelected}
                  onChange={onToggleAll}
                  id="select-all-charges"
                />
                <label htmlFor="select-all-charges" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  All ({payableCharges.length})
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Fee Dues Cards (< 768px) */}
        <div className="md:hidden divide-y divide-slate-100 overflow-y-auto max-h-[380px]">
          {charges.map((charge) => {
            const isPayable = charge.status === 'UNPAID' || charge.status === 'PARTIAL';
            const isSelected = selectedChargeIds.includes(charge.id);
            const totalAmt = Number(charge.chargeAmount ?? charge.amount ?? 0);
            const paidAmt = Number(charge.paidAmount ?? 0);
            const remainingBal = charge.balance !== undefined && charge.balance !== null
              ? Number(charge.balance)
              : Math.max(0, totalAmt - paidAmt);
            const currentPayVal = paymentAmounts[charge.id] !== undefined
              ? paymentAmounts[charge.id]
              : remainingBal;

            const isOver = Number(currentPayVal) > remainingBal;
            const isEditable = canManageCharge && charge.status === 'UNPAID' && paidAmt === 0;

            return (
              <div
                key={charge.id}
                onClick={() => {
                  if (isPayable) onToggleCharge(charge.id, remainingBal);
                }}
                className={`p-3 transition-colors ${
                  isSelected
                    ? 'bg-indigo-50/50'
                    : !isPayable
                    ? 'bg-slate-50/60 opacity-60'
                    : 'hover:bg-slate-50/80 cursor-pointer'
                }`}
              >
                {/* Top: Checkbox, Title, Month & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        disabled={!isPayable}
                        onChange={() => onToggleCharge(charge.id, remainingBal)}
                        id={`mobile-charge-${charge.id}`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                          {charge.title}
                        </span>
                        {charge.feeType?.name && (
                          <span className="text-[10px] text-slate-500 font-normal">
                            ({charge.feeType.name})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 font-medium">
                        <span>{charge.month}{charge.year ? ` ${charge.year}` : ''}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {getStatusBadge(charge.status)}

                    {isEditable && (
                      <div className="flex items-center gap-1 ml-1">
                        <button
                          type="button"
                          onClick={() => {
                            setChargeToEdit(charge);
                            setEditAmount(Number(charge.amount ?? charge.chargeAmount ?? 0).toString());
                            setEditError('');
                          }}
                          className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Edit Amount"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setChargeToDelete(charge)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Charge"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Middle: 3-Column Financial Breakdown */}
                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-100/80 text-xs">
                  <div className="bg-white/80 border border-slate-100 rounded-lg p-1.5 text-center">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Total</span>
                    <span className="font-mono font-semibold text-slate-700 text-xs">₹{totalAmt.toFixed(2)}</span>
                  </div>

                  <div className="bg-white/80 border border-slate-100 rounded-lg p-1.5 text-center">
                    <span className="text-[9px] uppercase font-bold text-emerald-600 block tracking-wider">Paid</span>
                    <span className="font-mono font-semibold text-emerald-600 text-xs">₹{paidAmt.toFixed(2)}</span>
                  </div>

                  <div className="bg-white/80 border border-slate-100 rounded-lg p-1.5 text-center">
                    <span className="text-[9px] uppercase font-bold text-rose-500 block tracking-wider">Due Bal</span>
                    <span className="font-mono font-bold text-rose-700 text-xs">₹{remainingBal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Bottom: Paying Amount Input (When Selected) */}
                {isSelected && (
                  <div
                    className="mt-2.5 pt-2 border-t border-indigo-200/60 flex items-center justify-between gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <label htmlFor={`pay-input-${charge.id}`} className="text-xs font-bold text-indigo-900 shrink-0">
                      Paying Now:
                    </label>
                    <div className="flex-1 max-w-[160px] relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">₹</span>
                      <input
                        id={`pay-input-${charge.id}`}
                        type="number"
                        step="0.01"
                        min="0"
                        max={remainingBal}
                        value={currentPayVal}
                        onChange={(e) => onUpdatePaymentAmount(charge.id, e.target.value)}
                        className={`w-full text-right py-1 pl-6 pr-2 rounded-lg border font-mono font-bold text-xs focus:outline-none transition-all ${
                          isOver
                            ? 'border-rose-500 bg-rose-50 text-rose-700'
                            : 'border-indigo-300 bg-white text-indigo-900 focus:ring-2 focus:ring-indigo-400'
                        }`}
                      />
                      {isOver && (
                        <span className="text-[8px] text-rose-600 block text-right font-semibold mt-0.5">
                          Exceeds balance
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Desktop Table View (>= 768px) */}
        <div className="hidden md:block flex-1 overflow-auto min-h-0">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-100/90 backdrop-blur-xs text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-1.5 px-2.5 w-7 text-center">[ ]</th>
                <th className="py-1.5 px-2.5">Fee Title</th>
                <th className="py-1.5 px-2.5">Month</th>
                <th className="py-1.5 px-2.5 text-right">Amount</th>
                <th className="py-1.5 px-2.5 text-right">Paid</th>
                <th className="py-1.5 px-2.5 text-right">Bal</th>
                <th className="py-1.5 px-2.5 text-right w-28">Pay (₹)</th>
                <th className="py-1.5 px-2.5 text-center w-16">Status</th>
                {canManageCharge && <th className="py-1.5 px-2.5 text-center w-14">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {charges.map((charge) => {
                const isPayable = charge.status === 'UNPAID' || charge.status === 'PARTIAL';
                const isSelected = selectedChargeIds.includes(charge.id);
                const totalAmt = Number(charge.chargeAmount ?? charge.amount ?? 0);
                const paidAmt = Number(charge.paidAmount ?? 0);
                const remainingBal = charge.balance !== undefined && charge.balance !== null
                  ? Number(charge.balance)
                  : Math.max(0, totalAmt - paidAmt);
                const currentPayVal = paymentAmounts[charge.id] !== undefined
                  ? paymentAmounts[charge.id]
                  : remainingBal;

                const isOver = Number(currentPayVal) > remainingBal;
                const isEditable = canManageCharge && charge.status === 'UNPAID' && paidAmt === 0;

                return (
                  <tr
                    key={charge.id}
                    className={`transition-colors ${isSelected
                        ? 'bg-indigo-50/40 font-medium'
                        : !isPayable
                          ? 'bg-slate-50/50 opacity-60'
                          : 'hover:bg-slate-50'
                      }`}
                  >
                    <td className="py-1.5 px-2 text-center">
                      <Checkbox
                        checked={isSelected}
                        disabled={!isPayable}
                        onChange={() => onToggleCharge(charge.id, remainingBal)}
                      />
                    </td>
                    <td className="py-1.5 px-2.5 font-bold text-slate-900">
                      {charge.title}
                      {charge.feeType?.name && (
                        <span className="text-[9px] text-slate-400 font-normal ml-1">
                          ({charge.feeType.name})
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-2.5 font-semibold text-slate-700 text-[11px]">
                      {charge.month}{charge.year ? ` ${charge.year}` : ''}
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-mono text-slate-700">
                      ₹{totalAmt.toFixed(2)}
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-mono text-emerald-600 font-semibold">
                      ₹{paidAmt.toFixed(2)}
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900">
                      ₹{remainingBal.toFixed(2)}
                    </td>
                    <td className="py-1 px-1.5 text-right">
                      {isSelected ? (
                        <div className="relative">
                          <input
                            type="number"
                            autoComplete="off"
                            step="0.01"
                            min="0"
                            max={remainingBal}
                            value={currentPayVal}
                            onChange={(e) => onUpdatePaymentAmount(charge.id, e.target.value)}
                            className={`w-full text-right py-0.5 px-1.5 rounded-md border font-mono font-bold text-xs focus:outline-none transition-all ${isOver
                                ? 'border-rose-500 bg-rose-50 text-rose-700'
                                : 'border-indigo-300 bg-white text-indigo-900 focus:ring-1 focus:ring-indigo-300'
                              }`}
                          />
                          {isOver && (
                            <span className="text-[8px] text-rose-600 block text-right font-semibold">
                              Exceeds bal
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-center">{getStatusBadge(charge.status)}</td>
                    {canManageCharge && (
                      <td className="py-1.5 px-2 text-center">
                        {isEditable ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setChargeToEdit(charge);
                                setEditAmount(Number(charge.amount ?? charge.chargeAmount ?? 0).toString());
                                setEditError('');
                              }}
                              className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors inline-flex items-center justify-center cursor-pointer"
                              title="Edit Fee Charge Amount"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setChargeToDelete(charge);
                              }}
                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors inline-flex items-center justify-center cursor-pointer"
                              title="Delete Unpaid Fee Charge"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-[10px]">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Amount Dialog */}
      {chargeToEdit && (
        <Modal
          isOpen={Boolean(chargeToEdit)}
          onClose={() => setChargeToEdit(null)}
          title="Edit Fee Charge Amount"
          description={`Update the charge amount for '${chargeToEdit.title}' (${chargeToEdit.month}).`}
          size="sm"
          footer={
            <>
              <button
                type="button"
                onClick={() => setChargeToEdit(null)}
                disabled={isUpdating}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg transition-colors border border-slate-200 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEdit}
                disabled={isUpdating}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-2xs disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
              >
                {isUpdating ? 'Saving...' : 'Save Amount'}
              </button>
            </>
          }
        >
          <form onSubmit={handleConfirmEdit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Charge Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                autoFocus
                value={editAmount}
                onChange={(e) => {
                  setEditAmount(e.target.value);
                  if (editError) setEditError('');
                }}
                className="w-full px-3 py-1.5 text-sm font-mono font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0.00"
              />
              {editError && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">{editError}</p>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Current Amount: <span className="font-mono font-bold text-slate-700">₹{Number(chargeToEdit.amount || chargeToEdit.chargeAmount || 0).toFixed(2)}</span>
            </p>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      {chargeToDelete && (
        <ConfirmDialog
          isOpen={Boolean(chargeToDelete)}
          onClose={() => setChargeToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Delete Unpaid Fee Charge"
          message={`Are you sure you want to permanently delete '${chargeToDelete.title}' (${chargeToDelete.month}) of amount ₹${Number(chargeToDelete.amount || chargeToDelete.chargeAmount || 0).toFixed(2)}? This action cannot be undone.`}
          confirmText="Delete Charge"
          variant="danger"
          loading={isDeleting}
        />
      )}
    </>
  );
};

export default OutstandingChargesTable;
