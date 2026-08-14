import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  User,
  Camera,
  Upload,
  CheckCircle2,
  Trash2,
  Phone,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { studentService } from '../../services/student.service.js';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Textarea } from '../../components/ui/Textarea.jsx';
import { Card, CardHeader, CardContent } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { toast } from '../../components/ui/Toast.jsx';
import { ModulePageHeader } from '../../components/ui/ModulePageHeader.jsx';
import { PassportPhotoCropModal } from '../../components/students/PassportPhotoCropModal.jsx';
import { StudentAvatar } from '../../components/students/StudentAvatar.jsx';
import { StudentStatusBadge } from '../../components/students/StudentStatusBadge.jsx';

const CASTE_OPTIONS = [
  { value: 'UR', label: 'UR / General' },
  { value: 'OBC', label: 'OBC (Other Backward Class)' },
  { value: 'SC', label: 'SC (Scheduled Caste)' },
  { value: 'ST', label: 'ST (Scheduled Tribe)' },
  { value: 'EWS', label: 'EWS (Economically Weaker Section)' },
  { value: 'OTHER', label: 'Other / Unreserved' },
];

export const EditStudentProfilePage = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Student Raw Record for comparison & Academic Summary
  const [studentRecord, setStudentRecord] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    admissionNo: '',
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

  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchStudent = async () => {
      setLoading(true);
      try {
        const res = await studentService.getStudent(studentId);
        if (res.success && res.data) {
          const s = res.data;
          setStudentRecord(s);

          // Resolve Caste
          let resolvedCaste = s.caste || 'UR';
          let custom = '';
          const knownValues = CASTE_OPTIONS.map((o) => o.value);
          if (s.caste && !knownValues.includes(s.caste)) {
            resolvedCaste = 'OTHER';
            custom = s.caste;
          }

          setFormData({
            admissionNo: s.admissionNo || '',
            name: s.name || '',
            guardianName: s.guardianName || '',
            phone: s.phone || '',
            gender: s.gender || 'MALE',
            caste: resolvedCaste,
            customCaste: custom,
            address: s.address || '',
            photoUrl: s.photoUrl || '',
            photoSizeKb: '',
          });
        }
      } catch (err) {
        toast.error(err.message || 'Failed loading student master profile');
        navigate('/app/students');
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [studentId, navigate]);

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
    setFormData((prev) => ({
      ...prev,
      photoUrl: url,
      photoSizeKb: sizeKb,
    }));
    setErrors((prev) => ({ ...prev, photoUrl: null }));
  };

  const handleRemovePhoto = () => {
    setFormData((prev) => ({
      ...prev,
      photoUrl: '',
      photoSizeKb: '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // Client-Side Validation
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Student full name is required';
    }

    if (!formData.guardianName.trim()) {
      newErrors.guardianName = 'Guardian name is required';
    }

    // Phone validation: mandatory 10 digits
    const trimmedPhone = formData.phone.trim();
    if (!trimmedPhone) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(trimmedPhone)) {
      newErrors.phone = 'Phone number must be exactly 10 digits';
    }

    if (!formData.gender) {
      newErrors.gender = 'Gender is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Please complete all mandatory fields correctly');
      return;
    }

    // Resolve Caste Value
    const finalCaste =
      formData.caste === 'OTHER'
        ? formData.customCaste.trim() || 'Other'
        : formData.caste;

    setSubmitting(true);
    try {
      const payload = {
        admissionNo: formData.admissionNo.trim() || undefined,
        name: formData.name.trim(),
        guardianName: formData.guardianName.trim(),
        phone: trimmedPhone,
        gender: formData.gender,
        caste: finalCaste || null,
        address: formData.address.trim() || null,
        photoUrl: formData.photoUrl ? formData.photoUrl.trim() : null,
      };

      await studentService.updateStudentProfile(studentId, payload);
      toast.success('Student profile updated successfully!');
      navigate(`/app/students/${studentId}`);
    } catch (err) {
      toast.error(err.message || 'Failed updating student profile');
      if (err.errors) setErrors(err.errors);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Skeleton height="40px" width="40%" />
        <Skeleton height="350px" width="100%" />
      </div>
    );
  }

  const currentAcademic = studentRecord?.academic;

  return (
    <div className="w-full space-y-5 pb-20 sm:pb-6">
      {/* Standardized Module Header */}
      <ModulePageHeader
        icon={User}
        title={`Edit Profile — ${studentRecord?.name || ''}`}
        description="Update permanent student master details, photo & contact information."
        actions={
          <div className="flex items-center gap-2">
            {studentRecord?.admissionNo && (
              <Badge variant="indigo" size="md font-mono">
                Adm: {studentRecord.admissionNo}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              icon={ArrowLeft}
              onClick={() => navigate(`/app/students/${studentId}`)}
            >
              Back to Profile
            </Button>
          </div>
        }
      />

      {/* Hidden File Input for Passport Crop Modal */}
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

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT SIDE: Student Profile Form (7 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            <Card className="border-slate-200 shadow-2xs overflow-hidden">
              <CardHeader
                title="Student Master Information"
                subtitle="Photo, contact details & identity info"
              />
              <CardContent className="space-y-4 pt-3">
                {/* ── PHOTO UPLOADER BOX ── */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* Photo Frame Container (Passport 3.5:4.5 aspect preview) */}
                    <div className="relative group shrink-0">
                      <div className="w-24 h-32 rounded-xl bg-white border-2 border-slate-300 shadow-sm overflow-hidden flex items-center justify-center relative">
                        {formData.photoUrl ? (
                          <img
                            src={formData.photoUrl}
                            alt="Student Passport"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <StudentAvatar
                            name={formData.name || 'Student'}
                            size="lg"
                            className="w-full h-full rounded-none"
                          />
                        )}

                        {formData.photoUrl && (
                          <div className="absolute top-1.5 right-1.5 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Controls & Badges */}
                    <div className="space-y-2 text-center sm:text-left flex-1">
                      <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">Student Passport Photo</span>
                        <Badge variant="warning" size="xs">
                          Passport Ratio (3.5:4.5)
                        </Badge>
                        <Badge variant="indigo" size="xs">
                          Auto-Deletes Old Photo
                        </Badge>
                      </div>

                      <p className="text-[11px] text-slate-500">
                        Replacing photo will automatically crop new photo and delete the previous asset from Cloudinary.
                      </p>

                      <div className="flex items-center justify-center sm:justify-start gap-2 pt-1 flex-wrap">
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs disabled:opacity-50"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{formData.photoUrl ? 'Replace Photo' : 'Upload & Crop Photo'}</span>
                        </button>

                        {formData.photoUrl && (
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={handleRemovePhoto}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── FORM FIELDS GRID (Compact 2-col) ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Student Full Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="Enter full name"
                      disabled={submitting}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                      disabled={submitting}
                      value={formData.guardianName}
                      onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
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
                        maxLength={10}
                        placeholder="10-digit mobile number"
                        disabled={submitting}
                        value={formData.phone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setFormData({ ...formData, phone: val });
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
                          disabled={submitting}
                          onClick={() => setFormData({ ...formData, gender: g })}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all ${
                            formData.gender === g
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
                      disabled={submitting}
                      value={formData.caste}
                      onChange={(e) => setFormData({ ...formData, caste: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium bg-white text-slate-900 focus:ring-2 focus:ring-indigo-300 outline-none"
                    >
                      {CASTE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    {formData.caste === 'OTHER' && (
                      <input
                        type="text"
                        placeholder="Specify Caste / Category"
                        value={formData.customCaste}
                        onChange={(e) => setFormData({ ...formData, customCaste: e.target.value })}
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
                      placeholder="Admission number"
                      disabled={submitting}
                      value={formData.admissionNo}
                      onChange={(e) => setFormData({ ...formData, admissionNo: e.target.value })}
                      error={errors.admissionNo}
                      className="text-xs"
                    />
                  </div>
                </div>

                {/* Residential Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Residential Address
                  </label>
                  <Textarea
                    placeholder="Residential address (Optional)"
                    disabled={submitting}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    error={errors.address}
                    rows={2}
                    className="text-xs"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Form Action Buttons (Desktop) */}
            <div className="hidden sm:flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/app/students/${studentId}`)}
                disabled={submitting}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="primary"
                loading={submitting}
                loadingText="Saving changes..."
                icon={Save}
              >
                Save Master Profile
              </Button>
            </div>
          </div>

          {/* RIGHT SIDE: Current Enrollment Context Card (5 Cols, Sticky) */}
          <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-5">
            <Card className="border-indigo-100 shadow-2xs overflow-hidden">
              <CardHeader
                title="Current Academic Context"
                subtitle="Active placement & enrollment status"
              />
              <CardContent className="space-y-4 pt-2">
                <div className="p-4 bg-indigo-50/70 rounded-xl border border-indigo-100 space-y-3">
                  <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                    <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider">
                      Status & Roll Number
                    </span>
                    <StudentStatusBadge status={studentRecord?.status || 'ACTIVE'} />
                  </div>

                  {currentAcademic ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">Academic Year:</span>
                        <span className="font-bold text-slate-900">{currentAcademic.academicYear?.name || '—'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">Class & Section:</span>
                        <span className="font-bold text-indigo-700">
                          Class {currentAcademic.class?.name || '—'} {currentAcademic.section ? `(${currentAcademic.section.name})` : ''}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">Medium:</span>
                        <span className="font-semibold text-slate-800">{currentAcademic.medium?.name || '—'}</span>
                      </div>
                      {currentAcademic.stream && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-medium">Stream:</span>
                          <Badge variant="indigo" size="xs">{currentAcademic.stream.name}</Badge>
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-2 border-t border-indigo-100">
                        <span className="text-slate-500 font-medium">Roll Number:</span>
                        <span className="font-mono font-bold text-slate-900">{currentAcademic.rollNumber ?? '—'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 py-2">
                      No active academic year enrollment found.
                    </div>
                  )}
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Master Profile Integrity</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Updating student master information affects official reports, attendance registers, fee receipts, and Cloudinary media assets.
                  </p>
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
            size="md"
            className="flex-1 justify-center"
            onClick={() => navigate(`/app/students/${studentId}`)}
            disabled={submitting}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="flex-[2] justify-center"
            loading={submitting}
            loadingText="Saving..."
            icon={Save}
          >
            Save Profile
          </Button>
        </div>
      </form>
    </div>
  );
};
