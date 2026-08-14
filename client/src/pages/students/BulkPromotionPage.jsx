import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Users, AlertTriangle, CheckCircle2, UserCheck, ArrowRight } from 'lucide-react';
import { useAcademicYear } from '../../hooks/useAcademicYear.js';
import { studentService } from '../../services/student.service.js';
import { academicService } from '../../services/academic.service.js';
import { Button } from '../../components/ui/Button.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Card, CardHeader, CardContent } from '../../components/ui/Card.jsx';
import { Checkbox } from '../../components/ui/Checkbox.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { StudentAvatar } from '../../components/students/StudentAvatar.jsx';
import { toast } from '../../components/ui/Toast.jsx';
import { ModulePageHeader } from '../../components/ui/ModulePageHeader.jsx';
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from '../../components/ui/Table.jsx';

const isClassX = (cls) => {
  if (!cls) return false;
  const name = String(cls.name || '').trim().toUpperCase();
  const code = String(cls.code || '').trim().toUpperCase();
  return name === 'X' || name === '10' || code === 'X' || code === '10';
};

export const BulkPromotionPage = () => {
  const navigate = useNavigate();
  const { academicYears, selectedYearId, setSelectedYearId } = useAcademicYear();

  // Setup options
  const [classes, setClasses] = useState([]);
  const [mediums, setMediums] = useState([]);
  const [sections, setSections] = useState([]);
  const [streams, setStreams] = useState([]);

  // Source Selection States
  const [sourceYearId, setSourceYearId] = useState(selectedYearId || '');
  const [sourceClassId, setSourceClassId] = useState('');
  const [sourceSectionId, setSourceSectionId] = useState('');

  // Loaded Source Students (Active Only)
  const [sourceStudents, setSourceStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // Target Selection States
  const [targetYearId, setTargetYearId] = useState('');
  const [targetClassId, setTargetClassId] = useState('');

  // Modal / Confirm / Result States
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [promotionResult, setPromotionResult] = useState(null);

  // 1. Fetch Setup Options Once
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [clsRes, secRes, medRes, strRes] = await Promise.all([
          academicService.getClasses(),
          academicService.getSections(),
          academicService.getMediums(),
          academicService.getStreams(),
        ]);
        if (clsRes.success) setClasses(clsRes.data || []);
        if (secRes.success) setSections(secRes.data || []);
        if (medRes.success) setMediums(medRes.data || []);
        if (strRes.success) setStreams(strRes.data || []);
      } catch (err) {
        toast.error('Failed loading academic configuration');
      }
    };
    fetchOptions();
  }, []);

  // Sorted classes by order ascending
  const sortedClasses = useMemo(() => {
    return [...classes]
      .filter((c) => c.isActive !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [classes]);

  // Source Class entity
  const sourceClass = useMemo(() => {
    return classes.find((c) => c.id === sourceClassId);
  }, [classes, sourceClassId]);

  // Is Class X restriction check (Requirement 11)
  const isSourceClassX = useMemo(() => {
    return isClassX(sourceClass);
  }, [sourceClass]);

  // Target Class calculation (Automatic 1 class higher based on Class.order)
  const { targetClass, isTerminalClass } = useMemo(() => {
    if (!sourceClass || !sortedClasses.length) return { targetClass: null, isTerminalClass: false };
    const currentIndex = sortedClasses.findIndex((c) => c.id === sourceClass.id);
    if (currentIndex === -1) return { targetClass: null, isTerminalClass: false };
    const hasNext = currentIndex + 1 < sortedClasses.length;
    return {
      targetClass: hasNext ? sortedClasses[currentIndex + 1] : null,
      isTerminalClass: !hasNext,
    };
  }, [sourceClass, sortedClasses]);

  // Auto-set targetClassId whenever targetClass changes
  useEffect(() => {
    if (targetClass) {
      setTargetClassId(targetClass.id);
    } else {
      setTargetClassId('');
    }
  }, [targetClass]);

  // Valid FUTURE target academic years
  const validFutureYears = useMemo(() => {
    if (!sourceYearId || !academicYears.length) return [];
    const sourceYr = academicYears.find((y) => y.id === sourceYearId);
    if (!sourceYr) return [];
    const sourceStartDate = sourceYr.startDate ? new Date(sourceYr.startDate).getTime() : 0;

    return academicYears.filter((y) => {
      if (y.isLocked) return false;
      if (y.id === sourceYearId || y.name === sourceYr.name) return false;
      const yStartDate = y.startDate ? new Date(y.startDate).getTime() : 0;
      if (yStartDate && sourceStartDate) {
        return yStartDate > sourceStartDate;
      }
      return y.name > sourceYr.name;
    });
  }, [academicYears, sourceYearId]);

  // Auto-select target academic year (1 year ahead)
  useEffect(() => {
    if (validFutureYears.length > 0) {
      setTargetYearId(validFutureYears[0].id);
    } else {
      setTargetYearId('');
    }
  }, [validFutureYears]);

  // 2. Fetch Eligible Active Students when sourceYearId or sourceClassId changes
  useEffect(() => {
    const fetchSourceStudents = async () => {
      if (!sourceYearId || !sourceClassId) {
        setSourceStudents([]);
        setSelectedStudentIds([]);
        return;
      }
      setLoadingStudents(true);
      try {
        const res = await studentService.getStudents({
          academicYearId: sourceYearId,
          classId: sourceClassId,
          sectionId: sourceSectionId || undefined,
          status: 'ACTIVE', // REQUIREMENT 6: Only ACTIVE status eligible
          limit: 300,
        });
        if (res.success) {
          const list = res.data || [];
          setSourceStudents(list);
          setSelectedStudentIds(list.map((s) => s.id));
        }
      } catch (err) {
        toast.error(err.message || 'Failed loading source students');
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchSourceStudents();
  }, [sourceYearId, sourceClassId, sourceSectionId]);

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedStudentIds(sourceStudents.map((s) => s.id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleToggleStudent = (studentId) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const handleOpenPreview = () => {
    if (selectedStudentIds.length === 0) {
      toast.error('Select at least one student to promote');
      return;
    }
    if (!targetYearId) {
      toast.error('Target academic year is required');
      return;
    }
    if (isSourceClassX) {
      toast.error('Class X students must be promoted individually.');
      return;
    }
    if (isTerminalClass) {
      toast.error('This is the terminal class. Students cannot be promoted to another class.');
      return;
    }

    setIsPreviewOpen(true);
  };

  const handleExecuteBulkPromotion = async () => {
    setSubmitting(true);
    try {
      const selectedStudentsList = sourceStudents.filter((s) => selectedStudentIds.includes(s.id));
      
      const studentsPayload = selectedStudentsList.map((s) => ({
        studentId: s.id,
        sourceEnrollmentId: s.enrollment.id,
        classId: targetClassId,
        mediumId: s.enrollment?.medium?.id,
        sectionId: s.enrollment?.section?.id || null,
        streamId: targetClass?.hasStream ? (s.enrollment?.stream?.id || null) : null,
        action: 'PROMOTE',
      }));

      const payload = {
        sourceAcademicYearId: sourceYearId,
        targetAcademicYearId: targetYearId,
        sourceClassId,
        students: studentsPayload,
      };

      const res = await studentService.bulkPromoteStudents(payload);
      const count = res.data?.promotedCount || selectedStudentIds.length;
      toast.success(`${count} students promoted successfully.`);

      setPromotionResult({
        count,
        sourceClassName: sourceClass?.name,
        targetClassName: targetClass?.name,
        targetYearName: academicYears.find((y) => y.id === targetYearId)?.name,
      });

      if (targetYearId) {
        setSelectedYearId(targetYearId);
      }
    } catch (err) {
      toast.error(err.message || 'Bulk promotion failed');
    } finally {
      setSubmitting(false);
      setIsPreviewOpen(false);
    }
  };

  const isAllSelected =
    sourceStudents.length > 0 && selectedStudentIds.length === sourceStudents.length;

  const targetAcademicYearName = useMemo(() => {
    return academicYears.find((y) => y.id === targetYearId)?.name || 'Next Academic Year';
  }, [academicYears, targetYearId]);

  // Selected students array for preview
  const selectedStudentsForPreview = useMemo(() => {
    return sourceStudents.filter((s) => selectedStudentIds.includes(s.id));
  }, [sourceStudents, selectedStudentIds]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Standardized Module Page Header */}
      <ModulePageHeader
        icon={Sparkles}
        title="Student Promotion"
        description="Controlled bulk promotion of active students to the next academic year."
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={ArrowLeft}
            onClick={() => navigate('/app/students')}
          >
            Back to Students List
          </Button>
        }
      />

      {/* Success State Banner after Promotion */}
      {promotionResult && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-emerald-900">
                {promotionResult.count} students promoted successfully.
              </h3>
              <p className="text-xs text-emerald-700 mt-1">
                Promoted from Class {promotionResult.sourceClassName} to Class {promotionResult.targetClassName} for Academic Year {promotionResult.targetYearName}.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/app/students')}
              >
                View Promoted Students
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPromotionResult(null);
                  setSourceClassId('');
                  setSourceStudents([]);
                  setSelectedStudentIds([]);
                }}
              >
                Promote Another Class
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {validFutureYears.length === 0 && sourceYearId && !promotionResult && (
        <Alert variant="warning" icon={AlertTriangle} title="No Target Academic Year Available">
          Promotion requires a future academic year relative to source year. Please create the next academic year (e.g. 2026-27) in{' '}
          <strong className="underline cursor-pointer" onClick={() => navigate('/app/academic-years')}>
            Academic Setup
          </strong>{' '}
          first.
        </Alert>
      )}

      {!promotionResult && (
        <>
          {/* Step 1. Source Class & Year Controls */}
          <Card>
            <CardHeader title="Select Source Academic Year & Class" subtitle="Choose class to promote students from" />
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select
                  label="Academic Year"
                  required
                  value={sourceYearId}
                  onChange={(e) => setSourceYearId(e.target.value)}
                >
                  <option value="">-- Select Academic Year --</option>
                  {academicYears.map((yr) => (
                    <option key={yr.id} value={yr.id}>
                      {yr.name} {yr.isCurrent ? '(Current)' : ''}
                    </option>
                  ))}
                </Select>

                <Select
                  label="Class"
                  required
                  value={sourceClassId}
                  onChange={(e) => setSourceClassId(e.target.value)}
                >
                  <option value="">-- Select Class --</option>
                  {sortedClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      Class {c.name}
                    </option>
                  ))}
                </Select>

                <Select
                  label="Section (Optional)"
                  value={sourceSectionId}
                  onChange={(e) => setSourceSectionId(e.target.value)}
                >
                  <option value="">All Sections</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      Section {s.name}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Automatic Target Resolution Summary Badge */}
              {sourceClass && !isSourceClassX && !isTerminalClass && (
                <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-indigo-900 block">Target Placement:</span>
                    <span className="text-slate-600">
                      {targetAcademicYearName} • Class <strong>{targetClass?.name}</strong> (Auto-determined)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="indigo" size="sm">Medium: Preserved</Badge>
                    <Badge variant="indigo" size="sm">Section: Preserved</Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* REQUIREMENT 11 & 35: Class X Restriction Banner */}
          {isSourceClassX && (
            <Alert variant="warning" icon={AlertTriangle} title="Bulk Promotion Restricted for Class X">
              Bulk promotion is not available for Class X. Students must be promoted individually with the target class, medium, stream and section.
              <div className="mt-3">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/app/students')}
                >
                  Individual Promotion
                </Button>
              </div>
            </Alert>
          )}

          {/* REQUIREMENT 30: Terminal Class Restriction Banner */}
          {isTerminalClass && sourceClass && !isSourceClassX && (
            <Alert variant="warning" icon={AlertTriangle} title="Terminal Class">
              This is the terminal class. Students cannot be promoted to another class.
            </Alert>
          )}

          {/* Step 2. Selectable Student Checklist */}
          {sourceClassId && !isSourceClassX && !isTerminalClass && (
            <Card>
              <CardHeader
                title="Review Eligible Students"
                subtitle={
                  loadingStudents
                    ? 'Loading eligible active students...'
                    : `${sourceStudents.length} eligible active student(s) found.`
                }
                action={
                  sourceStudents.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        label="Select All"
                        checked={isAllSelected}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </div>
                  )
                }
              />
              <CardContent>
                {loadingStudents ? (
                  <div className="space-y-2 p-4">
                    <Skeleton height="35px" width="100%" />
                    <Skeleton height="35px" width="100%" />
                    <Skeleton height="35px" width="100%" />
                  </div>
                ) : sourceStudents.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="No eligible active students found"
                    description="Only students with ACTIVE status are eligible for bulk promotion."
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-1">
                    {sourceStudents.map((item) => {
                      const isSelected = selectedStudentIds.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleToggleStudent(item.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 select-none ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-50/40 shadow-2xs'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <Checkbox checked={isSelected} readOnly />
                          <StudentAvatar name={item.name} photoUrl={item.photoUrl} size="sm" />
                          <div className="truncate flex-1">
                            <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              Adm: {item.admissionNo} {item.enrollment?.section ? `• Sec ${item.enrollment.section.name}` : ''}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Promotion Action Toolbar */}
          {sourceClassId && !isSourceClassX && !isTerminalClass && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <Button variant="outline" onClick={() => navigate('/app/students')}>
                Cancel
              </Button>

              <Button
                variant="primary"
                onClick={handleOpenPreview}
                disabled={selectedStudentIds.length === 0 || submitting || validFutureYears.length === 0}
                icon={Sparkles}
              >
                Review Promotion ({selectedStudentIds.length})
              </Button>
            </div>
          )}
        </>
      )}

      {/* REQUIREMENT 17 & 37: Bulk Promotion Preview Modal */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Promotion Preview"
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleExecuteBulkPromotion}
              loading={submitting}
              loadingText="Executing Promotion..."
              icon={Sparkles}
            >
              Confirm Promotion
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          {/* Summary Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-slate-400 block font-bold text-[10px] uppercase">From</span>
              <span className="font-bold text-slate-900">
                {academicYears.find((y) => y.id === sourceYearId)?.name} → Class {sourceClass?.name}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-bold text-[10px] uppercase">To</span>
              <span className="font-bold text-indigo-700">
                {targetAcademicYearName} → Class {targetClass?.name}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-bold text-[10px] uppercase">Students Count</span>
              <span className="font-bold text-slate-900">
                {selectedStudentIds.length} Selected / {sourceStudents.length} Eligible
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-bold text-[10px] uppercase">Settings</span>
              <span className="font-semibold text-slate-700">Medium & Section Preserved</span>
            </div>
          </div>

          {/* Student Table Preview */}
          <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Current Class</TableHead>
                  <TableHead>Target Class</TableHead>
                  <TableHead>Medium</TableHead>
                  <TableHead>Section</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedStudentsForPreview.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-bold text-slate-900">{s.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{s.admissionNo}</div>
                    </TableCell>
                    <TableCell>Class {sourceClass?.name}</TableCell>
                    <TableCell className="font-bold text-indigo-700">Class {targetClass?.name}</TableCell>
                    <TableCell>{s.enrollment?.medium?.name || 'Preserved'}</TableCell>
                    <TableCell>{s.enrollment?.section?.name ? `Section ${s.enrollment.section.name}` : 'Same Section'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </Modal>
    </div>
  );
};
