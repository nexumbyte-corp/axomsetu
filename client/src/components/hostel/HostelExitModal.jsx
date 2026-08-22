import React, { useState, useEffect } from 'react';
import { LogOut, AlertTriangle } from 'lucide-react';
import { hostelService } from '../../services/hostel.service.js';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';
import { DatePicker } from '../ui/DatePicker.jsx';
import { Badge } from '../ui/Badge.jsx';
import { toast } from '../ui/Toast.jsx';
import { formatStudentClassInfo } from '../../utils/hostelUtils.js';
import { formatDate } from '../../utils/formatters.js';

export const HostelExitModal = ({ isOpen, onClose, resident, onSuccess }) => {
  const [exitDate, setExitDate] = useState(new Date().toISOString().split('T')[0]);
  const [exitReason, setExitReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const minExitDate = resident?.startDate
    ? new Date(resident.startDate).toISOString().split('T')[0]
    : '';

  useEffect(() => {
    if (isOpen) {
      setExitDate(new Date().toISOString().split('T')[0]);
      setExitReason('');
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resident || !resident.id) {
      toast.error('No resident selected for exit');
      return;
    }
    if (!exitDate) {
      toast.error('Please specify exit date');
      return;
    }
    if (minExitDate && exitDate < minExitDate) {
      toast.error(`Exit date cannot be before hostel admission start date (${minExitDate})`);
      return;
    }

    try {
      setSubmitting(true);
      await hostelService.exitStudent({
        enrollmentId: resident.id,
        exitDate,
        reason: exitReason || 'Hostel Exit',
      });

      toast.success(`Hostel exit for ${resident.studentName || 'resident'} completed. Bed released!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Hostel exit failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!resident) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Process Resident Hostel Exit"
      description="End resident's active hostel stay and release their allocated bed."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 text-sm">{resident.studentName}</span>
            <Badge variant="blue">ACTIVE RESIDENT</Badge>
          </div>
          <p className="text-slate-600">
            Admission No: <strong className="text-slate-800">{resident.admissionNo}</strong> • {formatStudentClassInfo(resident)}
          </p>
          <p className="text-slate-800 font-medium pt-1">
            Current Bed: <strong>{resident.hostelName}</strong> → Room <strong>{resident.roomNumber}</strong> ({resident.bedNumber})
          </p>
          {resident.startDate && (
            <p className="text-slate-500 text-[11px] pt-0.5 font-mono">
              Hostel Admission Start Date: <strong className="text-slate-700">{formatDate(resident.startDate)}</strong>
            </p>
          )}
        </div>

        <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 flex items-start space-x-2.5 text-xs text-rose-800">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>
            Executing exit will terminate active enrollment, release Bed <strong>{resident.bedNumber}</strong> to <code>AVAILABLE</code>, and stop future automatic hostel monthly fee generation.
          </span>
        </div>

        <DatePicker
          label="Hostel Exit Date *"
          value={exitDate}
          onChange={(val) => setExitDate(val)}
          minDate={minExitDate}
          required
        />

        <Input
          label="Reason for Hostel Exit"
          placeholder="Enter reason for exit (e.g. Course completion, day scholar transition)"
          value={exitReason}
          onChange={(e) => setExitReason(e.target.value)}
        />

        <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting} className="bg-rose-600 hover:bg-rose-700 text-white">
            <LogOut className="w-4 h-4 mr-1.5" />
            Confirm Exit & Release Bed
          </Button>
        </div>
      </form>
    </Modal>
  );
};
