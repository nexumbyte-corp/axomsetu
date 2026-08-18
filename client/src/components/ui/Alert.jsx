import React from 'react';
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';

export const Alert = ({ type = 'info', title, children, className = '', onClose: _onClose }) => {
  const styles = {
    info: {
      bg: 'bg-sky-50 border-sky-200 text-sky-900',
      icon: Info,
      iconColor: 'text-sky-600',
    },
    success: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      icon: CheckCircle2,
      iconColor: 'text-emerald-600',
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200 text-amber-900',
      icon: AlertCircle,
      iconColor: 'text-amber-600',
    },
    danger: {
      bg: 'bg-rose-50 border-rose-200 text-rose-900',
      icon: XCircle,
      iconColor: 'text-rose-600',
    },
  };

  const currentStyle = styles[type] || styles.info;
  const Icon = currentStyle.icon;

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${currentStyle.bg} ${className}`}>
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${currentStyle.iconColor}`} />
      <div className="flex-1 text-xs">
        {title && <h4 className="font-semibold text-sm mb-0.5">{title}</h4>}
        <div className="leading-relaxed">{children}</div>
      </div>
    </div>
  );
};
