import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, UserCheck, ChevronDown, Check, X, Phone, User, BookOpen, Layers } from 'lucide-react';
import { Badge } from '../ui/Badge.jsx';

export const SearchableStudentSelect = ({
  students = [],
  selectedStudentId = '',
  onSelectStudent,
  isLoading = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId) || null;
  }, [students, selectedStudentId]);

  // Filter students based on search term
  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return students;
    const term = searchTerm.toLowerCase().trim();
    return students.filter((s) => {
      const nameMatch = s.name?.toLowerCase().includes(term);
      const admMatch = s.admissionNo?.toLowerCase().includes(term);
      const guardianMatch = (s.guardianName || s.fatherName || '').toLowerCase().includes(term);
      const phoneMatch = s.phone?.toLowerCase().includes(term);
      
      const enr = s.enrollment || s.enrollments?.[0];
      const classMatch = enr?.class?.name?.toLowerCase().includes(term);
      const sectionMatch = enr?.section?.name?.toLowerCase().includes(term);
      const rollMatch = String(enr?.rollNumber || enr?.rollNo || '').includes(term);
      const mediumMatch = enr?.medium?.name?.toLowerCase().includes(term);
      const streamMatch = enr?.stream?.name?.toLowerCase().includes(term);

      return (
        nameMatch ||
        admMatch ||
        guardianMatch ||
        phoneMatch ||
        classMatch ||
        sectionMatch ||
        rollMatch ||
        mediumMatch ||
        streamMatch
      );
    });
  }, [students, searchTerm]);

  const handleSelect = (student) => {
    onSelectStudent(student);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    onSelectStudent(null);
    setSearchTerm('');
    setIsOpen(true);
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  const getEnrollmentInfo = (st) => {
    const enr = st?.enrollment || st?.enrollments?.[0];
    if (!enr) return { className: 'N/A', sectionName: '', rollNo: '', mediumName: '', streamName: '' };
    const rawCls = enr.class?.name || '';
    const className = rawCls ? (rawCls.startsWith('Class') ? rawCls : `Class ${rawCls}`) : 'Class N/A';
    const sectionName = enr.section?.name ? `Sec ${enr.section.name}` : '';
    const rollNo = enr.rollNumber || enr.rollNo ? `Roll #${enr.rollNumber || enr.rollNo}` : '';
    const mediumName = enr.medium?.name ? `${enr.medium.name} Medium` : '';
    const streamName = enr.stream?.name || '';
    return { className, sectionName, rollNo, mediumName, streamName };
  };

  return (
    <div className="space-y-3" ref={dropdownRef}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5 text-indigo-600" />
          <span>Search / Select Student</span>
          <span className="text-rose-500">*</span>
        </label>
        <span className="text-[11px] text-slate-400 font-mono">
          ({students.length} students loaded)
        </span>
      </div>

      {/* Main Search Input & Dropdown Container */}
      <div className="relative">
        <div className="relative flex items-center">
          <div className="absolute left-3.5 text-slate-400 pointer-events-none">
            <Search className="w-4 h-4 text-indigo-600" />
          </div>

          <input
            ref={searchInputRef}
            type="text"
            value={isOpen || !selectedStudent ? searchTerm : `${selectedStudent.name} (${selectedStudent.admissionNo})`}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            placeholder="Type Student Name, Adm No, Father Name, Phone, Class..."
            className={`w-full pl-10 pr-20 py-2.5 text-xs bg-white rounded-xl border transition-all font-medium text-slate-900 shadow-2xs ${
              isOpen
                ? 'border-indigo-600 ring-2 ring-indigo-500/20'
                : 'border-slate-300 hover:border-slate-400'
            }`}
          />

          <div className="absolute right-3 flex items-center gap-1.5">
            {(selectedStudent || searchTerm) && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors text-xs font-bold flex items-center gap-1"
                title="Clear selection"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180 text-indigo-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Dropdown Options Popover */}
        {isOpen && (
          <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
            {/* Header info */}
            <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Matching students ({filteredStudents.length}):</span>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="text-indigo-600 font-bold hover:underline"
                >
                  Clear search query
                </button>
              )}
            </div>

            {/* List of Student Items */}
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 p-1">
              {isLoading ? (
                <div className="p-6 text-center text-xs text-slate-400 font-medium">
                  Loading students list...
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-6 text-center space-y-1">
                  <User className="w-6 h-6 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">No students match your search</p>
                  <p className="text-[11px] text-slate-400">Try searching by admission number, student name, or father name.</p>
                </div>
              ) : (
                filteredStudents.map((student) => {
                  const isSelected = student.id === selectedStudentId;
                  const info = getEnrollmentInfo(student);
                  const fatherName = student.guardianName || student.fatherName || 'N/A';

                  return (
                    <div
                      key={student.id}
                      onClick={() => handleSelect(student)}
                      className={`p-3 rounded-xl cursor-pointer transition-all flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'bg-indigo-50/90 border border-indigo-200 shadow-2xs'
                          : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs shrink-0 mt-0.5 shadow-2xs ${
                            isSelected ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700'
                          }`}
                        >
                          {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
                        </div>

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-extrabold text-slate-900">{student.name}</span>
                            <Badge variant="indigo" size="sm">
                              {student.admissionNo}
                            </Badge>
                            <Badge variant={student.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm">
                              {student.status || 'ACTIVE'}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-slate-600 font-medium">
                            <div className="flex items-center gap-1 truncate text-slate-700">
                              <User className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>Father: <strong className="text-slate-900">{fatherName}</strong></span>
                            </div>

                            <div className="flex items-center gap-1 truncate text-slate-700">
                              <BookOpen className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>
                                <strong className="text-slate-900">{info.className}</strong> {info.sectionName} {info.rollNo && `(${info.rollNo})`}
                              </span>
                            </div>

                            {student.phone && (
                              <div className="flex items-center gap-1 truncate text-slate-500 font-mono text-[10px]">
                                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>Ph: {student.phone}</span>
                              </div>
                            )}

                            {(info.mediumName || info.streamName) && (
                              <div className="flex items-center gap-1 truncate text-slate-500 text-[10px]">
                                <Layers className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{info.mediumName} {info.streamName && `• ${info.streamName}`}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-1 shadow-2xs">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selected Student Full Profile Card */}
      {selectedStudent && (
        <div className="p-4 bg-gradient-to-r from-indigo-50/90 via-purple-50/50 to-slate-50 rounded-2xl border border-indigo-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                <UserCheck className="w-4 h-4" />
              </div>
              <span className="text-xs font-extrabold text-slate-900">Selected Student Profile</span>
            </div>
            <Badge variant="success" size="sm">
              Ready for Fee Sheet
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-2.5 bg-white/90 rounded-xl border border-indigo-100 shadow-2xs">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-0.5">Student Name</span>
              <p className="font-bold text-slate-900 text-xs">{selectedStudent.name}</p>
              <p className="text-[10px] text-indigo-700 font-mono font-bold mt-0.5">Adm No: {selectedStudent.admissionNo}</p>
            </div>

            <div className="p-2.5 bg-white/90 rounded-xl border border-indigo-100 shadow-2xs">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-0.5">Father / Guardian</span>
              <p className="font-bold text-slate-900 text-xs">{selectedStudent.guardianName || selectedStudent.fatherName || 'N/A'}</p>
              {selectedStudent.phone && <p className="text-[10px] text-slate-500 font-mono mt-0.5">Ph: {selectedStudent.phone}</p>}
            </div>

            <div className="p-2.5 bg-white/90 rounded-xl border border-indigo-100 shadow-2xs">
              {(() => {
                const info = getEnrollmentInfo(selectedStudent);
                return (
                  <>
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-0.5">Class & Academic Details</span>
                    <p className="font-bold text-slate-900 text-xs">
                      {info.className} {info.sectionName}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                      {info.rollNo && `${info.rollNo} • `}{info.mediumName} {info.streamName && `• ${info.streamName}`}
                    </p>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableStudentSelect;
