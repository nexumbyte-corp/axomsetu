import React, { useState, useEffect } from 'react';
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
import { getAcademicMonthOptions } from '../../utils/formatters.js';

export const GenerateFeesPage = () => {
  const navigate = useNavigate();
  const { selectedYear, selectedYearId } = useAcademicYear();
  const monthOptions = getAcademicMonthOptions(selectedYear);

  const getCurrentMonthEnum = () => {
    const MONTH_NAMES = [
      'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
      'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
    ];
    return MONTH_NAMES[new Date().getMonth()];
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
          const res = await studentService.getStudents({ academicYearId: selectedYearId, limit: 100 });
          const list = Array.isArray(res.data) ? res.data : (res.data?.data || res || []);
          setStudentsList(list);
          if (list.length > 0) {
            setSelectedStudentId(list[0].id);
          } else {
            setSelectedStudentId('');
          }
        } catch {
          toast.error('Failed to load students list');
        }
      };
      loadStudents();
    }
  }, [generationMode, selectedYearId]);

  const selectedClassObj = classes.find((c) => c.id === selectedClassId);

  const [selectedStudentInfo, setSelectedStudentInfo] = useState(null);

  // Dynamic detection for BY_CLASS mode
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

          list.forEach((st) => {
            const enr = st.enrollment || st.enrollments?.find((e) => e.academicYearId === selectedYearId);
            if (enr) {
              if (enr.medium) medMap.set(enr.medium.id || enr.mediumId, enr.medium.name || 'Medium');
              if (enr.section) secMap.set(enr.section.id || enr.sectionId, enr.section.name || 'Section');
              if (enr.stream) stmMap.set(enr.stream.id || enr.streamId, enr.stream.name || 'Stream');
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
        // Entire school mode: Master Fee Templates for each class are resolved automatically by the backend.
        setSheetHeads((prev) => prev.filter((h) => h.isTemporary));
      } else if (generationMode === 'BY_CLASS' && selectedClassId) {
        const params = {
          academicYearId: selectedYearId,
          classId: selectedClassId,
        };
        const res = await feeService.getFeeStructures(params);
        const fsList = Array.isArray(res.data) ? res.data : (res.data?.data || []);

        // Group structures by medium for separate review
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
        // Look up selected student from loaded list or fetch details
        const selectedStudent = studentsList.find((s) => s.id === selectedStudentId);
        let studentObj = selectedStudent;
        let activeEnr = selectedStudent?.enrollment;

        if (!activeEnr) {
          const studentRes = await studentService.getStudent(selectedStudentId);
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
          name: studentObj.name,
          admissionNo: studentObj.admissionNo,
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
    if (generationMode === 'BY_STUDENT' && selectedStudentId) {
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

  const calculateSheetTotal = () => {
    return sheetHeads.reduce((sum, h) => (h.enabled ? sum + (parseFloat(h.amount) || 0) : sum), 0);
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

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden space-y-2 max-w-5xl mx-auto">
      {/* Wizard Progress Steps Indicator */}
      <div className="shrink-0 bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between">
          {[
            { step: 1, label: '1. Select Target' },
            { step: 2, label: '2. Review Fee Sheet' },
            { step: 3, label: '3. Preview Summary' },
            { step: 4, label: '4. Complete' },
          ].map((item, idx) => {
            const isActive = currentStep === item.step;
            const isDone = currentStep > item.step;
            return (
              <React.Fragment key={item.step}>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${isDone
                      ? 'bg-emerald-600 text-white'
                      : isActive
                        ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-500/20'
                        : 'bg-slate-100 text-slate-400'
                      }`}
                  >
                    {isDone ? <Check className="w-3.5 h-3.5" /> : item.step}
                  </div>
                  <span
                    className={`text-xs font-semibold hidden sm:inline-block ${isActive ? 'text-indigo-900 font-extrabold' : isDone ? 'text-emerald-700' : 'text-slate-400'
                      }`}
                  >
                    {item.label}
                  </span>
                </div>
                {idx < 3 && <div className={`flex-1 h-0.5 mx-2 ${currentStep > item.step ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Locked Year Warning Alert */}
      {selectedYear?.isLocked && (
        <div className="shrink-0 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-2.5 text-xs">
          <Lock className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <span className="font-bold">Academic Year Locked ({selectedYear.name})</span>. Fee generation disabled.
          </div>
        </div>
      )}

      {/* STEP 1: SELECT GENERATION TARGET */}
      {currentStep === 1 && (
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">Step 1 — Select Fee Generation Target</h2>
            <p className="text-xs text-slate-500">Choose the billing month and generation scope for fee charges.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Academic Year</label>
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

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">Generation Mode</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                { id: 'ENTIRE_SCHOOL', title: 'Entire School', desc: 'All classes & enrolled students', icon: Building2 },
                { id: 'BY_CLASS', title: 'By Class', desc: 'Specific class & medium', icon: Users },
                { id: 'BY_STUDENT', title: 'By Student', desc: 'Individual student enrollment', icon: UserCheck },
              ].map((mode) => {
                const IconComp = mode.icon;
                const isSelected = generationMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setGenerationMode(mode.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${isSelected
                      ? 'border-indigo-600 bg-indigo-50/60 shadow-xs ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <IconComp className="w-3.5 h-3.5" />
                      </div>
                      <input type="radio" checked={isSelected} readOnly className="h-3.5 w-3.5 text-indigo-600" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-900">{mode.title}</h4>
                    <p className="text-[10px] text-slate-500">{mode.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Mode Inputs */}
          {generationMode === 'BY_CLASS' && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <Select
                  label="Select Class"
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  options={classes.map((c) => ({ label: c.name, value: c.id }))}
                  required
                />
              </div>

              {/* Confirmation & Preview Card of Auto-Detected Mediums, Sections & Streams */}
              {selectedClassObj && (
                <div className="p-3.5 bg-gradient-to-r from-indigo-50/90 via-purple-50/50 to-slate-50 rounded-xl border border-indigo-200/80 shadow-xs space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100/80 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-extrabold text-xs shadow-xs shrink-0">
                        ✓
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900 tracking-tight">
                          Target Class: <span className="text-indigo-700 font-black">{selectedClassObj.name}</span>
                        </h4>
                        <p className="text-[10px] text-slate-500">
                          Auto-includes active mediums, sections, and enrolled students below.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="indigo" size="sm" className="text-[10px] font-bold">
                        {classDetectionInfo.loading ? 'Detecting...' : `${classDetectionInfo.studentCount} Students Enrolled`}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {/* Auto-detected Mediums */}
                    <div className="p-2.5 bg-white/90 rounded-lg border border-indigo-100/80 text-xs shadow-2xs">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                        Mediums ({classDetectionInfo.mediums.length})
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {classDetectionInfo.mediums.length > 0 ? (
                          classDetectionInfo.mediums.map((m) => (
                            <Badge key={m.id || m.name} variant="success" size="sm" className="text-[9px] py-0 px-1">
                              {m.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">All School Mediums</span>
                        )}
                      </div>
                    </div>

                    {/* Auto-detected Sections */}
                    <div className="p-2.5 bg-white/90 rounded-lg border border-indigo-100/80 text-xs shadow-2xs">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                        Sections ({classDetectionInfo.sections.length})
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {classDetectionInfo.sections.length > 0 ? (
                          classDetectionInfo.sections.map((sec) => (
                            <Badge key={sec.id || sec.name} variant="info" size="sm" className="text-[9px] py-0 px-1">
                              Sec {sec.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">All Sections</span>
                        )}
                      </div>
                    </div>

                    {/* Auto-detected Streams if class has streams */}
                    {selectedClassObj.hasStream && (
                      <div className="p-2.5 bg-white/90 rounded-lg border border-indigo-100/80 text-xs shadow-2xs">
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                          Streams ({classDetectionInfo.streams.length})
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {classDetectionInfo.streams.length > 0 ? (
                            classDetectionInfo.streams.map((st) => (
                              <Badge key={st.id || st.name} variant="neutral" size="sm" className="text-[9px] py-0 px-1">
                                {st.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">All Streams</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {generationMode === 'BY_STUDENT' && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <SearchableStudentSelect
                students={studentsList}
                selectedStudentId={selectedStudentId}
                onSelectStudent={(st) => setSelectedStudentId(st?.id || '')}
              />
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <Button onClick={handleGoToStep2} icon={ArrowRight} disabled={selectedYear?.isLocked} size="sm">
              Next: Review Fee Sheet
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: REVIEW FEE SHEET */}
      {currentStep === 2 && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="shrink-0 p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Step 2 — Review & Edit Fee Sheet</h3>
              <p className="text-[11px] text-slate-500">Uncheck heads to skip or edit amounts temporarily for this month.</p>
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
                className="text-[11px] font-semibold text-indigo-600 hover:underline"
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
                className="text-[11px] font-semibold text-slate-500 hover:underline"
              >
                Deselect All
              </button>
              <span className="text-slate-300 text-xs mr-2">|</span>
              <Button type="button" variant="outline" size="xs" icon={PlusCircle} onClick={() => setIsTempModalOpen(true)}>
                + Add Temp Fee
              </Button>
            </div>
          </div>

          {generationMode === 'ENTIRE_SCHOOL' && (
            <div className="shrink-0 p-3 bg-indigo-50/70 border-b border-indigo-100 flex items-center gap-2.5 text-xs text-indigo-900">
              <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
              <div>
                <span className="font-bold">Entire School Automatic Fee Generation:</span> Each class will generate charges using its Fee Template. Click <strong>"+ Add Temp Fee"</strong> to add a custom fee head for all students.
              </div>
            </div>
          )}

          {generationMode === 'BY_STUDENT' && selectedStudentInfo && (
            <div className="shrink-0 p-3 bg-indigo-50/70 border-b border-indigo-100 flex items-center gap-2 text-xs text-indigo-900">
              <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
              <div>
                <span className="font-bold">Target Student:</span> {selectedStudentInfo.name} <span className="font-mono font-semibold text-slate-700">({selectedStudentInfo.admissionNo})</span> — Class {selectedStudentInfo.className} ({selectedStudentInfo.mediumName} Medium{selectedStudentInfo.streamName ? ` - ${selectedStudentInfo.streamName}` : ''})
              </div>
            </div>
          )}

          <div className="flex-1 overflow-auto min-h-0">
            {sheetLoading ? (
              <div className="p-4 space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : generationMode === 'BY_CLASS' && mediumStructures.length > 0 ? (
              <div className="p-4 space-y-4">
                <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-200 text-xs text-indigo-900 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold">
                    <Users className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Fee Structures for Auto-Selected Mediums ({mediumStructures.length})</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal hidden sm:inline-block">
                    Review or edit fee heads per medium.
                  </span>
                </div>

                {mediumStructures.map((ms, medIdx) => {
                  const mediumTotal = ms.heads.reduce((sum, h) => (h.enabled ? sum + (parseFloat(h.amount) || 0) : sum), 0);
                  return (
                    <div key={ms.mediumId || medIdx} className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="indigo" size="sm" className="font-bold text-[10px]">
                            {ms.mediumName}
                          </Badge>
                          {ms.streamName && <Badge variant="neutral" size="sm" className="text-[10px]">{ms.streamName}</Badge>}
                          <span className="text-xs font-bold text-slate-800">Fee Breakdown</span>
                        </div>
                        <div className="text-xs font-bold text-slate-900">
                          Total: <span className="font-mono font-extrabold text-indigo-700">₹{mediumTotal.toLocaleString('en-IN')}</span> / student
                        </div>
                      </div>

                      {ms.heads.length === 0 ? (
                        <div className="p-3 text-xs text-slate-400 italic text-center">
                          No fee heads configured in template for {ms.mediumName}.
                        </div>
                      ) : (
                        <div className="table-responsive-wrapper">
                          <table className="w-full text-left text-xs min-w-[450px]">
                            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-bold uppercase text-[9px] sticky top-0 z-10 backdrop-blur-xs">
                              <tr>
                                <th className="px-3 py-2 w-10 text-center">Gen</th>
                                <th className="px-3 py-2">Fee Head</th>
                                <th className="px-3 py-2 text-right w-36">Amount (Editable)</th>
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
                                        className="w-full pl-6 pr-2 py-1 text-xs text-right font-mono font-bold rounded-md border border-slate-200 focus:ring-2 focus:ring-indigo-500/20"
                                      />
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Temporary Fee Heads section */}
                {sheetHeads.filter((h) => h.isTemporary).length > 0 && (
                  <div className="bg-white rounded-xl border border-amber-200 shadow-2xs overflow-hidden">
                    <div className="px-3 py-2 bg-amber-50 border-b border-amber-200 flex items-center justify-between text-xs font-bold text-amber-900">
                      <span>⚡ Single-Run Temporary Fee Heads</span>
                      <Button type="button" variant="outline" size="xs" icon={PlusCircle} onClick={() => setIsTempModalOpen(true)}>
                        + Add Temp Fee
                      </Button>
                    </div>
                    <div className="p-2 space-y-1.5">
                      {sheetHeads.filter((h) => h.isTemporary).map((head, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-amber-50/50 border border-amber-100 text-xs">
                          <span className="font-bold text-slate-800">{head.title}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-indigo-700">₹{Number(head.amount).toLocaleString('en-IN')}</span>
                            <button
                              onClick={() => handleRemoveTemporaryHead(sheetHeads.findIndex((sh) => sh === head))}
                              className="text-slate-400 hover:text-rose-600 p-1"
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
              <div className="table-responsive-wrapper">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px] sticky top-0 z-10 backdrop-blur-xs">
                    <tr>
                      <th className="px-3 py-2 w-10 text-center">Gen</th>
                      <th className="px-3 py-2">Fee Head</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2 w-40 text-right">Amount (Editable)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sheetHeads.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-500">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-bold text-slate-700">Automated Class Fee Templates Active</span>
                            <span className="text-[10px] text-slate-400">
                              Each class will generate charges using its defined Fee Template. Click "+ Add Temp Fee" above if you wish to add a custom fee head.
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
                                  className="w-full pl-6 pr-2 py-1 text-xs text-right font-mono font-bold rounded-md border border-slate-200 focus:ring-2 focus:ring-indigo-500/20"
                                />
                              </div>
                              {head.isTemporary && (
                                <button
                                  onClick={() => handleRemoveTemporaryHead(idx)}
                                  className="text-slate-400 hover:text-rose-600 p-1"
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

          <div className="shrink-0 p-3 bg-indigo-50/60 border-t border-indigo-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" icon={ArrowLeft} onClick={() => setCurrentStep(1)}>
                Back
              </Button>
              {generationMode === 'ENTIRE_SCHOOL' ? (
                <span className="text-xs font-bold text-indigo-900">
                  Scope: <span className="font-semibold text-indigo-700">All Classes</span>
                  {sheetHeads.length > 0 && (
                    <span> + <span className="font-mono font-extrabold text-indigo-700">₹{calculateSheetTotal().toLocaleString('en-IN')}</span> Temp Fee</span>
                  )}
                </span>
              ) : generationMode === 'BY_CLASS' && mediumStructures.length > 0 ? (
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                  <span className="hidden sm:inline-block">Totals:</span>
                  {mediumStructures.map((ms, idx) => {
                    const total = ms.heads.reduce((sum, h) => (h.enabled ? sum + (parseFloat(h.amount) || 0) : sum), 0);
                    return (
                      <span key={idx} className="bg-white px-2 py-0.5 rounded border border-indigo-200 font-mono text-[10px] font-extrabold text-indigo-700">
                        {ms.mediumName}: ₹{total.toLocaleString('en-IN')}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <span className="text-xs font-bold text-indigo-900">
                  Batch Fee: <span className="font-mono font-extrabold text-indigo-700">₹{calculateSheetTotal().toLocaleString('en-IN')}</span>
                </span>
              )}
            </div>

            <Button onClick={handleGoToStep3Preview} loading={previewLoading} loadingText="Calculating..." icon={ArrowRight} size="sm">
              Next: Preview
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: PREVIEW SUMMARY PAGE */}
      {currentStep === 3 && previewData && (
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">Step 3 — Generation Preview</h2>
            <p className="text-xs text-slate-500">Review estimated totals before creating official monthly charges.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Target Students</span>
              <p className="text-xs font-bold text-slate-900 mt-0.5">{previewData.totalStudents}</p>
            </div>

            <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
              <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-500 block">Est. Charges</span>
              <p className="text-sm font-extrabold text-indigo-700 font-mono mt-0.5">{previewData.generatedCount}</p>
            </div>

            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 col-span-2 sm:col-span-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 block">Est. Amount</span>
              <p className="text-sm font-extrabold text-emerald-700 font-mono mt-0.5">₹{previewData.totalEstimatedAmount.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* Skipped & Duplicate Charges Breakdown Badges */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
            <div className="flex items-center justify-between font-bold text-slate-800">
              <span>Safeguards Breakdown:</span>
              <div className="flex items-center gap-1.5">
                {previewData.alreadyExistsCount > 0 && (
                  <Badge variant="info" size="sm" className="text-[9px]">
                    {previewData.alreadyExistsCount} Already Exist
                  </Badge>
                )}
                <Badge variant={previewData.skippedCount > 0 ? 'neutral' : 'success'} size="sm" className="text-[9px]">
                  {previewData.skippedCount > 0 ? `${previewData.skippedCount} Skipped` : 'Clean Batch'}
                </Badge>
              </div>
            </div>

            {previewData.skippedBreakdown && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {(previewData.skippedBreakdown.alreadyExists > 0 || previewData.alreadyExistsCount > 0) && (
                  <Badge variant="info" size="sm" className="text-[9px]">
                    {previewData.alreadyExistsCount || previewData.skippedBreakdown.alreadyExists} Generated (Skipped)
                  </Badge>
                )}
                {previewData.skippedBreakdown.notActive > 0 && (
                  <Badge variant="danger" size="sm" className="text-[9px]">
                    {previewData.skippedBreakdown.notActive} Inactive Student
                  </Badge>
                )}
                {previewData.skippedBreakdown.noFeeStructure > 0 && (
                  <Badge variant="warning" size="sm" className="text-[9px]">
                    {previewData.skippedBreakdown.noFeeStructure} No Fee Structure
                  </Badge>
                )}
              </div>
            )}
          </div>

          {previewData.generatedCount === 0 && (
            <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 text-sky-900 text-xs flex items-center gap-2 font-semibold">
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

      {/* STEP 4: SUCCESS SCREEN */}
      {currentStep === 4 && resultData && (
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-2xs space-y-4 text-center max-w-lg mx-auto w-full">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Fee Generation Completed</h2>
            <p className="text-xs text-slate-500 mt-0.5">Official charges created for {resultData.month}.</p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 text-left text-xs font-mono">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-[9px] font-bold text-slate-400 block uppercase">Created</span>
                <span className="text-indigo-600 font-extrabold text-xs">{resultData.generatedCount}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 block uppercase">Exists</span>
                <span className="text-sky-600 font-extrabold text-xs">{resultData.alreadyExistsCount || 0}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 block uppercase">Skipped</span>
                <span className="text-slate-600 font-bold text-xs">{resultData.skippedCount}</span>
              </div>
            </div>

            {resultData.skippedBreakdown && (
              <div className="pt-2 border-t border-slate-200 space-y-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase block font-sans">Skipped Reasons</span>
                <div className="flex flex-wrap gap-1 pt-0.5 font-sans">
                  {(resultData.alreadyExistsCount > 0 || resultData.skippedBreakdown.alreadyExists > 0) && (
                    <Badge variant="info" size="sm" className="text-[9px]">
                      {resultData.alreadyExistsCount || resultData.skippedBreakdown.alreadyExists} Already Generated
                    </Badge>
                  )}
                  {resultData.skippedBreakdown.notActive > 0 && (
                    <Badge variant="danger" size="sm" className="text-[9px]">
                      {resultData.skippedBreakdown.notActive} Inactive Student
                    </Badge>
                  )}
                  {resultData.skippedBreakdown.noFeeStructure > 0 && (
                    <Badge variant="warning" size="sm" className="text-[9px]">
                      {resultData.skippedBreakdown.noFeeStructure} No Fee Structure
                    </Badge>
                  )}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-200">
              <span className="text-[9px] font-bold text-slate-400 block uppercase">Total Amount Generated</span>
              <span className="text-emerald-600 font-extrabold text-sm">₹{Number(resultData.totalAmount).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="flex justify-center gap-2.5 pt-1">
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

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsTempModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add to Sheet</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
