import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, User, Mail, Lock, Phone, MapPin, Eye, EyeOff, ArrowRight, ArrowLeft, ShieldCheck, CheckCircle, School } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Alert } from '../components/ui/Alert.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { SupportModal } from '../components/support/SupportModal.jsx';
import { BRAND_CONFIG } from '../config/brandConfig.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { TermsAndConditionsModal } from '../components/legal/TermsAndConditionsModal.jsx';
import { PrivacyPolicyModal } from '../components/legal/PrivacyPolicyModal.jsx';
import { TERMS_VERSION, PRIVACY_POLICY_VERSION } from '../constants/legalContent.js';

export const RegisterPage = () => {
  useDocumentTitle('Register School');
  const navigate = useNavigate();
  const { registerSchool } = useAuth();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    schoolName: '',
    address: '',
    phone: '',
    email: '',
    ownerName: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Terms & Conditions and Privacy Policy state
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrorMsg('');
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};
    const phoneRegex = /^[0-9+\-\s()]{7,15}$/;

    if (!formData.schoolName.trim()) {
      errors.schoolName = 'School name is required.';
    } else if (formData.schoolName.trim().length < 2) {
      errors.schoolName = 'Must be at least 2 characters.';
    } else if (formData.schoolName.trim().length > 100) {
      errors.schoolName = 'Must not exceed 100 characters.';
    }

    if (formData.phone.trim()) {
      if (!phoneRegex.test(formData.phone.trim())) {
        errors.phone = 'Phone number must be 7 to 15 digits.';
      }
    }

    if (!formData.email.trim()) {
      errors.email = 'School email is required.';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Enter a valid email address.';
    } else if (formData.email.trim().length > 100) {
      errors.email = 'Must not exceed 100 characters.';
    }

    if (formData.address.trim()) {
      if (formData.address.trim().length < 3) {
        errors.address = 'Must be at least 3 characters.';
      } else if (formData.address.trim().length > 300) {
        errors.address = 'Must not exceed 300 characters.';
      }
    }

    if (!formData.ownerName.trim()) {
      errors.ownerName = 'Administrator full name is required.';
    } else if (formData.ownerName.trim().length < 2) {
      errors.ownerName = 'Must be at least 2 characters.';
    } else if (formData.ownerName.trim().length > 100) {
      errors.ownerName = 'Must not exceed 100 characters.';
    }

    if (!formData.password) {
      errors.password = 'Password is required.';
    } else if (formData.password.length < 8) {
      errors.password = 'Must be at least 8 characters.';
    } else if (formData.password.length > 100) {
      errors.password = 'Must not exceed 100 characters.';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Confirm password is required.';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const executeRegistration = async () => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        ...formData,
        termsAccepted: true,
        acceptedTermsVersion: TERMS_VERSION,
        privacyPolicyVersion: PRIVACY_POLICY_VERSION,
      };

      const res = await registerSchool(payload);
      if (res.success) {
        showToast('School account created successfully. Please sign in.', 'success');
        navigate('/login', { replace: true });
      }
    } catch (err) {
      const rawErrors = err.errors || err.response?.data?.errors;
      if (rawErrors && Array.isArray(rawErrors)) {
        const mapped = {};
        rawErrors.forEach((eItem) => {
          const key = eItem.field || (eItem.path && eItem.path[0]);
          if (key) {
            mapped[key] = eItem.message;
          }
        });
        setFieldErrors(mapped);
      }
      if (!window.navigator.onLine) {
        setErrorMsg('Unable to create account. Please check your internet connection and try again.');
      } else {
        setErrorMsg(err.message || 'Failed to create school account. Please check your details and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    if (!termsAccepted) {
      setErrorMsg('Terms & Conditions acceptance is required to proceed.');
      setIsTermsModalOpen(true);
      return;
    }

    executeRegistration();
  };

  const handleAcceptTerms = () => {
    setTermsAccepted(true);
    setIsTermsModalOpen(false);
    setErrorMsg('');
    executeRegistration();
  };

  const handleDeclineTerms = () => {
    setTermsAccepted(false);
    setIsTermsModalOpen(false);
    setErrorMsg('You must accept the Terms & Conditions and Privacy Policy to register your school.');
  };

  return (
    <div className="w-full min-h-screen lg:h-screen lg:overflow-hidden bg-slate-50 text-slate-900 flex flex-col lg:flex-row font-sans selection:bg-indigo-600 selection:text-white">
      {/* LEFT SIDE: Marketing Banner matching Landing Page Theme */}
      <div className="relative hidden lg:flex lg:w-5/12 xl:w-1/2 flex-col justify-between p-10 xl:p-14 bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 text-white overflow-hidden border-r border-indigo-900/40">
        {/* Glow Lighting Accents */}
        <div className="absolute top-0 -left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -right-1/4 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

        {/* Top Logo Header */}
        <div className="relative z-10 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src="/app-icon.png" alt="AxomSetu Logo" className="w-9 h-9 rounded-lg object-cover shadow-sm group-hover:scale-105 transition-transform" />
            <div>
              <span className="text-lg font-extrabold tracking-tight text-white block leading-none">
                {BRAND_CONFIG.productName}
              </span>
              <span className="text-[10px] font-medium tracking-wide text-indigo-300 block mt-0.5">
                {BRAND_CONFIG.poweredBy}
              </span>
            </div>
          </Link>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold backdrop-blur-md">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>30-Day Free Trial</span>
          </div>
        </div>

        {/* Center Marketing Copy */}
        <div className="relative z-10 my-auto py-6 max-w-xl">
          <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-500/20 border border-indigo-400/30 px-3 py-1 rounded-full mb-4">
            INSTANT SCHOOL ONBOARDING
          </span>

          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight mb-4">
            Launch Your Digital School in <span className="text-indigo-400">Under 5 Minutes</span>
          </h1>

          <p className="text-sm xl:text-base text-indigo-100/80 leading-relaxed mb-6">
            Join hundreds of institutions using AxomSetu to streamline fee collection, student records, staff payroll, and daily academic operations with zero hassle.
          </p>

          {/* Benefit Cards */}
          <div className="space-y-2.5 mb-6">
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/10 p-3 rounded-xl">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs text-white font-medium">Automated Fee Structures, Collection & Digital Receipts</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/10 p-3 rounded-xl">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs text-white font-medium">Student Profiles, Academic Records & Admissions</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/10 p-3 rounded-xl">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs text-white font-medium">Multi-User Staff Permissions & PDF/Excel Export Reports</span>
            </div>
          </div>
        </div>

        {/* Bottom Guarantee Card */}
        <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/10 p-3.5 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <School className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-xs font-bold text-white">No Credit Card Required</p>
              <p className="text-[11px] text-indigo-200">Full platform access during your 30-day evaluation.</p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Clean Light Form Panel matching Landing Page theme */}
      <div className="w-full lg:w-7/12 xl:w-1/2 flex flex-col justify-between p-4 sm:p-6 lg:p-8 bg-slate-50 border-l border-slate-200 lg:h-screen lg:overflow-hidden">
        {/* Top Header Navigation */}
        <div className="flex items-center justify-between w-full max-w-xl mx-auto mb-2 shrink-0">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors px-3 py-1 rounded-lg bg-white border border-slate-200 shadow-xs hover:bg-slate-100"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Already registered? Sign In</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsSupportModalOpen(true)}
            className="text-xs text-slate-500 font-medium hover:text-indigo-600 transition-colors"
          >
            Support: <span className="text-indigo-600 font-semibold underline">Helpdesk</span>
          </button>
        </div>

        {/* Form Container Card */}
        <div className="w-full max-w-xl mx-auto my-auto py-1">
          {/* Mobile Header Logo */}
          <div className="lg:hidden text-center mb-4">
            <Link to="/" className="inline-flex items-center gap-2">
              <img src="/app-icon.png" alt="AxomSetu" className="w-7 h-7 rounded-lg shadow-xs" />
              <span className="text-base font-extrabold text-slate-900">{BRAND_CONFIG.productName}</span>
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Register Your School</h2>
                <p className="text-[11px] text-slate-500">Fill in details to set up your school environment.</p>
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3 h-3" />
                <span>30-Day Trial</span>
              </div>
            </div>

            {/* Alert Message */}
            {errorMsg && (
              <Alert type="danger" className="mb-3 bg-rose-50 border-rose-200 text-rose-800 text-xs py-2">
                {errorMsg}
              </Alert>
            )}

            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-3">
              {/* Grid Layout: Compact light fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* School Name */}
                <div className="sm:col-span-1">
                  <Input
                    variant="light"
                    size="sm"
                    label="School Name"
                    name="schoolName"
                    placeholder="e.g. St. Xavier School"
                    required
                    minLength={2}
                    maxLength={100}
                    icon={Building2}
                    value={formData.schoolName}
                    onChange={handleChange}
                    error={fieldErrors.schoolName}
                    disabled={isLoading}
                  />
                </div>

                {/* School Phone */}
                <div className="sm:col-span-1">
                  <Input
                    variant="light"
                    size="sm"
                    label="School Phone"
                    name="phone"
                    placeholder="+91 9876543210"
                    minLength={7}
                    maxLength={15}
                    icon={Phone}
                    value={formData.phone}
                    onChange={handleChange}
                    error={fieldErrors.phone}
                    disabled={isLoading}
                  />
                </div>

                {/* School Email */}
                <div className="sm:col-span-1">
                  <Input
                    variant="light"
                    size="sm"
                    label="School Email"
                    type="email"
                    name="email"
                    placeholder="info@school.com"
                    required
                    maxLength={100}
                    icon={Mail}
                    value={formData.email}
                    onChange={handleChange}
                    error={fieldErrors.email}
                    disabled={isLoading}
                  />
                </div>

                {/* School Address */}
                <div className="sm:col-span-1">
                  <Input
                    variant="light"
                    size="sm"
                    label="School Address"
                    name="address"
                    placeholder="City, State"
                    minLength={3}
                    maxLength={300}
                    icon={MapPin}
                    value={formData.address}
                    onChange={handleChange}
                    error={fieldErrors.address}
                    disabled={isLoading}
                  />
                </div>

                {/* Administrator Full Name */}
                <div className="sm:col-span-2">
                  <Input
                    variant="light"
                    size="sm"
                    label="Administrator Full Name"
                    name="ownerName"
                    placeholder="Principal / Director Name"
                    required
                    minLength={2}
                    maxLength={100}
                    icon={User}
                    value={formData.ownerName}
                    onChange={handleChange}
                    error={fieldErrors.ownerName}
                    disabled={isLoading}
                  />
                </div>

                {/* Password */}
                <div className="sm:col-span-1">
                  <Input
                    variant="light"
                    size="sm"
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Min. 8 characters"
                    required
                    minLength={8}
                    maxLength={100}
                    icon={Lock}
                    value={formData.password}
                    onChange={handleChange}
                    error={fieldErrors.password}
                    disabled={isLoading}
                  />
                </div>

                {/* Confirm Password */}
                <div className="sm:col-span-1">
                  <Input
                    variant="light"
                    size="sm"
                    label="Confirm Password"
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    placeholder="Re-enter password"
                    required
                    minLength={8}
                    maxLength={100}
                    icon={Lock}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    error={fieldErrors.confirmPassword}
                    disabled={isLoading}
                    endElement={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                        title={showPassword ? 'Hide password' : 'Show password'}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    }
                  />
                </div>
              </div>

              {/* T&C Checkbox */}
              <div className="pt-1">
                <label
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-colors cursor-pointer select-none ${termsAccepted ? 'bg-indigo-50/60 border-indigo-200' : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/60'
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => {
                      setTermsAccepted(e.target.checked);
                      setErrorMsg('');
                    }}
                    className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                  />
                  <span className="text-[11px] text-slate-600 leading-normal font-medium">
                    I confirm authority to register this school and agree to the{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsTermsModalOpen(true);
                      }}
                      className="font-bold text-indigo-600 hover:text-indigo-800 underline inline"
                    >
                      Terms & Conditions
                    </button>{' '}
                    and{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsPrivacyModalOpen(true);
                      }}
                      className="font-bold text-indigo-600 hover:text-indigo-800 underline inline"
                    >
                      Privacy Policy
                    </button>
                    .
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                className="w-full justify-center py-2.5 text-xs font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs transition-colors"
                loading={isLoading}
                loadingText="Creating Account..."
                icon={ArrowRight}
                iconPosition="right"
              >
                Create School Account
              </Button>
            </form>

            {/* Footer CTA */}
            <div className="mt-4 pt-3 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-500">
                Already registered your school?{' '}
                <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
                  Sign In to Account
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Support Modal (Fetches live contact info from server) */}
        <SupportModal
          isOpen={isSupportModalOpen}
          onClose={() => setIsSupportModalOpen(false)}
        />

        {/* Modal Dialogs */}
        <TermsAndConditionsModal
          isOpen={isTermsModalOpen}
          isAccepted={termsAccepted}
          onClose={() => setIsTermsModalOpen(false)}
          onAccept={handleAcceptTerms}
          onDecline={handleDeclineTerms}
        />

        <PrivacyPolicyModal
          isOpen={isPrivacyModalOpen}
          onClose={() => setIsPrivacyModalOpen(false)}
        />

        {/* Footer */}
        <footer className="w-full max-w-xl mx-auto text-center py-2 text-[11px] text-slate-400 shrink-0">
          <p>
            {BRAND_CONFIG.productName} &copy; {BRAND_CONFIG.copyrightYear} &bull; {BRAND_CONFIG.poweredBy}
          </p>
        </footer>
      </div>
    </div>
  );
};

export default RegisterPage;
