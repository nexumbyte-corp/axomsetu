import React, { useState, useEffect, useMemo } from 'react';
import {
  Printer,
  IdCard,
  FileText,
  Search,
  Loader2,
  Eye,
  Scissors,
  Sparkles,
  Filter,
  Users,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  X,
} from 'lucide-react';
import { useAcademicYear } from '../../hooks/useAcademicYear.js';
import { studentService } from '../../services/student.service.js';
import { academicService } from '../../services/academic.service.js';
import { schoolService } from '../../services/school.service.js';
import { storage } from '../../utils/storage.js';
import { Button } from '../../components/ui/Button.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Card, CardHeader, CardContent } from '../../components/ui/Card.jsx';
import { Checkbox } from '../../components/ui/Checkbox.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { StudentAvatar } from '../../components/students/StudentAvatar.jsx';
import { toast } from '../../components/ui/Toast.jsx';
import { ModulePageHeader } from '../../components/ui/ModulePageHeader.jsx';
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from '../../components/ui/Table.jsx';
import { DatePicker } from '../../components/ui/DatePicker.jsx';
import { AdmitCardTemplate, ADMIT_CARD_PRESETS, DEFAULT_PRESET_ID } from '../../components/academics/AdmitCardTemplate.jsx';

export const AdmitCardGenerationPage = () => {
  const { academicYears, selectedYearId, selectedYear } = useAcademicYear();

  // 1. School Data & Academic Configuration
  const [school, setSchool] = useState({});
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [mediums, setMediums] = useState([]);
  const [streams, setStreams] = useState([]);

  // 2. Active Academic Year (automatically resolved from tenant current session)
  const activeAcademicYear = useMemo(() => {
    return academicYears.find((y) => y.isCurrent) || selectedYear || null;
  }, [academicYears, selectedYear]);

  const academicYearId = activeAcademicYear?.id || selectedYearId || '';

  // 3. Generation Inputs & Filters
  const [templatePreset, setTemplatePreset] = useState(
    () => storage.getAdmitCardTemplatePreset() || DEFAULT_PRESET_ID
  );
  const [validUptoDate, setValidUptoDate] = useState(() => storage.getAdmitCardValidUpto() || '');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [mediumId, setMediumId] = useState('');
  const [streamId, setStreamId] = useState('');
  const [examName, setExamName] = useState(() => storage.getAdmitCardExamName() || 'Half Yearly Examination');
  const [searchTerm, setSearchTerm] = useState('');

  // 4. Students & Selection State
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [activePreviewStudentId, setActivePreviewStudentId] = useState(null);
  const [individualPrintStudent, setIndividualPrintStudent] = useState(null);

  // 5. Responsive Tab & Live Preview Scale State
  const [mobileTab, setMobileTab] = useState('directory'); // 'directory' | 'preview'
  const [previewScale, setPreviewScale] = useState(1); // 1, 0.9, 0.8

  // Handle Template Preset change with local storage persistence
  const handleTemplatePresetChange = (val) => {
    setTemplatePreset(val);
    storage.setAdmitCardTemplatePreset(val);
  };

  // Active Preset Object for details display
  const activePresetObj = useMemo(() => {
    return ADMIT_CARD_PRESETS.find((p) => p.id === templatePreset) || ADMIT_CARD_PRESETS[0];
  }, [templatePreset]);

  // Handle Exam Name change with local storage persistence
  const handleExamNameChange = (val) => {
    setExamName(val);
    storage.setAdmitCardExamName(val);
  };

  // Handle Valid Upto Date change with local storage persistence
  const handleValidUptoDateChange = (val) => {
    const stringVal = typeof val === 'object' && val?.target ? val.target.value : (val || '');
    setValidUptoDate(stringVal);
    storage.setAdmitCardValidUpto(stringVal);
  };

  // Reset individual print student state after printing completes
  useEffect(() => {
    const handleAfterPrint = () => {
      setIndividualPrintStudent(null);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  // Load School Profile & Setup Options Once
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const [schRes, clsRes, secRes, medRes, strRes] = await Promise.all([
          schoolService.getTenantProfile(),
          academicService.getClasses(),
          academicService.getSections(),
          academicService.getMediums(),
          academicService.getStreams(),
        ]);

        if (schRes.success && schRes.data) setSchool(schRes.data);
        if (clsRes.success) setClasses(clsRes.data || []);
        if (secRes.success) setSections(secRes.data || []);
        if (medRes.success) setMediums(medRes.data || []);
        if (strRes.success) setStreams(strRes.data || []);
      } catch (err) {
        console.error('Failed to load admit card configuration', err);
        toast.error('Failed to load academic setup information');
      }
    };
    fetchConfig();
  }, []);

  // Selected Class details (check if hasStream is true)
  const selectedClass = useMemo(() => {
    return classes.find((c) => c.id === classId) || null;
  }, [classes, classId]);

  // Clear Stream filter when selected class does not support streams
  useEffect(() => {
    if (selectedClass && !selectedClass.hasStream) {
      setStreamId('');
    }
  }, [selectedClass]);

  // Fetch Active Students when filters change
  useEffect(() => {
    const fetchStudents = async () => {
      if (!academicYearId || !classId) {
        setStudents([]);
        setSelectedStudentIds([]);
        setActivePreviewStudentId(null);
        return;
      }

      setLoadingStudents(true);
      try {
        const params = {
          academicYearId,
          classId,
          sectionId: sectionId || undefined,
          mediumId: mediumId || undefined,
          streamId: streamId || undefined,
          status: 'ACTIVE', // Active students only
          limit: 500, // Query full class list
        };

        const res = await studentService.getStudents(params);
        if (res.success && Array.isArray(res.data)) {
          setStudents(res.data);
          // Default: select all loaded students by student ID
          setSelectedStudentIds(res.data.map((item) => item.id));
          setActivePreviewStudentId(res.data[0]?.id || null);
        } else {
          setStudents([]);
          setSelectedStudentIds([]);
          setActivePreviewStudentId(null);
        }
      } catch (err) {
        console.error('Failed to fetch students for admit cards', err);
        toast.error('Unable to fetch student list');
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchStudents();
  }, [academicYearId, classId, sectionId, mediumId, streamId]);

  // Filtered students by search term
  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return students;
    const term = searchTerm.trim().toLowerCase();
    return students.filter((item) => {
      const rollStr = String(item.enrollment?.rollNumber ?? item.enrollment?.rollNo ?? '');
      const admStr = String(item.admissionNo || '').toLowerCase();
      const nameStr = String(item.name || '').toLowerCase();
      return nameStr.includes(term) || admStr.includes(term) || rollStr.includes(term);
    });
  }, [students, searchTerm]);

  // Selection Handlers
  const handleSelectAll = (checked) => {
    if (checked) {
      const allIds = filteredStudents.map((s) => s.id);
      setSelectedStudentIds(allIds);
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    setSelectedStudentIds(filteredStudents.map((s) => s.id));
  };

  const handleDeselectAll = () => {
    setSelectedStudentIds([]);
  };

  const isAllSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((s) => selectedStudentIds.includes(s.id));

  // Get selected student objects for generation / preview
  const selectedStudents = useMemo(() => {
    return students.filter((s) => selectedStudentIds.includes(s.id));
  }, [students, selectedStudentIds]);

  // Representative student for single preview card
  const previewStudent = useMemo(() => {
    if (activePreviewStudentId) {
      const found = students.find((s) => s.id === activePreviewStudentId);
      if (found) return found;
    }
    return selectedStudents[0] || filteredStudents[0] || null;
  }, [students, activePreviewStudentId, selectedStudents, filteredStudents]);

  // Index for preview stepper
  const previewStudentIndex = useMemo(() => {
    if (!previewStudent || filteredStudents.length === 0) return -1;
    return filteredStudents.findIndex((s) => s.id === previewStudent.id);
  }, [previewStudent, filteredStudents]);

  const handlePrevStudent = () => {
    if (filteredStudents.length <= 1) return;
    const prevIdx = previewStudentIndex > 0 ? previewStudentIndex - 1 : filteredStudents.length - 1;
    setActivePreviewStudentId(filteredStudents[prevIdx].id);
  };

  const handleNextStudent = () => {
    if (filteredStudents.length <= 1) return;
    const nextIdx = previewStudentIndex < filteredStudents.length - 1 ? previewStudentIndex + 1 : 0;
    setActivePreviewStudentId(filteredStudents[nextIdx].id);
  };

  const handlePreviewMobileStudent = (id) => {
    setActivePreviewStudentId(id);
    setMobileTab('preview');
  };

  // Selected Academic Year Object
  const currentYearObj = useMemo(() => {
    return activeAcademicYear || {};
  }, [activeAcademicYear]);

  // Group selected students into pairs (2 cards per A4 page)
  const pairedPages = useMemo(() => {
    const list = selectedStudents.length > 0 ? selectedStudents : [null];
    const pages = [];
    for (let i = 0; i < list.length; i += 2) {
      pages.push(list.slice(i, i + 2));
    }
    return pages;
  }, [selectedStudents]);

  // Trigger bulk browser print
  const handleGenerateAndPrint = () => {
    if (!examName.trim()) {
      toast.error('Please enter the Examination Name');
      return;
    }

    if (!validUptoDate) {
      toast.error('Please select the Valid Upto Date');
      return;
    }

    if (!classId) {
      toast.error('Please select a Class first');
      return;
    }

    if (selectedStudentIds.length === 0) {
      toast.error('Please select at least one student to generate admit cards');
      return;
    }

    setIndividualPrintStudent(null);
    setTimeout(() => {
      window.print();
    }, 50);
  };

  // Trigger single individual student print directly from table row
  const handlePrintIndividual = (e, item) => {
    if (e) e.stopPropagation();
    if (!examName.trim()) {
      toast.error('Please enter the Examination Name');
      return;
    }

    if (!validUptoDate) {
      toast.error('Please select the Valid Upto Date');
      return;
    }

    setIndividualPrintStudent(item);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="space-y-3.5 pb-20 lg:pb-8">
      {/* 1. Header Bar */}
      <div className="print:hidden">
        <ModulePageHeader
          title="Admit Card Generation"
          description={`Configure exam criteria, select candidates, preview live across 10 presets, and generate printable admit cards${activeAcademicYear?.name ? ` • Academic Session: ${activeAcademicYear.name}` : ''}.`}
          icon={IdCard}
          actions={
            <Button
              size="sm"
              onClick={handleGenerateAndPrint}
              disabled={loadingStudents || selectedStudents.length === 0 || !examName.trim() || !validUptoDate}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center gap-1.5 font-semibold text-xs py-1.5 px-3"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Generate Admit Cards ({selectedStudents.length})</span>
            </Button>
          }
        />
      </div>

      {/* 2. Generation Criteria & Filters (Responsive 2-Card Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 print:hidden">
        {/* Left Sub-Card: Exam & Template Configuration (5 cols on lg) */}
        <Card className="lg:col-span-5 border-slate-200/90 shadow-2xs bg-white rounded-xl">
          <CardContent className="p-3 sm:p-3.5 space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>1. Exam & Template Details</span>
              </div>
              <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded truncate max-w-36">
                {activePresetObj.name}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Exam Name */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                  Examination Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={examName}
                  onChange={(e) => handleExamNameChange(e.target.value)}
                  placeholder="e.g. Half Yearly Examination 2026-27"
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-2xs"
                />
              </div>

              {/* Template Preset Dropdown */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                  Card Style Preset
                </label>
                <Select
                  value={templatePreset}
                  onChange={(e) => handleTemplatePresetChange(e.target.value)}
                  size="sm"
                  className="w-full text-xs font-semibold"
                  aria-label="Select Admit Card Template Preset"
                >
                  {ADMIT_CARD_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Valid Upto Date */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                  Valid Upto <span className="text-rose-500">*</span>
                </label>
                <DatePicker
                  value={validUptoDate}
                  onChange={handleValidUptoDateChange}
                  size="sm"
                  placeholder="DD-MM-YYYY"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Sub-Card: Class & Cohort Selector (7 cols on lg) */}
        <Card className="lg:col-span-7 border-slate-200/90 shadow-2xs bg-white rounded-xl">
          <CardContent className="p-3 sm:p-3.5 space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
                <Filter className="w-3.5 h-3.5 text-indigo-600" />
                <span>2. Select Class & Cohort</span>
              </div>
              {selectedClass && (
                <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  {selectedClass.name}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Class (Required) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                  Class <span className="text-rose-500">*</span>
                </label>
                <Select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  size="sm"
                  className="w-full text-xs font-semibold"
                >
                  <option value="">-- Select Class --</option>
                  {classes
                    .filter((c) => c.isActive !== false)
                    .map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                </Select>
              </div>

              {/* Section */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Section</label>
                <Select
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  size="sm"
                  className="w-full text-xs"
                  disabled={!classId}
                >
                  <option value="">All Sections</option>
                  {sections
                    .filter((s) => s.isActive !== false)
                    .map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.name}
                      </option>
                    ))}
                </Select>
              </div>

              {/* Medium */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Medium</label>
                <Select
                  value={mediumId}
                  onChange={(e) => setMediumId(e.target.value)}
                  size="sm"
                  className="w-full text-xs"
                >
                  <option value="">All Mediums</option>
                  {mediums
                    .filter((m) => m.isActive !== false)
                    .map((med) => (
                      <option key={med.id} value={med.id}>
                        {med.name}
                      </option>
                    ))}
                </Select>
              </div>

              {/* Stream Selector if Class hasStream */}
              {selectedClass && selectedClass.hasStream && (
                <div className="sm:col-span-3 pt-1 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded shrink-0">
                    Stream Required:
                  </span>
                  <div className="flex-1 min-w-[160px] max-w-xs">
                    <Select
                      value={streamId}
                      onChange={(e) => setStreamId(e.target.value)}
                      size="sm"
                      className="w-full text-xs font-semibold"
                    >
                      <option value="">All Streams</option>
                      {streams
                        .filter((st) => st.isActive !== false)
                        .map((str) => (
                          <option key={str.id} value={str.id}>
                            {str.name}
                          </option>
                        ))}
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Mobile / Tablet Tab Switcher (< lg screens) */}
      <div className="lg:hidden flex items-center p-1 bg-slate-200/80 rounded-xl gap-1 print:hidden">
        <button
          type="button"
          onClick={() => setMobileTab('directory')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'directory'
              ? 'bg-white text-indigo-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Students Directory ({filteredStudents.length})</span>
          {selectedStudentIds.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 bg-indigo-100 text-indigo-800 text-[10px] rounded-full font-bold">
              {selectedStudentIds.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'preview'
              ? 'bg-white text-indigo-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Live Card Preview</span>
        </button>
      </div>

      {/* 4. Main Workspace: Directory Table + Live Admit Card Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start print:hidden">
        {/* Left Column: Student Selection Directory (7 cols on lg) */}
        <div
          className={`space-y-3 ${
            mobileTab === 'preview' ? 'hidden lg:block' : 'block'
          } lg:col-span-7`}
        >
          <Card className="border-slate-200/90 shadow-2xs bg-white rounded-xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-white py-2.5 px-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Student Directory
                  </h3>
                  <Badge variant="secondary" className="font-mono text-[11px] py-0 px-1.5">
                    {selectedStudentCountText(selectedStudentIds.length, filteredStudents.length)}
                  </Badge>

                  {/* Quick Select / Deselect All Pill Buttons */}
                  {filteredStudents.length > 0 && (
                    <div className="flex items-center gap-1 ml-1">
                      <button
                        type="button"
                        onClick={handleSelectAllFiltered}
                        className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline px-1 py-0.5 cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300 text-xs">|</span>
                      <button
                        type="button"
                        onClick={handleDeselectAll}
                        className="text-[10px] font-semibold text-slate-500 hover:text-slate-800 hover:underline px-1 py-0.5 cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                {/* Search Bar with Clear Button */}
                <div className="relative w-full sm:w-48 lg:w-52">
                  <Search className="w-3 h-3 absolute left-2 top-2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search roll, name, adm..."
                    className="w-full pl-7 pr-6 py-1 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {!classId ? (
                <div className="p-8 text-center">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-1.5 stroke-[1.5]" />
                  <p className="text-xs font-bold text-slate-700">Please Select a Class</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs mx-auto">
                    Choose a class above to populate students and generate examination admit cards.
                  </p>
                </div>
              ) : loadingStudents ? (
                <div className="p-6 space-y-2">
                  <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 py-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    <span>Loading student roster...</span>
                  </div>
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : filteredStudents.length === 0 ? (
                <EmptyState
                  title="No Students Found"
                  description="No active students match the selected class and filters."
                  icon={IdCard}
                  className="py-8"
                />
              ) : (
                <>
                  {/* Mobile Student Cards List (< 768px) */}
                  <div className="md:hidden divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                    {filteredStudents.map((item) => {
                      const isSelected = selectedStudentIds.includes(item.id);
                      const isPreviewActive = activePreviewStudentId === item.id;
                      const enroll = item.enrollment || {};
                      const rollVal = enroll.rollNumber ?? enroll.rollNo ?? '';

                      return (
                        <div
                          key={item.id}
                          onClick={() => setActivePreviewStudentId(item.id)}
                          className={`p-3 transition-colors flex items-center justify-between gap-2.5 cursor-pointer ${
                            isPreviewActive
                              ? 'bg-indigo-50/80 border-l-4 border-indigo-600'
                              : isSelected
                              ? 'bg-indigo-50/25 hover:bg-slate-50'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {/* Checkbox: stop propagation so clicking only toggles selection */}
                            <div onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={isSelected}
                                onChange={() => handleToggleSelect(item.id)}
                                id={`mob-student-${item.id}`}
                              />
                            </div>

                            <StudentAvatar
                              name={item.name}
                              photoUrl={item.photoUrl}
                              size="sm"
                              className="shrink-0"
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs text-slate-900 truncate">
                                  {item.name}
                                </span>
                                {rollVal && (
                                  <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">
                                    Roll: {rollVal}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5 truncate">
                                <span>{enroll.class?.name || ''} {enroll.section?.name ? `(${enroll.section.name})` : ''}</span>
                                {enroll.medium?.name && <span>• {enroll.medium.name}</span>}
                                {enroll.stream?.name && <span>• {enroll.stream.name}</span>}
                              </div>
                              {item.guardianName && (
                                <div className="text-[10px] text-slate-400 truncate">
                                  G: {item.guardianName}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Quick Preview & Individual Print Buttons */}
                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handlePreviewMobileStudent(item.id)}
                              title="Preview Admit Card"
                              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 shadow-2xs transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handlePrintIndividual(e, item)}
                              title={`Print Admit Card for ${item.name}`}
                              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 shadow-2xs transition-colors cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Table View (>= 768px) */}
                  <div className="hidden md:block overflow-x-auto max-h-[520px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200 text-xs">
                        <TableRow>
                          <TableHead className="w-9 text-center py-2">
                            <Checkbox
                              checked={isAllSelected}
                              onChange={(e) => handleSelectAll(e.target.checked)}
                            />
                          </TableHead>
                          <TableHead className="w-14 py-2">Roll</TableHead>
                          <TableHead className="py-2">Student Name</TableHead>
                          <TableHead className="py-2">Class & Sec</TableHead>
                          <TableHead className="py-2">Medium</TableHead>
                          {selectedClass?.hasStream && <TableHead className="py-2">Stream</TableHead>}
                          <TableHead className="w-24 text-right py-2">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStudents.map((item) => {
                          const isSelected = selectedStudentIds.includes(item.id);
                          const isPreviewActive = activePreviewStudentId === item.id;
                          const enroll = item.enrollment || {};
                          const rollVal = enroll.rollNumber ?? enroll.rollNo ?? '';
                          return (
                            <TableRow
                              key={item.id}
                              onClick={() => setActivePreviewStudentId(item.id)}
                              onMouseEnter={() => setActivePreviewStudentId(item.id)}
                              className={`cursor-pointer transition-colors text-xs ${
                                isPreviewActive
                                  ? 'bg-indigo-50/80 font-medium border-l-3 border-indigo-600'
                                  : isSelected
                                  ? 'bg-indigo-50/30 hover:bg-indigo-50/50'
                                  : 'hover:bg-slate-50'
                              }`}
                            >
                              {/* Selection Checkbox */}
                              <TableCell className="text-center py-1.5" onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={isSelected}
                                  onChange={() => handleToggleSelect(item.id)}
                                />
                              </TableCell>
                              <TableCell className="font-mono font-bold text-xs text-slate-800 py-1.5">
                                {rollVal}
                              </TableCell>
                              <TableCell className="py-1.5">
                                <div className="flex items-center gap-2">
                                  <StudentAvatar
                                    name={item.name}
                                    photoUrl={item.photoUrl}
                                    size="xs"
                                  />
                                  <div>
                                    <span className="font-bold text-xs text-slate-900 block leading-tight">
                                      {item.name}
                                    </span>
                                    {item.guardianName && (
                                      <span className="text-[10px] text-slate-500 block leading-tight">
                                        G: {item.guardianName}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs font-medium text-slate-700 py-1.5">
                                {enroll.class?.name || ''} {enroll.section?.name ? `(${enroll.section.name})` : ''}
                              </TableCell>
                              <TableCell className="text-xs text-slate-600 py-1.5">
                                {enroll.medium?.name || ''}
                              </TableCell>
                              {selectedClass?.hasStream && (
                                <TableCell className="text-xs font-medium text-slate-700 py-1.5">
                                  {enroll.stream?.name || ''}
                                </TableCell>
                              )}
                              {/* Action Buttons */}
                              <TableCell className="text-right py-1.5" onClick={(e) => e.stopPropagation()}>
                                <div className="inline-flex items-center gap-1 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => setActivePreviewStudentId(item.id)}
                                    title="Preview this candidate"
                                    className={`p-1.5 rounded-md border text-xs shadow-2xs transition-colors cursor-pointer ${
                                      isPreviewActive
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                                    }`}
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handlePrintIndividual(e, item)}
                                    title={`Print Admit Card for ${item.name}`}
                                    className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-500 hover:text-indigo-600 text-slate-600 shadow-2xs transition-colors cursor-pointer"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Single Live Admit Card Preview (5 cols on lg, sticky on desktop) */}
        <div
          className={`space-y-3 ${
            mobileTab === 'directory' ? 'hidden lg:block' : 'block'
          } lg:col-span-5 lg:sticky lg:top-4 self-start`}
        >
          <Card className="border-slate-200/90 shadow-2xs bg-white rounded-xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/80 py-2.5 px-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-indigo-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Live Preview
                  </h3>
                </div>

                {/* Stepper + Scale Controls */}
                <div className="flex items-center gap-1.5">
                  {filteredStudents.length > 0 && (
                    <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={handlePrevStudent}
                        disabled={filteredStudents.length <= 1}
                        className="p-1 rounded text-slate-600 hover:text-indigo-600 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                        title="Previous Student"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                      <span className="text-[10px] font-mono font-bold text-slate-700 px-1">
                        {previewStudentIndex >= 0 ? `${previewStudentIndex + 1}/${filteredStudents.length}` : '—'}
                      </span>
                      <button
                        type="button"
                        onClick={handleNextStudent}
                        disabled={filteredStudents.length <= 1}
                        className="p-1 rounded text-slate-600 hover:text-indigo-600 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                        title="Next Student"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Zoom Scale Pill */}
                  <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setPreviewScale((s) => Math.max(0.75, +(s - 0.1).toFixed(2)))}
                      disabled={previewScale <= 0.75}
                      className="p-1 text-slate-500 hover:text-indigo-600 disabled:opacity-30 cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3 h-3" />
                    </button>
                    <span className="text-[10px] font-mono font-semibold text-slate-600 px-0.5">
                      {Math.round(previewScale * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewScale((s) => Math.min(1.1, +(s + 0.1).toFixed(2)))}
                      disabled={previewScale >= 1.1}
                      className="p-1 text-slate-500 hover:text-indigo-600 disabled:opacity-30 cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Preset Selector & Active Candidate Name */}
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex-1 max-w-[170px]">
                  <Select
                    value={templatePreset}
                    onChange={(e) => handleTemplatePresetChange(e.target.value)}
                    size="sm"
                    className="text-xs py-0.5 font-semibold"
                    aria-label="Switch Preset Template"
                  >
                    {ADMIT_CARD_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name}
                      </option>
                    ))}
                  </Select>
                </div>

                {previewStudent?.name && (
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded truncate max-w-[160px]">
                    {previewStudent.name}
                  </span>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-3 bg-slate-100/70 overflow-hidden">
              {/* Active Preset Tagline Information */}
              <div className="mb-2 flex items-center justify-between text-[11px] text-slate-600 px-0.5">
                <span className="font-semibold text-slate-800 truncate">
                  {activePresetObj.label}
                </span>
                <span className="text-slate-500 text-[10px] hidden sm:inline truncate max-w-44 ml-2">
                  {activePresetObj.tagline}
                </span>
              </div>

              <div
                className="bg-white border border-slate-300 rounded-md p-2 shadow-xs max-w-md mx-auto transition-transform origin-top"
                style={{ transform: `scale(${previewScale})` }}
              >
                <AdmitCardTemplate
                  templateId={templatePreset}
                  school={school}
                  academicYearName={currentYearObj?.name}
                  examName={examName}
                  validUpto={validUptoDate}
                  student={previewStudent}
                  enrollment={previewStudent?.enrollment}
                  isPreview={true}
                />
              </div>

              {/* Bottom Quick Action for currently previewed student */}
              {previewStudent && (
                <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    onClick={(e) => handlePrintIndividual(e, previewStudent)}
                    className="flex-1 py-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-indigo-600 font-semibold shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print This Card Only</span>
                  </button>
                  <span className="text-[10px] text-slate-500 font-medium">
                    2 cards / A4 page
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 5. Mobile Sticky Floating Action Bar (< lg) */}
      {selectedStudents.length > 0 && (
        <div className="lg:hidden fixed bottom-3 left-3 right-3 z-30 bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-2xl shadow-xl flex items-center justify-between gap-3 border border-slate-800 print:hidden">
          <div className="min-w-0">
            <div className="text-xs font-bold truncate">
              {selectedStudents.length} {selectedStudents.length === 1 ? 'Student' : 'Students'} Selected
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {activePresetObj.name} • {examName || 'No exam name'}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setMobileTab(mobileTab === 'directory' ? 'preview' : 'directory')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 cursor-pointer"
            >
              {mobileTab === 'directory' ? 'View Preview' : 'View List'}
            </button>

            <Button
              size="sm"
              onClick={handleGenerateAndPrint}
              disabled={loadingStudents || selectedStudents.length === 0 || !examName.trim() || !validUptoDate}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5 py-1.5 px-3"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Generate Print</span>
            </Button>
          </div>
        </div>
      )}

      {/* 4. PRINT DOMAIN (HIDDEN ON SCREEN, VISIBLE ONLY FOR WINDOW.PRINT) */}
      <div className="hidden print:block printable-admit-cards-area">
        {/* Scenario A: Single Individual Student Print */}
        {individualPrintStudent ? (
          <div
            className="a4-print-page flex flex-col justify-start gap-4"
            style={{
              pageBreakAfter: 'auto',
              breakAfter: 'auto',
              boxSizing: 'border-box',
              padding: '0',
            }}
          >
            <div className="w-full shrink-0">
              <AdmitCardTemplate
                templateId={templatePreset}
                school={school}
                academicYearName={currentYearObj?.name}
                examName={examName}
                validUpto={validUptoDate}
                student={individualPrintStudent}
                enrollment={individualPrintStudent?.enrollment}
                isPreview={false}
              />
            </div>
          </div>
        ) : (
          /* Scenario B: Bulk Selected Students Print (Paired 2 per A4 page) */
          pairedPages.map((pagePair, pageIndex) => {
            const isLastPage = pageIndex === pairedPages.length - 1;
            return (
              <div
                key={pageIndex}
                className="a4-print-page flex flex-col justify-between py-1"
                style={{
                  height: '272mm',
                  maxHeight: '272mm',
                  pageBreakAfter: isLastPage ? 'auto' : 'always',
                  breakAfter: isLastPage ? 'auto' : 'page',
                  boxSizing: 'border-box',
                  padding: '0',
                  overflow: 'hidden',
                }}
              >
                {pagePair.map((item, cardIdx) => (
                  <React.Fragment key={item?.id || cardIdx}>
                    {cardIdx > 0 && (
                      <div className="w-full my-1 flex items-center justify-center text-slate-600 font-serif text-[8.5px] uppercase tracking-widest select-none shrink-0 print:my-1">
                        <div className="flex-1 border-b-2 border-dashed border-slate-700"></div>
                        <span className="px-2 py-0.5 bg-white border border-slate-700 rounded-sm font-black flex items-center gap-1 shrink-0 text-slate-900 text-[9px]">
                          <Scissors className="w-3 h-3 text-slate-900 transform -rotate-90 shrink-0" />
                          <span>CUT HERE</span>
                        </span>
                        <div className="flex-1 border-b-2 border-dashed border-slate-700"></div>
                      </div>
                    )}
                    <div className="w-full shrink-0">
                      <AdmitCardTemplate
                        templateId={templatePreset}
                        school={school}
                        academicYearName={currentYearObj?.name}
                        examName={examName}
                        validUpto={validUptoDate}
                        student={item}
                        enrollment={item?.enrollment}
                        isPreview={false}
                      />
                    </div>
                  </React.Fragment>
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// Helper for count badge
function selectedStudentCountText(selectedCount, totalCount) {
  if (totalCount === 0) return '0 Students';
  return `${selectedCount} of ${totalCount} Selected`;
}
