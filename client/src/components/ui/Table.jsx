import React from 'react';

export const Table = ({ children, className = '', minWidth = 'min-w-[640px]', ...props }) => {
  return (
    <div className="relative w-full max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs table-responsive-wrapper">
      <table className={`w-full text-left text-sm border-collapse ${minWidth} ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
};

export const TableHeader = ({ children, className = '', ...props }) => {
  return (
    <thead className={`bg-slate-50/80 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-600 ${className}`} {...props}>
      {children}
    </thead>
  );
};

export const TableHead = ({ children, className = '', ...props }) => {
  return (
    <th className={`px-3.5 py-3 text-left whitespace-nowrap ${className}`} {...props}>
      {children}
    </th>
  );
};

export const TableBody = ({ children, className = '', ...props }) => {
  return (
    <tbody className={`divide-y divide-slate-100 ${className}`} {...props}>
      {children}
    </tbody>
  );
};

export const TableRow = ({ children, className = '', hover = true, ...props }) => {
  return (
    <tr className={`${hover ? 'hover:bg-slate-50/70 transition-colors' : ''} ${className}`} {...props}>
      {children}
    </tr>
  );
};

export const TableCell = ({ children, className = '', ...props }) => {
  return (
    <td className={`px-3.5 py-3 align-middle text-slate-700 text-xs ${className}`} {...props}>
      {children}
    </td>
  );
};


