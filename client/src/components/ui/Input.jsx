import React from 'react';

export const Input = React.forwardRef(
  (
    {
      label,
      error,
      helperText,
      required = false,
      type = 'text',
      className = '',
      labelClassName = '',
      variant = 'light',
      size = 'md',
      id,
      name,
      icon: Icon,
      endElement,
      disabled = false,
      autoComplete,
      ...props
    },
    ref
  ) => {
    const inputId = id || name || label?.toLowerCase().replace(/\s+/g, '-');
    const computedAutoComplete = autoComplete || (type === 'password' ? 'new-password' : 'off');

    const handleWheel = (e) => {
      if (type === 'number') {
        e.preventDefault();
        e.target.blur();
      }
      if (props.onWheel) {
        props.onWheel(e);
      }
    };

    const isDark = variant === 'dark';
    const isSm = size === 'sm';

    const labelStyles = isDark
      ? `text-slate-300 ${labelClassName}`
      : `text-slate-600 ${labelClassName}`;

    const defaultInputStyles = isDark
      ? 'border-slate-700/80 bg-slate-950/90 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-indigo-500/30 disabled:bg-slate-900 disabled:text-slate-500 shadow-inner'
      : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-indigo-500/20 disabled:bg-slate-50 disabled:text-slate-500';

    const errorInputStyles = isDark
      ? 'border-rose-500/80 bg-slate-950/90 text-rose-200 placeholder-rose-400/60 focus:border-rose-500 focus:ring-rose-500/30'
      : 'border-rose-300 bg-white text-rose-900 placeholder-rose-300 focus:border-rose-500 focus:ring-rose-500/20';

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className={`block font-semibold uppercase tracking-wider ${isSm ? 'text-[10px] mb-1 font-bold' : 'text-xs mb-1.5'} ${labelStyles}`}>
            {label}
            {required && <span className="text-rose-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative rounded-lg shadow-2xs">
          {Icon && (
            <div className={`absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
              <Icon className={isSm ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            name={name}
            type={type}
            disabled={disabled}
            autoComplete={computedAutoComplete}
            onWheel={handleWheel}
            className={`w-full rounded-lg border transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed ${
              isSm ? 'py-1.5 text-xs' : 'py-2.5 text-sm'
            } ${
              Icon ? (isSm ? 'pl-8' : 'pl-9') : (isSm ? 'pl-2.5' : 'pl-3.5')
            } ${endElement ? (isSm ? 'pr-8' : 'pr-10') : (isSm ? 'pr-2.5' : 'pr-3.5')} ${
              error ? errorInputStyles : defaultInputStyles
            } ${className}`}
            {...props}
          />
          {endElement && <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center">{endElement}</div>}
        </div>
        {error && <p className="mt-1 text-xs text-rose-500 font-medium">{error}</p>}
        {helperText && !error && <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
