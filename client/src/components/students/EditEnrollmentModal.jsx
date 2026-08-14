import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { EnrollmentFields } from './EnrollmentFields.jsx';
import { studentService } from '../../services/student.service.js';
import { toast } from '../ui/Toast.jsx';
import { Save } from 'lucide-react';

export const EditEnrollmentModal = ({
  isOpen,
  onClose,
  student,
  enrollment,
  classes = [],
  mediums = [],
  sections = [],
  streams = [],
  onSuccess,
}) => {
  const [enrollmentValues, setEnrollmentValues] = useState({
    classId: '',
    mediumId: '',
    sectionId: '',
    streamId: '',
    rollNumber: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen && enrollment) {
      setEnrollmentValues({
        classId: enrollment.class?.id || enrollment.classId || '',
        mediumId: enrollment.medium?.id || enrollment.mediumId || '',
        sectionId: enrollment.section?.id || enrollment.sectionId || '',
        streamId: enrollment.stream?.id || enrollment.streamId || '',
        rollNumber: enrollment.rollNumber ?? enrollment.rollNo ?? '',
      });
      setErrors({});
    }
  }, [isOpen, enrollment]);

  if (!student || !enrollment) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!enrollmentValues.classId) {
      setErrors({ classId: 'Class is required' });
      return;
    }
    if (!enrollmentValues.mediumId) {
      setErrors({ mediumId: 'Medium is required' });
      return;
    }

    const selectedClass = classes.find((c) => c.id === enrollmentValues.classId);
    if (selectedClass?.hasStream && !enrollmentValues.streamId) {
      setErrors({ streamId: `Stream is required for class '${selectedClass.name}'` });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        classId: enrollmentValues.classId,
        sectionId: enrollmentValues.sectionId || null,
        mediumId: enrollmentValues.mediumId,
        streamId: selectedClass?.hasStream ? enrollmentValues.streamId || null : null,
        rollNumber: enrollmentValues.rollNumber || null,
      };

      await studentService.updateEnrollment(student.id, enrollment.id, payload);
      toast.success('Enrollment updated successfully');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to update enrollment');
      if (err.errors) setErrors(err.errors);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Enrollment (${enrollment.academicYear?.name}) — ${student.name}`}
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>

          <Button
            type="submit"
            form="edit-enrollment-form"
            loading={loading}
            loadingText="Saving changes..."
            icon={Save}
          >
            Save Enrollment
          </Button>
        </div>
      }
    >
      <form id="edit-enrollment-form" onSubmit={handleSubmit} className="space-y-4">
        <EnrollmentFields
          classes={classes}
          mediums={mediums}
          sections={sections}
          streams={streams}
          values={enrollmentValues}
          onChange={setEnrollmentValues}
          errors={errors}
          disabled={loading}
        />
      </form>
    </Modal>
  );
};
