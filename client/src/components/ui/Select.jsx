import React from 'react';
import { ChevronDown } from 'lucide-react';

export const Select = React.forwardRef(
  (
    {
      label,
      error,
      helperText,
      required = false,
      options = [],
      className = '',
      size = 'md',
      id,
      name,
      disabled = false,
      children,
      autoComplete = 'off',
      ...props
    },
    ref
  ) => {
    const selectId = id || name || label?.toLowerCase().replace(/\s+/g, '-');
    const isSm = size === 'sm';

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className={`block font-semibold uppercase tracking-wider text-slate-600 ${isSm ? 'text-[10px] mb-1 font-bold' : 'text-xs mb-1.5'}`}>
            {label}
            {required && <span className="text-rose-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative rounded-lg shadow-2xs">
          <select
            ref={ref}
            id={selectId}
            name={name}
            disabled={disabled}
            autoComplete={autoComplete}
            className={`w-full appearance-none rounded-lg border transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed bg-white ${
              isSm ? 'py-1.5 text-xs pl-2.5 pr-8' : 'py-2 text-sm pl-3.5 pr-10'
            } ${
              error
                ? 'border-rose-300 text-rose-900 focus:border-rose-500 focus:ring-rose-500/20'
                : 'border-slate-300 text-slate-900 focus:border-indigo-500 focus:ring-indigo-500/20'
            } ${className}`}
            {...props}
          >
            {children
              ? children
              : options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
            <ChevronDown className={isSm ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
          </div>
        </div>
        {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
