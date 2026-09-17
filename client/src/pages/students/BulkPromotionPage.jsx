import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  Users,
  AlertTriangle,
  CheckCircle2,
  Search,
  ArrowRight,
} from 'lucide-react';
import { useAcademicYear } from '../../hooks/useAcademicYear.js';
import { studentService } from '../../services/student.service.js';
import { academicService } from '../../services/academic.service.js';
import { Button } from '../../components/ui/Button.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Card, CardContent } from '../../components/ui/Card.jsx';
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
  const [sections, setSections] = useState([]);

  // Source Selection States
  const [sourceYearId, setSourceYearId] = useState(selectedYearId || '');
  const [sourceClassId, setSourceClassId] = useState('');
  const [sourceSectionId, setSourceSectionId] = useState('');

  // Loaded Source Students (Active Only)
  const [sourceStudents, setSourceStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');

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
      } catch {
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

  // Is Class X restriction check
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
        setStudentSearch('');
        return;
      }
      setLoadingStudents(true);
      try {
        const res = await studentService.getStudents({
          academicYearId: sourceYearId,
          classId: sourceClassId,
          sectionId: sourceSectionId || undefined,
          status: 'ACTIVE',
          limit: 300,
        });
        if (res.success) {
          const list = res.data || [];
          setSourceStudents(list);
          setSelectedStudentIds(list.map((s) => s.id));
        }
      } catch (err) {
        toast.error(err?.message || 'Failed loading source students');
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchSourceStudents();
  }, [sourceYearId, sourceClassId, sourceSectionId]);

  // Filtered students based on search term
  const filteredSourceStudents = useMemo(() => {
    if (!studentSearch.trim()) return sourceStudents;
    const q = studentSearch.trim().toLowerCase();
    return sourceStudents.filter((s) => {
      return (
        s.name?.toLowerCase().includes(q) ||
        s.admissionNo?.toLowerCase().includes(q) ||
        String(s.enrollment?.rollNumber || '').includes(q)
      );
    });
  }, [sourceStudents, studentSearch]);

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
      toast.error(err?.message || 'Bulk promotion failed');
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

  const sourceAcademicYearName = useMemo(() => {
    return academicYears.find((y) => y.id === sourceYearId)?.name || 'Current Academic Year';
  }, [academicYears, sourceYearId]);

  // Selected students array for preview
  const selectedStudentsForPreview = useMemo(() => {
    return sourceStudents.filter((s) => selectedStudentIds.includes(s.id));
  }, [sourceStudents, selectedStudentIds]);

  return (
    <div className="w-full space-y-3">
      {/* Standardized Module Page Header */}
      <ModulePageHeader
        icon={Sparkles}
        title="Student Bulk Promotion"
        description="Efficiently promote active students from one academic year to the next."
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={ArrowLeft}
            onClick={() => navigate('/app/students')}
            className="h-7 text-xs px-2.5"
          >
            Back to Students
          </Button>
        }
      />

      {/* Success State Banner after Promotion */}
      {promotionResult && (
        <Card className="border-emerald-200 bg-emerald-50/50 shadow-2xs">
          <CardContent className="p-4 text-center space-y-2.5">
            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-900">
                {promotionResult.count} Students Promoted Successfully
              </h3>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Promoted from <strong>Class {promotionResult.sourceClassName}</strong> to{' '}
                <strong>Class {promotionResult.targetClassName}</strong> for Academic Year{' '}
                <strong>{promotionResult.targetYearName}</strong>.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/app/students')}
                className="h-7 text-xs px-3"
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
                className="h-7 text-xs px-3"
              >
                Promote Another Class
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {validFutureYears.length === 0 && sourceYearId && !promotionResult && (
        <Alert variant="warning" icon={AlertTriangle} title="No Target Academic Year Available">
          Promotion requires a future academic year relative to the source year. Please create the next academic year (e.g. 2026-27) in{' '}
          <strong className="underline cursor-pointer" onClick={() => navigate('/app/academic-years')}>
            Academic Setup
          </strong>{' '}
          first.
        </Alert>
      )}

      {!promotionResult && (
        <>
          {/* Step 1. Academic Parameters Card */}
          <Card className="shadow-2xs">
            <div className="px-3.5 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900">1. Academic Parameters & Class Mapping</h3>
                <p className="text-[11px] text-slate-500">Select source year and class. Target class and next year are auto-calculated.</p>
              </div>
            </div>
            <CardContent className="p-3 space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                <Select
                  label="Source Academic Year"
                  size="sm"
                  required
                  value={sourceYearId}
                  onChange={(e) => setSourceYearId(e.target.value)}
                >
                  <option value="">-- Select Year --</option>
                  {academicYears.map((yr) => (
                    <option key={yr.id} value={yr.id}>
                      {yr.name} {yr.isCurrent ? '(Current)' : ''}
                    </option>
                  ))}
                </Select>

                <Select
                  label="Source Class"
                  size="sm"
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
                  size="sm"
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

                <Select
                  label="Target Academic Year"
                  size="sm"
                  required
                  value={targetYearId}
                  onChange={(e) => setTargetYearId(e.target.value)}
                  disabled={validFutureYears.length === 0}
                >
                  <option value="">-- Select Target Year --</option>
                  {validFutureYears.map((yr) => (
                    <option key={yr.id} value={yr.id}>
                      {yr.name}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Automatic Target Resolution Banner */}
              {sourceClass && !isSourceClassX && !isTerminalClass && (
                <div className="p-2 px-3 rounded-lg bg-indigo-50/70 border border-indigo-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-800">
                    <span className="font-semibold text-slate-500 text-[11px]">Class Mapping:</span>
                    <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                      Class {sourceClass.name} ({sourceAcademicYearName})
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded border border-indigo-200 text-[11px]">
                      Class {targetClass?.name} ({targetAcademicYearName})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="inline-block text-[10px] font-semibold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                      Medium: Preserved
                    </span>
                    <span className="inline-block text-[10px] font-semibold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                      Section: Preserved
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Class X Restriction Banner */}
          {isSourceClassX && (
            <Alert variant="warning" icon={AlertTriangle} title="Bulk Promotion Restricted for Class X">
              Bulk promotion is not available for Class X. Students must be promoted individually.
              <div className="mt-1.5">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/app/students')}
                  className="h-7 text-xs px-2.5"
                >
                  Go to Individual Promotion
                </Button>
              </div>
            </Alert>
          )}

          {/* Terminal Class Restriction Banner */}
          {isTerminalClass && sourceClass && !isSourceClassX && (
            <Alert variant="warning" icon={AlertTriangle} title="Terminal Class Reached">
              Class {sourceClass.name} is the highest terminal class in school configuration. Students cannot be promoted to a higher class.
            </Alert>
          )}

          {/* Step 2. Selectable Student Checklist */}
          {sourceClassId && !isSourceClassX && !isTerminalClass && (
            <Card className="shadow-2xs">
              <div className="px-3.5 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">2. Review & Select Eligible Students</h3>
                  <p className="text-[11px] text-slate-500">
                    {loadingStudents
                      ? 'Loading eligible active students...'
                      : `${sourceStudents.length} eligible active student(s) found in Class ${sourceClass?.name}.`}
                  </p>
                </div>

                {sourceStudents.length > 0 && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => handleSelectAll(!isAllSelected)}
                      className="text-[11px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-semibold h-7 px-2"
                    >
                      {isAllSelected ? 'Deselect All' : 'Select All'}
                    </Button>
                    <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                      {selectedStudentIds.length} / {sourceStudents.length} Selected
                    </span>
                  </div>
                )}
              </div>

              <CardContent className="p-3 space-y-2">
                {/* Search Bar */}
                {sourceStudents.length > 0 && (
                  <div className="w-full sm:w-64">
                    <Input
                      placeholder="Search student by name or adm no..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      icon={Search}
                      size="sm"
                      className="h-7 text-xs placeholder:text-slate-400 rounded-lg bg-slate-50/60 border-slate-200 focus:bg-white"
                    />
                  </div>
                )}

                {loadingStudents ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    <Skeleton height="38px" width="100%" />
                    <Skeleton height="38px" width="100%" />
                    <Skeleton height="38px" width="100%" />
                    <Skeleton height="38px" width="100%" />
                  </div>
                ) : sourceStudents.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="No active students found"
                    description="Only students with ACTIVE status in this class are eligible for bulk promotion."
                  />
                ) : filteredSourceStudents.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-500">
                    No students match search term "<strong className="text-slate-800">{studentSearch}</strong>"
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5 max-h-72 overflow-y-auto pr-1">
                    {filteredSourceStudents.map((item) => {
                      const isSelected = selectedStudentIds.includes(item.id);
                      const rollNo = item.enrollment?.rollNumber;
                      const secName = item.enrollment?.section?.name;

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleToggleStudent(item.id)}
                          className={`p-1.5 px-2.5 rounded-md border transition-all cursor-pointer flex items-center gap-2 select-none ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-50/50 text-indigo-950 shadow-2xs'
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <Checkbox checked={isSelected} onChange={() => {}} readOnly size="sm" />
                          <StudentAvatar name={item.name} photoUrl={item.photoUrl} size="xs" />
                          <div className="truncate flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-xs font-semibold truncate leading-tight">{item.name}</p>
                              {rollNo && (
                                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                  #{rollNo}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 font-mono truncate leading-tight mt-0.5">
                              Adm: {item.admissionNo} {secName ? `• Sec ${secName}` : ''}
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
            <div className="flex items-center justify-between p-2.5 px-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-xs text-slate-600 font-medium">
                Ready to promote <span className="font-bold text-indigo-700">{selectedStudentIds.length}</span> student(s)
                from Class <span className="font-semibold text-slate-900">{sourceClass?.name}</span> to Class{' '}
                <span className="font-semibold text-indigo-700">{targetClass?.name}</span>.
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/app/students')}
                  className="h-7 text-xs px-2.5"
                >
                  Cancel
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleOpenPreview}
                  disabled={selectedStudentIds.length === 0 || submitting || validFutureYears.length === 0}
                  icon={Sparkles}
                  className="h-7 text-xs px-3"
                >
                  Review Promotion ({selectedStudentIds.length})
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Bulk Promotion Preview Modal */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Confirm Bulk Student Promotion"
        size="xl"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPreviewOpen(false)}
              disabled={submitting}
              className="h-7 text-xs px-2.5"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleExecuteBulkPromotion}
              loading={submitting}
              loadingText="Promoting..."
              icon={Sparkles}
              className="h-7 text-xs px-3"
            >
              Confirm Promotion ({selectedStudentIds.length})
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          {/* Summary Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <span className="text-slate-400 block font-bold text-[10px] uppercase">From</span>
              <span className="font-bold text-slate-900">
                {sourceAcademicYearName} → Class {sourceClass?.name}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-bold text-[10px] uppercase">To Target</span>
              <span className="font-bold text-indigo-700">
                {targetAcademicYearName} → Class {targetClass?.name}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-bold text-[10px] uppercase">Students Count</span>
              <span className="font-bold text-slate-900 font-mono">
                {selectedStudentIds.length} / {sourceStudents.length} Selected
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-bold text-[10px] uppercase">Preservation</span>
              <span className="font-semibold text-slate-700">Medium & Section Maintained</span>
            </div>
          </div>

          {/* Student Table Preview */}
          <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200">
            <Table minWidth="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="py-1.5 px-2.5 text-[10px] font-bold">STUDENT</TableHead>
                  <TableHead className="py-1.5 px-2.5 text-[10px] font-bold">CURRENT CLASS</TableHead>
                  <TableHead className="py-1.5 px-2.5 text-[10px] font-bold">TARGET CLASS</TableHead>
                  <TableHead className="py-1.5 px-2.5 text-[10px] font-bold">MEDIUM</TableHead>
                  <TableHead className="py-1.5 px-2.5 text-[10px] font-bold">SECTION</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedStudentsForPreview.map((s) => (
                  <TableRow key={s.id} className="border-b border-slate-100">
                    <TableCell className="py-1.5 px-2.5">
                      <div className="font-bold text-slate-900 text-xs">{s.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{s.admissionNo}</div>
                    </TableCell>
                    <TableCell className="py-1.5 px-2.5 text-xs">Class {sourceClass?.name}</TableCell>
                    <TableCell className="py-1.5 px-2.5 text-xs font-bold text-indigo-700">
                      Class {targetClass?.name}
                    </TableCell>
                    <TableCell className="py-1.5 px-2.5 text-xs">
                      {s.enrollment?.medium?.name || 'Preserved'}
                    </TableCell>
                    <TableCell className="py-1.5 px-2.5 text-xs">
                      {s.enrollment?.section?.name ? `Section ${s.enrollment.section.name}` : 'Same Section'}
                    </TableCell>
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

export default BulkPromotionPage;
