import React, { useEffect } from 'react';
import { usePageHeader } from '../../context/PageHeaderContext.jsx';

/**
 * Standardized Module Page Header Component
 *
 * Registers page metadata (icon, title, description, actions) into the top navigation header bar.
 */
export const ModulePageHeader = ({
  icon: Icon,
  title,
  description,
  actions,
  children,
}) => {
  const { setHeaderInfo } = usePageHeader();

  const actionElements = actions || children;

  useEffect(() => {
    setHeaderInfo({
      icon: Icon,
      title,
      description,
      actions: actionElements,
    });

    return () => {
      setHeaderInfo(null);
    };
  }, [Icon, title, description, actionElements, setHeaderInfo]);

  // Mobile fallback inline header (hidden on desktop md+ since top navigation bar presents it cleanly)
  return (
    <div className="md:hidden bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col gap-3">
      <div className="flex items-center gap-2.5 min-w-0 w-full">
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-bold text-slate-900 truncate">{title}</h1>
          {description && (
            <p className="text-[11px] text-slate-500 font-medium truncate">{description}</p>
          )}
        </div>
      </div>
      {actionElements && (
        <div className="flex flex-wrap items-center gap-2 w-full pt-2 border-t border-slate-100">
          {actionElements}
        </div>
      )}
    </div>
  );
};

export default ModulePageHeader;
