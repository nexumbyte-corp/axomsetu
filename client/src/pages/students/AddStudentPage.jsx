import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  UserPlus,
  ShieldAlert,
  Camera,
  Upload,
  CheckCircle2,
  X,
  User,
  ShieldCheck,
  Sparkles,
  Receipt,
  RotateCcw,
  Check,
  PlusCircle,
  Calendar,
  Info,
  ArrowRight,
  ChevronRight,
  Edit3
} from 'lucide-react';
import { useAcademicYear } from '../../hooks/useAcademicYear.js';
import { useAuth } from '../../hooks/useAuth.js';
import { studentService } from '../../services/student.service.js';
import { academicService } from '../../services/academic.service.js';
import { feeService } from '../../services/fee.service.js';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { DatePicker } from '../../components/ui/DatePicker.jsx';
import { Textarea } from '../../components/ui/Textarea.jsx';
import { Card, CardContent } from '../../components/ui/Card.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { EnrollmentFields } from '../../components/students/EnrollmentFields.jsx';
import { PassportPhotoCropModal } from '../../components/students/PassportPhotoCropModal.jsx';
import { CameraCaptureModal } from '../../components/students/CameraCaptureModal.jsx';
import { toast } from '../../components/ui/Toast.jsx';
import { usePageHeader } from '../../context/PageHeaderContext.jsx';
import { useSubscription } from '../../context/SubscriptionContext.jsx';
import { getFormErrors } from '../../utils/errorUtils.js';
import { isStudentLimitError, parseStudentLimitError } from '../../utils/subscriptionUtils.js';
import { getISTTodayString, formatDateForInput, formatCurrency } from '../../utils/formatters.js';

const MONTH_NAMES = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];

const CASTE_OPTIONS = [
  { value: 'UR', label: 'UR / General' },
  { value: 'OBC', label: 'OBC' },
  { value: 'SC', label: 'SC' },
  { value: 'ST', label: 'ST' },
  { value: 'EWS', label: 'EWS' },
  { value: 'OTHER', label: 'Other' },
];

const toTitleCase = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => (word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : ''))
    .join(' ');
};

