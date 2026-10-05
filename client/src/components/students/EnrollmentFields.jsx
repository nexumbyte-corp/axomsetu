import React, { useEffect } from 'react';
import { Select } from '../ui/Select.jsx';
import { Input } from '../ui/Input.jsx';
import { Link } from 'react-router-dom';

export const EnrollmentFields = ({
  classes = [],
  mediums = [],
  sections = [],
  streams = [],
  values = { classId: '', mediumId: '', sectionId: '', streamId: '', rollNumber: '' },
  onChange,
  errors = {},
  disabled = false,
  size = 'sm',
}) => {
  const selectedClass = classes.find((c) => c.id === values.classId);
  const hasStream = Boolean(selectedClass?.hasStream);

  // Automatically reset streamId when switching to a non-stream class
  useEffect(() => {
    if (selectedClass && !hasStream && values.streamId) {
      onChange({ ...values, streamId: null });
    }
  }, [selectedClass, hasStream, values.streamId]);

  const handleClassChange = (e) => {
    const newClassId = e.target.value;
    const newClass = classes.find((c) => c.id === newClassId);
    const updatedValues = {
      ...values,
      classId: newClassId,
    };
    if (newClass && !newClass.hasStream) {
      updatedValues.streamId = null;
    }
    onChange(updatedValues);
  };

  return (
    <div className="space-y-3">
      {/* 3-Column Compact Grid for Class, Medium, Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {/* Class Selector */}
        <Select
          label="Class"
          size={size}
          required
          disabled={disabled}
          value={values.classId || ''}
          onChange={handleClassChange}
          error={errors.classId}
        >
          <option value="">-- Select Class --</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              Class {cls.name} {cls.hasStream ? '(Streams)' : ''}
            </option>
          ))}
        </Select>

        {/* Medium Selector */}
        <div>
          <Select
            label="Medium"
            size={size}
            required
            disabled={disabled}
            value={values.mediumId || ''}
            onChange={(e) => onChange({ ...values, mediumId: e.target.value })}
            error={errors.mediumId}
          >
            <option value="">-- Select Medium --</option>
            {mediums.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
          {mediums.length === 0 && (
            <p className="mt-0.5 text-[10px] text-amber-600">
              No mediums.{' '}
              <Link to="/app/mediums" className="underline font-semibold">
                Configure
              </Link>
            </p>
          )}
        </div>

        {/* Section Selector */}
        <Select
          label="Section"
          size={size}
          disabled={disabled}
          value={values.sectionId || ''}
          onChange={(e) => onChange({ ...values, sectionId: e.target.value || null })}
          error={errors.sectionId}
          helperText={size === 'sm' ? undefined : 'Optional'}
        >
          <option value="">No Section</option>
          {sections.map((sec) => (
            <option key={sec.id} value={sec.id}>
              Section {sec.name}
            </option>
          ))}
        </Select>
      </div>

      {/* Row 2: Stream (if enabled) & Roll Number */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {/* Stream Selector (Conditional on Class.hasStream) */}
        {hasStream ? (
          <div>
            <Select
              label="Stream *"
              size={size}
              required
              disabled={disabled || !values.classId}
              value={values.streamId || ''}
              onChange={(e) => onChange({ ...values, streamId: e.target.value || null })}
              error={errors.streamId}
              helperText={
                !values.classId
                  ? 'Select class first'
                  : undefined
              }
            >
              <option value="">-- Select Stream --</option>
              {streams.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </Select>

            {streams.length === 0 && (
              <p className="mt-0.5 text-[10px] text-amber-600">
                No streams.{' '}
                <Link to="/app/streams" className="underline font-semibold">
                  Configure
                </Link>
              </p>
            )}
          </div>
        ) : null}

        {/* Roll Number */}
        <div className={hasStream ? '' : 'sm:col-span-1'}>
          <Input
            label="Roll Number"
            size={size}
            type="text"
            placeholder="e.g. 15 (Optional)"
            disabled={disabled}
            maxLength={3}
            value={values.rollNumber ?? values.rollNo ?? ''}
            onChange={(e) => {
              const clean = e.target.value.replace(/\D/g, '').slice(0, 3);
              onChange({ ...values, rollNumber: clean });
            }}
            error={errors.rollNumber || errors.rollNo}
            helperText={size === 'sm' ? undefined : 'Optional (1 - 999)'}
          />
        </div>
      </div>
    </div>
  );
};
