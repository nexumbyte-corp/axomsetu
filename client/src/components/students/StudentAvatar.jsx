import React, { useState, useEffect } from 'react';

const COLORS = [
  'bg-indigo-100 text-indigo-700 border-indigo-200',
  'bg-emerald-100 text-emerald-700 border-emerald-200',
  'bg-amber-100 text-amber-700 border-amber-200',
  'bg-violet-100 text-violet-700 border-violet-200',
  'bg-rose-100 text-rose-700 border-rose-200',
  'bg-cyan-100 text-cyan-700 border-cyan-200',
];

const getInitials = (name = '') => {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return 'S';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const getColorClass = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLORS.length;
  return COLORS[index];
};

export const StudentAvatar = ({ name = '', photoUrl = null, size = 'md', className = '', onClick = null }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [photoUrl]);

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm font-semibold',
    lg: 'w-14 h-14 text-lg font-bold',
    xl: 'w-20 h-20 text-2xl font-bold',
    passport: 'w-20 h-24 rounded-xl text-base font-bold',
  };

  const selectedSize = sizeClasses[size] || sizeClasses.md;
  const initials = getInitials(name);
  const colorClass = getColorClass(name);
  const cursorClass = onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : '';

  if (photoUrl && !hasError) {
    return (
      <img
        src={photoUrl}
        alt={name}
        onClick={onClick}
        onError={() => setHasError(true)}
        className={`${selectedSize} ${size === 'passport' ? 'rounded-xl' : 'rounded-full'} object-cover border border-slate-200 shadow-2xs shrink-0 ${cursorClass} ${className}`}
      />
    );
  }

  return (
    <div
      onClick={onClick}
      className={`${selectedSize} ${size === 'passport' ? 'rounded-xl' : 'rounded-full'} flex items-center justify-center border font-sans uppercase shrink-0 shadow-2xs ${colorClass} ${cursorClass} ${className}`}
    >
      {initials}
    </div>
  );
};

export default StudentAvatar;
