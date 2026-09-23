import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Users,
  Plus,
  MoreVertical,
  Lock,
  Edit,
  Sparkles,
  UserCheck,
  UserX,
  Trash2,
  Receipt,
  Building,
  RefreshCw,
} from 'lucide-react';
import { useAcademicYear } from '../../hooks/useAcademicYear.js';
import { studentService } from '../../services/student.service.js';
import { academicService } from '../../services/academic.service.js';
import { Button } from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { Dropdown, DropdownItem, DropdownDivider } from '../../components/ui/Dropdown.jsx';
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from '../../components/ui/Table.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { toast } from '../../components/ui/Toast.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import { usePageHeader } from '../../context/PageHeaderContext.jsx';

import { StudentAvatar } from '../../components/students/StudentAvatar.jsx';
import { StudentStatusBadge } from '../../components/students/StudentStatusBadge.jsx';
import { StudentFiltersDrawer } from '../../components/students/StudentFiltersDrawer.jsx';
import { IndividualPromotionModal } from '../../components/students/IndividualPromotionModal.jsx';
import { PhotoPreviewModal } from '../../components/students/PhotoPreviewModal.jsx';

const STUDENT_FILTERS_STORAGE_KEY = 'student_list_filters';

const EMPTY_FILTERS = {
  classId: '',
  sectionId: '',
  mediumId: '',
  streamId: '',
  residenceType: '',
  status: '',
};

