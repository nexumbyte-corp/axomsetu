import React, { useState, useEffect, useCallback } from 'react';
import { Search, Users, CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react';
import { studentService } from '../../services/student.service.js';
import { academicService } from '../../services/academic.service.js';
import { useAcademicYear } from '../../hooks/useAcademicYear.js';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';
import { Badge } from '../ui/Badge.jsx';
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from '../ui/Table.jsx';
import { Pagination } from '../ui/Pagination.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { StudentAvatar } from '../students/StudentAvatar.jsx';
import { StudentStatusBadge } from '../students/StudentStatusBadge.jsx';

export const StudentPickerTable = ({ onSelectStudent }) => {
  const { selectedYearId, selectedYear } = useAcademicYear();

  // Data States
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });

  // 1. Fetch Setup Options (Classes & Sections)
  useEffect(() => {
    const fetchSetupOptions = async () => {
      try {
        const [clsRes, secRes] = await Promise.allSettled([
          academicService.getClasses(),
          academicService.getSections(),
        ]);
        if (clsRes.status === 'fulfilled' && clsRes.value?.success) {
          setClasses(clsRes.value.data || []);
        }
        if (secRes.status === 'fulfilled' && secRes.value?.success) {
          setSections(secRes.value.data || []);
        }
      } catch (err) {
        console.error('Failed to load academic options for fee picker', err);
      }
    };
    fetchSetupOptions();
  }, []);

  // 2. Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 3. Fetch Students List with Aggregated Pending Fees & In-Flight Cancellation
  useEffect(() => {
    if (!selectedYearId) return;

    const controller = new AbortController();
    setLoading(true);

    const loadStudents = async () => {
      try {
        const res = await studentService.getStudents({
          academicYearId: selectedYearId,
          page,
          limit: 15,
          search: debouncedSearch || undefined,
          classId: debouncedSearch ? undefined : (selectedClassId || undefined),
          sectionId: debouncedSearch ? undefined : (selectedSectionId || undefined),
        }, { signal: controller.signal });

        if (!controller.signal.aborted) {
          const list = res.data || [];
          setStudents(list);
          if (res.pagination) {
            setPagination(res.pagination);
          }
        }
      } catch (err) {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
          console.error('Failed to fetch students for fee collection picker', err);
          setStudents([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadStudents();

    return () => {
      controller.abort();
    };
  }, [selectedYearId, page, debouncedSearch, selectedClassId, selectedSectionId]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSelectedClassId('');
    setSelectedSectionId('');
    setPage(1);
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden p-2.5 sm:p-3 space-y-2">
      {/* Header Toolbar */}
      <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-2 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Users className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
              Select Student
              {selectedYear && (
                <Badge variant="indigo" size="sm" className="text-[10px] py-0 px-1.5">
                  {selectedYear.name}
                </Badge>
              )}
            </h3>
            <p className="text-[11px] text-slate-500">
              <span className="font-bold text-slate-700">{pagination.total}</span> students
            </p>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Class Select Filter */}
          <select
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setPage(1);
            }}
            className="py-1 px-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700 min-w-[110px]"
          >
            <option value="">All Classes</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                Class {cls.name}
              </option>
            ))}
          </select>

          {/* Section Select Filter */}
          <select
            value={selectedSectionId}
            onChange={(e) => {
              setSelectedSectionId(e.target.value);
              setPage(1);
            }}
            className="py-1 px-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700 min-w-[95px]"
          >
            <option value="">All Sec</option>
            {sections.map((sec) => (
              <option key={sec.id} value={sec.id}>
                Sec {sec.name}
              </option>
            ))}
          </select>

          {/* Search Input */}
          <div className="relative flex-1 min-w-[170px] sm:w-56">
            <Input
              placeholder="Search name, adm, father, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={Search}
              className="py-1 text-xs"
            />
          </div>

          {(searchTerm || selectedClassId || selectedSectionId) && (
            <Button variant="ghost" size="sm" onClick={handleResetFilters} className="text-xs py-1 px-2 h-7">
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Main Table / Skeletons / EmptyState */}
      {loading ? (
        <div className="flex-1 space-y-2 py-2 overflow-hidden">
          <Skeleton height="36px" width="100%" />
          <Skeleton height="36px" width="100%" />
          <Skeleton height="36px" width="100%" />
          <Skeleton height="36px" width="100%" />
          <Skeleton height="36px" width="100%" />
        </div>
      ) : students.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={Users}
            title="No students found"
            description={
              searchTerm || selectedClassId || selectedSectionId
                ? 'No students match search filters.'
                : `No active students found for ${selectedYear?.name || ''}.`
            }
            actionText={searchTerm || selectedClassId || selectedSectionId ? 'Clear Filters' : null}
            onAction={handleResetFilters}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden space-y-2">
          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block flex-1 overflow-auto min-h-0 rounded-lg border border-slate-200">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-slate-100/90 backdrop-blur-xs">
                <TableRow>
                  <TableHead className="py-2 px-3 text-xs font-bold text-slate-700">Student</TableHead>
                  <TableHead className="py-2 px-3 text-xs font-bold text-slate-700">Father / Ph</TableHead>
                  <TableHead className="py-2 px-3 text-xs font-bold text-slate-700">Class</TableHead>
                  <TableHead className="py-2 px-3 text-xs font-bold text-slate-700">Hostel</TableHead>
                  <TableHead className="py-2 px-3 text-xs font-bold text-slate-700">Roll</TableHead>
                  <TableHead className="py-2 px-3 text-xs font-bold text-slate-700">Dues</TableHead>
                  <TableHead className="py-2 px-3 text-xs font-bold text-slate-700">Status</TableHead>
                  <TableHead className="py-2 px-3 text-xs font-bold text-slate-700 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((item) => {
                  const e = item.enrollment || {};
                  const fatherName = item.fatherName || item.guardianName || '—';
                  const className = e.class?.name ? (e.class.name.startsWith('Class') ? e.class.name : `Class ${e.class.name}`) : 'Class N/A';
                  const sectionName = e.section ? `Sec ${e.section.name}` : '';
                  const streamName = e.stream?.name || null;
                  const mediumName = e.medium?.name || '—';
                  const hostelInfo = item.hostel;
                  const pendingFee = Number(item.pendingFee || 0);

                  return (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer hover:bg-indigo-50/40 transition-colors border-b border-slate-100"
                      onClick={() => onSelectStudent(item)}
                    >
                      {/* Identity Cell */}
                      <TableCell className="py-1.5 px-3">
                        <div className="flex items-center gap-2">
                          <StudentAvatar
                            name={item.name}
                            photoUrl={item.photoUrl}
                            size="sm"
                          />
                          <div>
                            <span className="font-bold text-slate-900 text-xs hover:text-indigo-600 transition-colors block leading-snug">
                              {item.name}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">Adm: {item.admissionNo}</span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Father / Guardian */}
                      <TableCell className="py-1.5 px-3">
                        <div className="text-xs font-semibold text-slate-900 truncate max-w-[130px]">{fatherName}</div>
                        {item.phone && <div className="text-[10px] text-slate-500 font-mono">Ph: {item.phone}</div>}
                      </TableCell>

                      {/* Class, Stream & Medium */}
                      <TableCell className="py-1.5 px-3">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="font-bold text-slate-800 text-xs">{className}</span>
                          {sectionName && <span className="text-[10px] text-slate-500">({sectionName})</span>}
                          {streamName && (
                            <Badge variant="indigo" size="sm" className="text-[9px] py-0 px-1">
                              {streamName}
                            </Badge>
                          )}
                          <span className="text-[10px] text-slate-400 font-normal">| {mediumName}</span>
                        </div>
                      </TableCell>

                      {/* Hostel Status */}
                      <TableCell className="py-1.5 px-3">
                        {hostelInfo?.enrolled ? (
                          <div title={`${hostelInfo.hostelName} (Room ${hostelInfo.roomNumber}, Bed ${hostelInfo.bedNumber})`}>
                            <Badge variant="purple" size="sm" className="font-semibold text-[9px] py-0 px-1">
                              Resident
                            </Badge>
                            <div className="text-[9px] text-purple-700 font-medium mt-0.5">
                              {hostelInfo.hostelName}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-normal">Day Scholar</span>
                        )}
                      </TableCell>

                      {/* Roll Number */}
                      <TableCell className="py-1.5 px-3">
                        <span className="font-mono text-xs text-slate-700 font-medium">
                          {e.rollNumber ?? '—'}
                        </span>
                      </TableCell>

                      {/* Aggregated Pending Fee Column */}
                      <TableCell className="py-1.5 px-3">
                        {pendingFee > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-extrabold bg-rose-50 text-rose-700 border border-rose-200/80 font-mono">
                            <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                            ₹{pendingFee.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-mono">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                            ₹0 (Clear)
                          </span>
                        )}
                      </TableCell>

                      {/* Status Badge */}
                      <TableCell className="py-1.5 px-3">
                        <StudentStatusBadge status={item.status} />
                      </TableCell>

                      {/* Action Button */}
                      <TableCell className="py-1.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => onSelectStudent(item)}
                          icon={CreditCard}
                          className="py-1 px-2 text-xs"
                        >
                          Collect
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards View (< 768px) */}
          <div className="md:hidden flex-1 overflow-y-auto min-h-0 space-y-2 pr-0.5">
            {students.map((item) => {
              const e = item.enrollment || {};
              const fatherName = item.fatherName || item.guardianName || '—';
              const pendingFee = Number(item.pendingFee || 0);

              return (
                <div
                  key={item.id}
                  className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2 cursor-pointer hover:border-indigo-300 transition-colors"
                  onClick={() => onSelectStudent(item)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <StudentAvatar
                        name={item.name}
                        photoUrl={item.photoUrl}
                        size="sm"
                      />
                      <div>
                        <span className="font-bold text-slate-900 text-xs block">
                          {item.name}
                        </span>
                        <p className="text-[10px] text-slate-500 font-mono">Adm: {item.admissionNo}</p>
                      </div>
                    </div>
                    <StudentStatusBadge status={item.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Class</span>
                      <span className="font-semibold text-slate-800 text-[11px]">
                        Class {e.class?.name || '—'} {e.section ? `(${e.section.name})` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Father</span>
                      <span className="font-semibold text-slate-800 truncate block text-[11px]">
                        {fatherName}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Dues</span>
                      {pendingFee > 0 ? (
                        <span className="font-extrabold text-rose-600 font-mono text-[11px]">
                          ₹{pendingFee.toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="font-bold text-emerald-600 text-[11px]">Clear (₹0)</span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Hostel</span>
                      <span className="font-medium text-slate-700 text-[11px]">
                        {item.hostel?.enrolled ? item.hostel.hostelName : 'Day Scholar'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-0.5" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onSelectStudent(item)}
                      icon={CreditCard}
                      className="w-full py-1 text-xs"
                    >
                      Collect
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls Footer */}
          <div className="shrink-0 pt-1 border-t border-slate-100">
            <Pagination
              page={page}
              limit={pagination.limit}
              total={pagination.total}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentPickerTable;
