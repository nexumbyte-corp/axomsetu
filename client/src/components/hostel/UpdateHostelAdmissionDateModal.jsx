import React, { useState, useEffect } from 'react';
import { AlertCircle, Info, Check } from 'lucide-react';
import { hostelService } from '../../services/hostel.service.js';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';
import { DatePicker } from '../ui/DatePicker.jsx';
import { Badge } from '../ui/Badge.jsx';
import { toast } from '../ui/Toast.jsx';
import { formatStudentClassInfo } from '../../utils/hostelUtils.js';
import { formatDate } from '../../utils/formatters.js';

export const UpdateHostelAdmissionDateModal = ({ isOpen, onClose, resident, onSuccess }) => {
  const [startDate, setStartDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Maximum allowable date constraints
  const maxExitDate = resident?.endDate
    ? new Date(resident.endDate).toISOString().split('T')[0]
    : '';

  const earliestTransferDate = resident?.transferHistory?.length > 0
    ? new Date(resident.transferHistory[resident.transferHistory.length - 1].transferDate || resident.transferHistory[0].transferDate).toISOString().split('T')[0]
    : '';

  // Calculate most restrictive max date
  let maxDate = '';
  if (maxExitDate && earliestTransferDate) {
    maxDate = maxExitDate < earliestTransferDate ? maxExitDate : earliestTransferDate;
  } else if (maxExitDate) {
    maxDate = maxExitDate;
  } else if (earliestTransferDate) {
    maxDate = earliestTransferDate;
  }

  useEffect(() => {
    if (isOpen && resident) {
      const currentStart = resident.startDate
        ? new Date(resident.startDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      setStartDate(currentStart);
      setReason('');
    }
  }, [isOpen, resident]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resident || !resident.id) {
      toast.error('No resident selected');
      return;
    }

    if (!startDate) {
      toast.error('Please specify a valid hostel admission date');
      return;
    }

    if (maxExitDate && startDate > maxExitDate) {
      toast.error(`Admission date cannot be after the exit date (${maxExitDate})`);
      return;
    }

    if (earliestTransferDate && startDate > earliestTransferDate) {
      toast.error(`Admission date cannot be after the first transfer date (${earliestTransferDate})`);
      return;
    }

    try {
      setSubmitting(true);
      await hostelService.updateAdmissionDate(resident.id, {
        startDate,
        reason: reason.trim() || undefined,
      });

      toast.success('Hostel admission date updated successfully');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update hostel admission date');
    } finally {
      setSubmitting(false);
    }
  };

  if (!resident) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Update Hostel Admission Date"
      description="Modify the recorded hostel admission start date for this resident."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Resident Summary Box */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 text-sm">{resident.studentName || resident.name}</span>
            <Badge variant={resident.status === 'ACTIVE' ? 'green' : 'gray'}>
              {resident.status || 'ACTIVE'}
            </Badge>
          </div>
          <p className="text-slate-600">
            Admission No: <strong className="text-slate-800 font-mono">{resident.admissionNo}</strong>
            {resident.className && ` • ${formatStudentClassInfo(resident)}`}
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 mt-1">
            <div>
              <span className="text-slate-500 block text-[11px]">Hostel & Room:</span>
              <span className="font-semibold text-slate-800">
                {resident.hostelName} → Room {resident.roomNumber} ({resident.bedNumber})
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Current Admission Date:</span>
              <span className="font-semibold text-indigo-700 font-mono">
                {formatDate(resident.startDate)}
              </span>
            </div>
          </div>
        </div>

        {/* Date Constraints Guidance */}
        {maxDate && (
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start space-x-2 text-xs text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Maximum allowable admission date is <strong>{maxDate}</strong>
              {maxExitDate === maxDate ? ' (Exit Date)' : ' (First Transfer Date)'}.
            </span>
          </div>
        )}

        {/* Date Picker Input */}
        <DatePicker
          label="New Hostel Admission Date *"
          value={startDate}
          onChange={(val) => setStartDate(val)}
          maxDate={maxDate || undefined}
          required
        />

        {/* Reason Input */}
        <Input
          label="Reason for Change (Optional)"
          placeholder="e.g., Corrected data entry error, Backdated hostel arrival"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        {/* Informational Note */}
        <div className="p-2.5 bg-blue-50/60 rounded-lg border border-blue-100 flex items-start space-x-2 text-[11px] text-blue-700">
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
          <span>
            Updating the admission date updates official resident records and adjusts monthly hostel fee generation eligibility accordingly.
          </span>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Check className="w-4 h-4 mr-1.5" />
            Save Admission Date
          </Button>
        </div>
      </form>
    </Modal>
  );
};
