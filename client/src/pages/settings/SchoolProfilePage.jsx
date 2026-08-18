import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Building, User, Lock, Eye, EyeOff, Save, AlertCircle, ShieldCheck, CreditCard, School, Mail, Phone, MapPin, Image, Upload, Trash2, RefreshCw, ExternalLink } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { usePermission } from '../../hooks/usePermission.js';
import { useToast } from '../../components/ui/Toast.jsx';
import { schoolService } from '../../services/school.service.js';
import { authService } from '../../services/auth.service.js';
import { Badge } from '../../components/ui/Badge.jsx';
import { AccessDeniedPage } from '../AccessDeniedPage.jsx';

export const SchoolProfilePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const _navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const { isOwner } = usePermission();
  const { showToast } = useToast();
  const addToast = ({ type = 'success', message }) => {
    if (showToast) showToast(message, type);
  };
  const fileInputRef = useRef(null);

  const activeTabFromUrl = searchParams.get('tab') || 'school';
  const [activeTab, setActiveTab] = useState(
    ['school', 'account', 'security'].includes(activeTabFromUrl) ? activeTabFromUrl : 'school'
  );

  // Sync tab state with URL
  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setSearchParams({ tab: tabKey });
  };

  // ── 1. School Profile State
  const [schoolLoading, setSchoolLoading] = useState(true);
  const [schoolError, setSchoolError] = useState(null);
  const [schoolSaving, setSchoolSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoDeleting, setLogoDeleting] = useState(false);

  const [schoolData, setSchoolData] = useState({
    id: '',
    name: '',
    code: '',
    email: '',
    phone: '',
    address: '',
    district: '',
    state: '',
    pincode: '',
    udiseCode: '',
    affiliationNo: '',
    website: '',
    logoUrl: '',
    status: 'ACTIVE',
    createdAt: null,
    owner: null,
    activeSubscription: null,
    stats: { totalStudents: 0, totalStaff: 0 },
  });

  // Track initial school data for unsaved changes warning
  const [initialSchoolData, setInitialSchoolData] = useState(null);

  // ── 2. User Account State
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountData, setAccountData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
  });

  // ── 3. Security / Change Password State
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({});

  // ── Fetch Tenant School Details
  const fetchSchoolProfile = async () => {
    setSchoolLoading(true);
    setSchoolError(null);
    try {
      const res = await schoolService.getTenantProfile();
      if (res && res.success && res.data) {
        const s = res.data;
        const loaded = {
          id: s.id || '',
          name: s.name || '',
          code: s.code || '',
          email: s.email || '',
          phone: s.phone || '',
          address: s.address || '',
          district: s.district || '',
          state: s.state || '',
          pincode: s.pincode || '',
          udiseCode: s.udiseCode || '',
          affiliationNo: s.affiliationNo || '',
          website: s.website || '',
          logoUrl: s.logoUrl || '',
          status: s.status || 'ACTIVE',
          createdAt: s.createdAt || null,
          owner: s.owner || null,
          activeSubscription: s.activeSubscription || null,
          stats: s.stats || { totalStudents: 0, totalStaff: 0 },
        };
        setSchoolData(loaded);
        setInitialSchoolData(loaded);
      } else {
        setSchoolError(res?.message || 'Failed to load school profile');
      }
    } catch (err) {
      const msg = err.message || err.response?.data?.message || 'Failed to load school profile';
      setSchoolError(msg);
      addToast({ type: 'error', message: msg });
    } finally {
      setSchoolLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner) {
      fetchSchoolProfile();
    }
  }, [isOwner]);

  useEffect(() => {
    if (user) {
      setAccountData({
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || '',
      });
    }
  }, [user]);

  // ── Ownership Guard
  if (!isOwner) {
    return <AccessDeniedPage missingPermission="SCHOOL_OWNER_REQUIRED" />;
  }

  // Check unsaved changes in school profile form
  const isSchoolFormDirty =
    initialSchoolData &&
    (schoolData.name !== initialSchoolData.name ||
      schoolData.email !== initialSchoolData.email ||
      (schoolData.phone || '') !== (initialSchoolData.phone || '') ||
      (schoolData.address || '') !== (initialSchoolData.address || '') ||
      (schoolData.district || '') !== (initialSchoolData.district || '') ||
      (schoolData.state || '') !== (initialSchoolData.state || '') ||
      (schoolData.pincode || '') !== (initialSchoolData.pincode || '') ||
      (schoolData.udiseCode || '') !== (initialSchoolData.udiseCode || '') ||
      (schoolData.affiliationNo || '') !== (initialSchoolData.affiliationNo || '') ||
      (schoolData.website || '') !== (initialSchoolData.website || '') ||
      (schoolData.logoUrl || '') !== (initialSchoolData.logoUrl || ''));

  // ── Handle Cloudinary File Upload (Compress <= 20KB & Replace Previous Asset)
  const handleLogoFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image type
    if (!file.type.startsWith('image/')) {
      addToast({ type: 'error', message: 'Please select a valid image file (PNG, JPEG, WebP, SVG).' });
      return;
    }

    // Input limit before server compression
    if (file.size > 5 * 1024 * 1024) {
      addToast({ type: 'error', message: 'File size should be less than 5MB.' });
      return;
    }

    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const res = await schoolService.uploadTenantLogo(formData);
      if (res && res.success && res.data?.logoUrl) {
        const newUrl = res.data.logoUrl;
        const sizeKb = res.data.sizeKb || '20';
        setSchoolData((prev) => ({ ...prev, logoUrl: newUrl }));
        addToast({
          type: 'success',
          message: `Logo compressed (${sizeKb} KB) and uploaded to Cloudinary!`,
        });
        await fetchSchoolProfile();
        if (refreshProfile) refreshProfile();
      } else {
        addToast({ type: 'error', message: res?.message || 'Failed to upload logo' });
      }
    } catch (err) {
      addToast({
        type: 'error',
        message: err.message || err.response?.data?.message || 'Failed to upload logo to Cloudinary',
      });
    } finally {
      setLogoUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // ── Remove Logo from Cloudinary
  const handleRemoveLogo = async () => {
    setLogoDeleting(true);
    try {
      const res = await schoolService.deleteTenantLogo();
      if (res && res.success) {
        setSchoolData((prev) => ({ ...prev, logoUrl: '' }));
        addToast({ type: 'success', message: 'Logo deleted from Cloudinary successfully!' });
        await fetchSchoolProfile();
        if (refreshProfile) refreshProfile();
      } else {
        addToast({ type: 'error', message: res?.message || 'Failed to delete logo' });
      }
    } catch (err) {
      addToast({
        type: 'error',
        message: err.message || err.response?.data?.message || 'Failed to delete logo from Cloudinary',
      });
    } finally {
      setLogoDeleting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // ── Save School Profile Form
  const handleSaveSchoolProfile = async (e) => {
    e.preventDefault();

    if (!schoolData.name.trim()) {
      addToast({ type: 'error', message: 'School name is required' });
      return;
    }

    if (!schoolData.email.trim()) {
      addToast({ type: 'error', message: 'Official contact email is required' });
      return;
    }

    setSchoolSaving(true);
    try {
      const payload = {
        name: schoolData.name.trim(),
        email: schoolData.email.trim(),
        phone: schoolData.phone?.trim() || null,
        address: schoolData.address?.trim() || null,
        district: schoolData.district?.trim() || null,
        state: schoolData.state?.trim() || null,
        pincode: schoolData.pincode?.trim() || null,
        udiseCode: schoolData.udiseCode?.trim() || null,
        affiliationNo: schoolData.affiliationNo?.trim() || null,
        website: schoolData.website?.trim() || null,
        logoUrl: schoolData.logoUrl?.trim() || null,
      };

      const res = await schoolService.updateTenantProfile(payload);
      if (res && res.success) {
        addToast({ type: 'success', message: 'School profile updated successfully!' });
        await fetchSchoolProfile();
        if (refreshProfile) refreshProfile();
      } else {
        addToast({ type: 'error', message: res?.message || 'Failed to update school profile' });
      }
    } catch (err) {
      addToast({
        type: 'error',
        message: err.message || err.response?.data?.message || 'Failed to update school profile',
      });
    } finally {
      setSchoolSaving(false);
    }
  };

  // ── Save Account Profile
  const handleSaveAccountProfile = async (e) => {
    e.preventDefault();
    if (!accountData.name.trim()) {
      addToast({ type: 'error', message: 'Full name is required' });
      return;
    }

    setAccountSaving(true);
    try {
      const payload = {
        name: accountData.name.trim(),
        phone: accountData.phone?.trim() || null,
      };

      const res = await authService.updateProfile(payload);
      if (res && res.success) {
        addToast({ type: 'success', message: 'Account profile updated successfully!' });
        if (refreshProfile) refreshProfile();
      } else {
        addToast({ type: 'error', message: res?.message || 'Failed to update user profile' });
      }
    } catch (err) {
      addToast({
        type: 'error',
        message: err.message || err.response?.data?.message || 'Failed to update user profile',
      });
    } finally {
      setAccountSaving(false);
    }
  };

  // ── Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }
    if (!passwordData.newPassword || passwordData.newPassword.length < 8) {
      errors.newPassword = 'New password must be at least 8 characters';
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setPasswordErrors({});
    setPasswordSaving(true);
    try {
      const res = await authService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword,
      });

      if (res && (res.success || res.message)) {
        addToast({ type: 'success', message: res.message || 'Password changed successfully!' });
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        addToast({ type: 'error', message: res?.message || 'Failed to change password' });
      }
    } catch (err) {
      const msg = err.message || err.response?.data?.message || 'Failed to change password';
      addToast({ type: 'error', message: msg });
      if (msg.toLowerCase().includes('current password')) {
        setPasswordErrors({ currentPassword: msg });
      }
    } finally {
      setPasswordSaving(false);
    }
  };

  // Password strength calculation helper
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-200' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500' };
    if (score === 2 || score === 3) return { score: 2, label: 'Medium', color: 'bg-amber-500' };
    return { score: 3, label: 'Strong', color: 'bg-emerald-500' };
  };

  const passwordStrength = getPasswordStrength(passwordData.newPassword);

  // Subscription remaining days calculation helper
  const calculateRemainingDays = (endDateStr) => {
    if (!endDateStr) return null;
    const end = new Date(endDateStr);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  const _remainingDays = schoolData.activeSubscription?.endDate
    ? calculateRemainingDays(schoolData.activeSubscription.endDate)
    : null;

  const schoolNameDisplay = schoolData.name || user?.schoolAdmins?.[0]?.school?.name || 'School Profile';

  return (
    <div className="space-y-6">
      {/* ── Page Header Banner ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shrink-0 overflow-hidden relative group">
            {schoolData.logoUrl ? (
              <img
                src={schoolData.logoUrl}
                alt={schoolNameDisplay}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <School className="w-8 h-8" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 truncate">
                {schoolLoading ? 'Loading Profile...' : schoolNameDisplay}
              </h1>
              {schoolData.code && (
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 text-slate-700">
                  {schoolData.code}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Manage school info, contact details, account profile, and security credentials.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Dynamic DB School Status */}
          <Badge
            variant={
              schoolData.status === 'ACTIVE'
                ? 'success'
                : schoolData.status === 'SUSPENDED'
                ? 'danger'
                : 'neutral'
            }
          >
            {schoolData.status || 'ACTIVE'}
          </Badge>

          {/* Dynamic Active Subscription Badge */}
          {schoolData.activeSubscription && (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" />
              {schoolData.activeSubscription.planName || 'Active Subscription'}
            </span>
          )}
        </div>
      </div>

      {/* ── Main Navigation Tabs ── */}
      <div className="flex border-b border-slate-200 bg-white px-4 pt-2 rounded-t-xl overflow-x-auto">
        <button
          onClick={() => handleTabChange('school')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'school'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>School Profile</span>
        </button>

        <button
          onClick={() => handleTabChange('account')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'account'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <User className="w-4 h-4" />
          <span>My Account</span>
        </button>

        <button
          onClick={() => handleTabChange('security')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'security'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Security & Password</span>
        </button>
      </div>

      {/* Error state alert */}
      {schoolError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <p className="text-xs font-medium text-red-800">{schoolError}</p>
          </div>
          <button
            onClick={fetchSchoolProfile}
            className="flex items-center gap-1.5 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold rounded-lg transition-colors shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* ── TAB 1: SCHOOL PROFILE ── */}
      {activeTab === 'school' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSaveSchoolProfile} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Institution Details</h3>
                  <p className="text-xs text-slate-500">Update official school information displayed on receipts and portal.</p>
                </div>
                <div className="flex items-center gap-2">
                  {isSchoolFormDirty && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                      Unsaved Changes
                    </span>
                  )}
                  {schoolLoading && <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />}
                </div>
              </div>

              {/* Cloudinary School Logo Upload Section */}
              <div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="w-20 h-20 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs relative">
                    {logoUploading ? (
                      <div className="flex flex-col items-center justify-center p-2 text-indigo-600">
                        <RefreshCw className="w-6 h-6 animate-spin mb-1" />
                        <span className="text-[9px] font-bold">Compressing...</span>
                      </div>
                    ) : schoolData.logoUrl ? (
                      <img
                        src={schoolData.logoUrl}
                        alt="Logo preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '';
                        }}
                      />
                    ) : (
                      <School className="w-10 h-10 text-slate-300" />
                    )}
                  </div>

                  <div className="space-y-2 flex-1 w-full">
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleLogoFileChange}
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={logoUploading || logoDeleting}
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs disabled:opacity-50"
                      >
                        {logoUploading ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Uploading to Cloudinary...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload New Logo</span>
                          </>
                        )}
                      </button>

                      {schoolData.logoUrl && (
                        <button
                          type="button"
                          disabled={logoUploading || logoDeleting}
                          onClick={handleRemoveLogo}
                          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors shadow-2xs disabled:opacity-50"
                        >
                          {logoDeleting ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Deleting...</span>
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove Logo</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="relative">
                      <Image className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={schoolData.logoUrl}
                        readOnly
                        placeholder="Cloudinary image URL will appear here after upload..."
                        className="w-full pl-9 pr-3 py-1.5 border border-slate-200 bg-slate-100 text-slate-600 rounded-lg text-xs font-mono font-medium truncate cursor-default"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* School Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  School Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <School className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={schoolData.name}
                    onChange={(e) => setSchoolData({ ...schoolData, name: e.target.value })}
                    placeholder="Enter school name"
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Official Contact Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      value={schoolData.email}
                      onChange={(e) => setSchoolData({ ...schoolData, email: e.target.value })}
                      placeholder="Enter school email address"
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={schoolData.phone}
                      onChange={(e) => setSchoolData({ ...schoolData, phone: e.target.value })}
                      placeholder="Enter school phone number"
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Address, District, State, PIN Code Grid */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Campus Address</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <textarea
                    rows={2}
                    value={schoolData.address}
                    onChange={(e) => setSchoolData({ ...schoolData, address: e.target.value })}
                    placeholder="Enter campus address"
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">District</label>
                  <input
                    type="text"
                    value={schoolData.district}
                    onChange={(e) => setSchoolData({ ...schoolData, district: e.target.value })}
                    placeholder="Enter district"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={schoolData.state}
                    onChange={(e) => setSchoolData({ ...schoolData, state: e.target.value })}
                    placeholder="Enter state"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">PIN Code</label>
                  <input
                    type="text"
                    value={schoolData.pincode}
                    onChange={(e) => setSchoolData({ ...schoolData, pincode: e.target.value })}
                    placeholder="Enter PIN code"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* UDISE Code, Affiliation No, Website Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">UDISE Code</label>
                  <input
                    type="text"
                    value={schoolData.udiseCode}
                    onChange={(e) => setSchoolData({ ...schoolData, udiseCode: e.target.value })}
                    placeholder="Enter UDISE code"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Affiliation / Recognition No.</label>
                  <input
                    type="text"
                    value={schoolData.affiliationNo}
                    onChange={(e) => setSchoolData({ ...schoolData, affiliationNo: e.target.value })}
                    placeholder="Enter affiliation number"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Website (Optional)</label>
                <div className="relative">
                  <ExternalLink className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={schoolData.website}
                    onChange={(e) => setSchoolData({ ...schoolData, website: e.target.value })}
                    placeholder="Enter school website URL"
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={schoolSaving || schoolLoading || logoUploading || logoDeleting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs transition-colors shadow-sm disabled:opacity-50"
                >
                  {schoolSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save School Profile</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Side Overview Cards */}
          <div className="space-y-6">
            {/* School Owner Info Card */}
            {schoolData.owner && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>Primary School Owner</span>
                </h3>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-900">{schoolData.owner.name}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{schoolData.owner.email}</span>
                  </p>
                  {schoolData.owner.phone && (
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{schoolData.owner.phone}</span>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: MY ACCOUNT PROFILE ── */}
      {activeTab === 'account' && (
        <div className="max-w-2xl bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-sm font-bold text-slate-900">Personal Profile Settings</h3>
            <p className="text-xs text-slate-500">Update your personal owner profile details.</p>
          </div>

          <form onSubmit={handleSaveAccountProfile} className="space-y-4">
            {/* User Avatar Circle */}
            <div className="flex items-center gap-4 py-2">
              <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xl border-2 border-indigo-200 shrink-0">
                {accountData.name.charAt(0) || 'O'}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-900">{accountData.name || 'School Owner'}</p>
                <p className="text-xs text-slate-500">{accountData.email}</p>
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                    SCHOOL OWNER
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                    ACTIVE
                  </span>
                </div>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={accountData.name}
                  onChange={(e) => setAccountData({ ...accountData, name: e.target.value })}
                  placeholder="Enter your full name"
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            {/* Email Address (Readonly) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Login Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={accountData.email}
                  readOnly
                  disabled
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 text-slate-500 rounded-lg text-xs font-medium cursor-not-allowed"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Account login email is protected and cannot be modified.</p>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Personal Phone Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={accountData.phone}
                  onChange={(e) => setAccountData({ ...accountData, phone: e.target.value })}
                  placeholder="Enter 10-digit phone number"
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Account Metadata (Readonly Info) */}
            <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">User Role</span>
                <span className="font-bold text-slate-800">School Owner</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">Associated School</span>
                <span className="font-bold text-slate-800">
                  {schoolData.name || user?.schoolAdmins?.[0]?.school?.name || 'N/A'}
                </span>
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                disabled={accountSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs transition-colors shadow-sm disabled:opacity-50"
              >
                {accountSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Account Profile</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── TAB 3: SECURITY & CHANGE PASSWORD ── */}
      {activeTab === 'security' && (
        <div className="max-w-2xl bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-sm font-bold text-slate-900">Security & Password Credentials</h3>
            <p className="text-xs text-slate-500">Update your account login password to maintain system security.</p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Current Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  placeholder="Enter current password"
                  className={`w-full pl-9 pr-10 py-2 border rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 ${
                    passwordErrors.currentPassword ? 'border-red-300 bg-red-50/30' : 'border-slate-200'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordErrors.currentPassword && (
                <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {passwordErrors.currentPassword}
                </p>
              )}
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="At least 8 characters"
                  className={`w-full pl-9 pr-10 py-2 border rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 ${
                    passwordErrors.newPassword ? 'border-red-300 bg-red-50/30' : 'border-slate-200'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordErrors.newPassword && (
                <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {passwordErrors.newPassword}
                </p>
              )}

              {/* Password Strength Meter */}
              {passwordData.newPassword && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                    <span>Password Strength</span>
                    <span className={passwordStrength.score === 3 ? 'text-emerald-600' : 'text-amber-600'}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1">
                    <div className={`h-full flex-1 rounded-full transition-colors ${passwordStrength.score >= 1 ? passwordStrength.color : 'bg-slate-200'}`} />
                    <div className={`h-full flex-1 rounded-full transition-colors ${passwordStrength.score >= 2 ? passwordStrength.color : 'bg-slate-200'}`} />
                    <div className={`h-full flex-1 rounded-full transition-colors ${passwordStrength.score >= 3 ? passwordStrength.color : 'bg-slate-200'}`} />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="Re-enter new password"
                  className={`w-full pl-9 pr-10 py-2 border rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 ${
                    passwordErrors.confirmPassword ? 'border-red-300 bg-red-50/30' : 'border-slate-200'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordErrors.confirmPassword && (
                <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {passwordErrors.confirmPassword}
                </p>
              )}
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                disabled={passwordSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs transition-colors shadow-sm disabled:opacity-50"
              >
                {passwordSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
