import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, UserCheck, PlusCircle, AlertTriangle, CheckCircle2, Lock, ArrowRight, ArrowLeft, FileSpreadsheet, Trash, Check } from 'lucide-react';
import { feeService } from '../../services/fee.service.js';
import { academicService } from '../../services/academic.service.js';
import { studentService } from '../../services/student.service.js';
import { useAcademicYear } from '../../hooks/useAcademicYear.js';
import { Button } from '../../components/ui/Button.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { toast } from '../../components/ui/Toast.jsx';
import { SearchableStudentSelect } from '../../components/fees/SearchableStudentSelect.jsx';
import { getAcademicMonthOptions, formatDate } from '../../utils/formatters.js';

export const GenerateFeesPage = () => {
  const navigate = useNavigate();
  const { selectedYear, selectedYearId } = useAcademicYear();
  const monthOptions = useMemo(() => getAcademicMonthOptions(selectedYear), [selectedYear]);

  const getCurrentMonthEnum = () => {
    const MONTH_NAMES = [
      'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
      'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
    ];
    return MONTH_NAMES[new Date().getMonth()];
  };

  const isStudentAdmissionAfterBillingMonth = (student, month, year) => {
    if (!student?.admissionDate || !month || !year?.startDate) return false;
    const MONTH_INDEX = {
      JANUARY: 0, FEBRUARY: 1, MARCH: 2, APRIL: 3, MAY: 4, JUNE: 5,
      JULY: 6, AUGUST: 7, SEPTEMBER: 8, OCTOBER: 9, NOVEMBER: 10, DECEMBER: 11
    };
    const d = new Date(student.admissionDate);
    if (isNaN(d.getTime())) return false;

    const admYear = d.getFullYear();
    const admMonth = d.getMonth();
    const admKey = admYear * 12 + admMonth;

    const startYear = new Date(year.startDate).getFullYear();
    const startMonth = new Date(year.startDate).getMonth();
    const targetMonthIdx = MONTH_INDEX[month] ?? 3;
    const targetYear = targetMonthIdx >= startMonth ? startYear : startYear + 1;
    const targetKey = targetYear * 12 + targetMonthIdx;

    return admKey > targetKey;
  };

  // Wizard Step: 1 = Selection, 2 = Review Fee Sheet, 3 = Preview, 4 = Success
  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [generationMode, setGenerationMode] = useState('BY_CLASS'); // ENTIRE_SCHOOL | BY_CLASS | BY_STUDENT
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const cur = getCurrentMonthEnum();
    const exists = monthOptions.some((m) => m.value === cur);
    return exists ? cur : (monthOptions[0]?.value || 'APRIL');
  });

  useEffect(() => {
    const cur = getCurrentMonthEnum();
    const exists = monthOptions.some((m) => m.value === cur);
    if (exists) {
      setSelectedMonth(cur);
    } else if (monthOptions.length > 0) {
      setSelectedMonth(monthOptions[0]?.value || 'APRIL');
    }
  }, [selectedYearId]);

  // Academic Setup Options
  const [classes, setClasses] = useState([]);
  const [mediums, setMediums] = useState([]);
  const [streams, setStreams] = useState([]);
  const [sections, setSections] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [hasTemplates, setHasTemplates] = useState(true);

  // Selection Inputs
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  // Fee Sheet state (Step 2)
  const [sheetHeads, setSheetHeads] = useState([]);
  const [sheetLoading, setSheetLoading] = useState(false);

  // Temporary Fee Modal
  const [isTempModalOpen, setIsTempModalOpen] = useState(false);
  const [tempFeeData, setTempFeeData] = useState({ title: '', amount: '' });

  // Preview Data & Execution (Step 3)
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [executing, setExecuting] = useState(false);

  // Success Result (Step 4)
  const [resultData, setResultData] = useState(null);

  // Load setup options on mount
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [clsRes, medRes, stmRes, secRes, templatesRes] = await Promise.all([
          academicService.getClasses(),
          academicService.getMediums(),
          academicService.getStreams(),
          academicService.getSections(),
          feeService.getFeeStructures({ academicYearId: selectedYearId }),
        ]);

        setClasses(clsRes.data || []);
        setMediums(medRes.data || []);
        setStreams(stmRes.data || []);
        setSections(secRes.data || []);

        const templatesList = templatesRes.data || [];
        setHasTemplates(templatesList.length > 0);

        if (clsRes.data?.length > 0) setSelectedClassId(clsRes.data[0].id);
      } catch (err) {
        console.error('Failed to load setup dropdowns:', err);
        toast.error('Failed to load setup dropdowns');
      }
    };
    if (selectedYearId) loadOptions();
  }, [selectedYearId]);

  // Load student list if mode is BY_STUDENT
  useEffect(() => {
    if (generationMode === 'BY_STUDENT' && selectedYearId) {
      const loadStudents = async () => {
        try {
          const res = await studentService.getStudents({ academicYearId: selectedYearId, limit: 300 });
          const list = Array.isArray(res.data) ? res.data : (res.data?.data || res || []);
          setStudentsList((prev) => {
            if (selectedStudentId) {
              const current = prev.find((s) => s.id === selectedStudentId);
              if (current && !list.some((s) => s.id === selectedStudentId)) {
                return [current, ...list];
              }
            }
            return list;
          });
          if (list.length > 0) {
            setSelectedStudentId((prev) => prev || list[0].id);
          }
        } catch {
          toast.error('Failed to load student list');
        }
      };
      loadStudents();
    }
  }, [generationMode, selectedYearId, selectedStudentId]);


  // Selected class metadata
  const selectedClassObj = classes.find((c) => c.id === selectedClassId);

  // Auto-detect mediums, sections & streams for selected class
  const [classDetectionInfo, setClassDetectionInfo] = useState({
    mediums: [],
    sections: [],
    streams: [],
    studentCount: 0,
    loading: false,
  });

  useEffect(() => {
    if (generationMode === 'BY_CLASS' && selectedClassId && selectedYearId) {
      const detectClassDetails = async () => {
        setClassDetectionInfo((prev) => ({ ...prev, loading: true }));
        try {
          const res = await studentService.getStudents({
            academicYearId: selectedYearId,
            classId: selectedClassId,
            limit: 300,
          });
          const list = Array.isArray(res.data) ? res.data : (res.data?.data || res || []);

          const medMap = new Map();
          const secMap = new Map();
          const stmMap = new Map();

          list.forEach((s) => {
            const enr = s.enrollment || s.enrollments?.find(
              (e) => e.academicYearId === selectedYearId || e.academicYear?.id === selectedYearId
            );
            if (enr) {
              if (enr.medium) medMap.set(enr.medium.id, enr.medium.name);
              if (enr.section) secMap.set(enr.section.id, enr.section.name);
              if (enr.stream) stmMap.set(enr.stream.id, enr.stream.name);
            }
          });

          const detectedMeds = medMap.size > 0
            ? Array.from(medMap.entries()).map(([id, name]) => ({ id, name }))
            : mediums;

          const detectedSecs = secMap.size > 0
            ? Array.from(secMap.entries()).map(([id, name]) => ({ id, name }))
            : sections;

          const detectedStms = stmMap.size > 0
            ? Array.from(stmMap.entries()).map(([id, name]) => ({ id, name }))
            : streams;

          setClassDetectionInfo({
            mediums: detectedMeds,
            sections: detectedSecs,
            streams: detectedStms,
            studentCount: list.length,
            loading: false,
          });
        } catch {
          setClassDetectionInfo({
            mediums: mediums,
            sections: sections,
            streams: streams,
            studentCount: 0,
            loading: false,
          });
        }
      };
      detectClassDetails();
    }
  }, [generationMode, selectedClassId, selectedYearId, mediums, sections, streams]);

  // Separate fee structures per medium for BY_CLASS mode
  const [mediumStructures, setMediumStructures] = useState([]);

  const handleToggleMediumHead = (medIdx, headIdx) => {
    const updated = [...mediumStructures];
    updated[medIdx].heads[headIdx].enabled = !updated[medIdx].heads[headIdx].enabled;
    setMediumStructures(updated);
  };

  const handleMediumHeadAmountChange = (medIdx, headIdx, val) => {
    const updated = [...mediumStructures];
    updated[medIdx].heads[headIdx].amount = parseFloat(val) || 0;
    setMediumStructures(updated);
  };

  // Fetch Fee Sheet template heads when moving to Step 2
  const loadFeeSheet = async () => {
    if (!selectedYearId) return;
    setSheetLoading(true);
    setSelectedStudentInfo(null);
    setMediumStructures([]);
    try {
      if (generationMode === 'ENTIRE_SCHOOL') {
        setSheetHeads((prev) => prev.filter((h) => h.isTemporary));
      } else if (generationMode === 'BY_CLASS' && selectedClassId) {
        const params = {
          academicYearId: selectedYearId,
          classId: selectedClassId,
        };
        const res = await feeService.getFeeStructures(params);
        const fsList = Array.isArray(res.data) ? res.data : (res.data?.data || []);

        const medStructs = fsList.map((fs) => ({
          mediumId: fs.mediumId,
          mediumName: fs.medium?.name || 'Medium',
          streamId: fs.streamId,
          streamName: fs.stream?.name,
          structureId: fs.id,
          heads: (fs.heads || []).map((h) => ({
            feeTypeId: h.feeTypeId,
            title: h.feeType?.name || 'Fee Head',
            amount: Number(h.amount),
            enabled: h.isActive,
            isTemporary: false,
          })),
        }));

        setMediumStructures(medStructs);
        setSheetHeads((prev) => prev.filter((h) => h.isTemporary));
      } else if (generationMode === 'BY_STUDENT' && selectedStudentId) {
        const selectedStudent = studentsList.find((s) => s.id === selectedStudentId);
        let studentObj = selectedStudent;
        let activeEnr = selectedStudent?.enrollment;

        if (!activeEnr) {
          const studentRes = await studentService.getStudent(selectedStudentId, selectedYearId);
          studentObj = studentRes.data || studentRes;
          activeEnr = studentObj?.enrollment || studentObj?.enrollments?.find(
            (e) => (e.academicYearId === selectedYearId || e.academicYear?.id === selectedYearId) && e.status === 'ACTIVE'
          );
        }

        if (!activeEnr) {
          toast.error('Selected student has no active enrollment in this academic year');
          setSheetHeads([]);
          return;
        }

        setSelectedStudentInfo({
          id: studentObj.id,
          name: studentObj.name,
          admissionNo: studentObj.admissionNo,
          admissionDate: studentObj.admissionDate,
          className: activeEnr.class?.name,
          mediumName: activeEnr.medium?.name,
          streamName: activeEnr.stream?.name,
        });

        const classId = activeEnr.classId || activeEnr.class?.id;
        const mediumId = activeEnr.mediumId || activeEnr.medium?.id;
        const streamId = activeEnr.streamId || activeEnr.stream?.id;

        const params = {
          academicYearId: selectedYearId,
          classId,
          mediumId,
          ...(streamId ? { streamId } : {}),
        };
        const res = await feeService.getFeeStructures(params);
        const fsList = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        const fs = fsList[0];
        const masterHeads = fs && fs.heads?.length > 0
          ? fs.heads.map((h) => ({
            feeTypeId: h.feeTypeId,
            title: h.feeType?.name || 'Fee Head',
            amount: Number(h.amount),
            enabled: h.isActive,
            isTemporary: false,
          }))
          : [];

        const existingTemp = sheetHeads.filter((h) => h.isTemporary);
        setSheetHeads([...masterHeads, ...existingTemp]);
      }
    } catch {
      toast.error('Failed to load fee sheet template');
    } finally {
      setSheetLoading(false);
    }
  };

  const handleGoToStep2 = () => {
    if (selectedYear?.isLocked) {
      toast.error('This academic year is locked. Fee generation is blocked.');
      return;
    }
    if (generationMode === 'BY_CLASS' && !selectedClassId) {
      toast.error('Please select a Class');
      return;
    }
    if (generationMode === 'BY_STUDENT') {
      if (!selectedStudentId) {
        toast.error('Please select a student');
        return;
      }
      const selectedStudent = studentsList.find((s) => s.id === selectedStudentId);
      if (selectedStudent && selectedStudent.status !== 'ACTIVE') {
        toast.error(`This student is not active (${selectedStudent.status}). Fee generation is not allowed.`);
        return;
      }
    }
    loadFeeSheet();
    setCurrentStep(2);
  };

  const handleToggleHeadEnabled = (index) => {
    const updated = [...sheetHeads];
    updated[index].enabled = !updated[index].enabled;
    setSheetHeads(updated);
  };

  const handleHeadAmountChange = (index, val) => {
    const updated = [...sheetHeads];
    updated[index].amount = parseFloat(val) || 0;
    setSheetHeads(updated);
  };

  const handleAddTemporaryHead = (e) => {
    e.preventDefault();
    if (!tempFeeData.title.trim() || !tempFeeData.amount) return;

    setSheetHeads([
      ...sheetHeads,
      {
        feeTypeId: null,
        title: tempFeeData.title.trim(),
        amount: parseFloat(tempFeeData.amount) || 0,
        enabled: true,
        isTemporary: true,
      },
    ]);

    setTempFeeData({ title: '', amount: '' });
    setIsTempModalOpen(false);
    toast.success('Temporary fee head added to sheet');
  };

  const handleRemoveTemporaryHead = (index) => {
    const updated = [...sheetHeads];
    updated.splice(index, 1);
    setSheetHeads(updated);
  };

  const buildPayload = () => {
    const customFeeHeads = [
      ...mediumStructures.flatMap((ms) =>
        ms.heads.map((h) => ({
          mediumId: ms.mediumId,
          feeTypeId: h.feeTypeId || null,
          title: h.title,
          amount: parseFloat(h.amount) || 0,
          enabled: h.enabled,
          isTemporary: Boolean(h.isTemporary),
        }))
      ),
      ...sheetHeads.map((h) => ({
        mediumId: h.mediumId || null,
        feeTypeId: h.feeTypeId || null,
        title: h.title,
        amount: parseFloat(h.amount) || 0,
        enabled: h.enabled,
        isTemporary: Boolean(h.isTemporary),
      })),
    ];

    return {
      academicYearId: selectedYearId,
      month: selectedMonth,
      mode: generationMode,
      ...(generationMode === 'BY_CLASS' && {
        classId: selectedClassId,
      }),
      ...(generationMode === 'BY_STUDENT' && {
        studentId: selectedStudentId,
      }),
      customFeeHeads,
    };
  };

  const handleGoToStep3Preview = async () => {
    if (generationMode !== 'ENTIRE_SCHOOL') {
      const hasEnabledMediumHeads = mediumStructures.some((ms) => ms.heads.some((h) => h.enabled));
      const hasEnabledSheetHeads = sheetHeads.some((h) => h.enabled);

      if (!hasEnabledMediumHeads && !hasEnabledSheetHeads) {
        toast.error('Select at least one fee head to generate');
        return;
      }
    }

    setPreviewLoading(true);
    try {
      const payload = buildPayload();
      const res = await feeService.previewFeeGeneration(payload);
      setPreviewData(res.data);
      setCurrentStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to calculate generation preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExecuteGeneration = async () => {
    setExecuting(true);
    try {
      const payload = buildPayload();
      const res = await feeService.executeFeeGeneration(payload);
      setResultData(res.data);
      setCurrentStep(4);
      toast.success('Fee charges generated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate fee charges');
    } finally {
      setExecuting(false);
    }
  };

  // If no templates exist at all in system, show clean empty state
  if (!hasTemplates) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-2xs">
        <EmptyState
          icon={FileSpreadsheet}
          title="No Fee Templates available."
          description="Create a Fee Template first before generating monthly fees for your school."
          actionLabel="Create Fee Template"
          onAction={() => navigate('/app/fees/templates')}
        />
      </div>
    );
  }

  const stepsList = [
    { step: 1, label: 'Scope & Month' },
    { step: 2, label: 'Fee Sheet' },
    { step: 3, label: 'Preview' },
    { step: 4, label: 'Complete' },
  ];

  return (
    <div className="space-y-3 w-full pb-6">
      {/* Sleek Minimalist Stepper Header */}
      <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between max-w-xl mx-auto">
          {stepsList.map((item, idx) => {
            const isActive = currentStep === item.step;
            const isDone = currentStep > item.step;
            return (
              <React.Fragment key={item.step}>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                      isDone
                        ? 'bg-emerald-600 text-white'
                        : isActive
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isDone ? <Check className="w-3 h-3 stroke-[3]" /> : item.step}
                  </div>
                  <span
                    className={`text-xs ${
                      isActive
                        ? 'text-indigo-900 font-bold'
                        : isDone
                        ? 'text-emerald-700 font-medium'
                        : 'text-slate-400 font-normal'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
                {idx < stepsList.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-3 transition-colors ${
                      currentStep > item.step ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Locked Year Warning Alert */}
      {selectedYear?.isLocked && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-2.5 text-xs">
          <Lock className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <span className="font-bold">Academic Year Locked ({selectedYear.name})</span>. Fee generation disabled.
          </div>
        </div>
      )}

      {/* ── STEP 1: SELECT GENERATION TARGET ── */}
      {currentStep === 1 && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-4 sm:p-5 space-y-4">
          {/* Header */}
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Select Target & Billing Month</h2>
            <p className="text-xs text-slate-500">Choose the billing month and target group for monthly fee charges.</p>
          </div>

          {/* Session & Month Parameter Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Academic Session</label>
              <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800">
                {selectedYear?.name || 'Current Academic Year'}
              </div>
            </div>

            <Select
              label="Billing Month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              options={monthOptions}
              required
            />
          </div>

          {/* Generation Mode Selector */}
          <div className="space-y-1.5 max-w-2xl">
            <label className="text-xs font-semibold text-slate-700 block">Generation Scope</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                { id: 'ENTIRE_SCHOOL', title: 'Entire School', desc: 'All classes & enrolled students', icon: Building2 },
                { id: 'BY_CLASS', title: 'By Class', desc: 'Specific class & mediums', icon: Users },
                { id: 'BY_STUDENT', title: 'By Student', desc: 'Individual student enrollment', icon: UserCheck },
              ].map((mode) => {
                const IconComp = mode.icon;
                const isSelected = generationMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setGenerationMode(mode.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-2xs ring-1 ring-indigo-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div
                        className={`w-6 h-6 rounded-md flex items-center justify-center ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <IconComp className="w-3.5 h-3.5" />
                      </div>
                      <input type="radio" checked={isSelected} readOnly className="h-3 w-3 text-indigo-600" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-900">{mode.title}</h4>
                    <p className="text-[10px] text-slate-500">{mode.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Scope Target */}
          {generationMode === 'BY_CLASS' && (
            <div className="space-y-2 max-w-2xl">
              <Select
                label="Target Class"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                options={classes.map((c) => ({ label: `Class ${c.name}`, value: c.id }))}
                required
              />

              {/* Sleek, Minimalist Meta Chip Row */}
              {selectedClassObj && (
                <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
                  <span className="font-bold text-slate-900">Class {selectedClassObj.name}</span>
                  <span className="text-slate-300">•</span>
                  <Badge variant="indigo" size="sm" className="font-semibold text-[10px]">
                    {classDetectionInfo.loading ? 'Counting...' : `${classDetectionInfo.studentCount} Students`}
                  </Badge>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-600 text-[11px]">
                    Mediums: {classDetectionInfo.mediums.map((m) => m.name).join(', ') || 'All'}
                  </span>
                  {classDetectionInfo.sections.length > 0 && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-600 text-[11px]">
                        Sections: {classDetectionInfo.sections.map((s) => s.name).join(', ')}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {generationMode === 'BY_STUDENT' && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3 max-w-2xl">
              <SearchableStudentSelect
                students={studentsList}
                selectedStudentId={selectedStudentId}
                academicYearId={selectedYearId}
                onSelectStudent={(st) => {
                  setSelectedStudentId(st?.id || '');
                  if (st) {
                    setStudentsList((prev) => (prev.some((s) => s.id === st.id) ? prev : [st, ...prev]));
                  }
                }}
              />

              {(() => {
                const sel = studentsList.find((s) => s.id === selectedStudentId);
                if (sel && isStudentAdmissionAfterBillingMonth(sel, selectedMonth, selectedYear)) {
                  return (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-[11px]">Admission date is after {selectedMonth}</p>
                        <p className="text-[11px] text-amber-700 leading-relaxed">
                          {sel.name} was admitted on {formatDate(sel.admissionDate)}. Prior charges will be skipped.
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          )}

          {/* Step 1 Footer Action */}
          <div className="flex justify-end pt-3 border-t border-slate-100">
            <Button onClick={handleGoToStep2} icon={ArrowRight} disabled={selectedYear?.isLocked} size="sm">
              Next: Review Fee Sheet
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 2: REVIEW FEE SHEET ── */}
      {currentStep === 2 && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {/* Header Action Bar */}
          <div className="p-3 sm:px-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">Review & Edit Fee Sheet</h3>
              <p className="text-[11px] text-slate-500">Uncheck heads to skip or edit amounts for this billing month.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setMediumStructures((prev) =>
                    prev.map((ms) => ({
                      ...ms,
                      heads: ms.heads.map((h) => ({ ...h, enabled: true })),
                    }))
                  );
                  setSheetHeads((prev) => prev.map((h) => ({ ...h, enabled: true })));
                }}
                className="text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer"
              >
                Select All
              </button>
              <span className="text-slate-300 text-xs">|</span>
              <button
                type="button"
                onClick={() => {
                  setMediumStructures((prev) =>
                    prev.map((ms) => ({
                      ...ms,
                      heads: ms.heads.map((h) => ({ ...h, enabled: false })),
                    }))
                  );
                  setSheetHeads((prev) => prev.map((h) => ({ ...h, enabled: false })));
                }}
                className="text-[11px] font-semibold text-slate-500 hover:underline cursor-pointer"
              >
                Deselect All
              </button>
              <span className="text-slate-300 text-xs mr-1">|</span>
              <Button type="button" variant="outline" size="xs" icon={PlusCircle} onClick={() => setIsTempModalOpen(true)}>
                + Custom Head
              </Button>
            </div>
          </div>

          {/* Fee Heads List / Table Area */}
          <div className="p-4 space-y-4">
            {sheetLoading ? (
              <div className="space-y-2 py-4">
                <Skeleton height="35px" width="100%" />
                <Skeleton height="35px" width="100%" />
                <Skeleton height="35px" width="100%" />
              </div>
            ) : generationMode === 'BY_CLASS' && mediumStructures.length > 0 ? (
              <div className="space-y-4">
                {mediumStructures.map((ms, medIdx) => {
                  const mediumTotal = ms.heads.reduce(
                    (sum, h) => (h.enabled ? sum + (parseFloat(h.amount) || 0) : sum),
                    0
                  );
                  return (
                    <div key={medIdx} className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                      <div className="px-3.5 py-2 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-800">
                        <span>Medium: {ms.mediumName} {ms.streamName ? `(${ms.streamName})` : ''}</span>
                        <span className="text-indigo-700 font-mono font-bold">
                          Total: ₹{mediumTotal.toLocaleString('en-IN')} / student
                        </span>
                      </div>

                      {ms.heads.length === 0 ? (
                        <div className="p-4 text-xs text-slate-400 italic text-center">
                          No fee heads configured in template for {ms.mediumName}.
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[9px]">
                            <tr>
                              <th className="px-3 py-2 w-10 text-center">Include</th>
                              <th className="px-3 py-2">Fee Head</th>
                              <th className="px-3 py-2 text-right w-36">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {ms.heads.map((head, headIdx) => (
                              <tr key={headIdx} className={!head.enabled ? 'bg-slate-50/60 opacity-40' : 'hover:bg-slate-50/50'}>
                                <td className="px-3 py-1.5 text-center">
                                  <input
                                    type="checkbox"
                                    checked={head.enabled}
                                    onChange={() => handleToggleMediumHead(medIdx, headIdx)}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                                  />
                                </td>
                                <td className="px-3 py-1.5 font-bold text-slate-900">
                                  {head.title}
                                </td>
                                <td className="px-3 py-1.5 text-right">
                                  <div className="relative w-32 ml-auto">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₹</span>
                                    <input
                                      type="number"
                                      autoComplete="off"
                                      min="0"
                                      step="0.01"
                                      disabled={!head.enabled}
                                      value={head.amount}
                                      onChange={(e) => handleMediumHeadAmountChange(medIdx, headIdx, e.target.value)}
                                      className="w-full pl-6 pr-2 py-1 text-xs text-right font-mono font-bold rounded-md border border-slate-200 focus:ring-1 focus:ring-indigo-500"
                                    />
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  );
                })}

                {/* Temporary Fee Heads section */}
                {sheetHeads.filter((h) => h.isTemporary).length > 0 && (
                  <div className="bg-white rounded-xl border border-amber-200 shadow-2xs overflow-hidden">
                    <div className="px-3 py-2 bg-amber-50 border-b border-amber-200 flex items-center justify-between text-xs font-bold text-amber-900">
                      <span>⚡ Custom Temporary Fee Heads</span>
                    </div>
                    <div className="p-2 space-y-1.5">
                      {sheetHeads.filter((h) => h.isTemporary).map((head, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-amber-50/50 border border-amber-100 text-xs">
                          <span className="font-bold text-slate-800">{head.title}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-indigo-700">₹{Number(head.amount).toLocaleString('en-IN')}</span>
                            <button
                              onClick={() => handleRemoveTemporaryHead(sheetHeads.findIndex((sh) => sh === head))}
                              className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px]">
                    <tr>
                      <th className="px-3 py-2 w-10 text-center">Include</th>
                      <th className="px-3 py-2">Fee Head</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2 w-40 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sheetHeads.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-500">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-bold text-slate-700">Master Fee Templates Active</span>
                            <span className="text-[10px] text-slate-400">
                              Each class generates charges according to its Master Template. Click "+ Custom Head" if adding single-run charges.
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      sheetHeads.map((head, idx) => (
                        <tr key={idx} className={!head.enabled ? 'bg-slate-50/70 opacity-40' : 'hover:bg-slate-50/50'}>
                          <td className="px-3 py-1.5 text-center">
                            <input
                              type="checkbox"
                              checked={head.enabled}
                              onChange={() => handleToggleHeadEnabled(idx)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                            />
                          </td>
                          <td className="px-3 py-1.5 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <span>{head.title}</span>
                              {head.isTemporary && <Badge variant="neutral" size="sm" className="text-[9px]">Temp Fee</Badge>}
                            </div>
                          </td>
                          <td className="px-3 py-1.5 text-slate-500 text-[11px]">
                            {head.isTemporary ? 'Single-run Custom' : 'Master Template'}
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <div className="relative w-32">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₹</span>
                                <input
                                  type="number"
                                  autoComplete="off"
                                  min="0"
                                  step="0.01"
                                  disabled={!head.enabled}
                                  value={head.amount}
                                  onChange={(e) => handleHeadAmountChange(idx, e.target.value)}
                                  className="w-full pl-6 pr-2 py-1 text-xs text-right font-mono font-bold rounded-md border border-slate-200 focus:ring-1 focus:ring-indigo-500"
                                />
                              </div>
                              {head.isTemporary && (
                                <button
                                  onClick={() => handleRemoveTemporaryHead(idx)}
                                  className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Step 2 Footer Navigation */}
          <div className="p-3 sm:px-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <Button variant="outline" size="sm" icon={ArrowLeft} onClick={() => setCurrentStep(1)}>
              Back
            </Button>

            <Button onClick={handleGoToStep3Preview} loading={previewLoading} loadingText="Calculating..." icon={ArrowRight} size="sm">
              Next: Preview
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: PREVIEW SUMMARY PAGE ── */}
      {currentStep === 3 && previewData && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-4 sm:p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Generation Preview</h2>
            <p className="text-xs text-slate-500">Review estimated totals before creating official monthly charges.</p>
          </div>

          {/* 3 Metric Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Target Students</span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{previewData.totalStudents}</p>
            </div>

            <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">Est. Charges</span>
              <p className="text-sm font-extrabold text-indigo-700 font-mono mt-0.5">{previewData.generatedCount}</p>
            </div>

            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">Est. Amount</span>
              <p className="text-sm font-extrabold text-emerald-700 font-mono mt-0.5">₹{previewData.totalEstimatedAmount.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* Safeguards Summary */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
            <div className="flex items-center justify-between font-semibold text-slate-800">
              <span>Safeguards Breakdown:</span>
              <div className="flex items-center gap-1.5">
                {previewData.alreadyExistsCount > 0 && (
                  <Badge variant="info" size="sm" className="text-[10px]">
                    {previewData.alreadyExistsCount} Already Exist
                  </Badge>
                )}
                <Badge variant={previewData.skippedCount > 0 ? 'neutral' : 'success'} size="sm" className="text-[10px]">
                  {previewData.skippedCount > 0 ? `${previewData.skippedCount} Skipped` : 'Clean Batch'}
                </Badge>
              </div>
            </div>

            {previewData.skippedBreakdown && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {(previewData.skippedBreakdown.alreadyExists > 0 || previewData.alreadyExistsCount > 0) && (
                  <Badge variant="info" size="sm" className="text-[10px]">
                    {previewData.alreadyExistsCount || previewData.skippedBreakdown.alreadyExists} Already Generated (Skipped)
                  </Badge>
                )}
                {previewData.skippedBreakdown.notActive > 0 && (
                  <Badge variant="danger" size="sm" className="text-[10px]">
                    {previewData.skippedBreakdown.notActive} Inactive Student
                  </Badge>
                )}
                {previewData.skippedBreakdown.noFeeStructure > 0 && (
                  <Badge variant="warning" size="sm" className="text-[10px]">
                    {previewData.skippedBreakdown.noFeeStructure} No Fee Structure
                  </Badge>
                )}
              </div>
            )}
          </div>

          {previewData.generatedCount === 0 && (
            <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 text-sky-900 text-xs flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
              <span>All charges for {previewData.month} have already been generated for these students.</span>
            </div>
          )}

          {/* Missing Structure Alert */}
          {previewData.noStructureClasses?.length > 0 && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Missing Fee Templates ({previewData.noStructureClasses.length}):</span>
              </div>
              <ul className="list-disc list-inside text-[11px] pl-2 space-y-0.5 text-amber-800">
                {previewData.noStructureClasses.map((clsName, idx) => (
                  <li key={idx}>{clsName}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-between pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" icon={ArrowLeft} onClick={() => setCurrentStep(2)}>
              Back
            </Button>

            <Button
              onClick={handleExecuteGeneration}
              loading={executing}
              loadingText="Generating..."
              disabled={previewData.generatedCount === 0}
              icon={CheckCircle2}
              size="sm"
            >
              {previewData.generatedCount === 0 ? 'All Charges Created' : 'Generate'}
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 4: SUCCESS SCREEN ── */}
      {currentStep === 4 && resultData && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-6 sm:p-8 space-y-4 text-center max-w-lg mx-auto w-full">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Fee Generation Completed</h2>
            <p className="text-xs text-slate-500 mt-0.5">Official charges created for {resultData.month}.</p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 text-left text-xs font-mono">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Created</span>
                <span className="text-indigo-600 font-extrabold text-xs">{resultData.generatedCount}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Exists</span>
                <span className="text-sky-600 font-extrabold text-xs">{resultData.alreadyExistsCount || 0}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Skipped</span>
                <span className="text-slate-600 font-bold text-xs">{resultData.skippedCount}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Amount Generated</span>
              <span className="text-emerald-600 font-extrabold text-sm">₹{Number(resultData.totalAmount).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="flex justify-center gap-2 pt-1">
            <Button size="sm" onClick={() => navigate('/app/fees/generated')}>
              View Generated Charges
            </Button>
            <Button size="sm" variant="outline" onClick={() => setCurrentStep(1)}>
              Done
            </Button>
          </div>
        </div>
      )}

      {/* Temporary Fee Modal */}
      <Modal isOpen={isTempModalOpen} onClose={() => setIsTempModalOpen(false)} title="Add Temporary Fee Head" size="sm">
        <form onSubmit={handleAddTemporaryHead} autoComplete="off" className="space-y-4">
          <p className="text-xs text-slate-500">
            This Fee Head will exist only during this generation. It will not alter master Fee Templates.
          </p>

          <Input
            label="Fee Head Name"
            placeholder="e.g. Annual Function Fee"
            value={tempFeeData.title}
            onChange={(e) => setTempFeeData({ ...tempFeeData, title: e.target.value })}
            required
          />

          <Input
            label="Amount (₹)"
            type="number"
            min="0"
            step="0.01"
            placeholder="300"
            value={tempFeeData.amount}
            onChange={(e) => setTempFeeData({ ...tempFeeData, amount: e.target.value })}
            required
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsTempModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit">Add to Sheet</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default GenerateFeesPage;
