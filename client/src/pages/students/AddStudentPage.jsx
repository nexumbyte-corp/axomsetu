import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, ShieldAlert, Camera, Upload, CheckCircle2, Trash2, Phone } from 'lucide-react';
import { useAcademicYear } from '../../hooks/useAcademicYear.js';
import { useAuth } from '../../hooks/useAuth.js';
import { studentService } from '../../services/student.service.js';
import { academicService } from '../../services/academic.service.js';
import { feeService } from '../../services/fee.service.js';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { DatePicker } from '../../components/ui/DatePicker.jsx';
import { Textarea } from '../../components/ui/Textarea.jsx';
import { Card, CardHeader, CardContent } from '../../components/ui/Card.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { EnrollmentFields } from '../../components/students/EnrollmentFields.jsx';
import { PassportPhotoCropModal } from '../../components/students/PassportPhotoCropModal.jsx';
import { toast } from '../../components/ui/Toast.jsx';
import { usePageHeader } from '../../context/PageHeaderContext.jsx';

const MONTH_NAMES = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];

const CASTE_OPTIONS = [
  { value: 'UR', label: 'UR / General' },
  { value: 'OBC', label: 'OBC (Other Backward Class)' },
  { value: 'SC', label: 'SC (Scheduled Caste)' },
  { value: 'ST', label: 'ST (Scheduled Tribe)' },
  { value: 'EWS', label: 'EWS (Economically Weaker Section)' },
  { value: 'OTHER', label: 'Other / Unreserved' },
];

const getCurrentFeeMonth = (dateObj = new Date()) => {
  const d = new Date(dateObj);
  const monthIdx = isNaN(d.getTime()) ? new Date().getMonth() : d.getMonth();
  return MONTH_NAMES[monthIdx] || 'JANUARY';
};

