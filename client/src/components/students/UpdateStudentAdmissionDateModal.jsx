import React, { useState, useEffect } from 'react';
import { AlertCircle, Info, Check } from 'lucide-react';
import { studentService } from '../../services/student.service.js';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';
import { DatePicker } from '../ui/DatePicker.jsx';
import { Badge } from '../ui/Badge.jsx';
import { toast } from '../ui/Toast.jsx';
import { formatDate } from '../../utils/formatters.js';

export const UpdateStudentAdmissionDateModal = ({ isOpen, onClose, student, onSuccess }) => {
  const [admissionDate, setAdmissionDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Derive constraint boundaries
  // 1. Earliest transfer date (if student had a stream/medium transfer)
  const earliestTransferDate = student?.earliestTransferDate || (
    student?.transferHistory?.length > 0
      ? new Date(student.transferHistory[0].transferDate).toISOString().split('T')[0]
      : (student?.transfers?.length > 0 ? new Date(student.transfers[0].transferDate).toISOString().split('T')[0] : '')
  );

  // 2. Earliest hostel start date (if student is in hostel)
  const hostelStartDate = student?.hostel?.startDate
    ? new Date(student.hostel.startDate).toISOString().split('T')[0]
    : (student?.activeHostelEnrollments?.length > 0
        ? new Date(student.activeHostelEnrollments[0].startDate).toISOString().split('T')[0]
        : '');

  // Calculate most restrictive maximum date
  let maxDate = '';
  let maxReason = '';
  if (earliestTransferDate && hostelStartDate) {
    if (earliestTransferDate < hostelStartDate) {
      maxDate = earliestTransferDate;
      maxReason = 'Earliest Transfer Date';
    } else {
      maxDate = hostelStartDate;
      maxReason = 'Hostel Admission Date';
    }
  } else if (earliestTransferDate) {
    maxDate = earliestTransferDate;
    maxReason = 'Earliest Transfer Date';
  } else if (hostelStartDate) {
    maxDate = hostelStartDate;
    maxReason = 'Hostel Admission Date';
  }

  useEffect(() => {
    if (isOpen && student) {
      const currentAdm = student.admissionDate
        ? new Date(student.admissionDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      setAdmissionDate(currentAdm);
      setReason('');
    }
  }, [isOpen, student]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!student || !student.id) {
      toast.error('No student selected');
      return;
    }

    if (!admissionDate) {
      toast.error('Please specify a valid school admission date');
      return;
    }

    if (maxDate && admissionDate > maxDate) {
      toast.error(`Admission date cannot be after the ${maxReason} (${maxDate})`);
      return;
    }

    try {
      setSubmitting(true);
      await studentService.updateAdmissionDate(student.id, {
        admissionDate,
        reason: reason.trim() || undefined,
      });

      toast.success('School admission date updated successfully');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update school admission date');
    } finally {
      setSubmitting(false);
    }
  };

  if (!student) return null;

  // Format class details
  const classInfo = student.className
    ? `${student.className}${student.sectionName ? ` (${student.sectionName})` : ''}`
    : (student.academic?.class?.name
        ? `Class ${student.academic.class.name}${student.academic.section?.name ? ` (${student.academic.section.name})` : ''}`
        : (student.enrollment?.class?.name
            ? `Class ${student.enrollment.class.name}${student.enrollment.section?.name ? ` (${student.enrollment.section.name})` : ''}`
            : ''));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Update School Admission Date"
      description="Modify the official school admission record date for this student."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Student Summary Box */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 text-sm">{student.name}</span>
            <Badge variant={student.status === 'ACTIVE' ? 'green' : 'gray'}>
              {student.status || 'ACTIVE'}
            </Badge>
          </div>
          <p className="text-slate-600">
            Admission No: <strong className="text-slate-800 font-mono">{student.admissionNo || 'N/A'}</strong>
            {classInfo && ` • ${classInfo}`}
          </p>
          <div className="pt-1 border-t border-slate-200/60 mt-1 flex items-center justify-between">
            <span className="text-slate-500 text-[11px]">Current Admission Date:</span>
            <span className="font-semibold text-indigo-700 font-mono text-xs">
              {formatDate(student.admissionDate || student.createdAt)}
            </span>
          </div>
        </div>

        {/* Date Constraints Guidance */}
        {maxDate && (
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start space-x-2 text-xs text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Maximum allowable admission date is <strong>{maxDate}</strong> ({maxReason}).
            </span>
          </div>
        )}

        {/* Date Picker Input */}
        <DatePicker
          label="New School Admission Date *"
          value={admissionDate}
          onChange={(val) => setAdmissionDate(val)}
          maxDate={maxDate || undefined}
          required
        />

        {/* Reason Input */}
        <Input
          label="Reason for Change (Optional)"
          placeholder="e.g., Corrected data entry typo, Official document update"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        {/* Informational Note */}
        <div className="p-2.5 bg-blue-50/60 rounded-lg border border-blue-100 flex items-start space-x-2 text-[11px] text-blue-700">
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
          <span>
            Updating the admission date updates official student records. Future monthly fee generations will take this date into account automatically.
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
