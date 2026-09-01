import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ArrowLeft, ShieldCheck, CheckCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Alert } from '../components/ui/Alert.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { SupportModal } from '../components/support/SupportModal.jsx';
import { BRAND_CONFIG } from '../config/brandConfig.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

export const LoginPage = () => {
  useDocumentTitle('Login');
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isInitializing, user } = useAuth();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState(() => {
    if (location.state?.message) return location.state.message;
    const storedMsg = sessionStorage.getItem('auth_error_message');
    if (storedMsg) {
      sessionStorage.removeItem('auth_error_message');
      return storedMsg;
    }
    return '';
  });

  useEffect(() => {
    const storedMsg = sessionStorage.getItem('auth_error_message');
    if (storedMsg) {
      sessionStorage.removeItem('auth_error_message');
      setErrorMsg(storedMsg);
    }
  }, []);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Spinner size="lg" label="Initializing session..." />
      </div>
    );
  }

  if (isAuthenticated) {
    const mainSystemPath = user?.role === 'SUPER_ADMIN' ? '/admin/dashboard' : '/app';
    return <Navigate to={mainSystemPath} replace />;
  }

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setErrorMsg('Please enter both email address and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const data = await login(formData);
      showToast('Sign in successful. Welcome back!', 'success');

      // Role based routing
      if (data.user?.role === 'SUPER_ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/app', { replace: true });
      }
    } catch (err) {
      if (!window.navigator.onLine) {
        setErrorMsg('Unable to sign in. Please check your internet connection and try again.');
      } else {
        setErrorMsg(err.message || 'Invalid email address or password.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen lg:h-screen lg:overflow-hidden bg-slate-50 text-slate-900 flex flex-col lg:flex-row font-sans selection:bg-indigo-600 selection:text-white">
      {/* LEFT SIDE: Marketing Showcase matching Landing Page hero banner */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between p-10 xl:p-14 bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 text-white overflow-hidden border-r border-indigo-900/40">
        {/* Decorative ambient background blur lights */}
        <div className="absolute top-0 -left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -right-1/4 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

        {/* Top Branding Header */}
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

          <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-500/20 border border-indigo-400/30 px-3 py-1 rounded-full">
            SCHOOL MANAGEMENT PLATFORM
          </span>
        </div>

        {/* Hero Marketing Content */}
        <div className="relative z-10 my-auto py-6 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold mb-4">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Trusted Enterprise Platform</span>
          </div>

          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight mb-4">
            Simple School Management. <br />
            <span className="text-indigo-400">Everything in One Place.</span>
          </h1>

          <p className="text-sm xl:text-base text-indigo-100/80 leading-relaxed mb-6">
            Manage students, academics, fees, staff, payroll, reports, and daily school operations seamlessly.
          </p>

          {/* Core Feature Badges */}
          <div className="space-y-2.5 mb-8">
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/10 p-3 rounded-xl">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs text-white font-medium">Fee Management, Receipts & Dues Collection</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/10 p-3 rounded-xl">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs text-white font-medium">Staff Salaries, Advances & Monthly Payroll</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/10 p-3 rounded-xl">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs text-white font-medium">Comprehensive Financial & Academic Reports</span>
            </div>
          </div>
        </div>

        {/* Bottom Platform Info Bar */}
        <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/10 p-3.5 rounded-xl flex items-center justify-between">
          <span className="text-xs text-white font-medium">AxomSetu Enterprise Platform</span>
          <span className="text-[11px] font-semibold text-indigo-300">{BRAND_CONFIG.poweredBy}</span>
        </div>
      </div>

      {/* RIGHT SIDE: Clean Light Form Panel matching Landing Page theme */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-8 lg:p-10 bg-slate-50 border-l border-slate-200 lg:h-screen lg:overflow-hidden">
        {/* Top Header Navigation */}
        <div className="flex items-center justify-between w-full max-w-md mx-auto mb-4 shrink-0">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-xs hover:bg-slate-100"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsSupportModalOpen(true)}
            className="text-xs text-slate-500 font-medium hover:text-indigo-600 transition-colors"
          >
            Need help? <span className="text-indigo-600 font-semibold underline">Support</span>
          </button>
        </div>

        {/* Form Container Card */}
        <div className="w-full max-w-md mx-auto my-auto py-2">
          {/* Mobile Header Logo */}
          <div className="lg:hidden text-center mb-6">
            <Link to="/" className="inline-flex items-center gap-2">
              <img src="/app-icon.png" alt="AxomSetu" className="w-8 h-8 rounded-lg shadow-xs" />
              <span className="text-lg font-extrabold text-slate-900">{BRAND_CONFIG.productName}</span>
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
            {/* Card Header */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center mx-auto mb-3">
                <Lock className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome back</h1>
              <p className="text-xs text-slate-500 mt-1">Sign in to your school account.</p>
            </div>

            {/* Error Alert */}
            {errorMsg && (
              <Alert type="danger" className="mb-5 bg-rose-50 border-rose-200 text-rose-800">
                {errorMsg}
              </Alert>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
              <div>
                <Input
                  variant="light"
                  label="Email Address"
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  required
                  autoComplete="off"
                  icon={Mail}
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>

              <div>
                <Input
                  variant="light"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Password"
                  required
                  autoComplete="new-password"
                  icon={Lock}
                  value={formData.password}
                  onChange={handleChange}
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

              <div className="flex items-center justify-end text-xs pt-1">
                <span className="text-slate-500">Forgot password? Contact your school administrator</span>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full justify-center py-2.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs transition-colors mt-2"
                loading={isLoading}
                loadingText="Signing in..."
                icon={ArrowRight}
                iconPosition="right"
              >
                Sign In
              </Button>
            </form>

            {/* Registration Redirect CTA */}
            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-600">
                Don't have an account?{' '}
                <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
                  Register Your School
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

        {/* Footer */}
        <footer className="w-full max-w-md mx-auto text-center py-3 text-xs text-slate-400 shrink-0">
          <p>
            {BRAND_CONFIG.productName} &copy; {BRAND_CONFIG.copyrightYear} &bull; {BRAND_CONFIG.poweredBy}
          </p>
        </footer>
      </div>
    </div>
  );
};

export default LoginPage;



