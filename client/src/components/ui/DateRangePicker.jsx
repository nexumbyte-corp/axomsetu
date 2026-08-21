import React, { useState, useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowRight
} from 'lucide-react';
import { formatDate, parseDateSafe, formatDateForInput } from '../../utils/formatters.js';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/**
 * Modern, Responsive, High-Contrast DateRangePicker Component
 * Presentation format: DD-MM-YYYY → DD-MM-YYYY
 * Emits: onChange({ startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD' })
 * Uses React Portal for zero clipping by parent containers
 */
export const DateRangePicker = ({
  startDate = '',
  endDate = '',
  onChange,
  label,
  error,
  helperText,
  disabled = false,
  minDate,
  maxDate,
  clearable = true,
  className = '',
  labelClassName = '',
  id,
}) => {
  const generatedId = useId();
  const pickerId = id || generatedId;
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  const parsedStart = parseDateSafe(startDate);
  const parsedEnd = parseDateSafe(endDate);

  const [isOpen, setIsOpen] = useState(false);
  const [hoverDate, setHoverDate] = useState(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });

  // Calendar View month & year
  const today = new Date();
  const initialDate = parsedStart || today;
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  // Selecting step: 'start' | 'end'
  const [selectionStep, setSelectionStep] = useState('start');
  const [tempStart, setTempStart] = useState(parsedStart);
  const [tempEnd, setTempEnd] = useState(parsedEnd);

  // Calculate portal popover position
  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const popoverHeight = 340;
      const popoverWidth = 350;

      let top = rect.bottom + window.scrollY + 6;
      if (spaceBelow < popoverHeight && spaceAbove > spaceBelow) {
        top = rect.top + window.scrollY - popoverHeight - 6;
      }

      let left = rect.left + window.scrollX;
      if (left + popoverWidth > window.innerWidth + window.scrollX - 12) {
        left = Math.max(12, window.innerWidth + window.scrollX - popoverWidth - 12);
      }

      setPopoverPos({ top, left });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScrollOrResize = () => updatePosition();
      window.addEventListener('resize', handleScrollOrResize);
      window.addEventListener('scroll', handleScrollOrResize, true);
      return () => {
        window.removeEventListener('resize', handleScrollOrResize);
        window.removeEventListener('scroll', handleScrollOrResize, true);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    setTempStart(parsedStart);
    setTempEnd(parsedEnd);
  }, [startDate, endDate]);

  const cleanedLabel = label ? label.replace(/\s*\*+$/, '') : '';

  // Click outside to dismiss (handles portal element)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setSelectionStep('start');
        setTempStart(parsedStart);
        setTempEnd(parsedEnd);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, parsedStart, parsedEnd]);

  const parsedMin = parseDateSafe(minDate);
  const parsedMax = parseDateSafe(maxDate);

  const isDateDisabled = (date) => {
    if (!date) return false;
    const time = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    if (parsedMin) {
      const minTime = new Date(parsedMin.getFullYear(), parsedMin.getMonth(), parsedMin.getDate()).getTime();
      if (time < minTime) return true;
    }
    if (parsedMax) {
      const maxTime = new Date(parsedMax.getFullYear(), parsedMax.getMonth(), parsedMax.getDate()).getTime();
      if (time > maxTime) return true;
    }
    return false;
  };

  const handleDateClick = (date) => {
    if (isDateDisabled(date)) return;

    if (selectionStep === 'start' || (tempStart && tempEnd)) {
      setTempStart(date);
      setTempEnd(null);
      setSelectionStep('end');
    } else if (selectionStep === 'end' && tempStart) {
      if (date < tempStart) {
        // Swap if clicked before start date
        setTempStart(date);
        setTempEnd(tempStart);
        emitChange(date, tempStart);
      } else {
        setTempEnd(date);
        emitChange(tempStart, date);
      }
      setSelectionStep('start');
      setIsOpen(false);
    }
  };

  const emitChange = (start, end) => {
    if (onChange) {
      const startStr = start ? formatDateForInput(start) : '';
      const endStr = end ? formatDateForInput(end) : '';
      onChange({ startDate: startStr, endDate: endStr }, start, end);
    }
  };

  const handleClear = (e) => {
    e?.stopPropagation();
    if (disabled) return;
    setTempStart(null);
    setTempEnd(null);
    setSelectionStep('start');
    if (onChange) {
      onChange({ startDate: '', endDate: '' }, null, null);
    }
    setIsOpen(false);
  };

  // Quick Preset Handlers
  const applyPreset = (type) => {
    const now = new Date();
    let s = null;
    let e = null;

    if (type === 'today') {
      s = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      e = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (type === 'thisMonth') {
      s = new Date(now.getFullYear(), now.getMonth(), 1);
      e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (type === 'lastMonth') {
      s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      e = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (type === 'last30Days') {
      s = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      e = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    if (s && e) {
      setTempStart(s);
      setTempEnd(e);
      emitChange(s, e);
      setViewYear(s.getFullYear());
      setViewMonth(s.getMonth());
      setIsOpen(false);
    }
  };

  // Days Builder
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfWeek = (year, month) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const daysInCurrentMonth = getDaysInMonth(viewYear, viewMonth);
  const daysInPrevMonth = getDaysInMonth(viewYear, viewMonth - 1);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);

  const calendarDays = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    calendarDays.push({
      day: daysInPrevMonth - i,
      month: viewMonth - 1,
      year: viewYear,
      isCurrentMonth: false,
    });
  }
  for (let i = 1; i <= daysInCurrentMonth; i++) {
    calendarDays.push({
      day: i,
      month: viewMonth,
      year: viewYear,
      isCurrentMonth: true,
    });
  }
  const totalDays = calendarDays.length;
  const nextMonthDaysCount = totalDays % 7 === 0 ? 0 : 7 - (totalDays % 7);
  for (let i = 1; i <= nextMonthDaysCount; i++) {
    calendarDays.push({
      day: i,
      month: viewMonth + 1,
      year: viewYear,
      isCurrentMonth: false,
    });
  }

  const displayRange =
    parsedStart && parsedEnd
      ? `${formatDate(parsedStart)} → ${formatDate(parsedEnd)}`
      : parsedStart
      ? `${formatDate(parsedStart)} → Select End Date`
      : 'Select Date Range';

  return (
    <div className={`w-full relative ${className}`} ref={containerRef}>
      {cleanedLabel && (
        <label htmlFor={pickerId} className={`block text-xs font-bold uppercase tracking-wider mb-1 text-slate-700 ${labelClassName}`}>
          {cleanedLabel}
        </label>
      )}

      {/* Trigger Button */}
      <div
        ref={triggerRef}
        id={pickerId}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-semibold font-mono transition-colors cursor-pointer bg-white text-slate-900 shadow-2xs ${
          error ? 'border-rose-400 text-rose-800' : 'border-slate-300 hover:border-slate-400'
        } ${disabled ? 'bg-slate-100 opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <CalendarIcon className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className={`truncate ${!parsedStart ? 'text-slate-400 font-normal font-sans' : 'text-slate-900 font-bold'}`}>
            {displayRange}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {clearable && (parsedStart || parsedEnd) && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Clear date range"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
      {helperText && !error && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}

      {/* Floating Range Popover - Portaled to document.body */}
      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'absolute',
              top: `${popoverPos.top}px`,
              left: `${popoverPos.left}px`,
              backgroundColor: '#ffffff',
              zIndex: 99999,
            }}
            className="w-80 sm:w-88 rounded-2xl shadow-2xl border border-slate-200 p-3.5 animate-in fade-in zoom-in-95 duration-100 bg-white text-slate-900"
          >
          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 pb-2.5 mb-2.5 border-b border-slate-100 overflow-x-auto text-[11px] font-bold">
            <button
              type="button"
              onClick={() => applyPreset('today')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 transition-colors shrink-0"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => applyPreset('thisMonth')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 transition-colors shrink-0"
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => applyPreset('lastMonth')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 transition-colors shrink-0"
            >
              Last Month
            </button>
            <button
              type="button"
              onClick={() => applyPreset('last30Days')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 transition-colors shrink-0"
            >
              Last 30 Days
            </button>
          </div>

          {/* Month / Navigation Bar */}
          <div className="flex items-center justify-between pb-2 mb-2">
            <span className="text-xs font-bold text-slate-900">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  if (viewMonth === 0) {
                    setViewMonth(11);
                    setViewYear(viewYear - 1);
                  } else {
                    setViewMonth(viewMonth - 1);
                  }
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 hover:text-indigo-600 border border-slate-200 transition-colors"
                title="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (viewMonth === 11) {
                    setViewMonth(0);
                    setViewYear(viewYear + 1);
                  } else {
                    setViewMonth(viewMonth + 1);
                  }
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 hover:text-indigo-600 border border-slate-200 transition-colors"
                title="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {DAYS_OF_WEEK.map((d) => (
              <div key={d} className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-0.5">
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((item, idx) => {
              const itemDate = new Date(item.year, item.month, item.day);
              const disabledDay = isDateDisabled(itemDate);

              const isStart =
                tempStart &&
                tempStart.getDate() === item.day &&
                tempStart.getMonth() === item.month &&
                tempStart.getFullYear() === item.year;

              const isEnd =
                tempEnd &&
                tempEnd.getDate() === item.day &&
                tempEnd.getMonth() === item.month &&
                tempEnd.getFullYear() === item.year;

              const effectiveEnd = tempEnd || (selectionStep === 'end' ? hoverDate : null);
              const inRange =
                tempStart &&
                effectiveEnd &&
                itemDate > tempStart &&
                itemDate < effectiveEnd;

              let dayStyle = 'text-slate-900 font-bold hover:bg-indigo-50 hover:text-indigo-700';
              if (isStart || isEnd) {
                dayStyle = 'bg-indigo-600 text-white font-extrabold shadow-md shadow-indigo-600/30 scale-105';
              } else if (inRange) {
                dayStyle = 'bg-indigo-50 text-indigo-800 font-bold rounded-none';
              } else if (!item.isCurrentMonth) {
                dayStyle = 'text-slate-400 font-medium hover:bg-slate-100 hover:text-slate-700';
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={disabledDay}
                  onMouseEnter={() => selectionStep === 'end' && setHoverDate(itemDate)}
                  onClick={() => handleDateClick(itemDate)}
                  className={`h-7.5 w-7.5 mx-auto text-xs rounded-lg flex items-center justify-center transition-all ${dayStyle} ${
                    disabledDay ? 'opacity-25 cursor-not-allowed' : ''
                  }`}
                >
                  {item.day}
                </button>
              );
            })}
          </div>

          {/* Footer Active Range Display */}
          <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100 text-xs">
            <span className="text-[11px] text-slate-700 font-bold font-mono">
              {tempStart ? formatDate(tempStart) : '—'} <ArrowRight className="w-3 h-3 inline mx-0.5 text-indigo-600" />{' '}
              {tempEnd ? formatDate(tempEnd) : '—'}
            </span>
            {clearable && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900"
              >
                Clear
              </button>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default DateRangePicker;

