import React from 'react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Phone, Mail, MessageSquare, Building2, ExternalLink } from 'lucide-react';
import { BRAND_CONFIG } from '../../config/brandConfig.js';

export const ContactUsModal = ({ isOpen, onClose, contactInfo, isLoading }) => {
  if (!isOpen) return null;

  const phone = contactInfo?.supportPhone || '+91 98765 43210';
  const email = contactInfo?.supportEmail || 'support@axomsetu.com';
  const whatsapp = contactInfo?.whatsappNumber || '+91 98765 43210';
  const whatsappClean = whatsapp.replace(/[^0-9]/g, '');

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="space-y-5">
        {/* Header Header */}
        <div className="border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center mb-3">
            <Phone className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Contact Support</h2>
          <p className="text-xs text-slate-500 mt-1">
            Get in touch with our institution support team for assistance, platform setup, or inquiries.
          </p>
        </div>

        {/* Dynamic Contact Options */}
        {isLoading ? (
          <div className="space-y-3 py-4">
            <div className="h-14 bg-slate-100 rounded-xl animate-pulse" />
            <div className="h-14 bg-slate-100 rounded-xl animate-pulse" />
            <div className="h-14 bg-slate-100 rounded-xl animate-pulse" />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Support Phone */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-500 block">Phone Support</span>
                  <span className="text-sm font-bold text-slate-900 font-mono">{phone}</span>
                </div>
              </div>
              <a
                href={`tel:${phone.replace(/\s+/g, '')}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <span>Call</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Support Email */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-500 block">Email Support</span>
                  <span className="text-sm font-bold text-slate-900 font-mono">{email}</span>
                </div>
              </div>
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <span>Email</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* WhatsApp Chat */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 border border-teal-200 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-500 block">WhatsApp Support</span>
                  <span className="text-sm font-bold text-slate-900 font-mono">{whatsapp}</span>
                </div>
              </div>
              <a
                href={`https://wa.me/${whatsappClean}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <span>WhatsApp</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>{BRAND_CONFIG.productName} &bull; {BRAND_CONFIG.poweredBy}</span>
          <Button variant="outline" size="sm" onClick={onClose} className="border-slate-300 text-slate-700">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
