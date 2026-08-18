import React, { useState, useEffect } from 'react';
import { RotateCcw, Info } from 'lucide-react';
import { feeService } from '../../services/fee.service.js';
import { useAcademicYear } from '../../hooks/useAcademicYear.js';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';
import { Badge } from '../ui/Badge.jsx';
import { Modal } from '../ui/Modal.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import { toast } from '../ui/Toast.jsx';

export const StudentFeeOverridesTab = ({ studentId, isLocked }) => {
  const { selectedYearId, selectedYear } = useAcademicYear();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Override Modal State
  const [selectedHead, setSelectedHead] = useState(null);
  const [overrideAmount, setOverrideAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchOverrides = async () => {
    if (!studentId || !selectedYearId) return;
    setLoading(true);
    try {
      const res = await feeService.getStudentFeeOverrides(studentId, { academicYearId: selectedYearId });
      setData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load student fee overrides');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverrides();
  }, [studentId, selectedYearId]);

  const handleOpenModal = (head) => {
    setSelectedHead(head);
    setOverrideAmount(head.overrideAmount !== null ? head.overrideAmount : head.masterAmount);
    setIsModalOpen(true);
  };

  const handleSaveOverride = async (e) => {
    e.preventDefault();
    if (!selectedHead) return;

    setSaving(true);
    try {
      await feeService.upsertStudentFeeOverride(studentId, {
        academicYearId: selectedYearId,
        feeTypeId: selectedHead.feeTypeId,
        amount: parseFloat(overrideAmount) || 0,
        isActive: true,
      });
      toast.success('Student fee override saved');
      setIsModalOpen(false);
      fetchOverrides();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save fee override');
    } finally {
      setSaving(false);
    }
  };

  const handleResetOverride = async (head) => {
    if (!head.overrideId) return;
    try {
      await feeService.deleteStudentFeeOverride(studentId, head.overrideId);
      toast.success('Override removed. Reverted to master fee structure.');
      fetchOverrides();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove override');
    }
  };

  if (loading) {
    return <Skeleton className="h-48 w-full rounded-xl" />;
  }

  return (
    <div className="space-y-4">
      {/* Header alert / notice */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 text-xs">
        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-slate-600 space-y-1">
          <p className="font-bold text-slate-900">Student Fee Inheritance & Overrides</p>
          <p>
            Students automatically inherit the master Fee Structure for their Class & Medium. Setting a student-level override modifies the fee amount strictly for this student without altering the master Fee Structure.
          </p>
        </div>
      </div>

      {!data?.hasFeeStructure && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
          <strong>No Fee Structure Found:</strong> There is no master Fee Structure configured for this student's class/medium in {selectedYear?.name}.
        </div>
      )}

      {/* Fee Overrides Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
            <tr>
              <th className="px-4 py-3">Fee Head</th>
              <th className="px-4 py-3 text-right">Master Structure Amount</th>
              <th className="px-4 py-3 text-right">Student Override Amount</th>
              <th className="px-4 py-3 text-right">Effective Fee</th>
              <th className="px-4 py-3 text-center">Status</th>
              {!isLocked && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(data?.effectiveHeads || []).map((head) => (
              <tr key={head.feeTypeId} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-bold text-slate-900">{head.feeTypeName}</td>
                <td className="px-4 py-3 text-right font-mono text-slate-500">
                  ₹{head.masterAmount.toLocaleString('en-IN')}
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-indigo-600">
                  {head.isOverridden ? `₹${head.overrideAmount.toLocaleString('en-IN')}` : '—'}
                </td>
                <td className="px-4 py-3 text-right font-mono font-extrabold text-slate-900">
                  ₹{head.effectiveAmount.toLocaleString('en-IN')}
                </td>
                <td className="px-4 py-3 text-center">
                  {head.isOverridden ? (
                    <div className="flex flex-col items-center gap-1">
                      <Badge variant="warning" size="sm">
                        Overridden
                      </Badge>
                      {head.effectiveAmount < head.masterAmount && (
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded font-mono">
                          Discount ₹{(head.masterAmount - head.effectiveAmount).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  ) : (
                    <Badge variant="neutral" size="sm">
                      Inherited
                    </Badge>
                  )}
                </td>
                {!isLocked && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenModal(head)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                      >
                        {head.isOverridden ? 'Edit Override' : 'Set Override'}
                      </button>

                      {head.isOverridden && (
                        <button
                          onClick={() => handleResetOverride(head)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Reset to Master Structure"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Override Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Set Fee Override — ${selectedHead?.feeTypeName}`}
        size="sm"
      >
        <form onSubmit={handleSaveOverride} className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <span className="text-slate-500">Master Structure Default Amount:</span>
            <span className="font-mono font-bold text-slate-900 ml-2">
              ₹{selectedHead?.masterAmount.toLocaleString('en-IN')}
            </span>
          </div>

          <Input
            label="Override Amount (₹)"
            type="number"
            min="0"
            step="0.01"
            value={overrideAmount}
            onChange={(e) => setOverrideAmount(e.target.value)}
            required
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} loadingText="Saving...">
              Save Override
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
