import React from 'react';
import { X } from 'lucide-react';

export const PhotoPreviewModal = ({ isOpen, onClose, photoUrl, name, admissionNo }) => {
  if (!isOpen || !photoUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-white p-3 rounded-2xl shadow-2xl max-w-xs sm:max-w-sm w-full overflow-hidden border border-slate-200 flex flex-col items-center select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white transition-colors z-10 shadow-md cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* High Quality Passport Frame View */}
        <div className="w-full rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center max-h-[75vh] border border-slate-800 shadow-inner">
          <img
            src={photoUrl}
            alt={name || 'Student Photo'}
            className="w-full max-h-[75vh] object-contain"
          />
        </div>

        <div className="w-full mt-3 text-center px-2 pb-1">
          <h3 className="text-sm font-bold text-slate-900">{name || 'Student Photo'}</h3>
          {admissionNo && (
            <p className="text-xs font-mono text-slate-500 font-semibold mt-0.5">
              Admission No: {admissionNo}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
