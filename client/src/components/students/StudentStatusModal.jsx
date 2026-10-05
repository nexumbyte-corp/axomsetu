import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';
import { DatePicker } from '../ui/DatePicker.jsx';
import { Badge } from '../ui/Badge.jsx';
import { StudentAvatar } from './StudentAvatar.jsx';
import { studentService } from '../../services/student.service.js';
import { formatDate, getISTTodayString } from '../../utils/formatters.js';
import {
  Building2,
  UserX,
  UserCheck,
  GraduationCap,
  Home,
  Bed,
  ArrowRight,
  LogOut,
  Calendar,
} from 'lucide-react';

export const StudentStatusModal = ({
  isOpen,
  onClose,
  onConfirm,
  student,
  targetStatus,
  loading = false,
}) => {
  const [exitDate, setExitDate] = useState(() => getISTTodayString() || '');
  const [reason, setReason] = useState('');
  const [fetchedHostel, setFetchedHostel] = useState(null);

  // Determine if student is registered as Hosteler or Day Scholar
  const isHosteler = Boolean(
    student?.hostel?.enrolled ||
    student?.hostel?.status === 'ACTIVE' ||
    fetchedHostel?.status === 'ACTIVE'
  );

  const isExitWorkflow = targetStatus === 'LEFT' || targetStatus === 'GRADUATED';

  // If student is marked as hosteler but startDate is missing, fetch full student details
  useEffect(() => {
    let isCancelled = false;
    if (isOpen && student?.id && isHosteler && !student?.hostel?.startDate) {
      studentService
        .getStudent(student.id)
        .then((res) => {
          if (!isCancelled && res?.data?.hostel) {
            setFetchedHostel(res.data.hostel);
          }
        })
        .catch(() => {});
    } else if (!isOpen) {
      setFetchedHostel(null);
    }
    return () => {
      isCancelled = true;
    };
  }, [isOpen, student?.id, isHosteler, student?.hostel?.startDate]);

  const effectiveHostel = {
    ...(student?.hostel || {}),
    ...(fetchedHostel || {}),
  };
  const hostelStartDate = effectiveHostel?.startDate || student?.hostel?.startDate || null;

  // Initialize form state when modal opens
  useEffect(() => {
    if (isOpen) {
      const today = getISTTodayString() || '';
      setExitDate(today);

      if (targetStatus === 'GRADUATED') {
        setReason(isHosteler ? 'Graduated - Academic course completion' : 'Academic course completion');
      } else if (targetStatus === 'LEFT') {
        setReason(isHosteler ? 'Left school - Hostel exit' : 'Left school');
      } else {
        setReason('');
      }
    }
  }, [isOpen, targetStatus, isHosteler]);

  // Ensure exitDate is not earlier than resolved hostel admission start date
  useEffect(() => {
    if (isOpen && hostelStartDate) {
      const startIso = typeof hostelStartDate === 'string' ? hostelStartDate.split('T')[0] : '';
      if (startIso && exitDate && exitDate < startIso) {
        setExitDate(startIso);
      }
    }
  }, [isOpen, hostelStartDate, exitDate]);

  if (!isOpen || !student || !targetStatus) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({
      status: targetStatus,
      exitDate: isHosteler && isExitWorkflow ? exitDate : undefined,
      reason: reason.trim() || undefined,
    });
  };

  const handleExitDateChange = (e, val) => {
    const chosen = typeof e === 'string' ? e : (val || e?.target?.value || '');
    setExitDate(chosen);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success" size="sm" icon={UserCheck}>ACTIVE</Badge>;
      case 'LEFT':
        return <Badge variant="danger" size="sm" icon={UserX}>LEFT</Badge>;
      case 'GRADUATED':
        return <Badge variant="primary" size="sm" icon={GraduationCap}>GRADUATED</Badge>;
      case 'ARCHIVED':
        return <Badge variant="neutral" size="sm">ARCHIVED</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  const currentAcademic = student.enrollment || student.academic;
  const minExitDate = hostelStartDate ? new Date(hostelStartDate) : undefined;

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? undefined : onClose}
      title="Change Student Status"
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={targetStatus === 'LEFT' ? 'danger' : 'primary'}
            size="sm"
            type="submit"
            form="student-status-form"
            loading={loading}
            loadingText="Processing..."
            icon={
              isHosteler && isExitWorkflow
                ? LogOut
                : targetStatus === 'LEFT'
                  ? UserX
                  : targetStatus === 'GRADUATED'
                    ? GraduationCap
                    : UserCheck
            }
          >
            {isHosteler && isExitWorkflow
              ? `Confirm Hostel Exit & Set ${targetStatus}`
              : `Confirm Status: ${targetStatus}`}
          </Button>
        </div>
      }
    >
      <form id="student-status-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Student Profile & Status Transition Card */}
        <div className="rounded-2xl border border-slate-200/90 bg-linear-to-r from-slate-50 via-white to-slate-50/60 p-4 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left: Avatar + Details */}
            <div className="flex items-center gap-3.5 min-w-0">
              <StudentAvatar
                name={student.name}
                photoUrl={student.photoUrl}
                size="lg"
                className="shrink-0 ring-2 ring-white shadow-xs"
              />
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900 truncate tracking-tight">
                    {student.name}
                  </h3>
                  <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 shadow-2xs">
                    Adm: {student.admissionNo}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium flex-wrap">
                  {currentAcademic?.class?.name && (
                    <span className="text-slate-700">
                      Class <strong>{currentAcademic.class.name}</strong>
                      {currentAcademic.section?.name ? ` • Sec ${currentAcademic.section.name}` : ''}
                    </span>
                  )}
                  {currentAcademic?.medium?.name && (
                    <span>• {currentAcademic.medium.name}</span>
                  )}
                  {currentAcademic?.academicYear?.name && (
                    <span className="text-slate-400">({currentAcademic.academicYear.name})</span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Status Flow Visualizer */}
            <div className="shrink-0 p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center gap-2.5">
              <div className="text-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Current
                </span>
                {getStatusBadge(student.status)}
              </div>

              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-400">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>

              <div className="text-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  New Status
                </span>
                {getStatusBadge(targetStatus)}
              </div>
            </div>
          </div>
        </div>

        {/* Residence Status Detection & Hostel Workflow Integration */}
        {isHosteler ? (
          <div className="rounded-2xl border border-amber-200 bg-linear-to-br from-amber-50/70 via-white to-amber-50/30 p-4 sm:p-5 shadow-xs space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Hostel Accommodation
                </h4>
              </div>

              <Badge variant="warning" size="sm" icon={Building2}>
                Hosteler
              </Badge>
            </div>

            {/* Current Allocation Chips Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded-xl bg-white border border-amber-200/80 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Hostel Facility
                </span>
                <span className="text-xs font-bold text-slate-800 truncate block mt-0.5" title={effectiveHostel?.hostelName}>
                  {effectiveHostel?.hostelName || '—'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-amber-200/80 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Room
                </span>
                <span className="text-xs font-bold text-slate-800 block mt-0.5">
                  Room {effectiveHostel?.roomNumber || '—'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-amber-200/80 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Bed Allocated
                </span>
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  <Bed className="w-3 h-3 text-amber-600" />
                  Bed {effectiveHostel?.bedNumber || '—'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-amber-200/80 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Admitted On
                </span>
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {hostelStartDate ? formatDate(hostelStartDate) : '—'}
                </span>
              </div>
            </div>

            {isExitWorkflow && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <DatePicker
                  label="Hostel Exit Date"
                  value={exitDate}
                  onChange={handleExitDateChange}
                  minDate={minExitDate}
                  size="sm"
                  required
                  disabled={loading}
                />
                <Input
                  label="Hostel Exit Reason"
                  placeholder="e.g. Left school, graduated"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  size="sm"
                  disabled={loading}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-linear-to-br from-slate-50 via-white to-slate-50/50 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                  <Home className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-semibold text-slate-800">
                  Day Scholar
                </h4>
              </div>

              <Badge variant="neutral" size="sm" icon={Home}>
                Day Scholar
              </Badge>
            </div>

            {isExitWorkflow && (
              <div className="pt-1">
                <Input
                  label="Status Change Remarks (Optional)"
                  placeholder="e.g. Relocated, personal reasons"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  size="sm"
                  disabled={loading}
                />
              </div>
            )}
          </div>
        )}

        {targetStatus === 'ACTIVE' && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-900 flex items-center gap-2 shadow-2xs">
            <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Student will be reactivated as a <strong>Day Scholar</strong>.</span>
          </div>
        )}
      </form>
    </Modal>
  );
};
