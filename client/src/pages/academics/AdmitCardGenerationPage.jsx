import React, { useState, useEffect, useMemo } from 'react';
import {
  Printer,
  IdCard,
  FileText,
  Search,
  Loader2,
  Eye,
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
import { AdmitCardTemplate } from '../../components/academics/AdmitCardTemplate.jsx';

export const AdmitCardGenerationPage = () => {
  const { academicYears, selectedYearId, selectedYear } = useAcademicYear();

  // 1. School Data & Academic Configuration
  const [school, setSchool] = useState({});
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [mediums, setMediums] = useState([]);
  const [streams, setStreams] = useState([]);

  // 2. Generation Inputs & Filters
  const [academicYearId, setAcademicYearId] = useState(selectedYearId || '');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [mediumId, setMediumId] = useState('');
  const [streamId, setStreamId] = useState('');
  const [examName, setExamName] = useState(() => storage.getAdmitCardExamName() || 'Half Yearly Examination');
  const [searchTerm, setSearchTerm] = useState('');

  // 3. Students & Selection State
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [activePreviewStudentId, setActivePreviewStudentId] = useState(null);
  const [individualPrintStudent, setIndividualPrintStudent] = useState(null);

  // Sync active academic year ID if context changes initially
  useEffect(() => {
    if (selectedYearId && !academicYearId) {
      setAcademicYearId(selectedYearId);
    }
  }, [selectedYearId, academicYearId]);

  // Handle Exam Name change with local storage persistence
  const handleExamNameChange = (val) => {
    setExamName(val);
    storage.setAdmitCardExamName(val);
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
      setLoadingConfig(true);
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
      } finally {
        setLoadingConfig(false);
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
    setActivePreviewStudentId(id);
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

  // Selected Academic Year Object Name
  const currentYearObj = useMemo(() => {
    return academicYears.find((y) => y.id === academicYearId) || selectedYear || {};
  }, [academicYears, academicYearId, selectedYear]);

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

    setIndividualPrintStudent(item);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="space-y-4 pb-8">
      {/* 1. Remastered Compact Header */}
      <div className="print:hidden">
        <ModulePageHeader
          title="Admit Card Generation"
          description="Select class criteria, enter exam name, preview live, and generate printable admit cards."
          icon={IdCard}
          actions={
            <Button
              size="sm"
              onClick={handleGenerateAndPrint}
              disabled={loadingStudents || selectedStudents.length === 0 || !examName.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center gap-1.5 font-semibold text-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Generate Admit Cards ({selectedStudents.length})</span>
            </Button>
          }
        />
      </div>

      {/* 2. Compact Generation Criteria Bar */}
      <Card className="border-slate-200 shadow-2xs print:hidden">
        <CardContent className="p-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 items-end">
            {/* Exam Name Input (Required, sm) */}
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                Exam Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={examName}
                onChange={(e) => handleExamNameChange(e.target.value)}
                placeholder="e.g. Half Yearly Examination"
                className="w-full h-8 px-2.5 rounded-md border border-slate-300 text-xs font-medium text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              />
            </div>

            {/* Academic Year (sm) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Academic Year</label>
              <Select
                value={academicYearId}
                onChange={(e) => setAcademicYearId(e.target.value)}
                size="sm"
                className="w-full text-xs"
              >
                {academicYears.map((yr) => (
                  <option key={yr.id} value={yr.id}>
                    {yr.name} {yr.isCurrent ? '(Active)' : ''}
                  </option>
                ))}
              </Select>
            </div>

            {/* Class (Required, sm) */}
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

            {/* Section (sm) */}
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

            {/* Medium (sm) */}
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
          </div>

          {/* Stream Selector if Class hasStream */}
          {selectedClass && selectedClass.hasStream && (
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2">
              <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                Stream Required:
              </span>
              <div className="w-56">
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
        </CardContent>
      </Card>

      {/* 3. Workspace: Directory Table + Single Card Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start print:hidden">
        {/* Left Column: Student Selection Table (7 Cols) */}
        <div className="lg:col-span-7 space-y-3">
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="border-b border-slate-100 bg-white py-2.5 px-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Student Directory</h3>
                  <Badge variant="secondary" className="font-mono text-[11px] py-0 px-1.5">
                    {selectedStudentCountText(selectedStudentIds.length, filteredStudents.length)}
                  </Badge>
                </div>

                {/* Table Search */}
                <div className="relative w-48 sm:w-52">
                  <Search className="w-3 h-3 absolute left-2 top-2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search student..."
                    className="w-full pl-7 pr-2.5 py-1 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {!classId ? (
                <div className="p-8 text-center">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-1.5 stroke-[1.5]" />
                  <p className="text-xs font-bold text-slate-700">Please Select a Class</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Select a class above to load eligible active students.
                  </p>
                </div>
              ) : loadingStudents ? (
                <div className="p-6 space-y-2">
                  <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 py-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    <span>Loading student list...</span>
                  </div>
                  <Skeleton className="h-7 w-full" />
                  <Skeleton className="h-7 w-full" />
                  <Skeleton className="h-7 w-full" />
                </div>
              ) : filteredStudents.length === 0 ? (
                <EmptyState
                  title="No Students Found"
                  description="No active students match the selected class and filters."
                  icon={IdCard}
                  className="py-8"
                />
              ) : (
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
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
                        <TableHead className="w-20 text-right py-2">Action</TableHead>
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
                            onClick={() => handleToggleSelect(item.id)}
                            onMouseEnter={() => setActivePreviewStudentId(item.id)}
                            className={`cursor-pointer transition-colors text-xs ${
                              isPreviewActive
                                ? 'bg-indigo-50/80 font-medium'
                                : isSelected
                                ? 'bg-indigo-50/30 hover:bg-indigo-50/60'
                                : 'hover:bg-slate-50'
                            }`}
                          >
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
                            {/* Individual Print Button in Table Row */}
                            <TableCell className="text-right py-1.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={(e) => handlePrintIndividual(e, item)}
                                title={`Print Admit Card for ${item.name}`}
                                aria-label={`Print Admit Card for ${item.name}`}
                                className="p-1.5 rounded-md border border-slate-300 bg-white hover:bg-indigo-50 hover:border-indigo-600 hover:text-indigo-600 text-slate-700 shadow-2xs transition-colors inline-flex items-center justify-center cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Single Live Admit Card Preview Only (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="border-b border-slate-100 bg-slate-50/80 py-2.5 px-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-indigo-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Live Admit Card Preview
                  </h3>
                </div>
                {previewStudent?.name && (
                  <span className="text-[10.5px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                    {previewStudent.name}
                  </span>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-3 bg-slate-100/70">
              <div className="bg-white border border-slate-300 rounded-md p-2 shadow-xs max-w-md mx-auto">
                <AdmitCardTemplate
                  school={school}
                  academicYearName={currentYearObj?.name}
                  examName={examName}
                  student={previewStudent}
                  enrollment={previewStudent?.enrollment}
                  isPreview={true}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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
                school={school}
                academicYearName={currentYearObj?.name}
                examName={examName}
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
                className="a4-print-page flex flex-col justify-start gap-4"
                style={{
                  pageBreakAfter: isLastPage ? 'auto' : 'always',
                  breakAfter: isLastPage ? 'auto' : 'page',
                  boxSizing: 'border-box',
                  padding: '0',
                }}
              >
                {pagePair.map((item, cardIdx) => (
                  <div key={item?.id || cardIdx} className="w-full shrink-0">
                    <AdmitCardTemplate
                      school={school}
                      academicYearName={currentYearObj?.name}
                      examName={examName}
                      student={item}
                      enrollment={item?.enrollment}
                      isPreview={false}
                    />
                  </div>
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
