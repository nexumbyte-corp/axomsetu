import React from 'react';

/**
 * Reusable Standardized Module Page Header Component
 *
 * @param {Object} props
 * @param {React.ElementType} [props.icon] - Lucide icon component to display on left
 * @param {string} props.title - Prominent module page title
 * @param {string} [props.description] - Short subtitle description of module purpose
 * @param {React.ReactNode} [props.actions] - Right-hand action buttons or badges
 * @param {React.ReactNode} [props.children] - Additional elements rendered on the right
 * @param {string} [props.className] - Optional extra wrapper CSS classes
 */
export const ModulePageHeader = ({
  icon: Icon,
  title,
  description,
  actions,
  children,
  className = '',
}) => {
  return (
    <div
      className={`bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${className}`}
    >
      <div className="flex items-center gap-3.5">
        {Icon && (
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        )}
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">{title}</h1>
          {description && (
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {description}
            </p>
          )}
        </div>
      </div>

      {(actions || children) && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {actions}
          {children}
        </div>
      )}
    </div>
  );
};


export default ModulePageHeader;
