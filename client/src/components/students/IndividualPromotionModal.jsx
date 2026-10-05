import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Select } from '../ui/Select.jsx';
import { Alert } from '../ui/Alert.jsx';
import { Badge } from '../ui/Badge.jsx';
import { EnrollmentFields } from './EnrollmentFields.jsx';
import { studentService } from '../../services/student.service.js';
import { Input } from '../ui/Input.jsx';
import { DatePicker } from '../ui/DatePicker.jsx';
import { toast } from '../ui/Toast.jsx';
import {
  Sparkles,
  AlertTriangle,
  GraduationCap,
  RotateCcw,
  UserX,
  Building2,
  Home,
  Bed,
  CheckCircle2,
} from 'lucide-react';

export const IndividualPromotionModal = ({
  isOpen,
  onClose,
  student,
  sourceEnrollment,
  academicYears = [],
  classes = [],
  mediums = [],
  sections = [],
  streams = [],
  onSuccess,
}) => {
  const [action, setAction] = useState('PROMOTE'); // 'PROMOTE' | 'REPEAT' | 'GRADUATE' | 'LEFT'
  const [targetYearId, setTargetYearId] = useState('');
  const [enrollmentValues, setEnrollmentValues] = useState({
    classId: '',
    mediumId: '',
    sectionId: '',
    streamId: '',
    rollNumber: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const getTodayDateStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isHosteler = Boolean(student?.hostel?.enrolled || student?.hostel?.status === 'ACTIVE');
  const hostelInfo = student?.hostel;

  const [exitDate, setExitDate] = useState(getTodayDateStr());
  const [exitReason, setExitReason] = useState('');

  // 1. Sort active classes by order ascending
  const sortedClasses = useMemo(() => {
    return [...classes]
      .filter((c) => c.isActive !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [classes]);

  // 2. Identify source class & check if next class exists for promotion
  const sourceClass = sourceEnrollment?.class;

  const { nextClass, isPromoteAllowed } = useMemo(() => {
    if (!sourceClass || !sortedClasses.length) return { nextClass: null, isPromoteAllowed: false };
    const currentIndex = sortedClasses.findIndex(
      (c) => c.id === sourceClass.id || c.name === sourceClass.name
    );
    const hasNext = currentIndex !== -1 && currentIndex + 1 < sortedClasses.length;
    return {
      nextClass: hasNext ? sortedClasses[currentIndex + 1] : null,
      isPromoteAllowed: hasNext,
    };
  }, [sortedClasses, sourceClass]);

  // 3. Available actions list based on whether promotion is allowed
  const availableActions = useMemo(() => {
    if (isPromoteAllowed) {
      return [
        { id: 'PROMOTE', label: 'Promote', icon: Sparkles },
        { id: 'REPEAT', label: 'Repeat', icon: RotateCcw },
        { id: 'LEFT', label: 'Mark as Left', icon: UserX },
      ];
    } else {
      return [
        { id: 'GRADUATE', label: 'Graduate', icon: GraduationCap },
        { id: 'REPEAT', label: 'Repeat', icon: RotateCcw },
        { id: 'LEFT', label: 'Mark as Left', icon: UserX },
      ];
    }
  }, [isPromoteAllowed]);

  // 4. Filter valid FUTURE target academic years (excluding source year & locked years & past years)
  const validFutureYears = useMemo(() => {
    if (!sourceEnrollment?.academicYear) return [];
    const sourceYearName = sourceEnrollment.academicYear.name;
    const sourceStartDate = sourceEnrollment.academicYear.startDate
      ? new Date(sourceEnrollment.academicYear.startDate).getTime()
      : 0;

    return academicYears.filter((y) => {
      if (y.isLocked) return false;
      if (y.id === sourceEnrollment.academicYearId || y.name === sourceYearName) return false;
      const yStartDate = y.startDate ? new Date(y.startDate).getTime() : 0;
      if (yStartDate && sourceStartDate) {
        return yStartDate > sourceStartDate;
      }
      return y.name > sourceYearName;
    });
  }, [academicYears, sourceEnrollment]);

  // 5. Initialize & auto-select values when modal opens
  useEffect(() => {
    if (isOpen && sourceEnrollment) {
      const defaultYear = validFutureYears[0];
      setTargetYearId(defaultYear?.id || '');

      const initialAction = isPromoteAllowed ? 'PROMOTE' : 'GRADUATE';
      setAction(initialAction);
      setExitDate(getTodayDateStr());
      if (initialAction === 'GRADUATE') {
        setExitReason(isHosteler ? 'Graduated - Academic completion' : 'Academic course completion');
      } else if (initialAction === 'LEFT') {
        setExitReason(isHosteler ? 'Left school - Hostel exit' : 'Left school');
      } else {
        setExitReason('');
      }

      if (isPromoteAllowed) {
        setEnrollmentValues({
          classId: nextClass?.id || sourceEnrollment.classId || '',
          mediumId: sourceEnrollment.mediumId || '',
          sectionId: sourceEnrollment.sectionId || '',
          streamId: nextClass?.hasStream ? (sourceEnrollment.streamId || '') : '',
          rollNumber: '',
        });
      } else {
        setEnrollmentValues({
          classId: sourceEnrollment.classId || '',
          mediumId: sourceEnrollment.mediumId || '',
          sectionId: sourceEnrollment.sectionId || '',
          streamId: sourceEnrollment.streamId || '',
          rollNumber: '',
        });
      }
      setErrors({});
    }
  }, [isOpen, sourceEnrollment, validFutureYears, isPromoteAllowed, nextClass, isHosteler]);

  if (!student || !sourceEnrollment) return null;

  // Handle Action selection change
  const handleActionChange = (newAction) => {
    setAction(newAction);
    setErrors({});

    if (newAction === 'GRADUATE') {
      setExitReason(isHosteler ? 'Graduated - Academic completion' : 'Academic course completion');
    } else if (newAction === 'LEFT') {
      setExitReason(isHosteler ? 'Left school - Hostel exit' : 'Left school');
    }

    if (newAction === 'PROMOTE') {
      const targetCls = nextClass || sourceEnrollment.class;
      setEnrollmentValues((prev) => ({
        ...prev,
        classId: targetCls?.id || '',
        streamId: targetCls?.hasStream ? prev.streamId : '',
      }));
    } else if (newAction === 'REPEAT') {
      const targetCls = classes.find((c) => c.id === sourceEnrollment.classId) || sourceEnrollment.class;
      setEnrollmentValues((prev) => ({
        ...prev,
        classId: targetCls?.id || sourceEnrollment.classId || '',
        streamId: targetCls?.hasStream ? sourceEnrollment.streamId || '' : '',
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // Client-side validations for enrollment creation actions (PROMOTE, REPEAT)
    if (action === 'PROMOTE' || action === 'REPEAT') {
      if (!targetYearId) {
        setErrors((prev) => ({ ...prev, targetYearId: 'Target academic year is required' }));
        return;
      }
      if (!enrollmentValues.classId) {
        setErrors((prev) => ({ ...prev, classId: 'Target class is required' }));
        return;
      }
      if (!enrollmentValues.mediumId) {
        setErrors((prev) => ({ ...prev, mediumId: 'Medium is required' }));
        return;
      }

      const selectedClass = classes.find((c) => c.id === enrollmentValues.classId);
      if (selectedClass?.hasStream && !enrollmentValues.streamId) {
        setErrors((prev) => ({ ...prev, streamId: `Stream is required for class '${selectedClass.name}'` }));
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        action,
        sourceEnrollmentId: sourceEnrollment.id,
      };

      if (action === 'PROMOTE' || action === 'REPEAT') {
        const selectedClass = classes.find((c) => c.id === enrollmentValues.classId);
        payload.targetAcademicYearId = targetYearId;
        payload.classId = enrollmentValues.classId;
        payload.targetClassId = enrollmentValues.classId;
        payload.sectionId = enrollmentValues.sectionId || null;
        payload.targetSectionId = enrollmentValues.sectionId || null;
        payload.mediumId = enrollmentValues.mediumId;
        payload.targetMediumId = enrollmentValues.mediumId;
        payload.streamId = selectedClass?.hasStream ? enrollmentValues.streamId || null : null;
        payload.targetStreamId = selectedClass?.hasStream ? enrollmentValues.streamId || null : null;
        payload.rollNumber = enrollmentValues.rollNumber || null;
      }

      if (action === 'GRADUATE' || action === 'LEFT') {
        payload.exitDate = isHosteler ? exitDate : undefined;
        payload.reason = exitReason.trim() || undefined;
      }

      const res = await studentService.promoteStudent(student.id, payload);
      toast.success(res.message || 'Academic transition processed successfully');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to process academic transition');
      if (err.errors) setErrors(err.errors);
    } finally {
      setLoading(false);
    }
  };

  // Button labels and configurations
  const getButtonConfig = () => {
    switch (action) {
      case 'PROMOTE':
        return {
          text: 'Promote Student',
          loadingText: 'Promoting...',
          icon: Sparkles,
          disabled: validFutureYears.length === 0,
        };
      case 'REPEAT':
        return {
          text: 'Repeat Student',
          loadingText: 'Repeating...',
          icon: RotateCcw,
          disabled: validFutureYears.length === 0,
        };
      case 'GRADUATE':
        return {
          text: 'Graduate Student',
          loadingText: 'Graduating...',
          icon: GraduationCap,
          disabled: false,
        };
      case 'LEFT':
        return {
          text: 'Mark as Left',
          loadingText: 'Updating...',
          icon: UserX,
          disabled: false,
        };
      default:
        return {
          text: 'Submit',
          loadingText: 'Processing...',
          icon: Sparkles,
          disabled: false,
        };
    }
  };

  const buttonConfig = getButtonConfig();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Academic Transition — ${student.name}`}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>

          <Button
            type="submit"
            form="academic-transition-form"
            loading={loading}
            loadingText={buttonConfig.loadingText}
            disabled={loading || buttonConfig.disabled}
            icon={buttonConfig.icon}
          >
            {buttonConfig.text}
          </Button>
        </>
      }
    >
      <form id="academic-transition-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Warning if no future academic year is available for PROMOTE / REPEAT */}
        {(action === 'PROMOTE' || action === 'REPEAT') && validFutureYears.length === 0 && (
          <Alert variant="warning" icon={AlertTriangle} title="No Future Academic Year Available">
            Transition requires a future academic year (e.g. 2027-28). Please create the next academic year in{' '}
            <strong className="underline cursor-pointer" onClick={() => (window.location.href = '/app/academic-years')}>
              Academic Setup
            </strong>{' '}
            first.
          </Alert>
        )}

        {/* Current Student Source Record & Action Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div>
            <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block mb-1">
              Current Academic Record
            </span>
            <p className="font-bold text-slate-900 text-sm">{sourceEnrollment.academicYear?.name}</p>
            <p className="text-slate-700 font-medium">
              Class {sourceEnrollment.class?.name}{' '}
              {sourceEnrollment.section ? `• Section ${sourceEnrollment.section.name}` : ''}
            </p>
            <p className="text-slate-500">
              {sourceEnrollment.medium?.name}{' '}
              {sourceEnrollment.stream ? `• Stream ${sourceEnrollment.stream.name}` : ''}
            </p>
          </div>

          <div className="md:border-l md:border-slate-200 md:pl-4">
            <span className="font-bold text-indigo-600 uppercase text-[10px] tracking-wider block mb-1.5">
              Select Action
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {availableActions.map((act) => {
                const Icon = act.icon;
                const isSelected = action === act.id;
                return (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => handleActionChange(act.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {act.label}
                  </button>
                );
              })}
            </div>
            {!isPromoteAllowed && (
              <p className="text-[11px] text-amber-700 font-medium mt-2">
                Class {sourceEnrollment.class?.name} has no next higher class. Promote action is not applicable.
              </p>
            )}
          </div>
        </div>

        {/* Dynamic Action Forms */}

        {/* 1. PROMOTE Form */}
        {action === 'PROMOTE' && (
          <div className="space-y-4">
            <div>
              <Select
                label="Target Academic Year"
                required
                value={targetYearId}
                onChange={(e) => setTargetYearId(e.target.value)}
                error={errors.targetAcademicYearId || errors.targetYearId}
                helperText="Must be a future academic year relative to current record"
              >
                <option value="">-- Select Future Academic Year --</option>
                {validFutureYears.map((yr) => (
                  <option key={yr.id} value={yr.id}>
                    {yr.name} {yr.isCurrent ? '(Current Year)' : ''}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Target Enrollment Details
                </h4>
                {nextClass && (
                  <Badge variant="indigo" size="sm">
                    Auto-selected: Class {nextClass.name} (1 Class Higher)
                  </Badge>
                )}
              </div>

              <EnrollmentFields
                classes={classes}
                mediums={mediums}
                sections={sections}
                streams={streams}
                values={enrollmentValues}
                onChange={setEnrollmentValues}
                errors={errors}
                disabled={loading}
              />
            </div>
          </div>
        )}

        {/* 2. REPEAT Form */}
        {action === 'REPEAT' && (
          <div className="space-y-4">
            <div>
              <Select
                label="Target Academic Year"
                required
                value={targetYearId}
                onChange={(e) => setTargetYearId(e.target.value)}
                error={errors.targetAcademicYearId || errors.targetYearId}
                helperText="Must be a future academic year relative to current record"
              >
                <option value="">-- Select Future Academic Year --</option>
                {validFutureYears.map((yr) => (
                  <option key={yr.id} value={yr.id}>
                    {yr.name} {yr.isCurrent ? '(Current Year)' : ''}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Repeat Enrollment Details
                </h4>
                <Badge variant="warning" size="sm">
                  Repeating: Class {sourceClass?.name}
                </Badge>
              </div>

              <EnrollmentFields
                classes={classes}
                mediums={mediums}
                sections={sections}
                streams={streams}
                values={enrollmentValues}
                onChange={setEnrollmentValues}
                errors={errors}
                disabled={loading}
              />
            </div>
          </div>
        )}

        {/* 3. GRADUATE Confirmation */}
        {action === 'GRADUATE' && (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                <span>Confirm Graduation</span>
              </div>
              <p className="text-xs leading-relaxed text-blue-800">
                This student will be marked as <strong>Graduated</strong>. No new academic year enrollment will be created. Historical enrollment records will be preserved intact.
              </p>
            </div>

            {/* Residence Status Detection & Hostel Workflow Integration */}
            {isHosteler ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                        Hosteler Record Detected
                      </span>
                      <Badge variant="warning" size="xs">Active Resident</Badge>
                    </div>
                    <div className="text-xs text-slate-700 flex flex-wrap items-center gap-x-3 gap-y-1 font-medium">
                      {hostelInfo?.hostelName && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-amber-600" />
                          {hostelInfo.hostelName}
                        </span>
                      )}
                      {hostelInfo?.roomNumber && (
                        <span>Room: <strong>{hostelInfo.roomNumber}</strong></span>
                      )}
                      {hostelInfo?.bedNumber && (
                        <span className="flex items-center gap-1">
                          <Bed className="w-3.5 h-3.5 text-amber-600" />
                          Bed: <strong>{hostelInfo.bedNumber}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-amber-800 bg-white/80 border border-amber-200 rounded-lg p-2.5 space-y-1 leading-relaxed">
                  <p className="font-semibold flex items-center gap-1.5 text-amber-900">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Automated Hostel Exit will be processed
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Graduation will automatically exit this student from the hostel, release <strong>Bed {hostelInfo?.bedNumber || ''}</strong> to available room inventory, and update their residence status to <strong>Day Scholar</strong>.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <DatePicker
                    label="Hostel Exit Date"
                    value={exitDate}
                    onChange={(e, val) => setExitDate(typeof e === 'string' ? e : (val || e?.target?.value || ''))}
                    minDate={hostelInfo?.startDate ? new Date(hostelInfo.startDate) : undefined}
                    size="sm"
                    required
                    disabled={loading}
                    helperText="Effective date when bed is released"
                  />
                  <Input
                    label="Hostel Exit Reason"
                    placeholder="e.g. Course completion"
                    value={exitReason}
                    onChange={(e) => setExitReason(e.target.value)}
                    size="sm"
                    disabled={loading}
                    helperText="Recorded in student & hostel exit logs"
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                  <Home className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Residence: Day Scholar</span>
                    <Badge variant="neutral" size="xs">Non-Hosteler</Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Student is not enrolled in hostel accommodation. Graduation proceeds with no hostel action.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. LEFT Confirmation */}
        {action === 'LEFT' && (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <UserX className="w-5 h-5 text-amber-600" />
                <span>Confirm Left School</span>
              </div>
              <p className="text-xs leading-relaxed text-amber-800">
                This student will be marked as <strong>Left</strong>. Historical academic records will remain available for reference.
              </p>
            </div>

            {/* Residence Status Detection & Hostel Workflow Integration */}
            {isHosteler ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                        Hosteler Record Detected
                      </span>
                      <Badge variant="warning" size="xs">Active Resident</Badge>
                    </div>
                    <div className="text-xs text-slate-700 flex flex-wrap items-center gap-x-3 gap-y-1 font-medium">
                      {hostelInfo?.hostelName && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-amber-600" />
                          {hostelInfo.hostelName}
                        </span>
                      )}
                      {hostelInfo?.roomNumber && (
                        <span>Room: <strong>{hostelInfo.roomNumber}</strong></span>
                      )}
                      {hostelInfo?.bedNumber && (
                        <span className="flex items-center gap-1">
                          <Bed className="w-3.5 h-3.5 text-amber-600" />
                          Bed: <strong>{hostelInfo.bedNumber}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-amber-800 bg-white/80 border border-amber-200 rounded-lg p-2.5 space-y-1 leading-relaxed">
                  <p className="font-semibold flex items-center gap-1.5 text-amber-900">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Automated Hostel Exit will be processed
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Marking student as <strong>Left</strong> will automatically exit their hostel enrollment, release <strong>Bed {hostelInfo?.bedNumber || ''}</strong> to available inventory, and update their residence status to <strong>Day Scholar</strong>.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <DatePicker
                    label="Hostel Exit Date"
                    value={exitDate}
                    onChange={(e, val) => setExitDate(typeof e === 'string' ? e : (val || e?.target?.value || ''))}
                    minDate={hostelInfo?.startDate ? new Date(hostelInfo.startDate) : undefined}
                    size="sm"
                    required
                    disabled={loading}
                    helperText="Effective date when bed is released"
                  />
                  <Input
                    label="Hostel Exit Reason"
                    placeholder="e.g. Left school"
                    value={exitReason}
                    onChange={(e) => setExitReason(e.target.value)}
                    size="sm"
                    disabled={loading}
                    helperText="Recorded in student & hostel exit logs"
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                  <Home className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Residence: Day Scholar</span>
                    <Badge variant="neutral" size="xs">Non-Hosteler</Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Student is not enrolled in hostel accommodation. Marking as Left proceeds with no hostel action.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
};
