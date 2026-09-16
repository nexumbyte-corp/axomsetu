import React from 'react';

export const Textarea = React.forwardRef(
  (
    { label, error, helperText, required = false, rows = 3, className = '', size = 'md', id, name, disabled = false, autoComplete = 'off', ...props },
    ref
  ) => {
    const textareaId = id || name || label?.toLowerCase().replace(/\s+/g, '-');
    const isSm = size === 'sm';

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className={`block font-semibold uppercase tracking-wider text-slate-600 ${isSm ? 'text-[10px] mb-1 font-bold' : 'text-xs mb-1.5'}`}>
            {label}
            {required && <span className="text-rose-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative rounded-lg shadow-2xs">
          <textarea
            ref={ref}
            id={textareaId}
            name={name}
            rows={rows}
            disabled={disabled}
            autoComplete={autoComplete}
            className={`w-full rounded-lg border transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed ${
              isSm ? 'p-2 text-xs' : 'p-3 text-sm'
            } ${
              error
                ? 'border-rose-300 text-rose-900 placeholder-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
                : 'border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-indigo-500/20'
            } ${className}`}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