export const AddStudentPage = () => {
  const navigate = useNavigate();
  const { selectedYear, selectedYearId } = useAcademicYear();
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const canOverride = user?.role === 'SCHOOL_ADMIN';

  // Setup options
  const [classes, setClasses] = useState([]);
  const [mediums, setMediums] = useState([]);
  const [sections, setSections] = useState([]);
  const [streams, setStreams] = useState([]);
  const [loadingSetup, setLoadingSetup] = useState(true);

  const todayDateStr = new Date().toISOString().split('T')[0];
  const minAdmissionDate = selectedYear?.startDate
    ? new Date(selectedYear.startDate).toISOString().split('T')[0]
    : '';

  // Form State
  const [studentInfo, setStudentInfo] = useState({
    admissionNo: '',
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

  const [enrollmentValues, setEnrollmentValues] = useState({
    classId: '',
    mediumId: '',
    sectionId: '',
    streamId: '',
    rollNumber: '',
  });

  const [feeStructureHeads, setFeeStructureHeads] = useState([]);
  const [loadingFeeStructure, setLoadingFeeStructure] = useState(false);

  // Fee Overrides state: { [headKey]: { overrideAmount: string, reason: string } }
  const [feeOverrides, setFeeOverrides] = useState({});

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const currentFeeMonth = getCurrentFeeMonth();

  useEffect(() => {
    const fetchOptions = async () => {
      setLoadingSetup(true);
      try {
        const [clsRes, secRes, medRes, strRes] = await Promise.all([
          academicService.getClasses(),
          academicService.getSections(),
          academicService.getMediums(),
          academicService.getStreams(),
        ]);
        if (clsRes.success) setClasses(clsRes.data || []);
        if (secRes.success) setSections(secRes.data || []);
        if (medRes.success) setMediums(medRes.data || []);
        if (strRes.success) setStreams(strRes.data || []);
      } catch {
        toast.error('Failed loading academic configuration');
      } finally {
        setLoadingSetup(false);
      }
    };
    fetchOptions();
  }, []);

  // Clear incompatible overrides whenever configuration changes
  useEffect(() => {
    setFeeOverrides({});
  }, [enrollmentValues.classId, enrollmentValues.mediumId, enrollmentValues.streamId]);

  // Fetch Fee Structure when Class / Medium / Stream selection changes
  useEffect(() => {
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
        setFeeStructureHeads([]);
      } finally {
        setLoadingFeeStructure(false);
      }
    };

    fetchFeeStructure();
  }, [selectedYearId, enrollmentValues.classId, enrollmentValues.mediumId, enrollmentValues.streamId, classes]);

  // Photo Select Trigger
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (JPEG, PNG, WebP)');
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

  const handlePhotoCropSuccess = (url, sizeKb) => {
    setStudentInfo((prev) => ({
      ...prev,
      photoUrl: url,
      photoSizeKb: sizeKb,
    }));
    setErrors((prev) => ({ ...prev, photoUrl: null }));
  };

  const handleRemovePhoto = () => {
    setStudentInfo((prev) => ({
      ...prev,
      photoUrl: '',
      photoSizeKb: '',
    }));
  };

  const allPreviewHeads = feeStructureHeads;

  const getHeadOverride = (head) => {
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
        error: 'Override amount cannot be negative',
        reason: ov.reason || '',
        rawValue: ov.overrideAmount,
      };
    }

    if (parsed > templateAmt) {
      return {
        finalAmount: parsed,
        discountAmount: 0,
        isOverridden: true,
        error: 'Override amount cannot be greater than original fee',
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
  };

  const totalOriginalAmount = allPreviewHeads.reduce((sum, h) => sum + (Number(h.amount) || 0), 0);
  const totalFinalAmount = allPreviewHeads.reduce((sum, h) => sum + getHeadOverride(h).finalAmount, 0);
  const totalDiscountAmount = Math.max(0, totalOriginalAmount - totalFinalAmount);
  const hasAnyOverrideError = allPreviewHeads.some((h) => Boolean(getHeadOverride(h).error));

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

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrors({});

    if (selectedYear?.isLocked) {
      toast.error('Cannot add student into a locked academic year');
      return;
    }

    if (hasAnyOverrideError) {
      toast.error('Please fix fee override validation errors before submitting');
      return;
    }

    // Client-Side Validation
    const newErrors = {};

    if (!studentInfo.photoUrl) {
      newErrors.photoUrl = 'Student photo is mandatory (Passport size)';
    }

    if (!studentInfo.name.trim()) {
      newErrors.name = 'Student full name is required';
    }

    if (!studentInfo.guardianName.trim()) {
      newErrors.guardianName = 'Guardian name is required';
    }

    if (!studentInfo.admissionDate) {
      newErrors.admissionDate = 'Admission date is required';
    } else if (minAdmissionDate && studentInfo.admissionDate < minAdmissionDate) {
      newErrors.admissionDate = `Back date before ${minAdmissionDate} is not allowed for ${selectedYear?.name || 'this Academic Year'}`;
    }

    // Phone validation: mandatory 10 digits
    const trimmedPhone = studentInfo.phone.trim();
    if (!trimmedPhone) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(trimmedPhone)) {
      newErrors.phone = 'Phone number must be exactly 10 digits';
    }

    if (!studentInfo.gender) {
      newErrors.gender = 'Gender is required';
    }

    if (!enrollmentValues.classId) {
      newErrors.classId = 'Class is required';
    }

    if (!enrollmentValues.mediumId) {
      newErrors.mediumId = 'Medium is required';
    }

    const selectedClass = classes.find((c) => c.id === enrollmentValues.classId);
    if (selectedClass?.hasStream && !enrollmentValues.streamId) {
      newErrors.streamId = `Stream is required for class '${selectedClass.name}'`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Please complete all mandatory fields correctly');
      return;
    }

    // Resolve Caste Value
    const resolvedCaste =
      studentInfo.caste === 'OTHER'
        ? studentInfo.customCaste.trim() || 'Other'
        : studentInfo.caste;

    // Prepare Fee Overrides Payload
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
    try {
      const payload = {
        photoUrl: studentInfo.photoUrl.trim(),
        admissionNo: studentInfo.admissionNo.trim() || null,
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
        rollNumber: enrollmentValues.rollNumber || null,

        generateInitialFees: true,
        feeOverrides: feeOverridesPayload.length > 0 ? feeOverridesPayload : null,
      };

      await studentService.createStudent(payload);
      toast.success('Student registered successfully and initial fee charges generated!');
      navigate('/app/students');
    } catch (err) {
      toast.error(err?.message || 'Failed adding student');
      if (err?.errors) setErrors(err.errors);
    } finally {
      setSubmitting(false);
    }
  };

  const isLocked = Boolean(selectedYear?.isLocked);

  const { setHeaderInfo } = usePageHeader();

  const handleSubmitRef = useRef();
  handleSubmitRef.current = handleSubmit;

  useEffect(() => {
    setHeaderInfo({
      title: 'Add Student',
      icon: UserPlus,
      actions: (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={UserPlus}
            onClick={(e) => handleSubmitRef.current?.(e)}
            loading={submitting}
            disabled={isLocked || loadingSetup || hasAnyOverrideError}
          >
            Add Student
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={ArrowLeft}
            onClick={() => navigate('/app/students')}
          >
            Back
          </Button>
        </div>
      ),
    });

    return () => setHeaderInfo(null);
  }, [setHeaderInfo, navigate, submitting, isLocked, loadingSetup, hasAnyOverrideError]);

  return (
    <div className="w-full space-y-5 pb-20 sm:pb-6">

      {isLocked && (
        <Alert variant="warning" icon={ShieldAlert} title="Locked Academic Year">
          {selectedYear?.name} is locked and historical records are read-only. Student creation is disabled.
        </Alert>
      )}

      {/* Hidden File Input for Photo Crop Modal */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handlePhotoSelect}
        accept="image/jpeg,image/png,image/jpg,image/webp"
        className="hidden"
      />

      {/* Passport Photo Crop Modal */}
      <PassportPhotoCropModal
        isOpen={cropModalOpen}
        onClose={() => setCropModalOpen(false)}
        file={selectedPhotoFile}
        onCropSuccess={handlePhotoCropSuccess}
      />

      <form onSubmit={handleSubmit} autoComplete="off">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT SIDE: Student Profile & Enrollment Form (7 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Section 1: Photo & Master Info Card */}
            <Card className="border-slate-200 shadow-2xs overflow-hidden">
              <CardHeader
                title="1. Student Master Information"
                subtitle="Mandatory photo, contact details & identity info"
              />
              <CardContent className="space-y-4 pt-3">
                
                {/* ── PHOTO UPLOADER BOX ── */}
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    errors.photoUrl
                      ? 'bg-red-50/60 border-red-300'
                      : studentInfo.photoUrl
                      ? 'bg-emerald-50/30 border-emerald-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* Photo Frame Container (Passport 3.5:4.5 aspect preview) */}
                    <div className="relative group shrink-0">
                      <div className="w-24 h-32 rounded-xl bg-white border-2 border-slate-300 shadow-sm overflow-hidden flex items-center justify-center relative">
                        {studentInfo.photoUrl ? (
                          <img
                            src={studentInfo.photoUrl}
                            alt="Student Passport"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-2 text-slate-400 text-center">
                            <Camera className="w-8 h-8 mb-1 text-slate-300" />
                            <span className="text-[10px] font-bold text-slate-400">PASSPORT</span>
                            <span className="text-[9px] text-slate-400">3.5 x 4.5 ratio</span>
                          </div>
                        )}

                        {studentInfo.photoUrl && (
                          <div className="absolute top-1.5 right-1.5 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Controls & Badges */}
                    <div className="space-y-2 text-center sm:text-left flex-1">
                      <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">
                          Student Photo <span className="text-red-500">*</span>
                        </span>
                        <Badge variant="warning" size="xs">
                          Passport Ratio (3.5:4.5)
                        </Badge>
                      </div>

                      <div className="flex items-center justify-center sm:justify-start gap-2 pt-1 flex-wrap">
                        <button
                          type="button"
                          disabled={submitting || isLocked}
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs disabled:opacity-50"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{studentInfo.photoUrl ? 'Change Photo' : 'Select Photo & Crop'}</span>
                        </button>

                        {studentInfo.photoUrl && (
                          <button
                            type="button"
                            disabled={submitting || isLocked}
                            onClick={handleRemovePhoto}
                            className="flex items-center gap-1 px-2 py-1 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>

                      {errors.photoUrl && (
                        <p className="text-[11px] text-red-600 font-semibold mt-1">{errors.photoUrl}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── FORM FIELDS GRID (Compact 2-col / 3-col) ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Student Full Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="Enter full name"
                      disabled={submitting || isLocked}
                      value={studentInfo.name}
                      onChange={(e) => setStudentInfo({ ...studentInfo, name: e.target.value })}
                      error={errors.name}
                      className="text-xs"
                    />
                  </div>

                  {/* Guardian Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Father / Guardian Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="Enter guardian name"
                      disabled={submitting || isLocked}
                      value={studentInfo.guardianName}
                      onChange={(e) => setStudentInfo({ ...studentInfo, guardianName: e.target.value })}
                      error={errors.guardianName}
                      className="text-xs"
                    />
                  </div>

                  {/* Phone Number (Mandatory 10 digits) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Phone Number (Exactly 10 Digits) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        autoComplete="off"
                        maxLength={10}
                        placeholder="10-digit mobile number"
                        disabled={submitting || isLocked}
                        value={studentInfo.phone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setStudentInfo({ ...studentInfo, phone: val });
                          if (errors.phone) setErrors({ ...errors, phone: null });
                        }}
                        className={`w-full pl-8 pr-3 py-1.5 border rounded-lg text-xs font-mono font-medium outline-none focus:ring-2 transition-colors ${
                          errors.phone
                            ? 'border-red-400 bg-red-50/50 text-red-900 focus:ring-red-300'
                            : 'border-slate-200 bg-white text-slate-900 focus:ring-indigo-300'
                        }`}
                      />
                    </div>
                    {errors.phone ? (
                      <p className="text-[11px] text-red-600 font-semibold mt-1">{errors.phone}</p>
                    ) : (
                      <p className="text-[10px] text-slate-400 mt-0.5">Must be 10 numeric digits</p>
                    )}
                  </div>

                  {/* Gender Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {['MALE', 'FEMALE', 'OTHER'].map((g) => (
                        <button
                          key={g}
                          type="button"
                          disabled={submitting || isLocked}
                          onClick={() => setStudentInfo({ ...studentInfo, gender: g })}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all ${
                            studentInfo.gender === g
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {g === 'MALE' ? 'Male' : g === 'FEMALE' ? 'Female' : 'Other'}
                        </button>
                      ))}
                    </div>
                    {errors.gender && (
                      <p className="text-[11px] text-red-600 font-semibold mt-1">{errors.gender}</p>
                    )}
                  </div>

                  {/* Caste / Category Dropdown */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Caste / Category
                    </label>
                    <select
                      disabled={submitting || isLocked}
                      value={studentInfo.caste}
                      onChange={(e) => setStudentInfo({ ...studentInfo, caste: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium bg-white text-slate-900 focus:ring-2 focus:ring-indigo-300 outline-none"
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
                        className="w-full mt-1.5 px-2.5 py-1 border border-slate-200 rounded-lg text-xs font-medium"
                      />
                    )}
                  </div>

                  {/* Admission Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Admission Number
                    </label>
                    <Input
                      placeholder="Auto-generated automatically"
                      disabled={true}
                      value={studentInfo.admissionNo || 'Auto-generated'}
                      readOnly
                      className="text-xs bg-slate-100 cursor-not-allowed text-slate-500 font-mono"
                    />
                  </div>

                  {/* Admission Date */}
                  <div>
                    <DatePicker
                      label="Admission Date"
                      required
                      value={studentInfo.admissionDate}
                      onChange={(val) => {
                        setStudentInfo({ ...studentInfo, admissionDate: val || '' });
                        if (errors.admissionDate) setErrors({ ...errors, admissionDate: null });
                      }}
                      minDate={minAdmissionDate}
                      maxDate={todayDateStr}
                      disabled={submitting || isLocked}
                      error={errors.admissionDate}
                      clearable={false}
                    />
                    {minAdmissionDate && (
                      <p className="text-[10px] text-slate-500 mt-1">
                        Min back-date: <span className="font-semibold text-slate-700">{minAdmissionDate}</span> ({selectedYear?.name})
                      </p>
                    )}
                  </div>
                </div>

                {/* Residential Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Residential Address
                  </label>
                  <Textarea
                    placeholder="Enter full address (Optional)"
                    disabled={submitting || isLocked}
                    value={studentInfo.address}
                    onChange={(e) => setStudentInfo({ ...studentInfo, address: e.target.value })}
                    error={errors.address}
                    rows={2}
                    className="text-xs"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Academic Enrollment */}
            <Card className="border-slate-200 shadow-2xs">
              <CardHeader
                title="2. Academic Placement"
                subtitle={`Enrollment parameters for ${selectedYear?.name || 'Current Year'}`}
              />
              <CardContent className="pt-2 space-y-4">
                <EnrollmentFields
                  classes={classes}
                  mediums={mediums}
                  sections={sections}
                  streams={streams}
                  values={enrollmentValues}
                  onChange={setEnrollmentValues}
                  errors={errors}
                  disabled={submitting || isLocked || loadingSetup}
                />

                {/* Left Side Bottom Action Bar */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/app/students')}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={submitting}
                    loadingText="Adding Student & Fees..."
                    disabled={isLocked || loadingSetup || hasAnyOverrideError}
                    icon={UserPlus}
                  >
                    Add Student & Generate Fees
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT SIDE: Fee Structure & Overrides (5 Cols, Sticky Desktop) */}
          <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-5">
            <Card className="border-indigo-100 shadow-2xs overflow-hidden">
              <CardHeader
                title="Applicable Fee Structure"
                subtitle="Class fee heads, overrides & payable total"
              />
              <CardContent className="space-y-3.5 pt-2">
                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Fee Heads ({allPreviewHeads.length})
                    </span>
                    <Badge variant="indigo" size="sm">
                      Month: {currentFeeMonth}
                    </Badge>
                  </div>

                  {loadingFeeStructure ? (
                    <div className="py-6 text-center text-xs text-slate-400 font-medium">
                      Loading fee structure...
                    </div>
                  ) : allPreviewHeads.length === 0 ? (
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800">
                      No active Fee Template found for selected Class/Medium/Stream.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
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

                        const targetMonth = currentFeeMonth;
                        const templateAmt = Number(head.amount) || 0;

                        return (
                          <div
                            key={headKey || idx}
                            className={`p-2.5 rounded-xl border transition-all ${
                              ov.error
                                ? 'bg-red-50/50 border-red-200'
                                : ov.isOverridden
                                ? 'bg-amber-50/40 border-amber-200 shadow-2xs'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <div>
                                <h4 className="text-xs font-bold text-slate-900">{head.title}</h4>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] text-slate-400 font-mono">{targetMonth}</span>
                                  {isOneTimeHead ? (
                                    <Badge variant="warning" size="xs">One-Time</Badge>
                                  ) : (
                                    <Badge variant="neutral" size="xs">Monthly</Badge>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-[9px] text-slate-400 font-medium block">Template:</span>
                                <span className="text-xs font-bold font-mono text-slate-700">
                                  ₹{templateAmt.toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>

                            {/* Override Input Controls */}
                            <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-100">
                              <div>
                                <label className="text-[9px] font-bold text-slate-500 mb-0.5 block">
                                  Final Amount (₹)
                                </label>
                                <input
                                  type="number"
                                  autoComplete="off"
                                  min="0"
                                  step="any"
                                  placeholder="Override Amount"
                                  disabled={submitting || isLocked || loadingFeeStructure || !canOverride}
                                  value={ov.rawValue}
                                  onChange={(e) => handleOverrideAmountChange(headKey, e.target.value)}
                                  className={`w-full px-2 py-1 text-xs font-mono font-bold rounded-md border focus:ring-2 outline-none ${
                                    ov.error
                                      ? 'border-red-400 bg-red-50 text-red-900'
                                      : ov.isOverridden
                                      ? 'border-amber-400 bg-amber-50 text-slate-900'
                                      : 'border-slate-200 bg-slate-50 text-slate-900'
                                  }`}
                                />
                              </div>

                              <div>
                                <label className="text-[9px] font-bold text-slate-500 mb-0.5 block">
                                  Override Reason
                                </label>
                                <input
                                  type="text"
                                  autoComplete="off"
                                  placeholder="Reason"
                                  disabled={submitting || isLocked || loadingFeeStructure || !canOverride}
                                  value={ov.reason}
                                  onChange={(e) => handleOverrideReasonChange(headKey, e.target.value)}
                                  className="w-full px-2 py-1 text-xs rounded-md border border-slate-200 bg-slate-50 text-slate-900 outline-none"
                                />
                              </div>
                            </div>

                            {ov.error ? (
                              <p className="text-[10px] text-red-600 font-semibold mt-1">{ov.error}</p>
                            ) : ov.isOverridden ? (
                              <div className="flex items-center justify-between gap-2 mt-1.5 pt-1 border-t border-amber-100 text-[11px]">
                                <span className="text-slate-400 line-through font-mono">
                                  ₹{templateAmt.toLocaleString('en-IN')}
                                </span>
                                {ov.discountAmount > 0 && (
                                  <Badge variant="success" size="xs">
                                    Concession: ₹{ov.discountAmount.toLocaleString('en-IN')}
                                  </Badge>
                                )}
                                <span className="font-extrabold font-mono text-emerald-700">
                                  Final: ₹{ov.finalAmount.toLocaleString('en-IN')}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Summary Breakdown Card */}
                  <div className="p-3 bg-indigo-50/90 rounded-xl border border-indigo-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-indigo-950 font-medium">
                      <span>Total Template Amount:</span>
                      <span className="font-mono font-bold">
                        ₹{totalOriginalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {totalDiscountAmount > 0 && (
                      <div className="flex items-center justify-between text-xs text-emerald-700 font-bold">
                        <span>Total Concession:</span>
                        <span className="font-mono">
                          - ₹{totalDiscountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-indigo-200">
                      <span className="text-xs font-black text-indigo-950">Total Initial Payable:</span>
                      <span className="text-base font-black font-mono text-indigo-700">
                        ₹{totalFinalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Form Desktop Action Buttons inside Sticky Fee Panel */}
                <div className="flex flex-col space-y-2 pt-1">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    className="w-full justify-center shadow-sm"
                    loading={submitting}
                    loadingText="Adding student & generating fees..."
                    disabled={isLocked || loadingSetup || hasAnyOverrideError}
                    icon={UserPlus}
                  >
                    Add Student & Generate Fees
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-center"
                    onClick={() => navigate('/app/students')}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Floating Mobile Action Bar (< 640px) */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 bg-white border-t border-slate-200 shadow-lg z-40 flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 justify-center"
            onClick={() => navigate('/app/students')}
            disabled={submitting}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="sm"
            className="flex-[2] justify-center"
            loading={submitting}
            loadingText="Adding..."
            disabled={isLocked || loadingSetup || hasAnyOverrideError}
            icon={UserPlus}
          >
            Add Student
          </Button>
        </div>
      </form>
    </div>
  );
};
