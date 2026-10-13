import React, { useState } from 'react';
import { Filter, RotateCcw, Search, SlidersHorizontal, ChevronDown, X } from 'lucide-react';
import { Select } from '../ui/Select.jsx';
import { Input } from '../ui/Input.jsx';
import { Button } from '../ui/Button.jsx';
import { Drawer } from '../ui/Drawer.jsx';

export const StudentFiltersDrawer = ({
  isOpen,
  onClose,
  onOpenMobileDrawer,
  searchTerm = '',
  onSearchChange,
  filters,
  onChange,
  onReset,
  classes = [],
  sections = [],
  mediums = [],
  streams = [],
  activeCount = 0,
  totalStudents = 0,
}) => {
  // Count secondary filters (excluding classId which is on the primary row)
  const secondaryFilterCount = [
    filters.sectionId,
    filters.mediumId,
    filters.streamId,
    filters.residenceType,
    filters.status,
  ].filter(Boolean).length;

  const [isExpanded, setIsExpanded] = useState(() => secondaryFilterCount > 0);

  const filterFormContent = (
    <div className="space-y-3.5">
      <Select
        label="Class"
        size="sm"
        value={filters.classId || ''}
        onChange={(e) => onChange('classId', e.target.value)}
      >
        <option value="">All Classes</option>
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            Class {c.name}
          </option>
        ))}
      </Select>

      <Select
        label="Section"
        size="sm"
        value={filters.sectionId || ''}
        onChange={(e) => onChange('sectionId', e.target.value)}
      >
        <option value="">All Sections</option>
        <option value="null">No Section</option>
        {sections.map((s) => (
          <option key={s.id} value={s.id}>
            Section {s.name}
          </option>
        ))}
      </Select>

      <Select
        label="Medium"
        size="sm"
        value={filters.mediumId || ''}
        onChange={(e) => onChange('mediumId', e.target.value)}
      >
        <option value="">All Mediums</option>
        {mediums.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </Select>

      <Select
        label="Stream"
        size="sm"
        value={filters.streamId || ''}
        onChange={(e) => onChange('streamId', e.target.value)}
      >
        <option value="">All Streams</option>
        {streams.map((st) => (
          <option key={st.id} value={st.id}>
            {st.name}
          </option>
        ))}
      </Select>

      <Select
        label="Residence Type"
        size="sm"
        value={filters.residenceType || ''}
        onChange={(e) => onChange('residenceType', e.target.value)}
      >
        <option value="">All (Day Scholar & Hosteller)</option>
        <option value="DAY_SCHOLAR">Day Scholar</option>
        <option value="HOSTELLER">Hosteller</option>
      </Select>

      <Select
        label="Student Status"
        size="sm"
        value={filters.status || ''}
        onChange={(e) => onChange('status', e.target.value)}
      >
        <option value="">All Statuses</option>
        <option value="ACTIVE">ACTIVE</option>
        <option value="LEFT">LEFT</option>
        <option value="GRADUATED">GRADUATED</option>
        <option value="ARCHIVED">ARCHIVED</option>
      </Select>

      {(activeCount > 0 || searchTerm) && (
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            icon={RotateCcw}
            className="w-full h-9 text-xs"
          >
            Clear Filters & Search
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
      {/* Desktop & Tablet Primary Toolbar */}
      <div className="hidden md:flex items-center gap-2">
        {/* Search Input */}
        <div className="flex-1 max-w-sm relative">
          <Input
            placeholder="Search name, admission no, phone, father..."
            value={searchTerm}
            onChange={onSearchChange}
            icon={Search}
            size="sm"
            className="h-9 text-xs placeholder:text-slate-400 rounded-lg bg-slate-50/60 border-slate-200 focus:bg-white transition-colors pr-7"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange({ target: { value: '' } })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Primary Class Filter */}
        <div className="w-36 shrink-0">
          <Select
            size="sm"
            value={filters.classId || ''}
            onChange={(e) => onChange('classId', e.target.value)}
            className="text-xs py-1 h-9 bg-slate-50/60 border-slate-200 hover:bg-white transition-colors rounded-lg font-medium text-slate-700"
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                Class {c.name}
              </option>
            ))}
          </Select>
        </div>

        {/* Secondary Filters Tray Toggle Button */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className={`inline-flex items-center gap-1.5 px-3 h-9 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
            isExpanded || secondaryFilterCount > 0
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
              : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-current" />
          <span>Filters</span>
          {secondaryFilterCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
              {secondaryFilterCount}
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>

        {/* Reset Button (If active filters exist) */}
        {(activeCount > 0 || searchTerm) && (
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg px-2.5 h-9 font-medium transition-colors"
          >
            Reset
          </button>
        )}

        {/* Student Count Indicator */}
        <div className="ml-auto flex items-center text-xs font-medium text-slate-500 shrink-0 whitespace-nowrap bg-slate-50 px-2.5 h-9 rounded-lg border border-slate-200/80 font-mono">
          <span className="font-bold text-slate-900 mr-1">{totalStudents}</span>
          {totalStudents === 1 ? 'Student' : 'Students'}
        </div>
      </div>

      {/* Desktop Collapsible Secondary Filters Tray */}
      {isExpanded && (
        <div className="hidden md:grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-2.5 border-t border-slate-100">
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Section
            </label>
            <Select
              size="sm"
              value={filters.sectionId || ''}
              onChange={(e) => onChange('sectionId', e.target.value)}
              className="text-xs py-1 h-8.5 bg-slate-50/60 border-slate-200 hover:bg-white transition-colors rounded-lg font-medium text-slate-700 w-full"
            >
              <option value="">All Sections</option>
              <option value="null">No Section</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  Section {s.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Medium
            </label>
            <Select
              size="sm"
              value={filters.mediumId || ''}
              onChange={(e) => onChange('mediumId', e.target.value)}
              className="text-xs py-1 h-8.5 bg-slate-50/60 border-slate-200 hover:bg-white transition-colors rounded-lg font-medium text-slate-700 w-full"
            >
              <option value="">All Mediums</option>
              {mediums.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Stream
            </label>
            <Select
              size="sm"
              value={filters.streamId || ''}
              onChange={(e) => onChange('streamId', e.target.value)}
              className="text-xs py-1 h-8.5 bg-slate-50/60 border-slate-200 hover:bg-white transition-colors rounded-lg font-medium text-slate-700 w-full"
            >
              <option value="">All Streams</option>
              {streams.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Residence
            </label>
            <Select
              size="sm"
              value={filters.residenceType || ''}
              onChange={(e) => onChange('residenceType', e.target.value)}
              className="text-xs py-1 h-8.5 bg-slate-50/60 border-slate-200 hover:bg-white transition-colors rounded-lg font-medium text-slate-700 w-full"
            >
              <option value="">All (Day / Hosteller)</option>
              <option value="DAY_SCHOLAR">Day Scholar</option>
              <option value="HOSTELLER">Hosteller</option>
            </Select>
          </div>

          <div>
            <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Status
            </label>
            <Select
              size="sm"
              value={filters.status || ''}
              onChange={(e) => onChange('status', e.target.value)}
              className="text-xs py-1 h-8.5 bg-slate-50/60 border-slate-200 hover:bg-white transition-colors rounded-lg font-medium text-slate-700 w-full"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="LEFT">LEFT</option>
              <option value="GRADUATED">GRADUATED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </Select>
          </div>
        </div>
      )}

      {/* Mobile Controls (< md) */}
      <div className="md:hidden flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <Input
            placeholder="Search students..."
            value={searchTerm}
            onChange={onSearchChange}
            icon={Search}
            size="sm"
            className="h-9 text-xs placeholder:text-slate-400 rounded-lg"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenMobileDrawer}
          icon={Filter}
          className="shrink-0 h-9 px-2.5 text-xs"
        >
          Filters {activeCount > 0 && `(${activeCount})`}
        </Button>
      </div>

      {/* Mobile Filter Drawer */}
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title={`Filter Students ${activeCount > 0 ? `(${activeCount})` : ''}`}
        position="right"
      >
        {filterFormContent}
      </Drawer>
    </div>
  );
};

export default StudentFiltersDrawer;
