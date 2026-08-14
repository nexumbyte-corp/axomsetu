import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, Phone, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import { studentService } from '../../services/student.service.js';
import { useAcademicYear } from '../../hooks/useAcademicYear.js';
import { Badge } from '../ui/Badge.jsx';

export const StudentSearch = ({ onSelectStudent, selectedStudent, onClearStudent }) => {
  const { selectedYearId } = useAcademicYear();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await studentService.getStudents({
          search: searchTerm.trim(),
          ...(selectedYearId && { academicYearId: selectedYearId }),
          limit: 8,
        });
        const students = res.data?.students || res.data || [];
        setResults(students);
        setIsOpen(true);
      } catch (err) {
        console.error('Failed to search students', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, selectedYearId]);

  const handleSelect = (student) => {
    onSelectStudent(student);
    setSearchTerm('');
    setIsOpen(false);
  };

  if (selectedStudent) {
    const isActive = selectedStudent.status === 'ACTIVE';
    const activeEnrollment =
      selectedStudent.enrollment ||
      selectedStudent.enrollments?.find((e) => e.status === 'ACTIVE') ||
      selectedStudent.enrollments?.[0];

    const rawClassName = selectedStudent.className || activeEnrollment?.class?.name;
    const className = rawClassName
      ? rawClassName.toLowerCase().startsWith('class')
        ? rawClassName
        : `Class ${rawClassName}`
      : null;

    const rawSection = selectedStudent.sectionName || activeEnrollment?.section?.name;
    const sectionName = rawSection
      ? rawSection.toLowerCase().startsWith('sec')
        ? rawSection
        : `Sec ${rawSection}`
      : null;

    const mediumName = selectedStudent.mediumName || activeEnrollment?.medium?.name || null;
    const streamName = selectedStudent.streamName || activeEnrollment?.stream?.name || null;

    return (
      <div className="space-y-2">
        <div className={`border rounded-xl p-4 flex items-center justify-between gap-4 transition-all ${
          isActive ? 'bg-indigo-50/70 border-indigo-200' : 'bg-amber-50/70 border-amber-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-sm shadow-xs ${
              isActive ? 'bg-indigo-600' : 'bg-amber-600'
            }`}>
              {selectedStudent.name ? selectedStudent.name.charAt(0) : 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">{selectedStudent.name}</h3>
                <Badge variant={isActive ? 'success' : 'danger'} size="sm">
                  {selectedStudent.status || 'ACTIVE'}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 font-mono mt-0.5">
                <span>Admission No: <strong className="text-slate-900 font-semibold">{selectedStudent.admissionNo}</strong></span>
                {(className || mediumName || streamName) && (
                  <>
                    <span>•</span>
                    {className && <span className="font-bold text-slate-900 font-sans">{className}</span>}
                    {sectionName && <span className="font-semibold text-slate-700 font-sans">({sectionName})</span>}
                    {streamName && (
                      <Badge variant="indigo" size="sm" className="px-1.5 py-0 text-[10px] font-sans">
                        {streamName}
                      </Badge>
                    )}
                    {mediumName && <span className="text-slate-500 font-medium font-sans">| {mediumName}</span>}
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClearStudent}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
          >
            <X className="w-4 h-4 text-slate-500" />
            <span>Change Student</span>
          </button>
        </div>

        {!isActive && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>This student is not active ({selectedStudent.status}). Fee generation is not allowed.</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="relative">
        <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder="Search Student by Admission No, Name, or Guardian Phone..."
          className="w-full pl-11 pr-10 py-3 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs transition-all placeholder:text-slate-400 font-medium text-slate-900"
        />
        {isLoading && (
          <Loader2 className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-indigo-600 animate-spin" />
        )}
        {!isLoading && searchTerm && (
          <button
            onClick={() => {
              setSearchTerm('');
              setResults([]);
            }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-80 overflow-y-auto divide-y divide-slate-100">
          {results.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500 font-medium">
              No students found matching "{searchTerm}"
            </div>
          ) : (
            results.map((st) => {
              const activeEnrollment = st.enrollments?.find((e) => e.status === 'ACTIVE') || st.enrollments?.[0] || st.enrollment;
              const rawClassName = activeEnrollment?.class?.name;
              const className = rawClassName ? (rawClassName.startsWith('Class') ? rawClassName : `Class ${rawClassName}`) : 'Unassigned';
              const sectionName = activeEnrollment?.section?.name ? `(${activeEnrollment.section.name})` : '';
              const mediumName = activeEnrollment?.medium?.name || null;
              const streamName = activeEnrollment?.stream?.name || null;
              const isActive = st.status === 'ACTIVE';

              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => handleSelect(st)}
                  className={`w-full text-left p-3 transition-colors flex items-center justify-between gap-3 group ${
                    isActive ? 'hover:bg-indigo-50/50' : 'bg-slate-50/60 hover:bg-slate-100 opacity-75'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                      isActive ? 'bg-slate-100 group-hover:bg-indigo-100 text-slate-700 group-hover:text-indigo-700' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {st.name ? st.name.charAt(0) : 'S'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-700 truncate transition-colors">
                          {st.name}
                        </p>
                        <Badge variant={isActive ? 'success' : 'danger'} size="sm">
                          {st.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                        <span>Adm: {st.admissionNo}</span>
                        <span>•</span>
                        <span className="font-semibold text-slate-800 font-sans">{className} {sectionName}</span>
                        {streamName && (
                          <Badge variant="indigo" size="sm" className="px-1 py-0 text-[9px]">
                            {streamName}
                          </Badge>
                        )}
                        {mediumName && <span className="text-slate-400 font-normal font-sans">| {mediumName}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-slate-500 shrink-0">
                    {st.guardianName && (
                      <div className="flex items-center gap-1 justify-end font-medium text-slate-700">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{st.guardianName}</span>
                      </div>
                    )}
                    {st.phone && (
                      <div className="flex items-center gap-1 justify-end text-slate-500 font-mono">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{st.phone}</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default StudentSearch;
