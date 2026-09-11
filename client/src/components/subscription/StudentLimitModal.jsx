import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, AlertTriangle, Sparkles, ArrowRight, X, Zap } from 'lucide-react';
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

  const handleUpgradeClick = () => {
    if (onClose) onClose();
    if (onUpgrade) {
      onUpgrade();
    } else {
      navigate('/app/subscription');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop with Blur */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Centered Modal Dialog Box */}
      <div
        className="relative w-full max-w-md sm:max-w-lg transform overflow-hidden rounded-3xl bg-white text-left align-middle shadow-2xl border border-slate-100 transition-all z-10 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Warning Ambient Banner */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-amber-500/10 via-rose-500/5 to-transparent pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 rounded-full p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8 space-y-6 relative z-10">
          {/* 1. ICON & HEADER SECTION */}
          <div className="flex flex-col items-center text-center space-y-3">
            {/* Visual Icon Badge Container */}
            <div className="relative">
              <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-3xl bg-gradient-to-tr from-amber-500/20 via-rose-500/15 to-indigo-500/10 border-2 border-amber-400/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
                <div className="relative flex items-center justify-center">
                  <Users className="w-10 h-10 sm:w-11 sm:h-11 text-amber-600" />
                  <div className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-1 border-2 border-white shadow-xs">
                    <AlertTriangle className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  </div>
                </div>
              </div>
              <span className="absolute -bottom-2.5 inset-x-0 mx-auto w-max px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-[10px] font-black text-amber-800 uppercase tracking-wider shadow-xs">
                Student Limit Reached
              </span>
            </div>

            {/* Title & Subtitle */}
            <div className="pt-3 space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Student Limit Reached
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
                Your <span className="font-bold text-slate-900">{planName}</span> subscription allows a maximum of{' '}
                <span className="font-bold text-slate-900">{maxStudents}</span> active students. You currently have{' '}
                <span className="font-bold text-rose-600 font-mono">{currentStudents}</span> active students.
              </p>
              <div className="pt-1">
                <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 rounded-xl py-1.5 px-3.5 inline-block shadow-2xs">
                  To add more students, please upgrade your subscription plan.
                </span>
              </div>
            </div>
          </div>

          {/* 2. STATS & CAPACITY BREAKDOWN */}
          <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200/80 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-center sm:text-left">
              <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Current Plan
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-indigo-950 truncate block mt-0.5">
                  {planName}
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Active / Max Allowed
                </span>
                <span className="text-xs sm:text-sm font-extrabold font-mono text-slate-900 block mt-0.5">
                  <span className="text-rose-600">{currentStudents}</span> / {maxStudents}
                </span>
              </div>
            </div>

            {/* Capacity Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-slate-500">Student Limit Capacity</span>
                <span className="text-rose-600 font-mono flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-500" />
                  100% Capacity Used
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden border border-slate-300/40">
                <div className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-rose-600 rounded-full w-full shadow-inner" />
              </div>
            </div>
          </div>

          {/* 3. EXPLANATORY UPGRADE BANNER */}
          <div className="flex items-start gap-3 p-3.5 bg-indigo-50/80 rounded-2xl border border-indigo-100 text-indigo-950">
            <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs leading-snug">
              <span className="font-bold block text-indigo-900">Unlock Unlimited Growth</span>
              <span className="text-slate-600">
                Upgrade your subscription plan to add more active students and unlock full platform operational modules.
              </span>
            </div>
          </div>

          {/* 4. MODAL ACTION BUTTONS */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onClose}
              className="w-full sm:w-1/2 justify-center py-2.5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 text-xs sm:text-sm font-bold order-2 sm:order-1"
            >
              Cancel / Close
            </Button>

            <button
              type="button"
              onClick={handleUpgradeClick}
              className="w-full sm:w-1/2 justify-center py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 group cursor-pointer order-1 sm:order-2"
            >
              <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span>Upgrade Subscription</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
