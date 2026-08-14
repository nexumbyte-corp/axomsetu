import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const toast = {
  success: (message) => {
    window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type: 'success' } }));
  },
  error: (message) => {
    window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type: 'error' } }));
  },
  info: (message) => {
    window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type: 'info' } }));
  },
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  useEffect(() => {
    const handleToastEvent = (e) => {
      if (e.detail?.message) {
        showToast(e.detail.message, e.detail.type || 'success');
      }
    };

    window.addEventListener('app:toast', handleToastEvent);
    return () => window.removeEventListener('app:toast', handleToastEvent);
  }, [showToast]);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Render Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toastItem) => (
          <div
            key={toastItem.id}
            className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-xl border shadow-lg transition-all transform animate-in slide-in-from-bottom-2 ${
              toastItem.type === 'success'
                ? 'bg-emerald-900 border-emerald-800 text-white'
                : toastItem.type === 'error'
                ? 'bg-rose-900 border-rose-800 text-white'
                : 'bg-slate-900 border-slate-800 text-white'
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs font-medium">
              {toastItem.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {toastItem.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
              {toastItem.type === 'info' && <Info className="w-4 h-4 text-sky-400 shrink-0" />}
              <span>{toastItem.message}</span>
            </div>
            <button
              onClick={() => removeToast(toastItem.id)}
              className="p-1 hover:bg-white/10 rounded-md transition-colors text-white/70 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  return {
    showToast: context?.showToast || ((msg, type) => toast[type]?.(msg)),
    success: toast.success,
    error: toast.error,
    info: toast.info,
  };
};

export const Toast = ({ type = 'success', message, onClose }) => {
  if (!message) return null;
  const isDanger = type === 'danger' || type === 'error';
  return (
    <div
      className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium shadow-xs transition-all ${
        isDanger ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
      }`}
    >
      <div className="flex items-center gap-2">
        {isDanger ? (
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        )}
        <span>{message}</span>
      </div>
      {onClose && (
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 rounded-md">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

