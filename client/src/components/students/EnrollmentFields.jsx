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
    <div className="space-y-4">
      {/* Class & Medium Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Class Selector */}
        <Select
          label="Class"
          required
          disabled={disabled}
          value={values.classId || ''}
          onChange={handleClassChange}
          error={errors.classId}
        >
          <option value="">-- Select Class --</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              Class {cls.name} {cls.hasStream ? '(Streams Enabled)' : ''}
            </option>
          ))}
        </Select>

        {/* Medium Selector */}
        <div>
          <Select
            label="Medium"
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
            <p className="mt-1 text-xs text-amber-600">
              No mediums configured.{' '}
              <Link to="/app/mediums" className="underline font-semibold">
                Configure Mediums
              </Link>
            </p>
          )}
        </div>
      </div>

      {/* Section & Stream Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Section Selector (Optional) */}
        <Select
          label="Section"
          disabled={disabled}
          value={values.sectionId || ''}
          onChange={(e) => onChange({ ...values, sectionId: e.target.value || null })}
          error={errors.sectionId}
          helperText="Optional"
        >
          <option value="">No Section</option>
          {sections.map((sec) => (
            <option key={sec.id} value={sec.id}>
              Section {sec.name}
            </option>
          ))}
        </Select>

        {/* Stream Selector (Conditional on Class.hasStream) */}
        <div>
          <Select
            label={`Stream ${hasStream ? '*' : '(N/A)'}`}
            required={hasStream}
            disabled={disabled || !hasStream || !values.classId}
            value={hasStream ? values.streamId || '' : ''}
            onChange={(e) => onChange({ ...values, streamId: e.target.value || null })}
            error={errors.streamId}
            helperText={
              !values.classId
                ? 'Select a class first'
                : !hasStream
                ? 'Class does not require a stream'
                : 'Required for this class'
            }
          >
            <option value="">
              {!hasStream ? 'Not Applicable' : '-- Select Stream --'}
            </option>
            {hasStream &&
              streams.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
          </Select>

          {hasStream && streams.length === 0 && (
            <p className="mt-1 text-xs text-amber-600">
              No streams configured.{' '}
              <Link to="/app/streams" className="underline font-semibold">
                Configure Streams
              </Link>
            </p>
          )}
        </div>
      </div>

      {/* Roll Number Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Roll Number"
          type="text"
          placeholder="e.g. 15 (Optional)"
          disabled={disabled}
          value={values.rollNumber ?? values.rollNo ?? ''}
          onChange={(e) => onChange({ ...values, rollNumber: e.target.value })}
          error={errors.rollNumber || errors.rollNo}
          helperText="Optional numerical roll number"
        />
      </div>
    </div>
  );
};
