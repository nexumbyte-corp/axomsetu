import React from 'react';
import { Filter, RotateCcw, Search } from 'lucide-react';
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
    <>
      {/* Desktop & Tablet Single-Row Toolbar (Search + Filters + Count) */}
      <div className="hidden md:flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
        {/* Search Input */}
        <div className="w-64 min-w-[200px] shrink-0">
          <Input
            placeholder="Search students..."
            value={searchTerm}
            onChange={onSearchChange}
            icon={Search}
            size="sm"
            className="h-9 text-xs placeholder:text-slate-400 rounded-lg bg-slate-50/60 border-slate-200 focus:bg-white transition-colors"
          />
        </div>

        {/* Filter Selects Row */}
        <div className="flex-1 grid grid-cols-5 gap-2 min-w-0">
          <Select
            size="sm"
            value={filters.classId || ''}
            onChange={(e) => onChange('classId', e.target.value)}
            className="text-xs py-1 h-9 bg-slate-50/60 border-slate-200 hover:bg-white transition-colors rounded-lg"
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                Class {c.name}
              </option>
            ))}
          </Select>

          <Select
            size="sm"
            value={filters.sectionId || ''}
            onChange={(e) => onChange('sectionId', e.target.value)}
            className="text-xs py-1 h-9 bg-slate-50/60 border-slate-200 hover:bg-white transition-colors rounded-lg"
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
            size="sm"
            value={filters.mediumId || ''}
            onChange={(e) => onChange('mediumId', e.target.value)}
            className="text-xs py-1 h-9 bg-slate-50/60 border-slate-200 hover:bg-white transition-colors rounded-lg"
          >
            <option value="">All Mediums</option>
            {mediums.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>

          <Select
            size="sm"
            value={filters.streamId || ''}
            onChange={(e) => onChange('streamId', e.target.value)}
            className="text-xs py-1 h-9 bg-slate-50/60 border-slate-200 hover:bg-white transition-colors rounded-lg"
          >
            <option value="">All Streams</option>
            {streams.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
          </Select>

          <Select
            size="sm"
            value={filters.status || ''}
            onChange={(e) => onChange('status', e.target.value)}
            className="text-xs py-1 h-9 bg-slate-50/60 border-slate-200 hover:bg-white transition-colors rounded-lg"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="LEFT">LEFT</option>
            <option value="GRADUATED">GRADUATED</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </Select>
        </div>

        {/* Reset Button (If active filters exist) */}
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="xs"
            onClick={onReset}
            className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 shrink-0 h-9 px-2 font-medium"
          >
            Reset
          </Button>
        )}

        {/* Student Count Indicator */}
        <div className="flex items-center text-xs font-medium text-slate-600 shrink-0 whitespace-nowrap bg-slate-50 px-2.5 h-9 rounded-lg border border-slate-200 font-mono">
          <span className="font-bold text-slate-900 mr-1">{totalStudents}</span>
          {totalStudents === 1 ? 'Student' : 'Students'}
        </div>
      </div>

      {/* Mobile Controls (< md) */}
      <div className="md:hidden flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <Input
            placeholder="Search students..."
            value={searchTerm}
            onChange={onSearchChange}
            icon={Search}
            size="sm"
            className="h-10 text-xs placeholder:text-slate-400 rounded-xl"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenMobileDrawer}
          icon={Filter}
          className="shrink-0 h-10 px-3 text-xs"
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
    </>
  );
};

export default StudentFiltersDrawer;

