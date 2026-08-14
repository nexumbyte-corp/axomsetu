import React, { useState, useEffect } from 'react';
import { Mail, Phone, MessageSquare, HelpCircle, ExternalLink } from 'lucide-react';
import { platformService } from '../../services/platformService.js';
import { Modal } from '../ui/Modal.jsx';
import { Spinner } from '../ui/Spinner.jsx';

export const SupportModal = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [contactInfo, setContactInfo] = useState({
    supportEmail: null,
    supportPhone: null,
    whatsappNumber: null,
    platformName: 'AxomSetu Platform',
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
      platformService
        .getContactInfo()
        .then((res) => {
          if (res.success && res.data) {
            setContactInfo(res.data);
          }
        })
        .catch((err) => {
          setError(err.message || 'Failed to load support information');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const hasEmail = Boolean(contactInfo.supportEmail && contactInfo.supportEmail.trim());
  const hasPhone = Boolean(contactInfo.supportPhone && contactInfo.supportPhone.trim());
  const hasWhatsapp = Boolean(contactInfo.whatsappNumber && contactInfo.whatsappNumber.trim());
  const hasAnyContact = hasEmail || hasPhone || hasWhatsapp;

  const cleanPhoneForWhatsapp = (phoneStr) => {
    if (!phoneStr) return '';
    return phoneStr.replace(/[^0-9]/g, '');
  };

  const cleanPhoneForTel = (phoneStr) => {
    if (!phoneStr) return '';
    return phoneStr.replace(/[^0-9+]/g, '');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Platform Help & Support" size="md">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">
          Need help with your school workspace? Get in touch directly with our support team using any of the channels below.
        </p>

        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner size="md" label="Loading support contacts..." />
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-700">
            {error}
          </div>
        ) : !hasAnyContact ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-500">
            <HelpCircle className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Support contact information is currently unavailable.</p>
            <p className="text-xs text-slate-400 mt-1">Please try again later or contact your system administrator.</p>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            {/* Support Email */}
            {hasEmail && (
              <a
                href={`mailto:${contactInfo.supportEmail.trim()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-500 hover:bg-indigo-50/40 transition-all group shadow-2xs"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Support Email</span>
                    <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                      {contactInfo.supportEmail}
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </a>
            )}

            {/* Support Phone */}
            {hasPhone && (
              <a
                href={`tel:${cleanPhoneForTel(contactInfo.supportPhone)}`}
                className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-emerald-500 hover:bg-emerald-50/40 transition-all group shadow-2xs"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Phone Support</span>
                    <span className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      {contactInfo.supportPhone}
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </a>
            )}

            {/* WhatsApp Support */}
            {hasWhatsapp && (
              <a
                href={`https://wa.me/${cleanPhoneForWhatsapp(contactInfo.whatsappNumber)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-emerald-500 hover:bg-emerald-50/40 transition-all group shadow-2xs"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">WhatsApp Support</span>
                    <span className="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                      {contactInfo.whatsappNumber}
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition-colors" />
              </a>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
