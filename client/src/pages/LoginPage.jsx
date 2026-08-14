import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Eye, EyeOff, Lock, Mail, CheckCircle2, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Alert } from '../components/ui/Alert.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { BRAND_CONFIG } from '../config/brandConfig.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

export const LoginPage = () => {
  useDocumentTitle('Login');
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
      setErrorMsg('Please provide both email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const data = await login(formData);
      showToast('Login successful. Welcome back!', 'success');

      // Role based routing
      if (data.user?.role === 'SUPER_ADMIN') {
        navigate('/admin/subscriptions', { replace: true });
      } else {
        navigate('/app', { replace: true });
      }
    } catch (err) {
      setErrorMsg(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Dynamic Background Glow Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-gradient-to-b from-indigo-600/20 via-purple-600/10 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Main Split Container */}
      <div className="w-full max-w-4xl bg-slate-900/90 rounded-3xl border border-slate-800/90 shadow-2xl backdrop-blur-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 relative z-10">
        
        {/* Left Side: Premium Brand Showcase */}
        <div className="hidden md:flex flex-col justify-between p-10 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border-r border-slate-800/80 relative overflow-hidden">
          {/* Ambient Inner Beam */}
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/15 via-transparent to-transparent pointer-events-none" />

          <div className="relative z-10">
            <Link to="/" className="inline-block mb-10 group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-lg font-extrabold tracking-tight text-white block">{BRAND_CONFIG.productName}</span>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-300 block">{BRAND_CONFIG.productTagline}</span>
                </div>
              </div>
            </Link>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-6">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Multi-Tenant Enterprise Portal</span>
            </div>

            <h2 className="text-2xl font-extrabold text-white leading-tight tracking-tight">
              Streamlined Administration for Forward-Thinking Schools
            </h2>
            <p className="mt-4 text-xs text-slate-300 leading-relaxed font-normal">
              Log in to access your institution dashboard, review locked academic session records, manage multi-class fee ledgers, and disburse staff salaries.
            </p>

            <div className="mt-8 space-y-3.5">
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <div className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span>Strict multi-tenant data privacy & encryption</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <div className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <span>Immutable academic year history locking</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <div className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span>Role-based permission control & audit trail</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 text-[11px] text-slate-400 border-t border-slate-800/80 pt-4 flex items-center justify-between font-mono">
            <span>{BRAND_CONFIG.productName} &copy; {BRAND_CONFIG.copyrightYear}</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              SLA 99.99%
            </span>
          </div>
        </div>

        {/* Right Side: Remastered Sign In Form */}
        <div className="p-6 sm:p-10 flex flex-col justify-center bg-slate-900/90 relative">
          
          {/* Mobile Header Logo */}
          <div className="md:hidden flex items-center gap-3 mb-8">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="text-base font-extrabold text-white">{BRAND_CONFIG.productName}</span>
            </Link>
          </div>

          <div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Sign In to Account</h2>
            <p className="text-xs text-slate-400 mt-1 mb-8">Enter your registered email address and password to access the portal.</p>
          </div>

          {errorMsg && (
            <Alert type="danger" className="mb-6 bg-rose-950/80 border-rose-800 text-rose-200">
              {errorMsg}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Input
                variant="dark"
                label="Email Address"
                type="email"
                name="email"
                placeholder="admin@school.com"
                required
                autoComplete="email"
                icon={Mail}
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            <div>
              <Input
                variant="dark"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="••••••••••••"
                required
                autoComplete="current-password"
                icon={Lock}
                value={formData.password}
                onChange={handleChange}
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

            <Button
              type="submit"
              variant="primary"
              className="w-full justify-center py-3.5 text-sm font-extrabold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-xl shadow-indigo-600/30 border border-indigo-400/30 mt-2"
              loading={isLoading}
              loadingText="Authenticating..."
              icon={ArrowRight}
              iconPosition="right"
            >
              Sign In to Dashboard
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
            <p className="text-xs text-slate-400">
              Don't have a school account yet?{' '}
              <Link to="/register" className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors inline-flex items-center gap-1">
                <span>Register School</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  1-Month Free
                </span>
              </Link>
            </p>
            <p className="text-[11px] text-slate-500 mt-4 font-mono">
              {BRAND_CONFIG.poweredBy}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
