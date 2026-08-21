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

  // 3. Fetch Students List with Aggregated Pending Fees
  const fetchStudents = useCallback(async () => {
    if (!selectedYearId) return;
    setLoading(true);
    try {
      const res = await studentService.getStudents({
        academicYearId: selectedYearId,
        page,
        limit: 15,
        search: debouncedSearch || undefined,
        classId: selectedClassId || undefined,
        sectionId: selectedSectionId || undefined,
      });

      const list = res.data || [];
      setStudents(list);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch students for fee collection picker', err);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [selectedYearId, page, debouncedSearch, selectedClassId, selectedSectionId]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSelectedClassId('');
    setSelectedSectionId('');
    setPage(1);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden p-4 space-y-4">
      {/* Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              Select Student to Collect Fee
              {selectedYear && (
                <Badge variant="indigo" size="sm">
                  {selectedYear.name}
                </Badge>
              )}
            </h3>
            <p className="text-xs text-slate-500">
              Showing <span className="font-bold text-slate-700">{pagination.total}</span> students loaded with real-time pending dues
            </p>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Class Select Filter */}
          <select
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setPage(1);
            }}
            className="py-2 px-3 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700 min-w-[130px]"
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
            className="py-2 px-3 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700 min-w-[120px]"
          >
            <option value="">All Sections</option>
            {sections.map((sec) => (
              <option key={sec.id} value={sec.id}>
                Sec {sec.name}
              </option>
            ))}
          </select>

          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] sm:w-64">
            <Input
              placeholder="Search by name, adm no, father name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={Search}
            />
          </div>

          {(searchTerm || selectedClassId || selectedSectionId) && (
            <Button variant="ghost" size="sm" onClick={handleResetFilters} className="text-xs">
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Main Table / Skeletons / EmptyState */}
      {loading ? (
        <div className="space-y-3 py-2">
          <Skeleton height="45px" width="100%" />
          <Skeleton height="45px" width="100%" />
          <Skeleton height="45px" width="100%" />
          <Skeleton height="45px" width="100%" />
          <Skeleton height="45px" width="100%" />
        </div>
      ) : students.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students found"
          description={
            searchTerm || selectedClassId || selectedSectionId
              ? 'No students match your search criteria. Try adjusting filters.'
              : `No active students enrolled for academic year ${selectedYear?.name || ''}.`
          }
          actionText={searchTerm || selectedClassId || selectedSectionId ? 'Clear Filters' : null}
          onAction={handleResetFilters}
        />
      ) : (
        <>
          {/* Desktop Table View (>= 768px) matching Student Tab */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Identity</TableHead>
                  <TableHead>Father / Guardian</TableHead>
                  <TableHead>Class, Stream & Medium</TableHead>
                  <TableHead>Hostel Status</TableHead>
                  <TableHead>Roll No.</TableHead>
                  <TableHead>Pending Dues</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
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
                      className="cursor-pointer hover:bg-indigo-50/40 transition-colors"
                      onClick={() => onSelectStudent(item)}
                    >
                      {/* Identity Cell */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <StudentAvatar
                            name={item.name}
                            photoUrl={item.photoUrl}
                            size="md"
                          />
                          <div>
                            <span className="font-bold text-slate-900 text-sm hover:text-indigo-600 transition-colors">
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

                      {/* Class, Stream & Medium */}
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

                      {/* Hostel Status */}
                      <TableCell>
                        {hostelInfo?.enrolled ? (
                          <div title={`${hostelInfo.hostelName} (Room ${hostelInfo.roomNumber}, Bed ${hostelInfo.bedNumber})`}>
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

                      {/* Aggregated Pending Fee Column */}
                      <TableCell>
                        {pendingFee > 0 ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs font-mono">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              ₹{pendingFee.toLocaleString('en-IN')} Pending
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-mono">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            ₹0 (Clear)
                          </span>
                        )}
                      </TableCell>

                      {/* Status Badge */}
                      <TableCell>
                        <StudentStatusBadge status={item.status} />
                      </TableCell>

                      {/* Action Button */}
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => onSelectStudent(item)}
                          icon={CreditCard}
                        >
                          Collect Fee
                        </Button>
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
              const fatherName = item.fatherName || item.guardianName || '—';
              const pendingFee = Number(item.pendingFee || 0);

              return (
                <div
                  key={item.id}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3 cursor-pointer hover:border-indigo-300 transition-colors"
                  onClick={() => onSelectStudent(item)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <StudentAvatar
                        name={item.name}
                        photoUrl={item.photoUrl}
                        size="md"
                      />
                      <div>
                        <span className="font-bold text-slate-900 text-sm">
                          {item.name}
                        </span>
                        <p className="text-xs text-slate-500 font-mono">Adm: {item.admissionNo}</p>
                      </div>
                    </div>
                    <StudentStatusBadge status={item.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Class & Stream</span>
                      <span className="font-semibold text-slate-800">
                        Class {e.class?.name || '—'} {e.section ? `(${e.section.name})` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Father / Phone</span>
                      <span className="font-semibold text-slate-800 truncate block">
                        {fatherName}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Pending Dues</span>
                      {pendingFee > 0 ? (
                        <span className="font-extrabold text-rose-600 font-mono">
                          ₹{pendingFee.toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="font-bold text-emerald-600">Clear (₹0)</span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Hostel</span>
                      <span className="font-medium text-slate-700">
                        {item.hostel?.enrolled ? item.hostel.hostelName : 'Day Scholar'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onSelectStudent(item)}
                      icon={CreditCard}
                      className="w-full sm:w-auto"
                    >
                      Collect Fee
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          <div className="pt-2 flex justify-end">
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
    </div>
  );
};

export default StudentPickerTable;
