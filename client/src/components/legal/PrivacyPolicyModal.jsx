import React from 'react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { FileText } from 'lucide-react';
import { PRIVACY_POLICY_VERSION, PRIVACY_POLICY_SECTIONS } from '../../constants/legalContent.js';

export const PrivacyPolicyModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="space-y-4">
        {/* Custom Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white -mx-4 -mt-4 p-5 sm:p-6 sm:-mx-6 sm:-mt-6 border-b border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight">Privacy Policy</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    v{PRIVACY_POLICY_VERSION}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  NEXUMBYTE Platform Data Protection & Privacy Guidelines
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="max-h-[380px] overflow-y-auto pr-2 space-y-3 custom-scrollbar text-xs">
          {PRIVACY_POLICY_SECTIONS.map((section) => (
            <div
              key={section.id}
              className="p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 transition-colors space-y-1"
            >
              <h4 className="font-bold text-slate-900 text-xs">{section.title}</h4>
              <p className="text-slate-600 leading-relaxed text-xs">{section.content}</p>
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <div className="flex justify-end pt-3 border-t border-slate-100">
          <Button variant="primary" size="sm" onClick={onClose}>
            Close Privacy Policy
          </Button>
        </div>
      </div>
    </Modal>
  );
};
