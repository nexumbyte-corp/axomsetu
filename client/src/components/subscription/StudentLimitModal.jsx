import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, X, Zap, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Button } from '../ui/Button.jsx';

export const StudentLimitModal = ({
  isOpen,
  onClose,
  limitInfo = {},
  onUpgrade,
}) => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const planName = limitInfo.planName || 'Free Trial';
  const maxStudents = limitInfo.maxStudents ?? 300;
  const currentStudents = limitInfo.currentStudents ?? maxStudents;
  const isEnterprise = Boolean(
    limitInfo.isEnterprise ||
      limitInfo.planType === 'ENTERPRISE' ||
      planName.toLowerCase().includes('enterprise')
  );

  const handleUpgradeClick = () => {
    if (onClose) onClose();
    if (onUpgrade) {
      onUpgrade();
    } else {
      navigate('/app/subscription');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Centered Large Modal Dialog */}
      <div
        className="relative w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl border border-slate-200 transition-all z-10 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
          <div className="flex items-start gap-3.5 pr-6">
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-600 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  Student Limit Reached
                </h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                  100% Capacity Used
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                Your subscription has reached the maximum allowed active student count for your current plan.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - 2 Column Grid */}
        <div className="p-5 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
            {/* Left Column: Current Capacity Overview */}
            <div className="md:col-span-5 flex flex-col justify-between bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 sm:p-5">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-3">
                  Current Capacity
                </span>

                <div className="space-y-3">
                  <div className="bg-white p-3 rounded-lg border border-slate-200/70 shadow-2xs">
                    <span className="text-xs text-slate-500 font-medium block">Active Subscription</span>
                    <span className="text-sm font-bold text-slate-900 block mt-0.5 truncate">{planName}</span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200/70 shadow-2xs">
                    <span className="text-xs text-slate-500 font-medium block">Student Utilization</span>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-xl font-bold text-rose-600 font-mono">
                        {currentStudents}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        / {maxStudents} active max
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4 space-y-1.5">
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full w-full" />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
                    <span>Limit Reached</span>
                    <span className="font-semibold text-rose-600">{currentStudents} / {maxStudents}</span>
                  </div>
                </div>
              </div>

              {/* Status Note */}
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200/70 rounded-lg text-xs text-amber-900 flex items-start gap-2.5 leading-snug">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  {isEnterprise
                    ? 'Student limit reached for your Enterprise plan. Contact support to request a limit expansion.'
                    : 'New student registration is paused until you upgrade your plan limit.'}
                </span>
              </div>
            </div>

            {/* Right Column: Upgrade Benefits or Enterprise Notice */}
            <div className="md:col-span-7 flex flex-col justify-between bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-2xs">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">
                  <Zap className="w-3.5 h-3.5 fill-indigo-600" />
                  {isEnterprise ? 'Enterprise Account Notice' : 'Recommended Action'}
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {isEnterprise ? 'Request Capacity Expansion' : 'Upgrade Plan to Expand Capacity'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {isEnterprise
                    ? 'Your institution is on an active Enterprise Subscription. Purchasing standard plans is disabled while on an Enterprise plan. Please contact support to adjust your student limit.'
                    : 'Select a subscription plan that fits your growing institution and unlock full operational capabilities.'}
                </p>

                <div className="space-y-3 my-4 pt-1">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        {isEnterprise ? 'Custom Student Limit Adjustment' : 'Higher Student Capacity'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {isEnterprise
                          ? 'Request tailored student capacity allocations for your school.'
                          : 'Add up to thousands of active student records seamlessly.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-slate-800">Dedicated Enterprise Support</p>
                      <p className="text-[11px] text-slate-500">Priority helpline and custom onboarding assistance from platform engineers.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-slate-800">No Operational Interruption</p>
                      <p className="text-[11px] text-slate-500">All school modules, records, and parent portals remain active.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg text-xs text-indigo-950 flex items-center justify-between gap-3">
                <span className="font-medium text-indigo-900">
                  {isEnterprise ? 'Need to speak directly with support?' : 'Have specific customization requirements?'}
                </span>
                <button
                  type="button"
                  onClick={handleUpgradeClick}
                  className="text-indigo-600 hover:text-indigo-800 font-bold text-xs shrink-0 cursor-pointer"
                >
                  {isEnterprise ? 'Contact Support &rarr;' : 'View Plans &rarr;'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bar */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 rounded-b-2xl">
          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Questions? Reach out to support anytime for enterprise contract options.</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 text-xs font-semibold border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              Cancel / Close
            </Button>

            <button
              type="button"
              onClick={handleUpgradeClick}
              className="w-full sm:w-auto px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-white text-white" />
              <span>{isEnterprise ? 'Contact Support' : 'Upgrade Subscription'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

