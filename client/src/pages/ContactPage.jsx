import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  GraduationCap,
  Phone,
  Mail,
  MessageSquare,
  Clock,
  Building2,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Menu,
} from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Drawer } from '../components/ui/Drawer.jsx';
import { platformService } from '../services/platformService.js';
import { BRAND_CONFIG } from '../config/brandConfig.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { TermsAndConditionsModal } from '../components/legal/TermsAndConditionsModal.jsx';
import { PrivacyPolicyModal } from '../components/legal/PrivacyPolicyModal.jsx';

export const ContactPage = () => {
  useDocumentTitle('Contact Us');
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [contactInfo, setContactInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Legal Modal states
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    document.body.style.overflow = '';
  }, [location.pathname]);

  useEffect(() => {
    const fetchContactData = async () => {
      setIsLoading(true);
      try {
        const res = await platformService.getContactInfo();
        if (res.success && res.data) {
          setContactInfo(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch platform contact info:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContactData();
  }, []);

  const phone = contactInfo?.supportPhone || '+91 98765 43210';
  const email = contactInfo?.supportEmail || 'support@axomsetu.com';
  const whatsapp = contactInfo?.whatsappNumber || '+91 98765 43210';
  const whatsappClean = whatsapp.replace(/[^0-9]/g, '');

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-indigo-600 selection:text-white flex flex-col justify-between">
      {/* 1. HEADER */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
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
            <Link to="/#features" className="hover:text-indigo-600 transition-colors">
              Features
            </Link>
            <Link to="/#modules" className="hover:text-indigo-600 transition-colors">
              Modules
            </Link>
            <Link to="/#how-it-works" className="hover:text-indigo-600 transition-colors">
              How It Works
            </Link>
            <Link to="/#pricing" className="hover:text-indigo-600 transition-colors">
              Pricing
            </Link>
            <Link to="/#faq" className="hover:text-indigo-600 transition-colors">
              FAQ
            </Link>
            <Link to="/contact" className="text-indigo-600 font-bold transition-colors">
              Contact Us
            </Link>
          </nav>

          {/* Right Actions: Clean & non-redundant */}
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

      {/* Mobile Navigation Drawer */}
      <Drawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        title={BRAND_CONFIG.productName}
        position="right"
      >
        <div className="flex flex-col gap-5 pt-2">
          <div className="text-xs text-slate-400 font-medium px-2">{BRAND_CONFIG.poweredBy}</div>
          <nav className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
            <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors">
              Home
            </Link>
            <Link to="/contact" onClick={() => setIsMobileMenuOpen(false)} className="px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 font-bold transition-colors">
              Contact Us
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

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 bg-slate-50/50 py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Breadcrumb Back Link */}
          <div className="mb-6">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </Link>
          </div>

          {/* Page Hero Title */}
          <div className="max-w-3xl mb-10">
            <span className="inline-block text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full mb-3">
              PLATFORM SUPPORT & CONTACT
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              Get in Touch with AxomSetu Team
            </h1>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              Have questions about AxomSetu or need assistance setting up your school portal? Our dedicated support team is here to help you get started smoothly.
            </p>
          </div>

          {/* Grid Layout: Left Dynamic Contact Cards, Right Platform Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Left 2 Columns: Dynamic Contact Cards */}
            <div className="lg:col-span-2 space-y-5">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-2">
                Official Support Channels
              </h2>

              {isLoading ? (
                <div className="space-y-4">
                  <div className="h-24 bg-white rounded-xl border border-slate-200 animate-pulse" />
                  <div className="h-24 bg-white rounded-xl border border-slate-200 animate-pulse" />
                  <div className="h-24 bg-white rounded-xl border border-slate-200 animate-pulse" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Phone Contact */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                        <Phone className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Phone Support</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Direct helpline for school administrators</p>
                        <span className="text-base font-bold text-slate-900 font-mono mt-1 block">{phone}</span>
                      </div>
                    </div>
                    <a
                      href={`tel:${phone.replace(/\s+/g, '')}`}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
                    >
                      <span>Call Support</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Email Contact */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0">
                        <Mail className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Email Support</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Official email helpdesk for inquiries and assistance</p>
                        <span className="text-base font-bold text-slate-900 font-mono mt-1 block">{email}</span>
                      </div>
                    </div>
                    <a
                      href={`mailto:${email}`}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
                    >
                      <span>Send Email</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* WhatsApp Support */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 border border-teal-200 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">WhatsApp Chat Support</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Instant messaging assistance for quick help</p>
                        <span className="text-base font-bold text-slate-900 font-mono mt-1 block">{whatsapp}</span>
                      </div>
                    </div>
                    <a
                      href={`https://wa.me/${whatsappClean}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
                    >
                      <span>Chat on WhatsApp</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Operating Hours Box */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Support Hours</h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Monday – Saturday: 9:00 AM – 6:00 PM IST
                      </p>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Response times: under 2 hours during operational hours.
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right 1 Column: Platform Information */}
            <div className="space-y-5">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-2">
                Platform & Provider Info
              </h2>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4 text-xs text-slate-600">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <img src="/app-icon.png" alt="AxomSetu Logo" className="w-10 h-10 rounded-xl object-cover shadow-xs" />
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-none">{BRAND_CONFIG.productName}</h3>
                    <span className="text-[11px] font-medium text-slate-500 mt-1 block">{BRAND_CONFIG.poweredBy}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-xs mb-1">About AxomSetu</h4>
                  <p className="leading-relaxed">
                    AxomSetu is an enterprise multi-tenant school management platform designed specifically for schools, academies, and educational institutions.
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Database-level tenant data isolation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Operational SLA 99.99% availability</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Immutable locked academic year ledgers</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <Link to="/register">
                    <Button variant="primary" className="w-full justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5">
                      <span>Start 30-Day Free Trial</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* 3. FOOTER */}
      <footer className="bg-slate-50 text-slate-600 text-xs py-10 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
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

          <div className="flex flex-wrap justify-center gap-5 text-slate-600 font-medium">
            <Link to="/#features" className="hover:text-indigo-600 transition-colors">
              Features
            </Link>
            <Link to="/#modules" className="hover:text-indigo-600 transition-colors">
              Modules
            </Link>
            <Link to="/#pricing" className="hover:text-indigo-600 transition-colors">
              Pricing
            </Link>
            <Link to="/#faq" className="hover:text-indigo-600 transition-colors">
              FAQ
            </Link>
            <button
              onClick={() => setIsTermsModalOpen(true)}
              className="hover:text-indigo-600 transition-colors bg-transparent p-0 font-medium text-slate-600 cursor-pointer"
            >
              Terms & Conditions
            </button>
            <button
              onClick={() => setIsPrivacyModalOpen(true)}
              className="hover:text-indigo-600 transition-colors bg-transparent p-0 font-medium text-slate-600 cursor-pointer"
            >
              Privacy Policy
            </button>
            <Link to="/contact" className="text-indigo-600 font-bold transition-colors">
              Contact/Support
            </Link>
          </div>

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

export default ContactPage;
