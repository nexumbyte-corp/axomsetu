import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, User, Mail, Lock, Phone, MapPin, Eye, EyeOff, Info, GraduationCap, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Alert } from '../components/ui/Alert.jsx';
import { useToast } from '../components/ui/Toast.jsx';
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
    if (!formData.schoolName.trim()) errors.schoolName = 'School name is required';
    if (!formData.email.trim()) errors.email = 'School email is required';
    if (!formData.ownerName.trim()) errors.ownerName = 'Owner name is required';
    if (!formData.password) errors.password = 'Password is required';
    if (formData.password.length < 8) errors.password = 'Password must be at least 8 characters';
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
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
        showToast('School registered successfully. Sign in to continue.', 'success');
        navigate('/login', { replace: true });
      }
    } catch (err) {
      if (err.errors) {
        const mapped = {};
        err.errors.forEach((eItem) => {
          if (eItem.path && eItem.path[0]) {
            mapped[eItem.path[0]] = eItem.message;
          }
        });
        setFieldErrors(mapped);
      }
      setErrorMsg(err.message || 'Failed to register school. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    if (!termsAccepted) {
      setIsTermsModalOpen(true);
      return;
    }

    executeRegistration();
  };

  const handleAcceptTerms = () => {
    setTermsAccepted(true);
    setIsTermsModalOpen(false);
    executeRegistration();
  };

  const handleDeclineTerms = () => {
    setTermsAccepted(false);
    setIsTermsModalOpen(false);
    setErrorMsg('You must accept the Terms & Conditions and Privacy Policy to create an AxomSetu school account.');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans py-12 relative overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Ambient Background Glow Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-indigo-600/20 via-purple-600/10 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Main Glassmorphism Card */}
      <div className="w-full max-w-3xl bg-slate-900/90 rounded-3xl border border-slate-800/90 shadow-2xl backdrop-blur-2xl overflow-hidden p-6 sm:p-10 relative z-10">
        
        {/* Logo & Header Ribbon */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-6 mb-6">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-tight text-white block">{BRAND_CONFIG.productName}</span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">{BRAND_CONFIG.productTagline}</span>
            </div>
          </Link>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold shadow-md">
            <Sparkles className="w-3.5 h-3.5" />
            <span>1 Month Free Trial</span>
          </div>
        </div>

        {/* Title */}
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Register Your Institution Account</h2>
          <p className="text-xs text-slate-400 mt-1 mb-6">Create your school profile and owner admin account to launch your ERP portal.</p>
        </div>

        {errorMsg && (
          <Alert type="danger" className="mb-6 bg-rose-950/80 border-rose-800 text-rose-200">
            {errorMsg}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Section 1: School Information */}
          <div className="bg-slate-950/60 rounded-2xl p-5 sm:p-6 border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/30">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <span>School Profile Information</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-500">Step 1 of 2</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  variant="dark"
                  label="School Name"
                  name="schoolName"
                  placeholder="e.g. Saint Francis High School"
                  required
                  icon={Building2}
                  value={formData.schoolName}
                  onChange={handleChange}
                  error={fieldErrors.schoolName}
                  disabled={isLoading}
                />
              </div>

              <div>
                <Input
                  variant="dark"
                  label="School Phone"
                  name="phone"
                  placeholder="+91 98765 43210"
                  icon={Phone}
                  value={formData.phone}
                  onChange={handleChange}
                  error={fieldErrors.phone}
                  disabled={isLoading}
                />
              </div>

              <div>
                <Input
                  variant="dark"
                  label="School Email"
                  type="email"
                  name="email"
                  placeholder="contact@school.com"
                  required
                  icon={Mail}
                  value={formData.email}
                  onChange={handleChange}
                  error={fieldErrors.email}
                  disabled={isLoading}
                />
              </div>

              <div className="sm:col-span-2">
                <Input
                  variant="dark"
                  label="Address"
                  name="address"
                  placeholder="Full School Campus Address"
                  icon={MapPin}
                  value={formData.address}
                  onChange={handleChange}
                  error={fieldErrors.address}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Owner Account Information */}
          <div className="bg-slate-950/60 rounded-2xl p-5 sm:p-6 border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/30">
                  <User className="w-3.5 h-3.5" />
                </div>
                <span>Owner Account Setup</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-500">Step 2 of 2</span>
            </div>

            <div className="bg-indigo-950/60 border border-indigo-800/60 rounded-xl p-3 text-xs text-indigo-200 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>The school email provided above will serve as the primary owner login credential.</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  variant="dark"
                  label="Owner Full Name"
                  name="ownerName"
                  placeholder="Principal or Administrator Name"
                  required
                  icon={User}
                  value={formData.ownerName}
                  onChange={handleChange}
                  error={fieldErrors.ownerName}
                  disabled={isLoading}
                />
              </div>

              <div>
                <Input
                  variant="dark"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Min 8 characters"
                  required
                  icon={Lock}
                  value={formData.password}
                  onChange={handleChange}
                  error={fieldErrors.password}
                  disabled={isLoading}
                />
              </div>

              <div>
                <Input
                  variant="dark"
                  label="Confirm Password"
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  placeholder="Re-enter password"
                  required
                  icon={Lock}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  error={fieldErrors.confirmPassword}
                  disabled={isLoading}
                  endElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-slate-200 transition-colors p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
              </div>
            </div>
          </div>

          {/* Simple Inline Terms Checklist Line */}
          <div className="pt-2 border-t border-slate-800/80">
            <label className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
              termsAccepted
                ? 'bg-indigo-950/80 border-indigo-500/50 shadow-md'
                : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900/60'
            }`}>
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => {
                  setTermsAccepted(e.target.checked);
                  setErrorMsg('');
                }}
                className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-950 cursor-pointer shrink-0"
              />
              <span className="text-xs text-slate-300 leading-relaxed font-medium">
                I confirm that I am authorized to register this school and agree to the{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsTermsModalOpen(true);
                  }}
                  className="font-bold text-indigo-400 hover:text-indigo-300 hover:underline transition-colors inline"
                >
                  Terms & Conditions
                </button>{' '}
                and{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsTermsModalOpen(true);
                  }}
                  className="font-bold text-indigo-400 hover:text-indigo-300 hover:underline transition-colors inline"
                >
                  Privacy Policy
                </button>
                .
              </span>
            </label>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full justify-center py-3.5 text-sm font-extrabold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-xl shadow-indigo-600/30 border border-indigo-400/30"
            loading={isLoading}
            loadingText="Registering School..."
            icon={ArrowRight}
            iconPosition="right"
          >
            Register School & Activate Trial
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
          <p className="text-xs text-slate-400">
            Already have a school account registered?{' '}
            <Link to="/login" className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
              Sign In to Account
            </Link>
          </p>
          <p className="text-[11px] text-slate-500 mt-4 font-mono">
            {BRAND_CONFIG.poweredBy}
          </p>
        </div>

      </div>

      {/* Full-width Responsive Terms & Conditions Modal */}
      <TermsAndConditionsModal
        isOpen={isTermsModalOpen}
        isAccepted={termsAccepted}
        onClose={() => setIsTermsModalOpen(false)}
        onAccept={handleAcceptTerms}
        onDecline={handleDeclineTerms}
      />

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />
    </div>
  );
};
