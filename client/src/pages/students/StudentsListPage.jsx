import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, Filter, MoreVertical, Lock, Edit, Eye, Sparkles, UserCheck, UserX, Trash2 } from 'lucide-react';
import { useAcademicYear } from '../../hooks/useAcademicYear.js';
import { studentService } from '../../services/student.service.js';
import { academicService } from '../../services/academic.service.js';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
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

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState({
    classId: '',
    sectionId: '',
    mediumId: '',
    streamId: '',
    status: '',
  });
  const [page, setPage] = useState(1);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Modal States
  const [selectedStudentForAction, setSelectedStudentForAction] = useState(null);
  const [activeModal, setActiveModal] = useState(null); // 'PROMOTE' | 'EDIT_ENROLLMENT' | 'STATUS_CONFIRM'
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
      setPage(1); // Reset page on search change
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

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
    setFilters({ classId: '', sectionId: '', mediumId: '', streamId: '', status: '' });
    setSearchTerm('');
    setDebouncedSearch('');
    setPage(1);
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
    <div className="space-y-6">
      {/* Locked Academic Year Warning Banner */}
      {isLocked && (
        <Alert variant="warning" title="Academic Year Locked" icon={Lock}>
          {selectedYear?.name} is locked. Student enrollments for this historical academic year are read-only.
        </Alert>
      )}

      {/* Content Bar: Count Indicator & Mobile Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-extrabold text-slate-900">
            {pagination.total > 0
              ? `${pagination.total} ${pagination.total === 1 ? 'Student' : 'Students'}`
              : 'Student Directory'}
          </span>
          {pagination.total > 0 && (
            <span className="text-xs font-medium text-slate-500 font-mono">
              (Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)})
            </span>
          )}
          {selectedYear && (
            <Badge variant="indigo" size="sm">
              {selectedYear.name}
            </Badge>
          )}
        </div>

        {/* Mobile Action Triggers */}
        <div className="flex items-center gap-2 sm:hidden w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          {can('STUDENTS_PROMOTE') && (
            <Button
              variant="outline"
              size="xs"
              onClick={() => navigate('/app/students/promote')}
              icon={Sparkles}
              disabled={isLocked}
              className="flex-1"
            >
              Promote
            </Button>
          )}
          {can('STUDENTS_CREATE') && (
            <Button
              variant="primary"
              size="xs"
              onClick={() => navigate('/app/students/new')}
              icon={Plus}
              disabled={isLocked}
              className="flex-1"
            >
              + Add
            </Button>
          )}
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search Bar */}
        <div className="flex-1 relative">
          <Input
            placeholder="Search by name, admission no., guardian or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={Search}
          />
        </div>

        {/* Mobile Filter Button Trigger */}
        <Button
          variant="outline"
          size="md"
          onClick={() => setIsFilterDrawerOpen(true)}
          icon={Filter}
          className="lg:hidden shrink-0"
        >
          Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
        </Button>
      </div>

      {/* Desktop Filter Toolbar */}
      <StudentFiltersDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        classes={classes}
        sections={sections}
        mediums={mediums}
        streams={streams}
        activeCount={activeFilterCount}
      />

      {/* Content Area: Table / Mobile Cards / Skeletons / EmptyState */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
          <Skeleton height="40px" width="100%" />
          <Skeleton height="40px" width="100%" />
          <Skeleton height="40px" width="100%" />
          <Skeleton height="40px" width="100%" />
          <Skeleton height="40px" width="100%" />
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Identity</TableHead>
                  <TableHead>Father / Guardian</TableHead>
                  <TableHead>Class, Stream & Medium</TableHead>
                  <TableHead>Hostel Status</TableHead>
                  <TableHead>Roll No.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((item) => {
                  const e = item.enrollment || {};
                  const fatherName = item.fatherName || item.guardianName || '—';
                  const className = e.class?.name ? `Class ${e.class.name}` : 'Class N/A';
                  const sectionName = e.section ? `Sec ${e.section.name}` : '';
                  const streamName = e.stream?.name || null;
                  const mediumName = e.medium?.name || '—';
                  const hostelInfo = item.hostel;

                  return (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                      onClick={() => navigate(`/app/students/${item.id}`)}
                    >
                      {/* Identity Cell */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <StudentAvatar
                            name={item.name}
                            photoUrl={item.photoUrl}
                            size="md"
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
                          <div>
                            <span className="font-bold text-slate-900 hover:text-indigo-600 transition-colors text-sm">
                              {item.name}
                            </span>
                            <div className="text-xs text-slate-500 font-mono">Adm: {item.admissionNo}</div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Father / Guardian */}
                      <TableCell>
                        <div className="text-xs font-bold text-slate-900">{fatherName}</div>
                        {item.phone && <div className="text-[11px] text-slate-500 font-mono">Ph: {item.phone}</div>}
                      </TableCell>

                      {/* Class, Stream & Medium (Common Column) */}
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-slate-800 text-xs">{className}</span>
                          {sectionName && <span className="text-[11px] text-slate-500">({sectionName})</span>}
                          {streamName && (
                            <Badge variant="indigo" size="sm">
                              {streamName}
                            </Badge>
                          )}
                          <span className="text-[11px] text-slate-400 font-normal">| {mediumName}</span>
                        </div>
                      </TableCell>

                      {/* Hostel Status Column */}
                      <TableCell>
                        {hostelInfo?.enrolled ? (
                          <div title={`${hostelInfo.hostelName} (Room ${hostelInfo.roomNumber}, ${hostelInfo.bedNumber})`}>
                            <Badge variant="purple" size="sm" className="font-semibold">
                              Hostel Resident
                            </Badge>
                            <div className="text-[10px] text-purple-700 font-medium mt-0.5">
                              {hostelInfo.hostelName} (R-{hostelInfo.roomNumber})
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-normal">Day Scholar</span>
                        )}
                      </TableCell>

                      {/* Roll Number */}
                      <TableCell>
                        <span className="font-mono text-xs text-slate-700 font-medium">
                          {e.rollNumber ?? '—'}
                        </span>
                      </TableCell>

                      {/* Status Badge */}
                      <TableCell>
                        <StudentStatusBadge status={item.status} />
                      </TableCell>

                      {/* Actions Dropdown */}
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Dropdown
                          align="right"
                          trigger={
                            <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          }
                        >
                          <DropdownItem icon={Eye} onClick={() => navigate(`/app/students/${item.id}`)}>
                            View Profile
                          </DropdownItem>

                          <DropdownItem icon={Edit} onClick={() => navigate(`/app/students/${item.id}/edit`)}>
                            Edit Master Profile
                          </DropdownItem>

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
                                  Academic Transition
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
                                    Hard Delete Student
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
          <div className="md:hidden space-y-3">
            {students.map((item) => {
              const e = item.enrollment || {};
              return (
                <div
                  key={item.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3 cursor-pointer hover:border-slate-300 transition-colors"
                  onClick={() => navigate(`/app/students/${item.id}`)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <StudentAvatar
                        name={item.name}
                        photoUrl={item.photoUrl}
                        size="md"
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
                      <div>
                        <span className="font-bold text-slate-900 text-sm hover:text-indigo-600">
                          {item.name}
                        </span>
                        <p className="text-xs text-slate-500 font-mono">{item.admissionNo}</p>
                      </div>
                    </div>
                    <StudentStatusBadge status={item.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Class & Stream</span>
                      <span className="font-semibold text-slate-800">
                        Class {e.class?.name || '—'} {e.section ? `(${e.section.name})` : ''} {e.stream ? `(${e.stream.name})` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Medium</span>
                      <span className="font-semibold text-slate-800">
                        {e.medium?.name || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Hostel Status</span>
                      {item.hostel?.enrolled ? (
                        <span className="font-bold text-purple-700">
                          {item.hostel.hostelName} (R-{item.hostel.roomNumber})
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">Day Scholar</span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Roll No</span>
                      <span className="font-mono text-slate-700">{e.rollNumber ?? '—'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/app/students/${item.id}`)}
                      icon={Eye}
                    >
                      View Details
                    </Button>

                    {!isLocked && (
                      <Dropdown
                        align="right"
                        trigger={
                          <button className="p-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        }
                      >
                        <DropdownItem onClick={() => navigate(`/app/students/${item.id}/edit`)}>
                          Edit Profile
                        </DropdownItem>
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
                            Academic Transition
                          </DropdownItem>
                        )}
                      </Dropdown>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          <div className="pt-2">
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
        message={`Are you sure you want to permanently hard-delete '${selectedStudentForAction?.name}' (Adm No: ${selectedStudentForAction?.admissionNo})? All initial registration records will be completely removed from the database. (Hard deletion is allowed for initial registrations without paid fee receipts).`}
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
