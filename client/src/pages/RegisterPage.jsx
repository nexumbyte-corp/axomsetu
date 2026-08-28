import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, User, Mail, Lock, Phone, MapPin, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
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
    const phoneRegex = /^[0-9+\-\s()]{7,15}$/;

    if (!formData.schoolName.trim()) {
      errors.schoolName = 'School name is required.';
    } else if (formData.schoolName.trim().length < 2) {
      errors.schoolName = 'School name must be at least 2 characters.';
    } else if (formData.schoolName.trim().length > 100) {
      errors.schoolName = 'School name must not exceed 100 characters.';
    }

    if (formData.phone.trim()) {
      if (!phoneRegex.test(formData.phone.trim())) {
        errors.phone = 'Phone number must be 7 to 15 digits (optional +, -, spaces or parentheses).';
      }
    }

    if (!formData.email.trim()) {
      errors.email = 'School email address is required.';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Enter a valid email address.';
    } else if (formData.email.trim().length > 100) {
      errors.email = 'Email must not exceed 100 characters.';
    }

    if (formData.address.trim()) {
      if (formData.address.trim().length < 3) {
        errors.address = 'Address must be at least 3 characters.';
      } else if (formData.address.trim().length > 300) {
        errors.address = 'Address must not exceed 300 characters.';
      }
    }

    if (!formData.ownerName.trim()) {
      errors.ownerName = 'Administrator full name is required.';
    } else if (formData.ownerName.trim().length < 2) {
      errors.ownerName = 'Administrator full name must be at least 2 characters.';
    } else if (formData.ownerName.trim().length > 100) {
      errors.ownerName = 'Administrator full name must not exceed 100 characters.';
    }

    if (!formData.password) {
      errors.password = 'Password is required.';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    } else if (formData.password.length > 100) {
      errors.password = 'Password must not exceed 100 characters.';
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-4 sm:p-6 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header Navigation */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-4">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img src="/app-icon.png" alt="AxomSetu Logo" className="w-9 h-9 rounded-lg object-cover shadow-xs group-hover:scale-105 transition-transform" />
          <div>
            <span className="text-base font-extrabold tracking-tight text-slate-900 block leading-none">
              {BRAND_CONFIG.productName}
            </span>
            <span className="text-[10px] font-medium tracking-wide text-slate-500 block mt-0.5">
              {BRAND_CONFIG.poweredBy}
            </span>
          </div>
        </Link>

        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100"
        >
          <span>Already registered? Sign In</span>
        </Link>
      </header>

      {/* Main Registration Content Card */}
      <main className="flex-1 flex items-center justify-center py-8">
        <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10">
          {/* Header */}
          <div className="border-b border-slate-100 pb-6 mb-6">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>30-Day Free Trial</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create Your School Account</h1>
            <p className="text-xs text-slate-500 mt-1">
              Set up your school and start managing your school operations with AxomSetu.
            </p>
          </div>

          {/* Alert Message */}
          {errorMsg && (
            <Alert type="danger" className="mb-6 bg-rose-50 border-rose-200 text-rose-800">
              {errorMsg}
            </Alert>
          )}

          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-6">
            {/* Section 1: School Information */}
            <div className="bg-slate-50/70 rounded-xl p-4 sm:p-5 border border-slate-200/80 space-y-4">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/60 pb-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>School Information</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Input
                    variant="light"
                    label="School Name"
                    name="schoolName"
                    placeholder="School Name"
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

                <div>
                  <Input
                    variant="light"
                    label="School Phone"
                    name="phone"
                    placeholder="Phone Number"
                    minLength={7}
                    maxLength={15}
                    icon={Phone}
                    value={formData.phone}
                    onChange={handleChange}
                    error={fieldErrors.phone}
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <Input
                    variant="light"
                    label="School Email"
                    type="email"
                    name="email"
                    placeholder="Email Address"
                    required
                    maxLength={100}
                    icon={Mail}
                    value={formData.email}
                    onChange={handleChange}
                    error={fieldErrors.email}
                    disabled={isLoading}
                  />
                </div>

                <div className="sm:col-span-2">
                  <Input
                    variant="light"
                    label="School Address"
                    name="address"
                    placeholder="School Address"
                    minLength={3}
                    maxLength={300}
                    icon={MapPin}
                    value={formData.address}
                    onChange={handleChange}
                    error={fieldErrors.address}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Administrator Information */}
            <div className="bg-slate-50/70 rounded-xl p-4 sm:p-5 border border-slate-200/80 space-y-4">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/60 pb-2">
                <User className="w-4 h-4 text-indigo-600" />
                <span>Administrator Information</span>
              </h2>

              <div>
                <Input
                  variant="light"
                  label="Full Name"
                  name="ownerName"
                  placeholder="Full Name"
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
            </div>

            {/* Section 3: Account Security */}
            <div className="bg-slate-50/70 rounded-xl p-4 sm:p-5 border border-slate-200/80 space-y-4">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/60 pb-2">
                <Lock className="w-4 h-4 text-indigo-600" />
                <span>Account Security</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    variant="light"
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Password"
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

                <div>
                  <Input
                    variant="light"
                    label="Confirm Password"
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    placeholder="Confirm Password"
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
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Terms & Conditions Checkbox */}
            <div className="pt-2">
              <label
                className={`flex items-start gap-3 p-4 rounded-xl border transition-colors cursor-pointer select-none ${
                  termsAccepted ? 'bg-indigo-50/60 border-indigo-200' : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/60'
                }`}
              >
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => {
                    setTermsAccepted(e.target.checked);
                    setErrorMsg('');
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                />
                <span className="text-xs text-slate-700 leading-relaxed font-medium">
                  I confirm that I am authorized to register this school and have read and agree to the{' '}
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
              className="w-full justify-center py-3 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors"
              loading={isLoading}
              loadingText="Creating Account..."
              icon={ArrowRight}
              iconPosition="right"
            >
              Create School Account
            </Button>
          </form>

          {/* Footer CTA */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-600">
              Already have a school account?{' '}
              <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
                Sign In to Account
              </Link>
            </p>
          </div>
        </div>
      </main>

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
      <footer className="max-w-4xl mx-auto w-full text-center py-4 text-xs text-slate-400">
        <p>
          {BRAND_CONFIG.productName} &copy; {BRAND_CONFIG.copyrightYear} &bull; {BRAND_CONFIG.poweredBy}
        </p>
      </footer>
    </div>
  );
};

export default RegisterPage;
