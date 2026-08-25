import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Alert } from '../components/ui/Alert.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
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
    const mainSystemPath = user?.role === 'SUPER_ADMIN' ? '/admin/subscriptions' : '/app';
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
        navigate('/admin/subscriptions', { replace: true });
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-4 sm:p-6 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header Navigation */}
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between py-4">
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
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
      </header>

      {/* Main Login Content Card */}
      <main className="flex-1 flex items-center justify-center py-8">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
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

          {/* Login Form */}
          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
            <div>
              <Input
                variant="light"
                label="Email Address"
                type="email"
                name="email"
                placeholder="Enter email address"
                required
                autoComplete="off"
                icon={Mail}
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                {/* Input handles label natively, but we can customize or let Input handle it */}
              </div>
              <Input
                variant="light"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Enter password"
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

            {/* Forgot password link option */}
            <div className="flex items-center justify-end text-xs pt-1">
              <span className="text-slate-500">Forgot password? Contact your school administrator</span>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full justify-center py-2.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors mt-2"
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
      </main>

      {/* Subtle Footer */}
      <footer className="max-w-6xl mx-auto w-full text-center py-4 text-xs text-slate-400">
        <p>
          {BRAND_CONFIG.productName} &copy; {BRAND_CONFIG.copyrightYear} &bull; {BRAND_CONFIG.poweredBy}
        </p>
      </footer>
    </div>
  );
};

export default LoginPage;
