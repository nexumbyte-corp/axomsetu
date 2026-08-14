import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export const Dropdown = ({ trigger, children, align = 'right' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const [openUp, setOpenUp] = useState(false);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const shouldOpenUp = spaceBelow < 260 && rect.top > 200;
      setOpenUp(shouldOpenUp);

      setCoords({
        top: shouldOpenUp ? 'auto' : `${rect.bottom + 6}px`,
        bottom: shouldOpenUp ? `${window.innerHeight - rect.top + 6}px` : 'auto',
        right: align === 'right' ? `${window.innerWidth - rect.right}px` : 'auto',
        left: align === 'left' ? `${rect.left}px` : 'auto',
      });
    }
  };

  const toggleDropdown = (e) => {
    e.stopPropagation();
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      updatePosition();
    };

    const handleClickOutside = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        menuRef.current &&
        !menuRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="inline-block" ref={triggerRef}>
      <div onClick={toggleDropdown}>{trigger}</div>

      {isOpen &&
        coords &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: coords.top,
              bottom: coords.bottom,
              left: coords.left,
              right: coords.right,
            }}
            className={`w-56 rounded-xl bg-white shadow-xl border border-slate-200 py-1.5 z-50 focus:outline-none animate-in fade-in duration-100 ${
              openUp ? 'origin-bottom' : 'origin-top'
            }`}
            onClick={() => setIsOpen(false)}
          >
            {children}
          </div>,
          document.body
        )}
    </div>
  );
};

export const DropdownItem = ({ children, onClick, icon: Icon, danger = false, className = '' }) => {
  return (
    <button
      onClick={(e) => {
        if (onClick) onClick(e);
      }}
      className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold transition-colors ${
        danger
          ? 'text-rose-600 hover:bg-rose-50'
          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
      } ${className}`}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0" />}
      <span>{children}</span>
    </button>
  );
};

export const DropdownDivider = () => <div className="my-1 border-t border-slate-100" />;
