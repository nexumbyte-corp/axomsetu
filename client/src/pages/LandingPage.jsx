import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  GraduationCap,
  Users,
  CreditCard,
  Building2,
  Calendar,
  ArrowRight,
  Menu,
  CheckCircle2,
  Receipt,
  FileSpreadsheet,
  TrendingUp,
  Zap,
  Sparkles,
  ChevronDown,
  Check,
  Lock,
  HelpCircle,
} from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Drawer } from '../components/ui/Drawer.jsx';
import { subscriptionService } from '../services/subscriptionService.js';
import { BRAND_CONFIG } from '../config/brandConfig.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

export const LandingPage = () => {
  useDocumentTitle();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [plansError, setPlansError] = useState(null);
  const [registeredSchools, setRegisteredSchools] = useState([]);
  const [loadingSchools, setLoadingSchools] = useState(true);

  // Dynamic UI States
  const [billingFilter, setBillingFilter] = useState('ALL'); // ALL, MONTHLY, QUARTERLY, YEARLY
  const [activePreviewTab, setActivePreviewTab] = useState('OVERVIEW'); // OVERVIEW, FEES, PAYROLL, ACADEMIC
  const [activeModuleCategory, setActiveModuleCategory] = useState('ALL');
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  // Auto-close mobile drawer and reset overflow on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    document.body.style.overflow = '';
  }, [location.pathname]);

  // Fetch Public Plans and Registered Schools dynamically on mount
  useEffect(() => {
    const fetchLandingData = async () => {
      setLoadingPlans(true);
      setLoadingSchools(true);
      try {
        const [plansRes, schoolsRes] = await Promise.all([
          subscriptionService.getPublicLandingPlans(),
          subscriptionService.getPublicLandingSchools(),
        ]);

        if (plansRes.success && Array.isArray(plansRes.data)) {
          setPlans(plansRes.data);
        } else {
          setPlans([]);
        }

        if (schoolsRes.success && Array.isArray(schoolsRes.data)) {
          setRegisteredSchools(schoolsRes.data);
        } else {
          setRegisteredSchools([]);
        }
      } catch (err) {
        console.error('Failed to fetch public landing data:', err);
        setPlansError('Unable to load live pricing plans right now.');
      } finally {
        setLoadingPlans(false);
        setLoadingSchools(false);
      }
    };

    fetchLandingData();
  }, []);

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

  // Features Breakdown for Marketing Section
  const modulesList = [
    {
      category: 'STUDENTS',
      icon: Users,
      title: 'Student Admission & Profiles',
      description: 'Centralized database for student bio-data, parent contact records, roll allocations, and academic session history.',
      badge: 'Core Module',
    },
    {
      category: 'FEES',
      icon: Receipt,
      title: 'Automated Fee Engine',
      description: 'Define multi-class fee structures, issue instant digital receipts, track pending dues, and view collection ledgers.',
      badge: 'Revenue Engine',
    },
    {
      category: 'PAYROLL',
      icon: CreditCard,
      title: 'Staff Payroll & Advances',
      description: 'Streamlined salary calculations, advance requests, partial disbursements, and detailed monthly salary slips.',
      badge: 'HR & Payroll',
    },
    {
      category: 'FINANCE',
      icon: FileSpreadsheet,
      title: 'School Expenses & Audit',
      description: 'Track daily maintenance cost, utility bills, inventory expenditures, and category-wise audit statements.',
      badge: 'Finance',
    },
    {
      category: 'ACADEMIC',
      icon: Calendar,
      title: 'Multi-Year Academic Switcher',
      description: 'Seamlessly toggle between active and historical academic years (2024-25, 2025-26, 2026-27) with read-only locks.',
      badge: 'Data Integrity',
    },
    {
      category: 'HOSTEL',
      icon: Building2,
      title: 'Hostel & Facility Billing',
      description: 'Manage room allocations, monthly mess fees, transport passes, and combined student billing invoices.',
      badge: 'Facilities',
    },
  ];

  const filteredModules =
    activeModuleCategory === 'ALL'
      ? modulesList
      : modulesList.filter((m) => m.category === activeModuleCategory);

  // Filtered Plans by Billing Filter
  const filteredPlans = plans.filter((p) => {
    if (billingFilter === 'ALL') return true;
    if (billingFilter === 'TRIAL') return p.isTrial;
    if (billingFilter === 'MONTHLY') return p.type === 'MONTHLY' || p.isTrial;
    if (billingFilter === 'QUARTERLY') return p.type === 'QUARTERLY';
    if (billingFilter === 'YEARLY') return p.type === 'YEARLY';
    return true;
  });

  // FAQs List
  const faqs = [
    {
      q: 'How does the 1-Month Free Trial work?',
      a: 'When you register your school, you automatically receive 30 days of complete platform access. All features (Student Records, Fees, Payroll, Expenses, PDF Exports) are fully active with zero restrictions and no credit card required.',
    },
    {
      q: 'Can we switch between different subscription plans later?',
      a: 'Yes! School Administrators can purchase or upgrade subscription plans (Monthly, Quarterly, or Yearly) at any time directly from the Subscription page in the admin panel.',
    },
    {
      q: 'How does Multi-Academic Year locking protect our records?',
      a: 'AxomSetu allows you to switch between active and historical sessions. When an academic session ends, it is automatically marked locked/read-only, ensuring historical student fee records and ledgers remain immutable.',
    },
    {
      q: 'What payment methods are supported for plan renewals?',
      a: 'We support instant UPI payments (Google Pay, PhonePe, Paytm, BHIM) and Cash payment requests verified directly by Super Admin. Razorpay integration is also launching soon.',
    },
    {
      q: 'Is our institution data isolated from other schools?',
      a: 'Absolutely. AxomSetu uses rigorous database-level multi-tenant isolation with unique school identifiers. Your school data is completely private, encrypted, and isolated.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white relative overflow-x-hidden">
      {/* Dynamic Background Glow Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-indigo-600/20 via-purple-600/10 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-96 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[1200px] right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Glassmorphism Navigation Bar */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold tracking-tight text-white">{BRAND_CONFIG.productName}</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-widest">
                  ERP Platform
                </span>
              </div>
              <span className="block text-[10px] uppercase font-bold tracking-widest text-slate-400">
                {BRAND_CONFIG.productTagline}
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300">
            <a href="#overview" className="hover:text-indigo-400 transition-colors">
              Overview
            </a>
            <a href="#clients" className="hover:text-indigo-400 transition-colors">
              Our Clients
            </a>
            <a href="#modules" className="hover:text-indigo-400 transition-colors">
              Modules
            </a>
            <a href="#academic-history" className="hover:text-indigo-400 transition-colors">
              Academic History
            </a>
            <a href="#plans" className="hover:text-indigo-400 transition-colors flex items-center gap-1">
              <span>Plans & Pricing</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </a>
            <a href="#faq" className="hover:text-indigo-400 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-800">
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button
                variant="primary"
                size="sm"
                className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold shadow-lg shadow-indigo-600/30 border border-indigo-400/30"
                icon={ArrowRight}
                iconPosition="right"
              >
                Start Free Trial
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2.5 rounded-xl text-slate-300 hover:bg-slate-800 border border-slate-700/60 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <Drawer isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} title={`${BRAND_CONFIG.productName} Navigation`} position="right">
        <div className="flex flex-col gap-6 pt-2">
          <nav className="flex flex-col gap-3 text-sm font-medium text-slate-200">
            <a
              href="#overview"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-4 py-2.5 rounded-xl hover:bg-slate-800/80 transition-colors"
            >
              Overview
            </a>
            <a
              href="#modules"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-4 py-2.5 rounded-xl hover:bg-slate-800/80 transition-colors"
            >
              Modules & Capabilities
            </a>
            <a
              href="#academic-history"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-4 py-2.5 rounded-xl hover:bg-slate-800/80 transition-colors"
            >
              Academic Session Switcher
            </a>
            <a
              href="#plans"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-4 py-2.5 rounded-xl hover:bg-slate-800/80 transition-colors flex items-center justify-between"
            >
              <span>Subscription Plans</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                1 Month Free
              </span>
            </a>
            <a
              href="#faq"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-4 py-2.5 rounded-xl hover:bg-slate-800/80 transition-colors"
            >
              Frequently Asked Questions
            </a>
          </nav>

          <div className="pt-6 border-t border-slate-800 flex flex-col gap-3">
            <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
              <Button variant="outline" className="w-full justify-center border-slate-700 text-slate-200">
                Sign In to Account
              </Button>
            </Link>
            <Link to="/register" onClick={() => setIsMobileMenuOpen(false)}>
              <Button variant="primary" className="w-full justify-center bg-indigo-600 font-bold">
                Start 1-Month Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </Drawer>

      <main className="relative">
        {/* HERO SECTION */}
        <section id="overview" className="pt-16 pb-20 lg:pt-24 lg:pb-32 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-4xl mx-auto">
              {/* Marketing Badge */}
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-800/90 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-8 shadow-xl backdrop-blur-md hover:border-indigo-400 transition-colors">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Next-Gen Enterprise Multi-Tenant School ERP</span>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span className="text-emerald-400 font-bold">1 Month Free Trial</span>
              </div>

              {/* Dynamic Headline */}
              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
                Complete School Operations, <br className="hidden sm:block" />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">
                  Fees & Payroll Managed Seamlessly
                </span>
              </h1>

              {/* Subtitle */}
              <p className="mt-6 text-base sm:text-lg text-slate-300 leading-relaxed max-w-3xl mx-auto font-normal">
                Empower your educational institution with an all-in-one administrative platform. Manage student admissions, multi-class fee receipting, staff salary advance ledgers, and locked academic session histories with zero data friction.
              </p>

              {/* Action Buttons */}
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/register" className="w-full sm:w-auto">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full sm:w-auto py-3.5 px-8 text-base bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 font-bold shadow-xl shadow-indigo-600/30 border border-indigo-400/30"
                    icon={ArrowRight}
                    iconPosition="right"
                  >
                    Start 1-Month Free Trial
                  </Button>
                </Link>
                <a href="#plans" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto py-3.5 px-8 text-base border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white"
                  >
                    View Dynamic Plans & Pricing
                  </Button>
                </a>
              </div>

              {/* Trust Badges */}
              <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-xs text-slate-400 font-medium border-t border-b border-slate-800/80 py-4">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 30-Day Full Access Trial
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> No Credit Card Required
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Instant Tenant Activation
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Locked Academic Integrity
                </span>
              </div>
            </div>

            {/* Interactive Live Preview Mockup Container */}
            <div className="mt-16 max-w-5xl mx-auto rounded-3xl border border-slate-700/80 shadow-2xl bg-slate-950/90 overflow-hidden backdrop-blur-2xl">
              {/* Mock Browser Header */}
              <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="text-xs text-slate-400 font-mono ml-2">https://app.axomsetu.com/admin/dashboard</span>
                </div>

                {/* Tab Switcher */}
                <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700/60 text-xs">
                  <button
                    onClick={() => setActivePreviewTab('OVERVIEW')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                      activePreviewTab === 'OVERVIEW' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Dashboard Overview
                  </button>
                  <button
                    onClick={() => setActivePreviewTab('FEES')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                      activePreviewTab === 'FEES' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Fee Collection Engine
                  </button>
                  <button
                    onClick={() => setActivePreviewTab('PAYROLL')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                      activePreviewTab === 'PAYROLL' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Payroll & Advances
                  </button>
                </div>
              </div>

              {/* Tab Content Display */}
              <div className="p-6 sm:p-8 text-left bg-slate-950 min-h-[320px]">
                {activePreviewTab === 'OVERVIEW' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                      <div>
                        <h3 className="text-lg font-bold text-white">Saint Francis High School - Admin Portal</h3>
                        <span className="text-xs text-slate-400">Academic Session: 2026–2027 (Active)</span>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        1-Month Free Trial Active
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800">
                        <span className="text-xs text-slate-400 font-medium block mb-1">Total Enrolled Students</span>
                        <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">1,240</div>
                        <span className="text-[11px] text-emerald-400 mt-2 inline-flex items-center gap-1 font-semibold">
                          <TrendingUp className="w-3.5 h-3.5" /> +12% vs last academic year
                        </span>
                      </div>

                      <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800">
                        <span className="text-xs text-slate-400 font-medium block mb-1">Monthly Fee Collection</span>
                        <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">₹14,85,000</div>
                        <span className="text-[11px] text-slate-400 mt-2 block">100% Digital Receipts Issued</span>
                      </div>

                      <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800">
                        <span className="text-xs text-slate-400 font-medium block mb-1">Staff Payroll Disbursements</span>
                        <div className="text-2xl sm:text-3xl font-extrabold text-indigo-400 font-mono">₹4,20,000</div>
                        <span className="text-[11px] text-slate-400 mt-2 block">32 Teachers & Staff</span>
                      </div>
                    </div>
                  </div>
                )}

                {activePreviewTab === 'FEES' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <h4 className="text-sm font-bold text-white">Recent Digital Fee Receipts</h4>
                      <span className="text-xs text-indigo-400 font-mono">Instant PDF Generator</span>
                    </div>

                    <div className="space-y-2">
                      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-white">RCT-2026-0842</span>
                          <span className="text-slate-400 block text-[11px]">Aarav Sharma • Class X-A</span>
                        </div>
                        <span className="font-mono font-bold text-emerald-400">₹12,500</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                          PAID (UPI)
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-white">RCT-2026-0841</span>
                          <span className="text-slate-400 block text-[11px]">Ananya Patel • Class XII-Science</span>
                        </div>
                        <span className="font-mono font-bold text-emerald-400">₹18,000</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                          PAID (CASH)
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {activePreviewTab === 'PAYROLL' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <h4 className="text-sm font-bold text-white">Staff Monthly Payroll Summary</h4>
                      <span className="text-xs text-indigo-400 font-mono">Automated Ledger</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-slate-400 block">Gross Staff Salaries</span>
                        <span className="text-xl font-bold text-white font-mono mt-1 block">₹4,50,000</span>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-slate-400 block">Salary Advances Deducted</span>
                        <span className="text-xl font-bold text-amber-400 font-mono mt-1 block">₹30,000</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* DYNAMIC CLIENTS & REGISTERED INSTITUTIONS SECTION */}
        <section id="clients" className="py-16 bg-slate-950/90 border-y border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold mb-3">
                <Building2 className="w-3.5 h-3.5" />
                <span>Our Registered Partner Institutions</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Trusted by Institutions Across the Nation
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-400">
                Schools and academies relying on AxomSetu for student records, automated fee receipts, and payroll administration.
              </p>
            </div>

            {loadingSchools ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 animate-pulse h-24 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-slate-800 rounded w-3/4" />
                      <div className="h-3 bg-slate-800/60 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : registeredSchools.length === 0 ? (
              <div className="text-center py-8 bg-slate-900/40 rounded-2xl border border-slate-800/60 max-w-md mx-auto">
                <Building2 className="w-8 h-8 text-indigo-400 mx-auto mb-2 opacity-70" />
                <p className="text-xs text-slate-300 font-semibold">Join as Our First Partner Institution</p>
                <span className="text-[11px] text-slate-500 block mt-1">Register your school today with a 1-Month Free Trial.</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 max-w-7xl mx-auto">
                {registeredSchools.map((school) => {
                  return (
                    <div
                      key={school.id}
                      className="bg-slate-900/80 hover:bg-slate-900 rounded-2xl p-4 border border-slate-800 hover:border-indigo-500/50 transition-all duration-300 flex flex-col items-center justify-center text-center shadow-md group"
                    >
                      {/* Logo at Top */}
                      {school.logoUrl ? (
                        <img
                          src={school.logoUrl}
                          alt={school.name}
                          className="w-14 h-14 rounded-2xl object-cover border border-slate-700/80 mb-3 group-hover:scale-105 transition-transform shadow-md"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-extrabold text-xl shadow-md mb-3 border border-indigo-400/30 group-hover:scale-105 transition-transform">
                          {school.name ? school.name.charAt(0).toUpperCase() : 'S'}
                        </div>
                      )}

                      {/* Name at Below */}
                      <h4
                        className="text-xs font-bold text-white leading-snug group-hover:text-indigo-300 transition-colors max-w-full truncate px-1"
                        title={school.name}
                      >
                        {school.name}
                      </h4>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* DYNAMIC PLANS & PRICING MARKETING SECTION */}
        <section id="plans" className="py-24 bg-slate-900 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-4">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>Transparent Institutional Pricing</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
                Flexible Plans for Institutions of All Sizes
              </h2>
              <p className="mt-4 text-sm sm:text-base text-slate-400 leading-relaxed">
                Start with a 1-month free trial. Upgrade anytime to a flexible monthly or discounted annual plan. No hidden charges or setup fees.
              </p>

              {/* Billing Cycle Filter Selector */}
              <div className="mt-8 inline-flex items-center bg-slate-800 p-1.5 rounded-2xl border border-slate-700/80 shadow-lg">
                <button
                  onClick={() => setBillingFilter('ALL')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    billingFilter === 'ALL'
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All Plans
                </button>
                <button
                  onClick={() => setBillingFilter('MONTHLY')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    billingFilter === 'MONTHLY'
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Monthly Billing
                </button>
                <button
                  onClick={() => setBillingFilter('QUARTERLY')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    billingFilter === 'QUARTERLY'
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Quarterly (Save 10%)
                </button>
                <button
                  onClick={() => setBillingFilter('YEARLY')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    billingFilter === 'YEARLY'
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Yearly (Save 15%)</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-400 text-slate-950 uppercase">
                    Best Value
                  </span>
                </button>
              </div>
            </div>

            {/* Dynamic Plans Grid */}
            {loadingPlans ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="bg-slate-800/50 rounded-3xl p-8 border border-slate-700/60 animate-pulse min-h-[400px]">
                    <div className="h-6 bg-slate-700 rounded w-1/3 mb-4" />
                    <div className="h-10 bg-slate-700 rounded w-1/2 mb-6" />
                    <div className="space-y-3">
                      <div className="h-4 bg-slate-700/60 rounded w-full" />
                      <div className="h-4 bg-slate-700/60 rounded w-4/5" />
                      <div className="h-4 bg-slate-700/60 rounded w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : plansError ? (
              <div className="text-center py-12 bg-slate-800/40 rounded-3xl border border-slate-700/60 max-w-md mx-auto">
                <HelpCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                <p className="text-sm text-slate-300 font-semibold">{plansError}</p>
                <Link to="/register" className="mt-4 inline-block">
                  <Button variant="primary" size="sm">
                    Start 1-Month Free Trial Now
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
                {filteredPlans.map((plan) => {
                  const isPopular = plan.badge === 'POPULAR';
                  const isBestValue = plan.badge === 'BEST VALUE';
                  const isTrial = plan.isTrial;
                  const hasDiscount = plan.discountPercentage > 0 || plan.discountAmount > 0;

                  return (
                    <div
                      key={plan.id}
                      className={`rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between relative group ${
                        isBestValue
                          ? 'bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 border-2 border-indigo-500 shadow-2xl shadow-indigo-500/20 scale-[1.02]'
                          : isPopular
                          ? 'bg-gradient-to-b from-slate-850 via-slate-900 to-slate-950 border-2 border-purple-500/80 shadow-xl'
                          : 'bg-slate-950/80 border border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Plan Badge Header Ribbon */}
                      {plan.badge && (
                        <div
                          className={`absolute -top-3.5 right-6 text-slate-950 text-[10px] font-extrabold uppercase px-3 py-1 rounded-full shadow-lg tracking-wider ${
                            isBestValue
                              ? 'bg-gradient-to-r from-emerald-400 to-teal-300'
                              : isPopular
                              ? 'bg-gradient-to-r from-purple-400 to-pink-300'
                              : 'bg-indigo-400'
                          }`}
                        >
                          {plan.badge}
                        </div>
                      )}

                      <div>
                        {/* Title & Description */}
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-extrabold text-white tracking-tight">{plan.name}</h3>
                          {isTrial && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                              Trial
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 min-h-[36px] leading-relaxed">{plan.description}</p>

                        {/* Pricing Box */}
                        <div className="my-6 p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl sm:text-4xl font-extrabold text-white font-mono tracking-tight">
                              {isTrial ? 'Free' : formatCurrency(plan.finalPrice)}
                            </span>
                            {!isTrial && (
                              <span className="text-xs text-slate-400 font-medium">
                                / {plan.durationValue} {plan.durationUnit.toLowerCase()}
                                {plan.durationValue > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>

                          {/* Discount tag if present */}
                          {hasDiscount && (
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-slate-500 line-through font-mono">
                                {formatCurrency(plan.basePrice)}
                              </span>
                              <span className="text-[10px] font-extrabold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded">
                                {plan.discountPercentage > 0
                                  ? `${plan.discountPercentage}% OFF`
                                  : `Save ${formatCurrency(plan.discountAmount)}`}
                              </span>
                            </div>
                          )}

                          {/* Effective monthly price calculation for multi-month plans */}
                          {plan.durationValue > 1 && !isTrial && (
                            <div className="mt-2 text-[11px] font-mono text-indigo-300">
                              Effective: {formatCurrency(Math.round(plan.finalPrice / plan.durationValue))}/mo
                            </div>
                          )}

                          {/* Special Offer Banner */}
                          {plan.offerTitle && (
                            <div className="mt-3 text-xs font-bold text-indigo-300 bg-indigo-950/80 border border-indigo-700/60 p-2.5 rounded-xl flex items-center gap-2">
                              <Zap className="w-4 h-4 text-indigo-400 shrink-0" />
                              <span>{plan.offerTitle}</span>
                            </div>
                          )}
                        </div>

                        {/* Features List */}
                        <div className="space-y-2.5 mb-8">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-3">
                            Included Capabilities
                          </span>
                          {Array.isArray(plan.features) &&
                            plan.features.map((feat, idx) => (
                              <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-300">
                                <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </div>
                                <span>{typeof feat === 'string' ? feat : feat.name}</span>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Action CTA Button */}
                      <Link to={`/register?plan=${plan.code}`}>
                        <Button
                          variant="primary"
                          className={`w-full justify-center py-3 font-bold shadow-lg transition-all ${
                            isBestValue
                              ? 'bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white shadow-indigo-500/30'
                              : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                          }`}
                          icon={ArrowRight}
                          iconPosition="right"
                        >
                          {isTrial ? 'Start 1-Month Free Trial' : 'Select Plan'}
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* INTERACTIVE MODULES & FEATURES GRID */}
        <section id="modules" className="py-24 bg-slate-950 border-t border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
                Engineered for Modern Educational Administration
              </h2>
              <p className="mt-3 text-sm text-slate-400">
                Eliminate physical registers, billing discrepancies, and historical ledger confusion with specialized modular tools.
              </p>

              {/* Module Filter Tabs */}
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {[
                  { id: 'ALL', label: 'All Modules' },
                  { id: 'STUDENTS', label: 'Student Management' },
                  { id: 'FEES', label: 'Fees & Receipts' },
                  { id: 'PAYROLL', label: 'Staff Payroll' },
                  { id: 'FINANCE', label: 'School Expenses' },
                  { id: 'ACADEMIC', label: 'Academic Sessions' },
                  { id: 'HOSTEL', label: 'Hostel & Facilities' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveModuleCategory(tab.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      activeModuleCategory === tab.id
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredModules.map((item, idx) => {
                const IconComp = item.icon;
                return (
                  <div
                    key={idx}
                    className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800/90 hover:border-indigo-500/50 hover:bg-slate-900 transition-all duration-300 group shadow-lg"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <IconComp className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-800 px-2.5 py-1 rounded-md">
                        {item.badge}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* MULTI-ACADEMIC YEAR SPOTLIGHT */}
        <section id="academic-history" className="py-24 bg-slate-900 border-t border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold mb-4 border border-indigo-500/20">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  <span>Historical Data Protection</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
                  Seamless Multi-Year Management Without Historical Data Corruption
                </h2>
                <p className="mt-4 text-sm text-slate-300 leading-relaxed">
                  Schools require immutable historical financial registers and student enrollment snapshots. AxomSetu allows school administrators to switch between academic sessions on demand while locking past records.
                </p>

                <div className="mt-8 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 mt-1">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Immutable Locked Sessions</h4>
                      <p className="text-xs text-slate-400">Past session fee ledgers and student grades remain locked against accidental edits once a session closes.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20 mt-1">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">One-Click Session Header Switcher</h4>
                      <p className="text-xs text-slate-400">Instantly inspect past year student records or fee registers right from the top navigation bar without altering active operations.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual Registry Card */}
              <div className="bg-slate-950 rounded-3xl p-6 text-white border border-slate-800 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Academic Session Registry</span>
                  <span className="text-[10px] text-indigo-400 font-mono">Tenant-Scoped Isolation</span>
                </div>

                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-indigo-950/80 border border-indigo-700/60 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-extrabold text-white">2026–2027</span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500 text-slate-950">
                          ACTIVE SESSION
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">01 Apr 2026 – 31 Mar 2027</span>
                    </div>
                    <span className="text-xs text-emerald-400 font-bold font-mono">Operations Live</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between opacity-85">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-slate-300">2025–2026</span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                          LOCKED
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">01 Apr 2025 – 31 Mar 2026</span>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">Read Only Ledger</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FREQUENTLY ASKED QUESTIONS (FAQ) ACCORDION */}
        <section id="faq" className="py-24 bg-slate-900 border-t border-slate-800/80">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl font-extrabold text-white">Frequently Asked Questions</h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-400">
                Everything you need to know about starting your 1-month free trial and managing plans.
              </p>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="bg-slate-950/90 rounded-2xl border border-slate-800 overflow-hidden transition-all"
                  >
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? -1 : idx)}
                      className="w-full p-5 text-left flex items-center justify-between text-slate-200 font-bold text-sm sm:text-base hover:text-white"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        className={`w-5 h-5 text-indigo-400 transition-transform duration-200 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* BOTTOM HIGH-CONVERTING CTA BANNER */}
        <section className="py-20 bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 border-t border-indigo-800/60 relative overflow-hidden">
          <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Ready to Upgrade Your Institution's ERP?
            </h2>
            <p className="mt-4 text-sm sm:text-base text-indigo-200 max-w-2xl mx-auto leading-relaxed">
              Register your school in less than 2 minutes. Gain immediate access with a 1-month free trial, full module access, and zero commitment.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/register">
                <Button
                  variant="primary"
                  size="lg"
                  className="bg-white text-indigo-950 hover:bg-slate-100 font-extrabold px-8 py-3.5 text-base shadow-2xl"
                  icon={ArrowRight}
                  iconPosition="right"
                >
                  Start 1-Month Free Trial Now
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-slate-400 text-xs py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-white text-sm">{BRAND_CONFIG.productName}</span>
              <span className="block text-[10px] text-slate-400 font-mono">&copy; {BRAND_CONFIG.copyrightYear} AxomSetu &bull; {BRAND_CONFIG.poweredBy}</span>
            </div>
          </div>

          <div className="flex items-center gap-6 text-slate-400 font-medium">
            <a href="#overview" className="hover:text-white transition-colors">
              Overview
            </a>
            <a href="#modules" className="hover:text-white transition-colors">
              Modules
            </a>
            <a href="#plans" className="hover:text-white transition-colors">
              Pricing Plans
            </a>
            <Link to="/login" className="hover:text-white transition-colors">
              School Sign In
            </Link>
            <Link to="/register" className="hover:text-white transition-colors">
              School Registration
            </Link>
          </div>

          {/* System Status Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Operational SLA: 99.99%</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
