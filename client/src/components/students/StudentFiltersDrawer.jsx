import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { Select } from '../ui/Select.jsx';
import { Button } from '../ui/Button.jsx';
import { Drawer } from '../ui/Drawer.jsx';

export const StudentFiltersDrawer = ({
  isOpen,
  onClose,
  filters,
  onChange,
  onReset,
  classes = [],
  sections = [],
  mediums = [],
  streams = [],
  activeCount = 0,
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

      {activeCount > 0 && (
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            icon={RotateCcw}
            className="w-full h-9 text-xs"
          >
            Clear Filters ({activeCount})
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop & Tablet Compact Inline Filter Toolbar */}
      <div className="hidden md:flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider shrink-0 pr-2.5 border-r border-slate-200 select-none">
          <Filter className="w-3.5 h-3.5 text-indigo-600" />
          <span>FILTERS</span>
          {activeCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 text-[10px] flex items-center justify-center font-bold">
              {activeCount}
            </span>
          )}
        </div>

        <div className="flex-1 grid grid-cols-2 lg:grid-cols-5 gap-2">
          <Select
            size="sm"
            value={filters.classId || ''}
            onChange={(e) => onChange('classId', e.target.value)}
            className="text-xs py-1.5 h-9 bg-slate-50/60 border-slate-200 hover:bg-white transition-colors"
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
            className="text-xs py-1.5 h-9 bg-slate-50/60 border-slate-200 hover:bg-white transition-colors"
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
            className="text-xs py-1.5 h-9 bg-slate-50/60 border-slate-200 hover:bg-white transition-colors"
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
            className="text-xs py-1.5 h-9 bg-slate-50/60 border-slate-200 hover:bg-white transition-colors"
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
            className="text-xs py-1.5 h-9 bg-slate-50/60 border-slate-200 hover:bg-white transition-colors"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="LEFT">LEFT</option>
            <option value="GRADUATED">GRADUATED</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </Select>
        </div>

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