export const AddStudentPage = () => {
  const navigate = useNavigate();
  const { selectedYear, selectedYearId } = useAcademicYear();
  const { user } = useAuth();
  const { showStudentLimitModal, subscription } = useSubscription();

  // Multi-step state: 1 = Student & Class Details, 2 = Fee Schedule & Concessions
  const [currentStep, setCurrentStep] = useState(1);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const nameInputRef = useRef(null);

  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [photoOptionsOpen, setPhotoOptionsOpen] = useState(false);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);

  const canOverride = user?.role === 'SCHOOL_ADMIN';

  // Academic Setup options
  const [classes, setClasses] = useState([]);
  const [mediums, setMediums] = useState([]);
  const [sections, setSections] = useState([]);
  const [streams, setStreams] = useState([]);
  const [loadingSetup, setLoadingSetup] = useState(true);

  // Track session count
  const [sessionAddedCount, setSessionAddedCount] = useState(0);

  const todayDateStr = getISTTodayString();
  const minAdmissionDate = selectedYear?.startDate
    ? formatDateForInput(selectedYear.startDate)
    : '';
  const maxAdmissionDate = selectedYear?.endDate
    ? formatDateForInput(selectedYear.endDate)
    : '';

  // Form State
  const [studentInfo, setStudentInfo] = useState({
    admissionDate: todayDateStr,
    name: '',
    guardianName: '',
    phone: '',
    gender: 'MALE',
    caste: 'UR',
    customCaste: '',
    address: '',
    photoUrl: '',
    photoSizeKb: '',
  });

  // Photo Crop Modal State
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
  const [pendingPhotoFile, setPendingPhotoFile] = useState(null);
  const [photoLoadError, setPhotoLoadError] = useState(false);

  const [enrollmentValues, setEnrollmentValues] = useState({
    classId: '',
    mediumId: '',
    sectionId: '',
    streamId: '',
    rollNumber: '',
  });

  const [feeStructureHeads, setFeeStructureHeads] = useState([]);
  const [loadingFeeStructure, setLoadingFeeStructure] = useState(false);

  // Fee Overrides state
  const [feeOverrides, setFeeOverrides] = useState({});

  const [submitting, setSubmitting] = useState(false);
  const [submittingMode, setSubmittingMode] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setStudentInfo((prev) => ({
      ...prev,
      admissionDate: getISTTodayString(),
    }));
  }, []);

  // Fetch academic configuration on mount
  useEffect(() => {
    let isMounted = true;
    const fetchOptions = async () => {
      setLoadingSetup(true);
      try {
        const [clsRes, secRes, medRes, strRes] = await Promise.all([
          academicService.getClasses(),
          academicService.getSections(),
          academicService.getMediums(),
          academicService.getStreams(),
        ]);
        if (isMounted) {
          if (clsRes.success) setClasses(clsRes.data || []);
          if (secRes.success) setSections(secRes.data || []);
          if (medRes.success) setMediums(medRes.data || []);
          if (strRes.success) setStreams(strRes.data || []);
        }
      } catch {
        toast.error('Failed loading academic configuration');
      } finally {
        if (isMounted) setLoadingSetup(false);
      }
    };
    fetchOptions();
    return () => {
      isMounted = false;
    };
  }, []);

  // Clear overrides whenever class/medium/stream changes
  useEffect(() => {
    setFeeOverrides({});
  }, [enrollmentValues.classId, enrollmentValues.mediumId, enrollmentValues.streamId]);

  // Fetch Fee Structure when Class / Medium / Stream selection changes
  useEffect(() => {
    let isCancelled = false;
    const fetchFeeStructure = async () => {
      if (!selectedYearId || !enrollmentValues.classId || !enrollmentValues.mediumId) {
        setFeeStructureHeads([]);
        return;
      }

      const selectedClass = classes.find((c) => c.id === enrollmentValues.classId);
      if (selectedClass?.hasStream && !enrollmentValues.streamId) {
        setFeeStructureHeads([]);
        return;
      }

      setLoadingFeeStructure(true);
      try {
        const params = {
          academicYearId: selectedYearId,
          classId: enrollmentValues.classId,
          mediumId: enrollmentValues.mediumId,
          ...(selectedClass?.hasStream && enrollmentValues.streamId ? { streamId: enrollmentValues.streamId } : {}),
        };
        const res = await feeService.getFeeStructures(params);
        if (isCancelled) return;
        const fsList = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        const fs = fsList[0];
        if (fs && fs.heads?.length > 0) {
          setFeeStructureHeads(
            fs.heads.filter((h) => h.isActive).map((h) => ({
              feeTypeId: h.feeTypeId,
              title: h.feeType?.name || 'Fee Head',
              category: h.feeType?.category || h.feeType?.feeCategory || 'ACADEMIC',
              amount: Number(h.amount),
            }))
          );
        } else {
          setFeeStructureHeads([]);
        }
      } catch {
        if (!isCancelled) setFeeStructureHeads([]);
      } finally {
        if (!isCancelled) setLoadingFeeStructure(false);
      }
    };

    fetchFeeStructure();
    return () => {
      isCancelled = true;
    };
  }, [selectedYearId, enrollmentValues.classId, enrollmentValues.mediumId, enrollmentValues.streamId, classes]);

  // Photo handlers
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error('Selected file size exceeds 8MB');
      return;
    }

    setSelectedPhotoFile(file);
    setCropModalOpen(true);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePhotoCropSuccess = (url, sizeKb, file) => {
    setPhotoLoadError(false);
    setPendingPhotoFile(file || null);
    setStudentInfo((prev) => ({
      ...prev,
      photoUrl: url,
      photoSizeKb: sizeKb,
    }));
    setErrors((prev) => ({ ...prev, photoUrl: null }));
  };

  const handleRemovePhoto = () => {
    setPhotoLoadError(false);
    setPendingPhotoFile(null);
    setStudentInfo((prev) => ({
      ...prev,
      photoUrl: '',
      photoSizeKb: '',
    }));
  };

  // Fee calculation & overrides logic
  const allPreviewHeads = feeStructureHeads;

  const getHeadOverride = useCallback((head) => {
    const key = head.feeTypeId || head.title;
    const ov = feeOverrides[key];
    const templateAmt = Number(head.amount) || 0;

    if (!ov || ov.overrideAmount === undefined || ov.overrideAmount === '') {
      return {
        finalAmount: templateAmt,
        discountAmount: 0,
        isOverridden: false,
        error: null,
        reason: ov?.reason || '',
        rawValue: '',
      };
    }

    const parsed = Number(ov.overrideAmount);
    if (isNaN(parsed) || parsed < 0) {
      return {
        finalAmount: templateAmt,
        discountAmount: 0,
        isOverridden: true,
        error: 'Amount cannot be negative',
        reason: ov.reason || '',
        rawValue: ov.overrideAmount,
      };
    }

    if (parsed > templateAmt) {
      return {
        finalAmount: parsed,
        discountAmount: 0,
        isOverridden: true,
        error: 'Amount cannot exceed template fee',
        reason: ov.reason || '',
        rawValue: ov.overrideAmount,
      };
    }

    const discountAmount = templateAmt - parsed;
    return {
      finalAmount: parsed,
      discountAmount,
      isOverridden: parsed !== templateAmt,
      error: null,
      reason: ov.reason || '',
      rawValue: ov.overrideAmount,
    };
  }, [feeOverrides]);

  const totalOriginalAmount = useMemo(
    () => allPreviewHeads.reduce((sum, h) => sum + (Number(h.amount) || 0), 0),
    [allPreviewHeads]
  );

  const totalFinalAmount = useMemo(
    () => allPreviewHeads.reduce((sum, h) => sum + getHeadOverride(h).finalAmount, 0),
    [allPreviewHeads, getHeadOverride]
  );

  const totalDiscountAmount = Math.max(0, totalOriginalAmount - totalFinalAmount);
  const hasAnyOverrideError = useMemo(
    () => allPreviewHeads.some((h) => Boolean(getHeadOverride(h).error)),
    [allPreviewHeads, getHeadOverride]
  );

  const oneTimeAmount = useMemo(() => {
    return allPreviewHeads
      .filter((h) => {
        const cat = (h.category || '').toUpperCase();
        const titleLower = (h.title || '').toLowerCase();
        return (
          cat === 'ONE_TIME' ||
          cat === 'ONETIME_PER_YEAR' ||
          titleLower.includes('admission') ||
          titleLower.includes('registration') ||
          titleLower.includes('annual')
        );
      })
      .reduce((sum, h) => sum + getHeadOverride(h).finalAmount, 0);
  }, [allPreviewHeads, getHeadOverride]);

  const monthlyAmount = useMemo(() => {
    return Math.max(0, totalFinalAmount - oneTimeAmount);
  }, [totalFinalAmount, oneTimeAmount]);

  const applyPresetDiscount = (head, percentage, defaultReason = '') => {
    const key = head.feeTypeId || head.title;
    const templateAmt = Number(head.amount) || 0;
    if (percentage === 0) {
      setFeeOverrides((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }

    const discountedAmt = Math.round(templateAmt * (1 - percentage / 100));
    setFeeOverrides((prev) => ({
      ...prev,
      [key]: {
        overrideAmount: String(discountedAmt),
        reason: prev[key]?.reason || defaultReason || `${percentage}% Concession`,
      },
    }));
  };

  const handleOverrideAmountChange = (headKey, value) => {
    setFeeOverrides((prev) => ({
      ...prev,
      [headKey]: {
        ...prev[headKey],
        overrideAmount: value,
      },
    }));
  };

  const handleOverrideReasonChange = (headKey, value) => {
    setFeeOverrides((prev) => ({
      ...prev,
      [headKey]: {
        ...prev[headKey],
        reason: value,
      },
    }));
  };

  const billingMonthsPreview = useMemo(() => {
    if (!studentInfo.admissionDate) {
      return [MONTH_NAMES[new Date().getMonth()] || 'JANUARY'];
    }
    const admDate = new Date(studentInfo.admissionDate);
    if (isNaN(admDate.getTime())) {
      return [MONTH_NAMES[new Date().getMonth()] || 'JANUARY'];
    }

    const today = new Date();
    const endTarget = admDate > today ? admDate : today;

    const months = [];
    const curr = new Date(admDate);
    curr.setDate(1);
    curr.setHours(0, 0, 0, 0);

    const end = new Date(endTarget);
    end.setDate(1);
    end.setHours(0, 0, 0, 0);

    while (curr <= end) {
      months.push(MONTH_NAMES[curr.getMonth()]);
      curr.setMonth(curr.getMonth() + 1);
    }
    return months.length > 0 ? months : [MONTH_NAMES[end.getMonth()] || 'JANUARY'];
  }, [studentInfo.admissionDate]);

  const isFormDirty = useMemo(() => {
    return Boolean(
      studentInfo.name.trim() ||
      studentInfo.guardianName.trim() ||
      studentInfo.phone.trim() ||
      studentInfo.address.trim() ||
      studentInfo.photoUrl ||
      pendingPhotoFile ||
      enrollmentValues.rollNumber ||
      Object.keys(feeOverrides).length > 0
    );
  }, [studentInfo, pendingPhotoFile, enrollmentValues.rollNumber, feeOverrides]);

  const handleNavigateBack = () => {
    if (isFormDirty) {
      setConfirmLeaveOpen(true);
    } else {
      navigate('/app/students');
    }
  };

  // Step 1 Validation
  const validateStep1 = () => {
    const newErrors = {};

    if (!studentInfo.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (studentInfo.name.trim().length < 2) {
      newErrors.name = 'Min 2 characters required';
    }

    if (!studentInfo.guardianName.trim()) {
      newErrors.guardianName = 'Guardian name is required';
    } else if (studentInfo.guardianName.trim().length < 2) {
      newErrors.guardianName = 'Min 2 characters required';
    }

    if (!studentInfo.admissionDate) {
      newErrors.admissionDate = 'Admission date required';
    } else if (minAdmissionDate && studentInfo.admissionDate < minAdmissionDate) {
      newErrors.admissionDate = `Cannot be before ${minAdmissionDate}`;
    } else if (maxAdmissionDate && studentInfo.admissionDate > maxAdmissionDate) {
      newErrors.admissionDate = `Cannot be after ${maxAdmissionDate}`;
    }

    const trimmedPhone = studentInfo.phone.trim();
    if (!trimmedPhone) {
      newErrors.phone = 'Phone required';
    } else if (!/^\d{10}$/.test(trimmedPhone)) {
      newErrors.phone = 'Must be exactly 10 digits';
    }

    if (!studentInfo.gender) {
      newErrors.gender = 'Gender required';
    }

    if (!enrollmentValues.classId) {
      newErrors.classId = 'Class is required';
    }

    if (!enrollmentValues.mediumId) {
      newErrors.mediumId = 'Medium is required';
    }

    const selectedClass = classes.find((c) => c.id === enrollmentValues.classId);
    if (selectedClass?.hasStream && !enrollmentValues.streamId) {
      newErrors.streamId = `Stream required for ${selectedClass.name}`;
    }

    if (enrollmentValues.rollNumber) {
      const parsedRoll = Number(enrollmentValues.rollNumber);
      if (isNaN(parsedRoll) || parsedRoll < 1 || parsedRoll > 999) {
        newErrors.rollNumber = 'Must be between 1 and 999';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstErrorKey = Object.keys(newErrors)[0];
      const targetElement = document.getElementById(firstErrorKey) || document.querySelector(`[name="${firstErrorKey}"]`);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetElement.focus?.();
      }
      toast.error('Please correct highlighted fields before proceeding');
      return false;
    }

    setErrors({});
    return true;
  };

  const handleNextToFeePage = () => {
    if (validateStep1()) {
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBackToDetails = () => {
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Form Submit
  const handleSubmit = async (e, mode = 'FINISH') => {
    if (e) e.preventDefault();

    if (currentStep === 1) {
      handleNextToFeePage();
      return;
    }

    if (selectedYear?.isLocked) {
      toast.error('Cannot add student into a locked academic year');
      return;
    }

    if (hasAnyOverrideError) {
      toast.error('Please fix fee override errors before submitting');
      return;
    }

    const trimmedPhone = studentInfo.phone.trim();
    const selectedClass = classes.find((c) => c.id === enrollmentValues.classId);

    const resolvedCaste =
      studentInfo.caste === 'OTHER'
        ? studentInfo.customCaste.trim() || 'Other'
        : studentInfo.caste;

    const feeOverridesPayload = [];
    allPreviewHeads.forEach((h) => {
      const ov = getHeadOverride(h);
      if (ov.isOverridden && !ov.error) {
        feeOverridesPayload.push({
          feeTypeId: h.feeTypeId || null,
          title: h.title,
          finalAmount: ov.finalAmount,
          reason: ov.reason ? ov.reason.trim() : null,
        });
      }
    });

    setSubmitting(true);
    setSubmittingMode(mode);

    try {
      let finalPhotoUrl = (studentInfo.photoUrl?.startsWith('data:') || studentInfo.photoUrl?.startsWith('blob:'))
        ? null
        : (studentInfo.photoUrl?.trim() || null);

      // Upload deferred photo to backend during final submit
      if (pendingPhotoFile) {
        try {
          const photoFormData = new FormData();
          photoFormData.append('logo', pendingPhotoFile);
          const uploadRes = await studentService.uploadPhoto(photoFormData);
          if (uploadRes?.data?.photoUrl) {
            finalPhotoUrl = uploadRes.data.photoUrl;
          } else {
            throw new Error(uploadRes?.message || 'Failed to upload student photo');
          }
        } catch (photoErr) {
          toast.error(photoErr?.message || 'Photo upload failed. Please try again.');
          setSubmitting(false);
          setSubmittingMode(null);
          return;
        }
      }

      const payload = {
        photoUrl: finalPhotoUrl,
        admissionNo: null,
        admissionDate: studentInfo.admissionDate,
        name: studentInfo.name.trim(),
        guardianName: studentInfo.guardianName.trim(),
        phone: trimmedPhone,
        gender: studentInfo.gender,
        caste: resolvedCaste || null,
        address: studentInfo.address.trim() || null,

        academicYearId: selectedYearId,
        classId: enrollmentValues.classId,
        sectionId: enrollmentValues.sectionId || null,
        mediumId: enrollmentValues.mediumId,
        streamId: selectedClass?.hasStream ? enrollmentValues.streamId || null : null,
        rollNumber: enrollmentValues.rollNumber ? Number(enrollmentValues.rollNumber) : null,

        generateInitialFees: true,
        feeOverrides: feeOverridesPayload.length > 0 ? feeOverridesPayload : null,
      };

      const createdRes = await studentService.createStudent(payload);
      const studentName = studentInfo.name.trim();

      try {
        localStorage.removeItem('student_list_filters');
      } catch (storageErr) {
        console.error('Failed clearing saved student list filters:', storageErr);
      }

      if (mode === 'ANOTHER') {
        setPendingPhotoFile(null);
        setPhotoLoadError(false);
        setSessionAddedCount((prev) => prev + 1);
        toast.success(`🎉 ${studentName} registered! Ready for next.`);

        setStudentInfo((prev) => ({
          admissionDate: prev.admissionDate,
          name: '',
          guardianName: '',
          phone: '',
          gender: 'MALE',
          caste: 'UR',
          customCaste: '',
          address: '',
          photoUrl: '',
          photoSizeKb: '',
        }));

        setFeeOverrides({});
        setErrors({});

        setEnrollmentValues((prev) => ({
          ...prev,
          rollNumber: '',
        }));

        setCurrentStep(1);

        setTimeout(() => {
          nameInputRef.current?.focus();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
      } else {
        toast.success(`Student ${studentName} registered successfully!`);
        navigate('/app/students', {
          state: {
            newStudentAdded: true,
            createdStudentId: createdRes?.data?.id,
            timestamp: Date.now(),
          },
        });
      }
    } catch (err) {
      if (isStudentLimitError(err)) {
        showStudentLimitModal(parseStudentLimitError(err, subscription));
      } else {
        toast.error(err?.message || 'Failed adding student');
        const backendErrors = getFormErrors(err);
        if (Object.keys(backendErrors).length > 0) {
          setErrors((prev) => ({ ...prev, ...backendErrors }));
        }
      }
    } finally {
      setSubmitting(false);
      setSubmittingMode(null);
    }
  };

  const isLocked = Boolean(selectedYear?.isLocked);

  // Keyboard shortcut: Ctrl+Enter
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (currentStep === 1) {
          handleNextToFeePage();
        } else {
          handleSubmit(null, 'FINISH');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, studentInfo, enrollmentValues, feeOverrides]);

  // Page Header setup
  const { setHeaderInfo } = usePageHeader();
  const handleSubmitRef = useRef();
  handleSubmitRef.current = handleSubmit;

  useEffect(() => {
    setHeaderInfo({
      title: 'New Student Admission',
      icon: UserPlus,
      actions: (
        <div className="flex items-center gap-1.5">
          {sessionAddedCount > 0 && (
            <Badge variant="indigo" size="xs" className="hidden sm:inline-flex animate-in fade-in">
              <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
              {sessionAddedCount} added
            </Badge>
          )}

          {currentStep === 1 ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={ArrowRight}
              onClick={handleNextToFeePage}
              className="text-xs font-bold shadow-xs py-1"
            >
              Next: Fee Page
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={PlusCircle}
                onClick={(e) => handleSubmitRef.current?.(e, 'ANOTHER')}
                loading={submitting && submittingMode === 'ANOTHER'}
                disabled={isLocked || loadingSetup || hasAnyOverrideError || (submitting && submittingMode === 'FINISH')}
                className="hidden sm:inline-flex text-xs py-1"
                title="Save & Add Another"
              >
                Save & Add Another
              </Button>

              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={UserPlus}
                onClick={(e) => handleSubmitRef.current?.(e, 'FINISH')}
                loading={submitting && submittingMode === 'FINISH'}
                disabled={isLocked || loadingSetup || hasAnyOverrideError || (submitting && submittingMode === 'ANOTHER')}
                className="text-xs font-bold shadow-xs py-1"
              >
                Add & Finish
              </Button>
            </>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={ArrowLeft}
            onClick={currentStep === 2 ? handleBackToDetails : handleNavigateBack}
            className="text-xs py-1"
          >
            Back
          </Button>
        </div>
      ),
    });

    return () => setHeaderInfo(null);
  }, [setHeaderInfo, currentStep, sessionAddedCount, submitting, submittingMode, isLocked, loadingSetup, hasAnyOverrideError, isFormDirty]);

  const selectedClassObj = classes.find((c) => c.id === enrollmentValues.classId);
  const selectedMediumObj = mediums.find((m) => m.id === enrollmentValues.mediumId);
  const selectedSectionObj = sections.find((s) => s.id === enrollmentValues.sectionId);

  return (
    <div className="w-full space-y-3.5 pb-20 sm:pb-6">

      {/* Locked Academic Year Alert */}
      {isLocked && (
        <Alert variant="warning" icon={ShieldAlert} title="Locked Academic Year">
          {selectedYear?.name} is locked. Registration disabled.
        </Alert>
      )}

      {/* Discard Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmLeaveOpen}
        onClose={() => setConfirmLeaveOpen(false)}
        onConfirm={() => {
          setConfirmLeaveOpen(false);
          navigate('/app/students');
        }}
        title="Discard New Student?"
        message="You have unsaved changes. If you leave now, entered data will be lost."
        confirmText="Discard & Leave"
        cancelText="Continue"
        variant="danger"
      />

      {/* Hidden File Inputs for Photo */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handlePhotoSelect}
        accept="image/jpeg,image/png,image/jpg,image/webp"
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handlePhotoSelect}
        accept="image/jpeg,image/png,image/jpg,image/webp"
        capture="environment"
        className="hidden"
      />

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onCapture={(file) => {
          setSelectedPhotoFile(file);
          setCropModalOpen(true);
        }}
        onCaptureSuccess={handlePhotoCropSuccess}
        onFallbackNative={() => cameraInputRef.current?.click()}
      />

      {/* Photo Option Selection Modal */}
      {photoOptionsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-xs overflow-hidden p-3.5 space-y-2.5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Photo Upload Method</h4>
              <button
                type="button"
                onClick={() => setPhotoOptionsOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setPhotoOptionsOpen(false);
                  fileInputRef.current?.click();
                }}
                className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 hover:bg-indigo-50/70 border border-slate-200 transition-all text-left"
              >
                <div className="w-7 h-7 rounded-md bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Upload from Device</div>
                  <div className="text-[10px] text-slate-500">From gallery or files</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPhotoOptionsOpen(false);
                  setCameraModalOpen(true);
                }}
                className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 transition-all text-left"
              >
                <div className="w-7 h-7 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <Camera className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Take Photo with Camera</div>
                  <div className="text-[10px] text-slate-500">Camera / Webcam</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Passport Photo Crop Modal */}
      <PassportPhotoCropModal
        isOpen={cropModalOpen}
        onClose={() => {
          setCropModalOpen(false);
          setSelectedPhotoFile(null);
        }}
        file={selectedPhotoFile}
        onCropSuccess={handlePhotoCropSuccess}
      />

      {/* ── ULTRA-COMPACT TWO-STEP STEPPER BAR ── */}
      <div className="bg-white rounded-xl border border-slate-200 px-3 py-2 shadow-2xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Step 1 Pill */}
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-2 text-left transition-all ${
              currentStep === 1
                ? 'text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                currentStep === 1
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : currentStep > 1
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {currentStep > 1 ? <Check className="w-3 h-3" /> : '1'}
            </div>
            <span className="text-xs">1. Personal & Class Info</span>
          </button>

          <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />

          {/* Step 2 Pill */}
          <button
            type="button"
            onClick={() => {
              if (currentStep === 1) handleNextToFeePage();
            }}
            className={`flex items-center gap-2 text-left transition-all ${
              currentStep === 2
                ? 'text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                currentStep === 2
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              <Receipt className="w-3 h-3" />
            </div>
            <span className="text-xs">2. Fee Schedule & Concessions</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant="indigo" size="xs" className="font-semibold">
            <Calendar className="w-2.5 h-2.5" />
            {selectedYear?.name || 'Current Year'}
          </Badge>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* PART 1: STUDENT PERSONAL INFO & CLASS ENROLLMENT (COMPACT)   */}
      {/* ───────────────────────────────────────────────────────────── */}
      {currentStep === 1 && (
        <div className="space-y-3.5 animate-in fade-in-50 duration-150">

          {/* 1. Student Master Information Card */}
          <Card className="border-slate-200 shadow-2xs">
            <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                1. Student Identity & Contact Information
              </span>
              <span className="text-[10px] text-slate-400">* Required fields</span>
            </div>

            <CardContent className="p-3 sm:p-3.5 space-y-3">
              {/* Row with Compact Passport Photo & Primary Info */}
              <div className="flex flex-col sm:flex-row items-start gap-3">
                {/* Compact Passport Thumbnail (3.5 : 4.5 Ratio -> 68px x 88px) */}
                <div className="shrink-0 flex sm:flex-col items-center gap-1.5">
                  <div
                    onClick={() => !studentInfo.photoUrl && !isLocked && setPhotoOptionsOpen(true)}
                    className={`w-16 h-20 rounded-lg bg-slate-50 border overflow-hidden flex items-center justify-center relative shadow-2xs transition-all ${
                      studentInfo.photoUrl
                        ? 'border-emerald-300 ring-2 ring-emerald-100'
                        : 'border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/20 cursor-pointer'
                    }`}
                    title="Student Passport Photo (Optional)"
                  >
                    {studentInfo.photoUrl && !photoLoadError ? (
                      <img
                        src={studentInfo.photoUrl}
                        alt="Passport"
                        className="w-full h-full object-cover"
                        onError={() => setPhotoLoadError(true)}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-1 text-slate-400 text-center select-none">
                        <Camera className="w-5 h-5 mb-0.5 text-slate-300" />
                        <span className="text-[8px] font-bold text-slate-400 uppercase">Photo</span>
                      </div>
                    )}

                    {studentInfo.photoUrl && (
                      <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-xs">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      disabled={submitting || isLocked}
                      onClick={() => setPhotoOptionsOpen(true)}
                      className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold transition-colors"
                    >
                      {studentInfo.photoUrl ? 'Change' : '+ Photo'}
                    </button>
                    {studentInfo.photoUrl && (
                      <button
                        type="button"
                        disabled={submitting || isLocked}
                        onClick={handleRemovePhoto}
                        className="px-1.5 py-0.5 text-red-600 hover:bg-red-50 rounded text-[9px] font-semibold text-center"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* Primary Student Inputs Grid */}
                <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {/* Full Name */}
                  <div id="name">
                    <Input
                      label="Student Full Name"
                      size="sm"
                      required
                      ref={nameInputRef}
                      placeholder="e.g. Aarav Sharma"
                      disabled={submitting || isLocked}
                      value={studentInfo.name}
                      icon={User}
                      onBlur={() => {
                        if (studentInfo.name) {
                          setStudentInfo((prev) => ({ ...prev, name: toTitleCase(prev.name) }));
                        }
                      }}
                      onChange={(e) => {
                        setStudentInfo({ ...studentInfo, name: e.target.value });
                        if (errors.name) setErrors({ ...errors, name: null });
                      }}
                      error={errors.name}
                      endElement={
                        studentInfo.name ? (
                          <button
                            type="button"
                            onClick={() => setStudentInfo((prev) => ({ ...prev, name: toTitleCase(prev.name) }))}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800"
                            title="Format Case"
                          >
                            <Sparkles className="w-3 h-3" />
                          </button>
                        ) : null
                      }
                      autoFocus
                    />
                  </div>

                  {/* Guardian Name */}
                  <div id="guardianName">
                    <Input
                      label="Father / Guardian Name"
                      size="sm"
                      required
                      placeholder="e.g. Rajesh Sharma"
                      disabled={submitting || isLocked}
                      value={studentInfo.guardianName}
                      icon={ShieldCheck}
                      onBlur={() => {
                        if (studentInfo.guardianName) {
                          setStudentInfo((prev) => ({ ...prev, guardianName: toTitleCase(prev.guardianName) }));
                        }
                      }}
                      onChange={(e) => {
                        setStudentInfo({ ...studentInfo, guardianName: e.target.value });
                        if (errors.guardianName) setErrors({ ...errors, guardianName: null });
                      }}
                      error={errors.guardianName}
                    />
                  </div>

                  {/* Phone Number */}
                  <div id="phone">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Phone Number <span className="text-rose-500">*</span>
                      <span className={`float-right font-mono ${studentInfo.phone.length === 10 ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                        {studentInfo.phone.length}/10
                      </span>
                    </label>
                    <div className="relative rounded-lg shadow-2xs">
                      <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-slate-400 text-xs font-bold border-r border-slate-200 pr-1.5 my-1">
                        +91
                      </div>
                      <input
                        type="tel"
                        autoComplete="off"
                        maxLength={10}
                        placeholder="10 Digits"
                        disabled={submitting || isLocked}
                        value={studentInfo.phone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setStudentInfo({ ...studentInfo, phone: val });
                          if (errors.phone) setErrors({ ...errors, phone: null });
                        }}
                        className={`w-full pl-12 pr-6 py-1.5 border rounded-lg text-xs font-mono font-medium outline-none focus:ring-2 transition-colors ${
                          errors.phone
                            ? 'border-rose-300 text-rose-900 bg-white focus:border-rose-500 focus:ring-rose-500/20'
                            : 'border-slate-300 text-slate-900 bg-white focus:border-indigo-500 focus:ring-indigo-500/20'
                        }`}
                      />
                      {studentInfo.phone.length === 10 && (
                        <div className="absolute inset-y-0 right-0 pr-2 flex items-center text-emerald-600">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                    {errors.phone && <p className="mt-0.5 text-xs text-rose-500 font-medium">{errors.phone}</p>}
                  </div>

                  {/* Gender */}
                  <div id="gender">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Gender <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { id: 'MALE', label: 'Male' },
                        { id: 'FEMALE', label: 'Female' },
                        { id: 'OTHER', label: 'Other' }
                      ].map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          disabled={submitting || isLocked}
                          onClick={() => {
                            setStudentInfo({ ...studentInfo, gender: g.id });
                            if (errors.gender) setErrors({ ...errors, gender: null });
                          }}
                          className={`py-1.5 px-1 rounded-lg text-xs font-bold border transition-all text-center ${
                            studentInfo.gender === g.id
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                    {errors.gender && <p className="mt-0.5 text-xs text-rose-500 font-medium">{errors.gender}</p>}
                  </div>

                  {/* Admission Date */}
                  <div id="admissionDate">
                    <DatePicker
                      label="Admission Date"
                      size="sm"
                      required
                      value={studentInfo.admissionDate}
                      onChange={(val) => {
                        setStudentInfo({ ...studentInfo, admissionDate: val || '' });
                        if (errors.admissionDate) setErrors({ ...errors, admissionDate: null });
                      }}
                      minDate={minAdmissionDate}
                      maxDate={maxAdmissionDate}
                      disabled={submitting || isLocked}
                      error={errors.admissionDate}
                      clearable={false}
                    />
                  </div>

                  {/* Caste / Category */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Social Category
                    </label>
                    <select
                      disabled={submitting || isLocked}
                      value={studentInfo.caste}
                      onChange={(e) => setStudentInfo({ ...studentInfo, caste: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium bg-white text-slate-900 focus:ring-2 focus:ring-indigo-300 outline-none"
                    >
                      {CASTE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    {studentInfo.caste === 'OTHER' && (
                      <input
                        type="text"
                        autoComplete="off"
                        placeholder="Specify Caste / Category"
                        value={studentInfo.customCaste}
                        onChange={(e) => setStudentInfo({ ...studentInfo, customCaste: e.target.value })}
                        className="w-full mt-1 px-2 py-1 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-1 focus:ring-indigo-300 outline-none"
                      />
                    )}
                  </div>

                  {/* Residential Address (Spans full width across 3 cols on lg) */}
                  <div className="sm:col-span-2 lg:col-span-3">
                    <Textarea
                      label="Residential Address (Optional)"
                      size="sm"
                      placeholder="Street, locality, town, pin code..."
                      disabled={submitting || isLocked}
                      maxLength={300}
                      rows={3}
                      value={studentInfo.address}
                      onChange={(e) => setStudentInfo({ ...studentInfo, address: e.target.value })}
                      error={errors.address}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Academic Enrollment Section Card */}
          <Card className="border-slate-200 shadow-2xs">
            <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                2. Academic Class & Placement
              </span>
              <span className="text-[10px] text-slate-400">Class & medium selection</span>
            </div>

            <CardContent className="p-3 sm:p-3.5 space-y-3">
              <EnrollmentFields
                classes={classes}
                mediums={mediums}
                sections={sections}
                streams={streams}
                values={enrollmentValues}
                onChange={setEnrollmentValues}
                errors={errors}
                disabled={submitting || isLocked || loadingSetup}
                size="sm"
              />

              {/* Bottom Nav Bar */}
              <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                <div className="text-[11px] text-slate-400 hidden sm:block">
                  <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">Enter</span> to proceed to Fee Schedule
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleNavigateBack}
                    className="py-1 text-xs"
                  >
                    Cancel
                  </Button>

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    icon={ArrowRight}
                    onClick={handleNextToFeePage}
                    className="py-1 text-xs font-bold shadow-xs"
                  >
                    Next: Fee Schedule & Concessions
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* PART 2: FEE SCHEDULE & CONCESSIONS PAGE (ENHANCED UX)         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {currentStep === 2 && (
        <div className="space-y-3.5 animate-in fade-in-50 duration-150">

          {/* Executive Student Identity Ribbon */}
          <div className="bg-gradient-to-r from-indigo-50/90 via-white to-slate-50 rounded-2xl border border-indigo-100/90 p-3 sm:p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Photo Avatar */}
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white border-2 border-indigo-200/80 shadow-xs ring-2 ring-indigo-50 shrink-0 overflow-hidden flex items-center justify-center">
                {studentInfo.photoUrl && !photoLoadError ? (
                  <img
                    src={studentInfo.photoUrl}
                    alt={studentInfo.name || 'Student'}
                    className="w-full h-full object-cover"
                    onError={() => setPhotoLoadError(true)}
                  />
                ) : (
                  <span className="text-sm font-extrabold text-indigo-700 font-mono">
                    {studentInfo.name ? studentInfo.name.charAt(0).toUpperCase() : 'S'}
                  </span>
                )}
              </div>

              {/* Details & Badges */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-900 leading-none">
                    {studentInfo.name || 'New Student'}
                  </span>
                  <Badge variant="indigo" size="xs" className="font-semibold">
                    Class {selectedClassObj?.name || ''} {selectedMediumObj ? `(${selectedMediumObj.name})` : ''}
                  </Badge>
                  {selectedSectionObj && (
                    <Badge variant="neutral" size="xs">
                      Sec: {selectedSectionObj.name}
                    </Badge>
                  )}
                  {enrollmentValues.rollNumber && (
                    <Badge variant="neutral" size="xs" className="font-mono">
                      Roll #{enrollmentValues.rollNumber}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2.5 text-xs text-slate-500 flex-wrap">
                  <span>Guardian: <strong className="text-slate-700">{studentInfo.guardianName || '—'}</strong></span>
                  <span className="text-slate-300">•</span>
                  <span>Phone: <strong className="font-mono text-slate-700">+91 {studentInfo.phone || '—'}</strong></span>
                  <span className="text-slate-300">•</span>
                  <span>Admission Date: <strong className="text-slate-700">{studentInfo.admissionDate}</strong></span>
                </div>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={Edit3}
              onClick={handleBackToDetails}
              className="self-start sm:self-center py-1.5 px-3 text-xs text-indigo-700 hover:bg-indigo-50 border-indigo-200"
            >
              Edit Details
            </Button>
          </div>

          <form onSubmit={(e) => handleSubmit(e, 'FINISH')}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">

              {/* Fee Heads List (7 Cols) */}
              <div className="lg:col-span-7 space-y-3">
                <Card className="border-slate-200 shadow-2xs">
                  <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        Fee Heads ({allPreviewHeads.length})
                      </span>
                      <p className="text-[10px] text-slate-400">Configure student-specific fee concessions or waivers</p>
                    </div>
                    <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                      Billing starts: <strong className="text-slate-900">{billingMonthsPreview[0]}</strong>
                    </span>
                  </div>

                  <CardContent className="p-3 sm:p-3.5 space-y-2.5">
                    {billingMonthsPreview.length > 1 && (
                      <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-200 text-[11px] text-sky-800 flex items-center gap-2">
                        <Info className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span>
                          Backdated admission ({studentInfo.admissionDate}): initial charges generated across <strong>{billingMonthsPreview.length} months</strong> ({billingMonthsPreview[0]} to {billingMonthsPreview[billingMonthsPreview.length - 1]}).
                        </span>
                      </div>
                    )}

                    {loadingFeeStructure ? (
                      <div className="py-8 text-center text-xs text-slate-500">
                        Loading class fee structure...
                      </div>
                    ) : allPreviewHeads.length === 0 ? (
                      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800">
                        No active fee template configured. Student will be admitted with zero initial charges.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {allPreviewHeads.map((head, idx) => {
                          const headKey = head.feeTypeId || head.title;
                          const ov = getHeadOverride(head);

                          const titleLower = (head.title || '').toLowerCase();
                          const isOneTimeHead =
                            head.category === 'ONE_TIME' ||
                            head.category === 'ONETIME_PER_YEAR' ||
                            titleLower.includes('admission') ||
                            titleLower.includes('registration') ||
                            titleLower.includes('annual');

                          const templateAmt = Number(head.amount) || 0;
                          const is100Active = ov.isOverridden && ov.finalAmount === 0;
                          const is50Active = ov.isOverridden && ov.finalAmount === Math.round(templateAmt * 0.5);
                          const is25Active = ov.isOverridden && ov.finalAmount === Math.round(templateAmt * 0.75);

                          return (
                            <div
                              key={headKey || idx}
                              className={`p-3 rounded-xl border transition-all ${
                                ov.error
                                  ? 'bg-rose-50/60 border-rose-200 shadow-xs'
                                  : ov.isOverridden
                                  ? 'bg-amber-50/40 border-amber-200/90 shadow-2xs'
                                  : 'bg-white border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              {/* Head Header */}
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-xs font-bold text-slate-900">{head.title}</h4>
                                  {isOneTimeHead ? (
                                    <Badge variant="warning" size="xs">One-Time</Badge>
                                  ) : (
                                    <Badge variant="neutral" size="xs">Monthly</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs">
                                  <span className="text-[10px] text-slate-400">Template Fee:</span>
                                  <span className="font-mono font-bold text-slate-800">
                                    {formatCurrency(templateAmt)}
                                  </span>
                                </div>
                              </div>

                              {/* Presets & Custom Overrides Row */}
                              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap">
                                {canOverride && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">Concession:</span>
                                    <button
                                      type="button"
                                      onClick={() => applyPresetDiscount(head, 100, 'Full Waiver')}
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                                        is100Active
                                          ? 'bg-emerald-600 text-white shadow-xs'
                                          : 'bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700'
                                      }`}
                                    >
                                      100% Free
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => applyPresetDiscount(head, 50, '50% Concession')}
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                                        is50Active
                                          ? 'bg-indigo-600 text-white shadow-xs'
                                          : 'bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700'
                                      }`}
                                    >
                                      50% Off
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => applyPresetDiscount(head, 25, '25% Concession')}
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                                        is25Active
                                          ? 'bg-sky-600 text-white shadow-xs'
                                          : 'bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-700'
                                      }`}
                                    >
                                      25% Off
                                    </button>
                                    {ov.isOverridden && (
                                      <button
                                        type="button"
                                        onClick={() => applyPresetDiscount(head, 0)}
                                        className="p-1 rounded text-[10px] font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors ml-0.5"
                                        title="Reset to Template Amount"
                                      >
                                        <RotateCcw className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                )}

                                {/* Compact Inputs: Payable & Reason */}
                                <div className="flex items-center gap-2 ml-auto">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] font-semibold text-slate-500">Payable ₹:</span>
                                    <input
                                      type="number"
                                      autoComplete="off"
                                      min="0"
                                      step="any"
                                      placeholder={String(templateAmt)}
                                      disabled={submitting || isLocked || loadingFeeStructure || !canOverride}
                                      value={ov.rawValue}
                                      onChange={(e) => handleOverrideAmountChange(headKey, e.target.value)}
                                      className={`w-20 px-2 py-0.5 text-xs font-mono font-bold rounded-lg border focus:ring-2 outline-none transition-colors ${
                                        ov.error
                                          ? 'border-rose-300 bg-rose-50 text-rose-900 focus:ring-rose-500/20'
                                          : ov.isOverridden
                                          ? 'border-amber-400 bg-amber-50/80 text-slate-900 focus:ring-amber-500/20'
                                          : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-indigo-400 focus:ring-indigo-500/20'
                                      }`}
                                    />
                                  </div>

                                  <input
                                    type="text"
                                    autoComplete="off"
                                    placeholder={ov.isOverridden ? "Reason (e.g. Sibling)" : "Reason (optional)"}
                                    disabled={submitting || isLocked || loadingFeeStructure || !canOverride}
                                    value={ov.reason}
                                    onChange={(e) => handleOverrideReasonChange(headKey, e.target.value)}
                                    className={`w-32 px-2 py-0.5 text-[11px] rounded-lg border outline-none transition-colors ${
                                      ov.isOverridden && !ov.reason.trim()
                                        ? 'border-amber-300 bg-amber-50/40 text-slate-800'
                                        : 'border-slate-200 bg-slate-50 text-slate-800 focus:border-indigo-400'
                                    }`}
                                  />
                                </div>
                              </div>

                              {/* Error or Concession Status Strip */}
                              {ov.error ? (
                                <p className="text-[10px] text-rose-600 font-semibold mt-1.5">{ov.error}</p>
                              ) : ov.isOverridden ? (
                                <div className="flex items-center justify-between gap-2 mt-1.5 pt-1.5 border-t border-amber-200/50 text-[11px]">
                                  <span className="text-slate-400 line-through font-mono text-[10px]">
                                    Template: {formatCurrency(templateAmt)}
                                  </span>
                                  {ov.discountAmount > 0 && (
                                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                      Concession: -{formatCurrency(ov.discountAmount)}
                                    </span>
                                  )}
                                  <span className="font-extrabold font-mono text-emerald-800">
                                    Final Payable: {formatCurrency(ov.finalAmount)}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Financial Summary & Actions (5 Cols, Sticky Desktop) */}
              <div className="lg:col-span-5 space-y-3 lg:sticky lg:top-4">
                <Card className="border-indigo-100 shadow-2xs overflow-hidden">
                  <div className="px-3.5 py-2.5 border-b border-indigo-50 bg-indigo-50/40 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Financial Summary
                    </span>
                    <Badge variant="indigo" size="xs">
                      {selectedYear?.name || 'Academic Year'}
                    </Badge>
                  </div>

                  <CardContent className="p-3.5 space-y-3">
                    <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 space-y-2 text-xs">
                      {oneTimeAmount > 0 && (
                        <div className="flex items-center justify-between text-slate-600">
                          <span>One-Time Charges:</span>
                          <span className="font-mono font-medium">{formatCurrency(oneTimeAmount)}</span>
                        </div>
                      )}
                      {monthlyAmount > 0 && (
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Recurring Monthly (1st mo):</span>
                          <span className="font-mono font-medium">{formatCurrency(monthlyAmount)}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-indigo-950 pt-1 border-t border-indigo-100">
                        <span className="font-medium">Total Standard Fee:</span>
                        <span className="font-mono font-bold">
                          {formatCurrency(totalOriginalAmount)}
                        </span>
                      </div>

                      {totalDiscountAmount > 0 && (
                        <div className="flex items-center justify-between text-emerald-700 font-bold bg-emerald-100/70 p-1.5 rounded-lg border border-emerald-200">
                          <span>Total Concession:</span>
                          <span className="font-mono">
                            - {formatCurrency(totalDiscountAmount)}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-indigo-200">
                        <div>
                          <span className="font-bold text-indigo-950 block">Net Initial Payable:</span>
                          <span className="text-[10px] text-slate-500 font-normal">First admission dues</span>
                        </div>
                        <span className="text-lg font-black font-mono text-indigo-700">
                          {formatCurrency(totalFinalAmount)}
                        </span>
                      </div>
                    </div>

                    {/* Operational Note */}
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[10px] text-slate-600 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-slate-700">
                        <Calendar className="w-3 h-3 text-indigo-600" />
                        <span>Billing Cycle Starts: {billingMonthsPreview[0]}</span>
                      </div>
                      <p className="text-slate-500 leading-relaxed">
                        Initial due invoice and student fee ledger will be automatically generated upon enrollment.
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-1">
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        className="w-full justify-center shadow-xs font-bold text-xs py-2"
                        loading={submitting && submittingMode === 'FINISH'}
                        loadingText="Enrolling..."
                        disabled={isLocked || loadingSetup || hasAnyOverrideError || (submitting && submittingMode === 'ANOTHER')}
                        icon={UserPlus}
                      >
                        Confirm & Add Student
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full justify-center text-xs py-1.5 font-semibold text-slate-700 hover:text-slate-900"
                        icon={PlusCircle}
                        onClick={(e) => handleSubmit(e, 'ANOTHER')}
                        loading={submitting && submittingMode === 'ANOTHER'}
                        loadingText="Saving & Resetting..."
                        disabled={isLocked || loadingSetup || hasAnyOverrideError || (submitting && submittingMode === 'FINISH')}
                        title="Save student and add next"
                      >
                        Save & Add Another Student
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full justify-center text-xs text-slate-500 py-1"
                        icon={ArrowLeft}
                        onClick={handleBackToDetails}
                        disabled={submitting}
                      >
                        Back to Student Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Floating Mobile Action Bar (< 640px) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 p-2.5 bg-white/95 backdrop-blur-sm border-t border-slate-200 shadow-xl z-40 flex items-center gap-2">
        {currentStep === 1 ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 justify-center text-xs py-1"
              onClick={handleNavigateBack}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="flex-[2] justify-center text-xs font-bold py-1"
              icon={ArrowRight}
              onClick={handleNextToFeePage}
            >
              Next: Fee Page
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 justify-center text-xs py-1"
              onClick={handleBackToDetails}
              disabled={submitting}
            >
              Back
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="flex-[2] justify-center text-xs font-bold py-1"
              loading={submitting && submittingMode === 'FINISH'}
              disabled={isLocked || loadingSetup || hasAnyOverrideError || (submitting && submittingMode === 'ANOTHER')}
              icon={UserPlus}
              onClick={(e) => handleSubmit(e, 'FINISH')}
            >
              Confirm & Add
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