const loadSavedStudentFilters = () => {
  try {
    const saved = localStorage.getItem(STUDENT_FILTERS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (err) {
    console.error('Failed loading saved student list filters:', err);
    return null;
  }
};

export const StudentsListPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedYear, selectedYearId, academicYears } = useAcademicYear();
  const { can } = usePermission();
  const { setHeaderInfo } = usePageHeader();

  const isLocked = Boolean(selectedYear?.isLocked);

  // Data States
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [highlightedStudentId, setHighlightedStudentId] = useState(null);

  // Setup Options
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [mediums, setMediums] = useState([]);
  const [streams, setStreams] = useState([]);

  // Search & Filter States (restored from localStorage if available)
  const savedFilterState = useMemo(loadSavedStudentFilters, []);
  const [searchTerm, setSearchTerm] = useState(() => savedFilterState?.searchTerm || '');
  const [debouncedSearch, setDebouncedSearch] = useState(() => savedFilterState?.searchTerm || '');
  const [filters, setFilters] = useState(() => ({
    classId: savedFilterState?.filters?.classId || '',
    sectionId: savedFilterState?.filters?.sectionId || '',
    mediumId: savedFilterState?.filters?.mediumId || '',
    streamId: savedFilterState?.filters?.streamId || '',
    residenceType: savedFilterState?.filters?.residenceType || '',
    status: savedFilterState?.filters?.status || '',
  }));
  const [page, setPage] = useState(() => savedFilterState?.page || 1);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Modal States
  const [selectedStudentForAction, setSelectedStudentForAction] = useState(null);
  const [activeModal, setActiveModal] = useState(null); // 'PROMOTE' | 'STATUS_CONFIRM' | 'DELETE_HARD'
  const [targetStatus, setTargetStatus] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);

  // Stable Refresh Signal
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshStudents = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setSelectedStudentForAction(null);
    setTargetStatus(null);
  }, []);

  // 1. Fetch Academic Setup Options Once on Mount
  useEffect(() => {
    Promise.allSettled([
      academicService.getClasses(),
      academicService.getSections(),
      academicService.getMediums(),
      academicService.getStreams(),
    ])
      .then(([clsRes, secRes, medRes, strRes]) => {
        if (clsRes.status === 'fulfilled' && clsRes.value?.success) setClasses(clsRes.value.data || []);
        if (secRes.status === 'fulfilled' && secRes.value?.success) setSections(secRes.value.data || []);
        if (medRes.status === 'fulfilled' && medRes.value?.success) setMediums(medRes.value.data || []);
        if (strRes.status === 'fulfilled' && strRes.value?.success) setStreams(strRes.value.data || []);
      })
      .catch((err) => {
        console.error('Failed loading academic setup options', err);
      });
  }, []);

  // 2. Debounce Search Input (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 3. Continuously persist active filters, search, and page to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STUDENT_FILTERS_STORAGE_KEY,
        JSON.stringify({ filters, searchTerm, page })
      );
    } catch (err) {
      console.error('Failed saving student list filters:', err);
    }
  }, [filters, searchTerm, page]);

  // 4. Fetch Students from Backend when parameters or refreshKey change
  useEffect(() => {
    if (!selectedYearId) return;
    let isCancelled = false;
    setLoading(true);

    const queryParams = {
      academicYearId: selectedYearId,
      page,
      limit: 20,
      search: debouncedSearch || undefined,
      classId: filters.classId || undefined,
      sectionId: filters.sectionId || undefined,
      mediumId: filters.mediumId || undefined,
      streamId: filters.streamId || undefined,
      residenceType: filters.residenceType || undefined,
      status: filters.status || undefined,
    };

    studentService
      .getStudents(queryParams)
      .then((res) => {
        if (!isCancelled && res?.success) {
          setStudents(res.data || []);
          if (res.pagination) {
            setPagination(res.pagination);
          }
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          toast.error(err?.message || 'Failed loading students list');
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedYearId, page, debouncedSearch, filters, refreshKey]);

  // 5. Handle new student navigation signal from AddStudentPage (runs once per added student)
  const handledNewStudentSignalRef = useRef(null);
  useEffect(() => {
    if (location.state?.newStudentAdded) {
      const signalKey = location.state.timestamp || location.state.createdStudentId || 'added';
      if (handledNewStudentSignalRef.current === signalKey) return;
      handledNewStudentSignalRef.current = signalKey;

      const createdId = location.state.createdStudentId;
      if (createdId) {
        setHighlightedStudentId(createdId);
        const timer = setTimeout(() => {
          setHighlightedStudentId(null);
        }, 8000);
        return () => clearTimeout(timer);
      }

      try {
        localStorage.removeItem(STUDENT_FILTERS_STORAGE_KEY);
      } catch (err) {
        console.error('Failed clearing student list filters:', err);
      }

      setFilters(EMPTY_FILTERS);
      setSearchTerm('');
      setDebouncedSearch('');
      setPage(1);
      setRefreshKey((k) => k + 1);

      try {
        window.history.replaceState({}, document.title);
      } catch {
        // Safe fallback
      }
    }
  }, [location.state]);

  // 6. Auto-refresh when tab gains focus or becomes visible
  useEffect(() => {
    const handleFocus = () => refreshStudents();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshStudents();
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refreshStudents]);

  // 7. Synchronize global top header actions (stable dependencies avoid context re-render loops)
  useEffect(() => {
    setHeaderInfo({
      title: 'Students',
      icon: Users,
      actions: (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshStudents}
            icon={RefreshCw}
            className="h-8 text-xs px-2.5"
            title="Refresh student list"
          >
            Refresh
          </Button>
          {can('STUDENTS_PROMOTE') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/app/students/promote')}
              icon={Sparkles}
              disabled={isLocked}
              className="h-8 text-xs px-3"
            >
              Bulk Promote
            </Button>
          )}
          {can('STUDENTS_CREATE') && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/app/students/new')}
              icon={Plus}
              disabled={isLocked}
              className="h-8 text-xs px-3"
            >
              Add Student
            </Button>
          )}
        </div>
      ),
    });

    return () => setHeaderInfo(null);
  }, [setHeaderInfo, navigate, can, isLocked, refreshStudents]);

  // Filter & Pagination Handlers
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setSearchTerm('');
    setDebouncedSearch('');
    setPage(1);
    try {
      localStorage.removeItem(STUDENT_FILTERS_STORAGE_KEY);
    } catch (err) {
      console.error('Failed clearing student list filters:', err);
    }
  };

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters]
  );

  // Status & Hard Delete Confirmation Handlers
  const handleStatusChangeClick = (student, newStatus) => {
    setSelectedStudentForAction(student);
    setTargetStatus(newStatus);
    setActiveModal('STATUS_CONFIRM');
  };

  const handleConfirmStatusChange = async () => {
    if (!selectedStudentForAction || !targetStatus) return;
    setStatusUpdating(true);
    try {
      await studentService.updateStudentStatus(selectedStudentForAction.id, targetStatus);
      toast.success(`Student status updated to ${targetStatus}`);
      refreshStudents();
    } catch (err) {
      toast.error(err?.message || 'Failed updating status');
    } finally {
      setStatusUpdating(false);
      closeModal();
    }
  };

  const handleDeleteStudentHard = async () => {
    if (!selectedStudentForAction) return;
    setStatusUpdating(true);
    try {
      const res = await studentService.deleteStudentHard(selectedStudentForAction.id);
      toast.success(res?.message || `Student '${selectedStudentForAction.name}' deleted successfully.`);
      refreshStudents();
    } catch (err) {
      toast.error(err?.message || 'Failed to delete student.');
    } finally {
      setStatusUpdating(false);
      closeModal();
    }
  };

  const handlePhotoPreview = (e, student) => {
    if (student.photoUrl) {
      e.stopPropagation();
      setPreviewPhoto({
        photoUrl: student.photoUrl,
        name: student.name,
        admissionNo: student.admissionNo,
      });
    }
  };

  // Reusable Single-Source Student Actions Dropdown (shared across Desktop Table & Mobile Cards)
  const renderStudentActions = (item) => {
    const isEnrolledHostel = item.hostel?.enrolled;

    return (
      <Dropdown
        align="right"
        trigger={
          <button
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            aria-label="Student options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        }
      >
        <DropdownItem icon={Edit} onClick={() => navigate(`/app/students/${item.id}/edit`)}>
          Edit Student
        </DropdownItem>
        <DropdownItem icon={Receipt} onClick={() => navigate(`/app/students/${item.id}/ledger`)}>
          Manage Fees
        </DropdownItem>
        {isEnrolledHostel && (
          <DropdownItem icon={Building} onClick={() => navigate(`/app/students/${item.id}?tab=hostel`)}>
            Hostel Details
          </DropdownItem>
        )}
        {!isLocked && (
          <>
            {item.status !== 'GRADUATED' && item.status !== 'LEFT' && (
              <DropdownItem
                icon={Sparkles}
                onClick={() => {
                  setSelectedStudentForAction(item);
                  setActiveModal('PROMOTE');
                }}
              >
                Promote
              </DropdownItem>
            )}

            <DropdownDivider />

            {item.status === 'ACTIVE' && (
              <>
                <DropdownItem
                  icon={UserX}
                  danger
                  onClick={() => handleStatusChangeClick(item, 'LEFT')}
                >
                  Mark as LEFT
                </DropdownItem>
                <DropdownItem
                  icon={UserCheck}
                  onClick={() => handleStatusChangeClick(item, 'GRADUATED')}
                >
                  Mark as GRADUATED
                </DropdownItem>
              </>
            )}
            {item.status !== 'ACTIVE' && (
              <DropdownItem
                icon={UserCheck}
                onClick={() => handleStatusChangeClick(item, 'ACTIVE')}
              >
                Reactivate Student
              </DropdownItem>
            )}
            {can('STUDENTS_DELETE') && (
              <>
                <DropdownDivider />
                <DropdownItem
                  icon={Trash2}
                  danger
                  onClick={() => {
                    setSelectedStudentForAction(item);
                    setActiveModal('DELETE_HARD');
                  }}
                >
                  Delete
                </DropdownItem>
              </>
            )}
          </>
        )}
      </Dropdown>
    );
  };

  return (
    <div className="space-y-3.5">
      {/* Locked Academic Year Warning Banner */}
      {isLocked && (
        <Alert variant="warning" title="Academic Year Locked" icon={Lock}>
          {selectedYear?.name} is locked. Student enrollments for this historical academic year are read-only.
        </Alert>
      )}

      {/* Unified Search & Filter Toolbar */}
      <StudentFiltersDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        onOpenMobileDrawer={() => setIsFilterDrawerOpen(true)}
        searchTerm={searchTerm}
        onSearchChange={(e) => {
          setSearchTerm(e.target.value);
          setPage(1);
        }}
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        classes={classes}
        sections={sections}
        mediums={mediums}
        streams={streams}
        activeCount={activeFilterCount}
        totalStudents={pagination.total}
      />

      {/* Content Area: Table / Mobile Cards / Skeletons / EmptyState */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
          <Skeleton height="36px" width="100%" />
          <Skeleton height="42px" width="100%" />
          <Skeleton height="42px" width="100%" />
          <Skeleton height="42px" width="100%" />
          <Skeleton height="42px" width="100%" />
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
          {activeFilterCount > 0 || debouncedSearch ? (
            <EmptyState
              title="No students match your search"
              description="Try adjusting your search criteria or clearing active filters."
              actionText="Clear Filters"
              onAction={handleResetFilters}
            />
          ) : (
            <EmptyState
              icon={Users}
              title={`No students enrolled in ${selectedYear?.name || 'this academic year'}`}
              description={
                isLocked
                  ? 'No records exist for this locked year.'
                  : 'Add your first student or promote students from a previous academic year.'
              }
              actionText={!isLocked ? 'Add Student' : null}
              onAction={() => navigate('/app/students/new')}
            />
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <Table minWidth="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="py-2.5 px-3.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-50/90 border-b border-slate-200">
                    STUDENT
                  </TableHead>
                  <TableHead className="py-2.5 px-3.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-50/90 border-b border-slate-200">
                    GUARDIAN
                  </TableHead>
                  <TableHead className="py-2.5 px-3.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-50/90 border-b border-slate-200">
                    CLASS
                  </TableHead>
                  <TableHead className="py-2.5 px-3.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-50/90 border-b border-slate-200">
                    HOSTEL
                  </TableHead>
                  <TableHead className="py-2.5 px-3.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-50/90 border-b border-slate-200">
                    ROLL NO
                  </TableHead>
                  <TableHead className="py-2.5 px-3.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-50/90 border-b border-slate-200">
                    STATUS
                  </TableHead>
                  <TableHead className="py-2.5 px-3.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-50/90 border-b border-slate-200 text-right">
                    ACTION
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((item) => {
                  const e = item.enrollment || {};
                  const fatherName = item.fatherName || item.guardianName || '—';
                  const className = e.class?.name ? `Class ${e.class.name}` : 'Class N/A';
                  const sectionName = e.section?.name ? `(${e.section.name})` : '';
                  const streamName = e.stream?.name || null;
                  const mediumName = e.medium?.name || '—';
                  const hostelInfo = item.hostel;
                  const isHighlighted = item.id === highlightedStudentId;

                  return (
                    <TableRow
                      key={item.id}
                      className={`cursor-pointer transition-colors border-b border-slate-100 ${
                        isHighlighted
                          ? 'bg-emerald-50/80 hover:bg-emerald-100/70 ring-2 ring-emerald-500/50'
                          : 'hover:bg-slate-50/80'
                      }`}
                      onClick={() => navigate(`/app/students/${item.id}`)}
                    >
                      {/* STUDENT */}
                      <TableCell className="py-2.5 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <StudentAvatar
                            name={item.name}
                            photoUrl={item.photoUrl}
                            size="sm"
                            onClick={(ev) => handlePhotoPreview(ev, item)}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900 text-xs sm:text-sm hover:text-indigo-600 transition-colors truncate">
                                {item.name}
                              </span>
                              {isHighlighted && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white tracking-wide uppercase animate-pulse">
                                  New
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono tracking-tight">
                              {item.admissionNo}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* GUARDIAN */}
                      <TableCell className="py-2.5 px-3.5">
                        <div className="text-xs font-medium text-slate-900 truncate">
                          {fatherName}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {item.phone || '—'}
                        </div>
                      </TableCell>

                      {/* CLASS */}
                      <TableCell className="py-2.5 px-3.5">
                        <div className="text-xs font-semibold text-slate-900">
                          {className} {sectionName}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {streamName ? `${streamName} · ${mediumName}` : mediumName}
                        </div>
                      </TableCell>

                      {/* HOSTEL */}
                      <TableCell className="py-2.5 px-3.5">
                        {hostelInfo?.enrolled ? (
                          <div>
                            <span className="inline-block text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100/80">
                              Hosteler
                            </span>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Room {hostelInfo.roomNumber} · Bed {hostelInfo.bedNumber}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-normal">Day Scholar</span>
                        )}
                      </TableCell>

                      {/* ROLL NO */}
                      <TableCell className="py-2.5 px-3.5">
                        <span className="font-mono text-xs text-slate-700 font-medium">
                          {e.rollNumber ?? '—'}
                        </span>
                      </TableCell>

                      {/* STATUS */}
                      <TableCell className="py-2.5 px-3.5">
                        <StudentStatusBadge status={item.status} size="sm" />
                      </TableCell>

                      {/* ACTION */}
                      <TableCell className="py-2.5 px-3.5 text-right" onClick={(ev) => ev.stopPropagation()}>
                        {renderStudentActions(item)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards View (< 768px) */}
          <div className="md:hidden space-y-2.5">
            {students.map((item) => {
              const e = item.enrollment || {};
              const fatherName = item.fatherName || item.guardianName || '—';
              const hostelInfo = item.hostel;
              const isHighlighted = item.id === highlightedStudentId;

              return (
                <div
                  key={item.id}
                  className={`bg-white p-3.5 rounded-xl border shadow-2xs space-y-2.5 cursor-pointer transition-colors ${
                    isHighlighted
                      ? 'border-emerald-400 bg-emerald-50/40 ring-2 ring-emerald-500/40'
                      : 'border-slate-200 hover:border-indigo-200'
                  }`}
                  onClick={() => navigate(`/app/students/${item.id}`)}
                >
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <StudentAvatar
                        name={item.name}
                        photoUrl={item.photoUrl}
                        size="sm"
                        onClick={(ev) => handlePhotoPreview(ev, item)}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900 text-xs sm:text-sm truncate block">
                            {item.name}
                          </span>
                          {isHighlighted && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white tracking-wide uppercase animate-pulse">
                              New
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono">{item.admissionNo}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(ev) => ev.stopPropagation()}>
                      <StudentStatusBadge status={item.status} size="sm" />
                      {renderStudentActions(item)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Guardian</span>
                      <span className="font-medium text-slate-800 text-[11px] truncate block">{fatherName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Class</span>
                      <span className="font-semibold text-slate-800 text-[11px]">
                        Class {e.class?.name || '—'} {e.section?.name ? `(${e.section.name})` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Hostel</span>
                      {hostelInfo?.enrolled ? (
                        <span className="font-semibold text-purple-700 text-[11px]">
                          Room {hostelInfo.roomNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal text-[11px]">Day Scholar</span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Roll No</span>
                      <span className="font-mono text-slate-700 text-[11px]">{e.rollNumber ?? '—'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          <div className="pt-1">
            <Pagination
              currentPage={page}
              totalPages={pagination.totalPages}
              onPageChange={(p) => setPage(p)}
              totalItems={pagination.total}
              itemsPerPage={pagination.limit}
            />
          </div>
        </>
      )}

      {/* Individual Promotion Modal */}
      {selectedStudentForAction && activeModal === 'PROMOTE' && (
        <IndividualPromotionModal
          isOpen={true}
          onClose={closeModal}
          student={selectedStudentForAction}
          sourceEnrollment={selectedStudentForAction.enrollment}
          academicYears={academicYears}
          classes={classes}
          mediums={mediums}
          sections={sections}
          streams={streams}
          onSuccess={refreshStudents}
        />
      )}

      {/* Status Confirmation Dialog */}
      <ConfirmDialog
        isOpen={activeModal === 'STATUS_CONFIRM'}
        onClose={closeModal}
        onConfirm={handleConfirmStatusChange}
        title="Change Student Status"
        message={`Are you sure you want to change status of ${selectedStudentForAction?.name} to ${targetStatus}?`}
        confirmText="Update Status"
        loading={statusUpdating}
        loadingText="Updating..."
      />

      {/* Hard Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={activeModal === 'DELETE_HARD'}
        onClose={closeModal}
        onConfirm={handleDeleteStudentHard}
        title={`Hard Delete Student (${selectedStudentForAction?.name})`}
        message={`Are you sure you want to permanently hard-delete '${selectedStudentForAction?.name}' (Adm No: ${selectedStudentForAction?.admissionNo})? All initial registration records will be completely removed from the database.`}
        confirmText="Hard Delete Permanently"
        cancelText="Cancel"
        variant="danger"
        loading={statusUpdating}
        loadingText="Deleting..."
      />

      {/* Photo Preview Modal */}
      <PhotoPreviewModal
        isOpen={Boolean(previewPhoto)}
        onClose={() => setPreviewPhoto(null)}
        photoUrl={previewPhoto?.photoUrl}
        name={previewPhoto?.name}
        admissionNo={previewPhoto?.admissionNo}
      />
    </div>
  );
};

export default StudentsListPage;
