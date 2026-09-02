import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, Filter, MoreVertical, Lock, Edit, Eye, Sparkles, UserCheck, UserX, Trash2, Receipt, Building } from 'lucide-react';
import { useAcademicYear } from '../../hooks/useAcademicYear.js';
import { studentService } from '../../services/student.service.js';
import { academicService } from '../../services/academic.service.js';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
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
import { EditEnrollmentModal } from '../../components/students/EditEnrollmentModal.jsx';
import { PhotoPreviewModal } from '../../components/students/PhotoPreviewModal.jsx';

const STUDENT_FILTERS_STORAGE_KEY = 'student_list_filters';

const loadSavedStudentFilters = () => {
  try {
    const saved = localStorage.getItem(STUDENT_FILTERS_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (err) {
    console.error('Failed loading saved student list filters:', err);
  }
  return null;
};

export const StudentsListPage = () => {
  const navigate = useNavigate();
  const { selectedYear, selectedYearId, academicYears } = useAcademicYear();
  const { can } = usePermission();
  const { setHeaderInfo } = usePageHeader();

  // Data States
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Setup Options
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [mediums, setMediums] = useState([]);
  const [streams, setStreams] = useState([]);

  // Load continuous filters saved in localStorage
  const savedFilterState = useMemo(() => loadSavedStudentFilters(), []);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState(() => savedFilterState?.searchTerm || '');
  const [debouncedSearch, setDebouncedSearch] = useState(() => savedFilterState?.searchTerm || '');
  const [filters, setFilters] = useState(() => ({
    classId: savedFilterState?.filters?.classId || '',
    sectionId: savedFilterState?.filters?.sectionId || '',
    mediumId: savedFilterState?.filters?.mediumId || '',
    streamId: savedFilterState?.filters?.streamId || '',
    status: savedFilterState?.filters?.status || '',
  }));
  const [page, setPage] = useState(() => savedFilterState?.page || 1);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Modal States
  const [selectedStudentForAction, setSelectedStudentForAction] = useState(null);
  const [activeModal, setActiveModal] = useState(null); // 'PROMOTE' | 'EDIT_ENROLLMENT' | 'STATUS_CONFIRM' | 'DELETE_HARD'
  const [targetStatus, setTargetStatus] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);

  const isLocked = Boolean(selectedYear?.isLocked);

  // Synchronize global top header title ("Students") and page actions
  useEffect(() => {
    setHeaderInfo({
      title: 'Students',
      icon: Users,
      actions: (
        <div className="flex items-center gap-2">
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
  }, [setHeaderInfo, navigate, can, isLocked]);

  // 1. Fetch Academic Setup Options Once
  useEffect(() => {
    const fetchSetupData = async () => {
      try {
        const [clsRes, secRes, medRes, strRes] = await Promise.allSettled([
          academicService.getClasses(),
          academicService.getSections(),
          academicService.getMediums(),
          academicService.getStreams(),
        ]);
        if (clsRes.status === 'fulfilled' && clsRes.value?.success) setClasses(clsRes.value.data || []);
        if (secRes.status === 'fulfilled' && secRes.value?.success) setSections(secRes.value.data || []);
        if (medRes.status === 'fulfilled' && medRes.value?.success) setMediums(medRes.value.data || []);
        if (strRes.status === 'fulfilled' && strRes.value?.success) setStreams(strRes.value.data || []);
      } catch (err) {
        console.error('Failed loading academic setup options', err);
      }
    };
    fetchSetupData();
  }, []);

  // 2. Debounce Search Input (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 2.1 Continuously save filters, search term, and page state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STUDENT_FILTERS_STORAGE_KEY,
        JSON.stringify({
          filters,
          searchTerm,
          page,
        })
      );
    } catch (err) {
      console.error('Failed saving student list filters:', err);
    }
  }, [filters, searchTerm, page]);

  // 3. Fetch Students from Backend when filters / academic year / page changes
  const fetchStudents = useCallback(async () => {
    if (!selectedYearId) return;
    setLoading(true);
    try {
      const queryParams = {
        academicYearId: selectedYearId,
        page,
        limit: 20,
        search: debouncedSearch || undefined,
        classId: filters.classId || undefined,
        sectionId: filters.sectionId || undefined,
        mediumId: filters.mediumId || undefined,
        streamId: filters.streamId || undefined,
        status: filters.status || undefined,
      };

      const res = await studentService.getStudents(queryParams);
      if (res.success) {
        setStudents(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed loading students list');
    } finally {
      setLoading(false);
    }
  }, [selectedYearId, page, debouncedSearch, filters]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Reset pagination to page 1 on filter change
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleResetFilters = () => {
    const emptyFilters = { classId: '', sectionId: '', mediumId: '', streamId: '', status: '' };
    setFilters(emptyFilters);
    setSearchTerm('');
    setDebouncedSearch('');
    setPage(1);
    try {
      localStorage.removeItem(STUDENT_FILTERS_STORAGE_KEY);
    } catch (err) {
      console.error('Failed clearing student list filters:', err);
    }
  };

  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(Boolean).length;
  }, [filters]);

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
      fetchStudents();
    } catch (err) {
      toast.error(err.message || 'Failed updating status');
    } finally {
      setStatusUpdating(false);
      setActiveModal(null);
      setSelectedStudentForAction(null);
      setTargetStatus(null);
    }
  };

  const handleDeleteStudentHard = async () => {
    if (!selectedStudentForAction) return;
    setStatusUpdating(true);
    try {
      const res = await studentService.deleteStudentHard(selectedStudentForAction.id);
      toast.success(res.message || `Student '${selectedStudentForAction.name}' deleted successfully.`);
      fetchStudents();
    } catch (err) {
      toast.error(err.message || 'Failed to delete student.');
    } finally {
      setStatusUpdating(false);
      setActiveModal(null);
      setSelectedStudentForAction(null);
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Locked Academic Year Warning Banner */}
      {isLocked && (
        <Alert variant="warning" title="Academic Year Locked" icon={Lock}>
          {selectedYear?.name} is locked. Student enrollments for this historical academic year are read-only.
        </Alert>
      )}

      {/* Unified Single-Row Search & Filter Toolbar */}
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
              title={`No students enrolled in ${selectedYear?.name}`}
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
                  const sectionName = e.section ? `(${e.section.name})` : '';
                  const streamName = e.stream?.name || null;
                  const mediumName = e.medium?.name || '—';
                  const hostelInfo = item.hostel;

                  return (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer hover:bg-slate-50/80 transition-colors border-b border-slate-100"
                      onClick={() => navigate(`/app/students/${item.id}`)}
                    >
                      {/* STUDENT */}
                      <TableCell className="py-2.5 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <StudentAvatar
                            name={item.name}
                            photoUrl={item.photoUrl}
                            size="sm"
                            onClick={(e) => {
                              if (item.photoUrl) {
                                e.stopPropagation();
                                setPreviewPhoto({
                                  photoUrl: item.photoUrl,
                                  name: item.name,
                                  admissionNo: item.admissionNo,
                                });
                              }
                            }}
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 text-xs sm:text-sm hover:text-indigo-600 transition-colors truncate">
                              {item.name}
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
                        {item.phone ? (
                          <div className="text-[11px] text-slate-500 font-mono">
                            {item.phone}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 font-mono">—</div>
                        )}
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
                      <TableCell className="py-2.5 px-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <Dropdown
                          align="right"
                          trigger={
                            <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          }
                        >
                          <DropdownItem icon={Eye} onClick={() => navigate(`/app/students/${item.id}`)}>
                            View Profile
                          </DropdownItem>
                          <DropdownItem icon={Edit} onClick={() => navigate(`/app/students/${item.id}/edit`)}>
                            Edit Student
                          </DropdownItem>
                          <DropdownItem icon={Receipt} onClick={() => navigate(`/app/students/${item.id}/ledger`)}>
                            Manage Fees
                          </DropdownItem>
                          {hostelInfo?.enrolled && (
                            <DropdownItem icon={Building} onClick={() => navigate(`/app/students/${item.id}?tab=hostel`)}>
                              Hostel Details
                            </DropdownItem>
                          )}
                          {!isLocked && (
                            <>
                              <DropdownItem
                                icon={Edit}
                                onClick={() => {
                                  setSelectedStudentForAction(item);
                                  setActiveModal('EDIT_ENROLLMENT');
                                }}
                              >
                                Edit Enrollment
                              </DropdownItem>

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
                                <DropdownItem
                                  icon={UserX}
                                  danger
                                  onClick={() => handleStatusChangeClick(item, 'LEFT')}
                                >
                                  Mark as LEFT
                                </DropdownItem>
                              )}
                              {item.status === 'ACTIVE' && (
                                <DropdownItem
                                  icon={UserCheck}
                                  onClick={() => handleStatusChangeClick(item, 'GRADUATED')}
                                >
                                  Mark as GRADUATED
                                </DropdownItem>
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
              return (
                <div
                  key={item.id}
                  className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5 cursor-pointer hover:border-indigo-200 transition-colors"
                  onClick={() => navigate(`/app/students/${item.id}`)}
                >
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <StudentAvatar
                        name={item.name}
                        photoUrl={item.photoUrl}
                        size="sm"
                        onClick={(e) => {
                          if (item.photoUrl) {
                            e.stopPropagation();
                            setPreviewPhoto({
                              photoUrl: item.photoUrl,
                              name: item.name,
                              admissionNo: item.admissionNo,
                            });
                          }
                        }}
                      />
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-900 text-xs sm:text-sm truncate block">
                          {item.name}
                        </span>
                        <p className="text-[11px] text-slate-500 font-mono">{item.admissionNo}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <StudentStatusBadge status={item.status} size="sm" />
                      <Dropdown
                        align="right"
                        trigger={
                          <button className="p-1 rounded-md text-slate-400 hover:text-slate-600">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        }
                      >
                        <DropdownItem icon={Eye} onClick={() => navigate(`/app/students/${item.id}`)}>
                          View Profile
                        </DropdownItem>
                        <DropdownItem icon={Edit} onClick={() => navigate(`/app/students/${item.id}/edit`)}>
                          Edit Student
                        </DropdownItem>
                        <DropdownItem icon={Receipt} onClick={() => navigate(`/app/students/${item.id}/ledger`)}>
                          Manage Fees
                        </DropdownItem>
                        {hostelInfo?.enrolled && (
                          <DropdownItem icon={Building} onClick={() => navigate(`/app/students/${item.id}?tab=hostel`)}>
                            Hostel Details
                          </DropdownItem>
                        )}
                        {!isLocked && (
                          <>
                            <DropdownItem
                              onClick={() => {
                                setSelectedStudentForAction(item);
                                setActiveModal('EDIT_ENROLLMENT');
                              }}
                            >
                              Edit Enrollment
                            </DropdownItem>
                            {item.status !== 'GRADUATED' && item.status !== 'LEFT' && (
                              <DropdownItem
                                onClick={() => {
                                  setSelectedStudentForAction(item);
                                  setActiveModal('PROMOTE');
                                }}
                              >
                                Promote
                              </DropdownItem>
                            )}
                          </>
                        )}
                      </Dropdown>
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
                        Class {e.class?.name || '—'} {e.section ? `(${e.section.name})` : ''}
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
          onClose={() => {
            setActiveModal(null);
            setSelectedStudentForAction(null);
          }}
          student={selectedStudentForAction}
          sourceEnrollment={selectedStudentForAction.enrollment}
          academicYears={academicYears}
          classes={classes}
          mediums={mediums}
          sections={sections}
          streams={streams}
          onSuccess={fetchStudents}
        />
      )}

      {/* Edit Enrollment Modal */}
      {selectedStudentForAction && activeModal === 'EDIT_ENROLLMENT' && (
        <EditEnrollmentModal
          isOpen={true}
          onClose={() => {
            setActiveModal(null);
            setSelectedStudentForAction(null);
          }}
          student={selectedStudentForAction}
          enrollment={selectedStudentForAction.enrollment}
          classes={classes}
          mediums={mediums}
          sections={sections}
          streams={streams}
          onSuccess={fetchStudents}
        />
      )}

      {/* Status Confirmation Dialog */}
      <ConfirmDialog
        isOpen={activeModal === 'STATUS_CONFIRM'}
        onClose={() => {
          setActiveModal(null);
          setSelectedStudentForAction(null);
        }}
        onConfirm={handleConfirmStatusChange}
        title={`Change Student Status`}
        message={`Are you sure you want to change status of ${selectedStudentForAction?.name} to ${targetStatus}?`}
        confirmText="Update Status"
        loading={statusUpdating}
        loadingText="Updating..."
      />

      {/* Hard Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={activeModal === 'DELETE_HARD'}
        onClose={() => {
          setActiveModal(null);
          setSelectedStudentForAction(null);
        }}
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

