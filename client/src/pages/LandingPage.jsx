import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  GraduationCap,
  Users,
  CreditCard,
  Building2,
  Calendar,
  Menu,
  Receipt,
  FileSpreadsheet,
  ChevronDown,
  Check,
  Sliders,
  UserCheck,
  Phone,
} from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Drawer } from '../components/ui/Drawer.jsx';
import { subscriptionService } from '../services/subscriptionService.js';
import { platformService } from '../services/platformService.js';
import { BRAND_CONFIG } from '../config/brandConfig.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { TermsAndConditionsModal } from '../components/legal/TermsAndConditionsModal.jsx';
import { PrivacyPolicyModal } from '../components/legal/PrivacyPolicyModal.jsx';

export const LandingPage = () => {
  useDocumentTitle();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [plansError, setPlansError] = useState(null);

  // Dynamic UI States
  const [billingFilter, setBillingFilter] = useState('ALL'); // ALL, MONTHLY, QUARTERLY, YEARLY
  const [activePreviewTab, setActivePreviewTab] = useState('DASHBOARD'); // DASHBOARD, FEES, PAYROLL
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  // Legal Modal states
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  // Auto-close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    document.body.style.overflow = '';
  }, [location.pathname]);

  // Fetch Public Plans from API on mount
  useEffect(() => {
    const fetchLandingData = async () => {
      setLoadingPlans(true);
      setPlansError(null);
      try {
        const plansRes = await subscriptionService.getPublicLandingPlans();
        if (plansRes && plansRes.success && Array.isArray(plansRes.data)) {
          setPlans(plansRes.data);
        } else if (Array.isArray(plansRes)) {
          setPlans(plansRes);
        } else {
          setPlans([]);
        }
      } catch (err) {
        console.error('Failed to fetch public landing plans:', err);
        setPlansError('Unable to load pricing plans right now.');
      } finally {
        setLoadingPlans(false);
      }
    };

    fetchLandingData();
  }, []);

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

  // Core 8 Features list
  const coreFeatures = [
    {
      icon: Users,
      title: 'Student Management',
      description: 'Manage student profiles, admissions, academic records, and parent contact details.',
    },
    {
      icon: Receipt,
      title: 'Fee Management',
      description: 'Define fee structures, issue instant digital receipts, track collections, and view ledgers.',
    },
    {
      icon: CreditCard,
      title: 'Staff & Payroll',
      description: 'Manage staff salaries, advance requests, monthly payroll disbursements, and payslips.',
    },
    {
      icon: Calendar,
      title: 'Academic Management',
      description: 'Configure academic years, classes, sections, mediums, streams, and session locking.',
    },
    {
      icon: FileSpreadsheet,
      title: 'Reports',
      description: 'Access complete financial, collection, fee status, and administrative PDF & Excel reports.',
    },
    {
      icon: Building2,
      title: 'Hostel Management',
      description: 'Manage hostel room allocations, mess fees, resident admissions, and facility billing.',
    },
    {
      icon: Sliders,
      title: 'Expenses',
      description: 'Track daily maintenance costs, utility bills, vendor payments, and expense ledgers.',
    },
    {
      icon: UserCheck,
      title: 'User Permissions',
      description: 'Assign role-based access control for administrative staff and institutional users.',
    },
  ];

  // System Modules list
  const systemModules = [
    {
      icon: Users,
      name: 'Students',
      description: 'Manage student profiles, academic information and records.',
    },
    {
      icon: Receipt,
      name: 'Fee Management',
      description: 'Manage fee structures, collections, discounts and receipts.',
    },
    {
      icon: CreditCard,
      name: 'Staff & Payroll',
      description: 'Manage staff salary, advances, payroll and disbursement.',
    },
    {
      icon: FileSpreadsheet,
      name: 'Reports',
      description: 'Access financial, academic and operational reports.',
    },
    {
      icon: Building2,
      name: 'Hostel Management',
      description: 'Manage hostel enrollment, rooms, beds and hostel fees.',
    },
    {
      icon: Sliders,
      name: 'Expenses & Finance',
      description: 'Track school operational expenses, funds and account ledgers.',
    },
  ];

  // Numbered How It Works Steps
  const howItWorksSteps = [
    {
      step: '01',
      title: 'Set Up',
      description: 'Configure your school profile, classes, and academic session information.',
    },
    {
      step: '02',
      title: 'Manage',
      description: 'Manage students, fee structures, staff profiles, and daily school operations.',
    },
    {
      step: '03',
      title: 'Track',
      description: 'Monitor fee collections, salary payments, expenses, and operational reports.',
    },
  ];

  // Filtered Plans by Billing Filter
  const filteredPlans = plans.filter((p) => {
    if (billingFilter === 'ALL') return true;
    if (billingFilter === 'MONTHLY') return p.type === 'MONTHLY' || p.isTrial;
    if (billingFilter === 'QUARTERLY') return p.type === 'QUARTERLY';
    if (billingFilter === 'YEARLY') return p.type === 'YEARLY';
    return true;
  });

  // FAQs List
  const faqs = [
    {
      q: 'What is AxomSetu?',
      a: 'AxomSetu is a comprehensive school management SaaS platform that allows school administrators to handle student admissions, fee collection, staff payroll, expenses, hostel management, and administrative reporting from one unified system.',
    },
    {
      q: 'How does the trial work?',
      a: 'When you register your school, you automatically receive a 30-day free trial with full access to all platform features. No credit card is required to get started.',
    },
    {
      q: 'What modules are available?',
      a: 'AxomSetu includes Student Management, Fee Management, Staff & Payroll, Academic Setup, Expense Tracking, Hostel Management, User & Permission Controls, and PDF/Excel Reports.',
    },
    {
      q: 'Can multiple users use AxomSetu?',
      a: 'Yes. School administrators can create multiple user accounts for office staff, accountants, and teachers with specific access permissions.',
    },
    {
      q: 'Can I control user permissions?',
      a: 'Yes. AxomSetu provides granular role-based permission management, allowing administrators to restrict access to specific modules such as fee collection, payroll, or system settings.',
    },
    {
      q: 'What happens after subscription expiry?',
      a: 'Your school data remains securely stored. To continue creating new fee receipts, disbursing salary, or modifying records, simply renew your subscription from the Subscription page.',
    },
    {
      q: 'Can I export school data?',
      a: 'Yes. All fee collection receipts, ledger summaries, student lists, and financial reports can be exported directly to standard PDF or Excel formats.',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-indigo-600 selection:text-white">
      {/* 1. LANDING PAGE HEADER */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Branding */}
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

          {/* Center Navigation */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-600">
            <a href="#features" className="hover:text-indigo-600 transition-colors">
              Features
            </a>
            <a href="#modules" className="hover:text-indigo-600 transition-colors">
              Modules
            </a>
            <a href="#how-it-works" className="hover:text-indigo-600 transition-colors">
              How It Works
            </a>
            <a href="#pricing" className="hover:text-indigo-600 transition-colors">
              Pricing
            </a>
            <a href="#faq" className="hover:text-indigo-600 transition-colors">
              FAQ
            </a>
            <Link to="/contact" className="hover:text-indigo-600 transition-colors font-semibold">
              Contact Us
            </Link>
          </nav>

          {/* Right: Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-semibold">
                Login
              </Button>
            </Link>
            <Link to="/register">
              <Button variant="primary" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs">
                Start Free Trial
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Trigger */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      <Drawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        title={BRAND_CONFIG.productName}
        position="right"
      >
        <div className="flex flex-col gap-5 pt-2">
          <div className="text-xs text-slate-400 font-medium px-2">{BRAND_CONFIG.poweredBy}</div>
          <nav className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
            <a
              href="#features"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Features
            </a>
            <a
              href="#modules"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Modules
            </a>
            <a
              href="#how-it-works"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              How It Works
            </a>
            <a
              href="#pricing"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Pricing
            </a>
            <a
              href="#faq"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              FAQ
            </a>
            <Link
              to="/contact"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors flex items-center justify-between font-semibold text-indigo-600"
            >
              <span>Contact Us</span>
            </Link>
          </nav>

          <div className="pt-4 border-t border-slate-200 flex flex-col gap-2.5">
            <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
              <Button variant="outline" className="w-full justify-center border-slate-300 text-slate-800">
                Login
              </Button>
            </Link>
            <Link to="/register" onClick={() => setIsMobileMenuOpen(false)}>
              <Button variant="primary" className="w-full justify-center bg-indigo-600 text-white font-semibold">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </Drawer>

      <main>
        {/* 2. HERO SECTION */}
        <section className="py-16 sm:py-20 lg:py-24 bg-white border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <span className="inline-block text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full mb-4">
                SCHOOL MANAGEMENT PLATFORM
              </span>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
                Simple School Management. <br />
                <span className="text-indigo-600">Everything in One Place.</span>
              </h1>

              <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
                Manage students, academics, fees, staff, payroll, reports and other school operations from one platform.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to="/register" className="w-full sm:w-auto">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full sm:w-auto py-2.5 px-6 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm"
                  >
                    Start Free Trial
                  </Button>
                </Link>
                <Link to="/login" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto py-2.5 px-6 text-sm font-semibold border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    Login
                  </Button>
                </Link>
              </div>
            </div>

            {/* 3. HERO PRODUCT VISUAL - Realistic Software UI Mockup */}
            <div className="mt-12 max-w-5xl mx-auto rounded-xl border border-slate-200 shadow-sm bg-white overflow-hidden">
              {/* Window Header */}
              <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="text-xs text-slate-500 font-mono ml-2">AxomSetu School Admin Portal</span>
                </div>

                {/* Mockup Tabs */}
                <div className="flex items-center bg-white rounded-lg p-1 border border-slate-200 text-xs">
                  <button
                    onClick={() => setActivePreviewTab('DASHBOARD')}
                    className={`px-3 py-1 rounded-md font-semibold transition-colors ${activePreviewTab === 'DASHBOARD'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    Dashboard Preview
                  </button>
                  <button
                    onClick={() => setActivePreviewTab('FEES')}
                    className={`px-3 py-1 rounded-md font-semibold transition-colors ${activePreviewTab === 'FEES'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    Fee Management
                  </button>
                  <button
                    onClick={() => setActivePreviewTab('PAYROLL')}
                    className={`px-3 py-1 rounded-md font-semibold transition-colors ${activePreviewTab === 'PAYROLL'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    Staff & Payroll
                  </button>
                </div>
              </div>

              {/* Window Body Display */}
              <div className="p-5 sm:p-8 bg-slate-50 text-left min-h-[300px]">
                {activePreviewTab === 'DASHBOARD' && (
                  <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                      <div>
                        <h2 className="text-base font-bold text-slate-900">Saint Francis High School</h2>
                        <span className="text-xs text-slate-500">Academic Year: 2026–2027</span>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
                        Trial Active
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                        <span className="text-xs font-medium text-slate-500">Total Enrolled Students</span>
                        <div className="text-2xl font-bold text-slate-900 mt-1">1,240</div>
                        <span className="text-[11px] text-slate-500 mt-1 block">Active academic session</span>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                        <span className="text-xs font-medium text-slate-500">Monthly Fee Collection</span>
                        <div className="text-2xl font-bold text-indigo-600 mt-1">₹14,85,000</div>
                        <span className="text-[11px] text-slate-500 mt-1 block">100% digital receipts issued</span>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                        <span className="text-xs font-medium text-slate-500">Staff Salary Disbursements</span>
                        <div className="text-2xl font-bold text-slate-900 mt-1">₹4,20,000</div>
                        <span className="text-[11px] text-slate-500 mt-1 block">Teaching & support staff</span>
                      </div>
                    </div>
                  </div>
                )}

                {activePreviewTab === 'FEES' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <h3 className="text-sm font-bold text-slate-900">Fee Collection Register & Digital Receipts</h3>
                      <span className="text-xs text-indigo-600 font-semibold">Instant Receipt Generator</span>
                    </div>

                    <div className="space-y-2.5">
                      <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-900">Receipt #RCT-2026-0842</span>
                          <span className="text-slate-500 block text-[11px]">Aarav Sharma • Class X-A</span>
                        </div>
                        <span className="font-bold text-slate-900">₹12,500</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                          PAID
                        </span>
                      </div>

                      <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-900">Receipt #RCT-2026-0841</span>
                          <span className="text-slate-500 block text-[11px]">Ananya Patel • Class XII-Science</span>
                        </div>
                        <span className="font-bold text-slate-900">₹18,000</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                          PAID
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {activePreviewTab === 'PAYROLL' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <h3 className="text-sm font-bold text-slate-900">Staff Monthly Payroll Ledger</h3>
                      <span className="text-xs text-indigo-600 font-semibold">Automated Deductions</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-4 bg-white rounded-lg border border-slate-200">
                        <span className="text-slate-500 block">Gross Monthly Staff Salary</span>
                        <span className="text-xl font-bold text-slate-900 mt-1 block">₹4,50,000</span>
                      </div>

                      <div className="p-4 bg-white rounded-lg border border-slate-200">
                        <span className="text-slate-500 block">Salary Advances Deducted</span>
                        <span className="text-xl font-bold text-indigo-600 mt-1 block">₹30,000</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 4. CORE FEATURES SECTION */}
        <section id="features" className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Everything Your School Needs
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Manage the essential operations of your school from one platform.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {coreFeatures.map((item, idx) => {
                const IconComp = item.icon;
                return (
                  <div
                    key={idx}
                    className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 mb-3">
                      <IconComp className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-1.5">{item.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 5. MODULES SECTION */}
        <section id="modules" className="py-16 sm:py-20 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Core System Modules
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Integrated modules to handle daily educational and financial operations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {systemModules.map((mod, idx) => {
                const IconComp = mod.icon;
                return (
                  <div
                    key={idx}
                    className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs hover:border-indigo-200 transition-colors flex items-start gap-4"
                  >
                    <div className="w-11 h-11 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 mb-1">{mod.name}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">{mod.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 6. HOW IT WORKS */}
        <section id="how-it-works" className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                How It Works
              </h2>
              <p className="mt-2 text-sm text-slate-600">Get your institution running in three simple steps.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {howItWorksSteps.map((step, idx) => (
                <div key={idx} className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs text-center">
                  <div className="w-12 h-12 rounded-full bg-indigo-600 text-white font-extrabold text-base flex items-center justify-center mx-auto mb-4">
                    {step.step}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 7. PRICING SECTION */}
        <section id="pricing" className="py-16 sm:py-20 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Subscription Plans
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Transparent plans configured for your school. Start with a free trial and upgrade anytime.
              </p>

              {/* Billing Cycle Filter Buttons */}
              <div className="mt-6 inline-flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  onClick={() => setBillingFilter('ALL')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${billingFilter === 'ALL' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  All Plans
                </button>
                <button
                  onClick={() => setBillingFilter('MONTHLY')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${billingFilter === 'MONTHLY' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingFilter('QUARTERLY')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${billingFilter === 'QUARTERLY' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  Quarterly
                </button>
                <button
                  onClick={() => setBillingFilter('YEARLY')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${billingFilter === 'YEARLY' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  Yearly
                </button>
              </div>
            </div>

            {/* Dynamic Plans Display */}
            {loadingPlans ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="bg-slate-50 rounded-xl p-6 border border-slate-200 animate-pulse h-80" />
                ))}
              </div>
            ) : plansError ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200 max-w-md mx-auto">
                <p className="text-xs text-slate-600 mb-3">{plansError}</p>
                <Link to="/register">
                  <Button variant="primary" size="sm" className="bg-indigo-600 text-white">
                    Start Free Trial
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
                {filteredPlans.map((plan) => {
                  const isTrial = plan.isTrial;
                  const hasDiscount = plan.discountPercentage > 0 || plan.discountAmount > 0;

                  return (
                    <div
                      key={plan.id}
                      className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-colors"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                          {isTrial && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Trial
                            </span>
                          )}
                          {plan.badge && !isTrial && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
                              {plan.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mb-4 min-h-[32px]">{plan.description}</p>

                        <div className="py-3 border-y border-slate-100 my-4">
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-slate-900">
                              {isTrial ? 'Free' : formatCurrency(plan.finalPrice)}
                            </span>
                            {!isTrial && (
                              <span className="text-xs text-slate-500">
                                / {plan.durationValue} {plan.durationUnit.toLowerCase()}
                                {plan.durationValue > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>

                          {hasDiscount && (
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-xs text-slate-400 line-through">
                                {formatCurrency(plan.basePrice)}
                              </span>
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                {plan.discountPercentage > 0
                                  ? `${plan.discountPercentage}% OFF`
                                  : `Save ${formatCurrency(plan.discountAmount)}`}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Features list */}
                        <div className="space-y-2 mb-6">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                            Features
                          </span>
                          {Array.isArray(plan.features) &&
                            plan.features.map((feat, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs text-slate-700">
                                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>{typeof feat === 'string' ? feat : feat.name}</span>
                              </div>
                            ))}
                        </div>
                      </div>

                      <Link to={isTrial ? '/register' : `/register?plan=${plan.code}`}>
                        <Button
                          variant="primary"
                          className="w-full justify-center py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs"
                        >
                          {isTrial ? 'Start Free Trial' : 'Get Started'}
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* 8. FAQ SECTION */}
        <section id="faq" className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Frequently Asked Questions
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Common questions about AxomSetu school management platform.
              </p>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={idx} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? -1 : idx)}
                      className="w-full p-4 text-left flex items-center justify-between text-slate-900 font-bold text-sm hover:text-indigo-600 transition-colors"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-600' : ''
                          }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-2.5">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 9. FINAL CTA */}
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Ready to simplify your school management?
            </h2>
            <p className="mt-3 text-sm text-slate-600 max-w-xl mx-auto">
              Start using AxomSetu for your school.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
              <Link to="/register">
                <Button
                  variant="primary"
                  size="lg"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 text-sm rounded-lg shadow-sm"
                >
                  Start Free Trial
                </Button>
              </Link>
              <Link to="/login">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold px-6 py-2.5 text-sm rounded-lg"
                >
                  Login
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 10. LANDING FOOTER */}
      <footer className="bg-slate-50 text-slate-600 text-xs py-10 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left branding */}
          <div className="flex items-center gap-2.5">
            <img src="/app-icon.png" alt="AxomSetu Logo" className="w-8 h-8 rounded-lg object-cover" />
            <div>
              <span className="font-bold text-slate-900 text-sm block leading-none">
                {BRAND_CONFIG.productName}
              </span>
              <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                {BRAND_CONFIG.poweredBy}
              </span>
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-wrap justify-center gap-5 text-slate-600 font-medium">
            <a href="#features" className="hover:text-indigo-600 transition-colors">
              Features
            </a>
            <a href="#modules" className="hover:text-indigo-600 transition-colors">
              Modules
            </a>
            <a href="#pricing" className="hover:text-indigo-600 transition-colors">
              Pricing
            </a>
            <a href="#faq" className="hover:text-indigo-600 transition-colors">
              FAQ
            </a>
            <button
              onClick={() => setIsTermsModalOpen(true)}
              className="hover:text-indigo-600 transition-colors bg-transparent p-0 font-medium text-slate-600"
            >
              Terms & Conditions
            </button>
            <button
              onClick={() => setIsPrivacyModalOpen(true)}
              className="hover:text-indigo-600 transition-colors bg-transparent p-0 font-medium text-slate-600"
            >
              Privacy Policy
            </button>
            <Link to="/contact" className="hover:text-indigo-600 transition-colors">
              Contact/Support
            </Link>
          </div>

          {/* Copyright */}
          <div className="text-[11px] text-slate-500 text-center md:text-right">
            &copy; {new Date().getFullYear()} {BRAND_CONFIG.companyName}. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Modal Dialogs */}
      <TermsAndConditionsModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        onAccept={() => setIsTermsModalOpen(false)}
        onDecline={() => setIsTermsModalOpen(false)}
      />

      <PrivacyPolicyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />
    </div>
  );
};

export default LandingPage;
