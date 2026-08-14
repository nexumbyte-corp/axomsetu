import React, { useState, useEffect, useCallback } from 'react';
import { Search, Users, CreditCard, Loader2 } from 'lucide-react';
import { studentService } from '../../services/student.service.js';
import { academicService } from '../../services/academic.service.js';
import { useAcademicYear } from '../../hooks/useAcademicYear.js';
import { Button } from '../ui/Button.jsx';
import { Badge } from '../ui/Badge.jsx';
import { Pagination } from '../ui/Pagination.jsx';

export const StudentPickerTable = ({ onSelectStudent }) => {
  const { selectedYearId, selectedYear } = useAcademicYear();

  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });

  // 1. Fetch Classes for filter
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await academicService.getClasses();
        if (res.success) {
          setClasses(res.data || []);
        }
      } catch (err) {
        console.error('Failed to load classes for fee picker', err);
      }
    };
    fetchClasses();
  }, []);

  // 2. Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 3. Fetch Students List
  const fetchStudents = useCallback(async () => {
    if (!selectedYearId) return;
    setLoading(true);
    try {
      const res = await studentService.getStudents({
        academicYearId: selectedYearId,
        page,
        limit: 12,
        search: debouncedSearch || undefined,
        classId: selectedClassId || undefined,
      });

      const list = res.data?.students || res.data || [];
      setStudents(list);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch students list', err);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [selectedYearId, page, debouncedSearch, selectedClassId]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden p-3 space-y-2.5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-slate-900">Select Student</h3>
          <Badge variant="indigo" size="sm">
            {selectedYear?.name || 'Academic Year'}
          </Badge>
          <span className="text-[11px] text-slate-400 font-mono">({pagination.total} students)</span>
        </div>

        {/* Quick Filter Inputs */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Class Filter */}
          <select
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setPage(1);
            }}
            className="py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700 min-w-[130px]"
          >
            <option value="">All Classes</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                Class {cls.name}
              </option>
            ))}
          </select>

          {/* Search Bar */}
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search student or adm..."
              className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Table Content */}
      {loading ? (
        <div className="py-8 text-center text-xs text-slate-500 flex flex-col items-center gap-1.5">
          <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
          <span>Loading students...</span>
        </div>
      ) : students.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500 space-y-1">
          <Users className="w-6 h-6 text-slate-300 mx-auto" />
          <p className="font-bold text-slate-700">No students found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2 px-3">Student</th>
                <th className="py-2 px-3">Father / Guardian</th>
                <th className="py-2 px-3">Class, Stream & Medium</th>
                <th className="py-2 px-3 text-center">Status</th>
                <th className="py-2 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {students.map((st) => {
                const enr = st.enrollment || st.enrollments?.[0];
                const rawClassName = enr?.class?.name;
                const className = rawClassName ? (rawClassName.startsWith('Class') ? rawClassName : `Class ${rawClassName}`) : 'Class N/A';
                const sectionName = enr?.section?.name ? `Sec ${enr.section.name}` : '';
                const streamName = enr?.stream?.name || null;
                const mediumName = enr?.medium?.name || '—';
                const fatherName = st.fatherName || st.guardianName || '—';

                return (
                  <tr key={st.id} className="hover:bg-indigo-50/40 transition-colors">
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[11px] shrink-0">
                          {st.name ? st.name.charAt(0) : 'S'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{st.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">Adm: {st.admissionNo}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-2 px-3">
                      <p className="text-slate-900 font-bold">{fatherName}</p>
                      {st.phone && <p className="text-[10px] text-slate-500 font-mono">Ph: {st.phone}</p>}
                    </td>

                    <td className="py-2 px-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-slate-800">{className}</span>
                        {sectionName && <span className="text-[10px] text-slate-500">({sectionName})</span>}
                        {streamName && (
                          <Badge variant="indigo" size="sm">
                            {streamName}
                          </Badge>
                        )}
                        <span className="text-[10px] text-slate-400 font-normal">| {mediumName}</span>
                      </div>
                    </td>

                    <td className="py-2 px-3 text-center">
                      <Badge variant={st.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm">
                        {st.status || 'ACTIVE'}
                      </Badge>
                    </td>

                    <td className="py-2 px-3 text-right">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onSelectStudent(st)}
                      >
                        <CreditCard className="w-3.5 h-3.5 mr-1" />
                        Collect Fee
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-end pt-1">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      )}
    </div>
  );
};

export default StudentPickerTable;
