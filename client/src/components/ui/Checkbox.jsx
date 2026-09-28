import React from 'react';

export const Checkbox = React.forwardRef(
  ({ label, description, className = '', id, name, disabled = false, isDisabled = false, checked, onChange, ...props }, ref) => {
    const checkboxId = id || name || label?.toLowerCase().replace(/\s+/g, '-');
    const isActuallyDisabled = Boolean(disabled || isDisabled);

    return (
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            ref={ref}
            id={checkboxId}
            name={name}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            disabled={isActuallyDisabled}
            className={`w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
            {...props}
          />
        </div>
        {(label || description) && (
          <div className="ml-3 text-sm leading-5">
            {label && (
              <label htmlFor={checkboxId} className="font-medium text-slate-800 cursor-pointer disabled:cursor-not-allowed select-none">
                {label}
              </label>
            )}
            {description && <p className="text-xs text-slate-500">{description}</p>}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
