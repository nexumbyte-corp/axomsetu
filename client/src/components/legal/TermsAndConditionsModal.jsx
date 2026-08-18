import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { ShieldCheck, FileText, Search, Scale } from 'lucide-react';
import { TERMS_VERSION, PRIVACY_POLICY_VERSION, TERMS_CLAUSES, PRIVACY_POLICY_SECTIONS } from '../../constants/legalContent.js';

export const TermsAndConditionsModal = ({ isOpen, onClose: _onClose, onAccept, onDecline, isAccepted = false }) => {
  const [activeTab, setActiveTab] = useState('terms'); // 'terms' | 'privacy'
  const [isChecked, setIsChecked] = useState(isAccepted);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setIsChecked(isAccepted);
  }, [isAccepted, isOpen]);

  if (!isOpen) return null;

  const handleAccept = () => {
    if (!isChecked) return;
    onAccept();
  };

  const handleDecline = () => {
    onDecline();
  };

  const filteredClauses = TERMS_CLAUSES.filter(
    (clause) =>
      clause.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clause.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPrivacy = PRIVACY_POLICY_SECTIONS.filter(
    (sec) =>
      sec.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sec.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleDecline}
      size="2xl"
    >
      <div className="space-y-4 w-full">
        {/* Full-width Responsive Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white -mx-4 -mt-4 p-5 sm:p-6 sm:-mx-6 sm:-mt-6 border-b border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 shrink-0">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight">Terms & Conditions of Service</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    v{activeTab === 'terms' ? TERMS_VERSION : PRIVACY_POLICY_VERSION}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  AxomSetu Institution Registration & Platform Usage Agreement
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs & Quick Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-800/80 relative z-10">
            <div className="flex gap-2 bg-slate-950/60 p-1 rounded-xl border border-slate-800 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('terms')}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'terms'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Terms & Conditions (32 Clauses)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('privacy')}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'privacy'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Privacy Policy</span>
              </button>
            </div>

            {/* Search filter */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter clauses or keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950/70 text-xs text-slate-200 pl-8 pr-3 py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500 placeholder-slate-500"
              />
            </div>
          </div>
        </div>

        {/* Scrollable Content Container */}
        <div className="max-h-[50vh] sm:max-h-[55vh] min-h-[250px] overflow-y-auto pr-2 space-y-3 custom-scrollbar text-xs">
          {activeTab === 'terms' ? (
            filteredClauses.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                No terms clauses found matching "{searchTerm}".
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredClauses.map((clause) => (
                  <div
                    key={clause.id}
                    className="p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200/80 transition-colors space-y-1.5 group flex flex-col justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                          {clause.id}
                        </span>
                        <span className="group-hover:text-indigo-700 transition-colors">{clause.title}</span>
                      </h4>
                      <p className="text-slate-600 leading-relaxed pl-7 text-[11px] sm:text-xs mt-1">
                        {clause.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : filteredPrivacy.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              No privacy sections found matching "{searchTerm}".
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPrivacy.map((sec) => (
                <div
                  key={sec.id}
                  className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200/80 transition-colors space-y-1.5"
                >
                  <h4 className="font-bold text-slate-900 text-xs">{sec.title}</h4>
                  <p className="text-slate-600 leading-relaxed text-xs">{sec.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Interactive Consent Confirmation Box */}
        <div className="pt-2">
          <label className={`flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer select-none ${
            isChecked
              ? 'bg-indigo-50/90 border-indigo-300 shadow-sm'
              : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
          }`}>
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setIsChecked(!isChecked);
                }
              }}
            />
            <span className="text-xs text-slate-800 font-medium leading-relaxed">
              I confirm that I am authorized to register this school and have read and agree to the{' '}
              <strong className="text-indigo-950 font-bold">AxomSetu Terms & Conditions</strong> and{' '}
              <strong className="text-indigo-950 font-bold">Privacy Policy</strong>.
            </span>
          </label>
        </div>

        {/* Footer Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="text-[11px] text-slate-500 font-medium">
            Version 1.0 Electronic Legal Consent Record
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDecline}
              className="w-full sm:w-auto hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
            >
              Decline
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={!isChecked}
              onClick={handleAccept}
              className={`w-full sm:w-auto font-bold transition-all ${
                !isChecked
                  ? 'opacity-50 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-600/25'
              }`}
            >
              Accept & Continue
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
