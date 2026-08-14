import React from 'react';
import { GraduationCap } from 'lucide-react';
import { BRAND_CONFIG } from '../../config/brandConfig.js';

export const BrandLogo = ({
  variant = 'default', // 'default' | 'light' | 'compact' | 'withTagline'
  showCompany = false,
  className = '',
  iconClassName = 'w-6 h-6',
  size = 'md', // 'sm' | 'md' | 'lg'
}) => {
  const isLight = variant === 'light';

  const iconSizes = {
    sm: 'w-7 h-7 text-xs rounded-lg',
    md: 'w-9 h-9 text-sm rounded-xl',
    lg: 'w-11 h-11 text-base rounded-2xl',
  };

  const titleSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className={`${iconSizes[size] || iconSizes.md} ${isLight
            ? 'bg-white/10 text-white border border-white/20 backdrop-blur-xs'
            : 'bg-indigo-600 text-white shadow-xs'
          } flex items-center justify-center shrink-0 font-bold`}
      >
        <GraduationCap className={iconClassName} />
      </div>
      <div className="flex flex-col leading-tight">
        <span
          className={`${titleSizes[size] || titleSizes.md} font-bold tracking-tight ${isLight ? 'text-white' : 'text-slate-900'
            }`}
        >
          {BRAND_CONFIG.productName}
        </span>
        {variant === 'withTagline' && (
          <span className={`text-[10px] font-medium ${isLight ? 'text-indigo-200' : 'text-slate-500'}`}>
            {BRAND_CONFIG.productTagline}
          </span>
        )}
        {showCompany && (
          <span className={`text-[9px] font-semibold tracking-wider ${isLight ? 'text-indigo-300' : 'text-slate-400'}`}>
            {BRAND_CONFIG.poweredBy}
          </span>
        )}
      </div>
    </div>
  );
};

export default BrandLogo;
