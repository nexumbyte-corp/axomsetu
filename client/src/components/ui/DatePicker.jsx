import React, { useState, useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
} from 'lucide-react';
import { formatDate, parseDateSafe, formatDateForInput } from '../../utils/formatters.js';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const DAYS_OF_WEEK = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/**
 * Modern, Responsive, High-Contrast DatePicker Component
 * Presentation format: DD-MM-YYYY (e.g. 21-08-2026)
 * Internal/API value: YYYY-MM-DD
 * Uses React Portal for zero clipping by parent containers
 */
export const DatePicker = ({
  value = '',
  onChange,
  label,
  error,
  helperText,
  required = false,
  disabled = false,
  placeholder = 'DD-MM-YYYY',
  minDate,
  maxDate,
  clearable = true,
  isDob = false,
  className = '',
  labelClassName = '',
  id,
  name,
}) => {
  const generatedId = useId();
  const inputId = id || name || generatedId;
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const popoverRef = useRef(null);

  // Parse current value
  const parsedValue = parseDateSafe(value);
  const displayValue = parsedValue ? formatDate(parsedValue) : '';

  // Internal input text state for controlled manual typing
  const [inputText, setInputText] = useState(displayValue);
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState('days'); // 'days' | 'months' | 'years'
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });

  // View state for calendar (month & year being viewed)
  const today = new Date();
  const initialViewDate = parsedValue || (isDob ? new Date(today.getFullYear() - 15, today.getMonth(), 1) : today);
  const [viewYear, setViewYear] = useState(initialViewDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialViewDate.getMonth());
  const [yearGridStart, setYearGridStart] = useState(Math.floor(initialViewDate.getFullYear() / 12) * 12);

  // Calculate portal popover coordinates
  const updatePosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const popoverHeight = 340;
      const popoverWidth = 320;

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

  // Sync display text when value prop changes
  useEffect(() => {
    if (parsedValue) {
      setInputText(formatDate(parsedValue));
      setViewYear(parsedValue.getFullYear());
      setViewMonth(parsedValue.getMonth());
      setYearGridStart(Math.floor(parsedValue.getFullYear() / 12) * 12);
    } else {
      setInputText('');
    }
  }, [value]);

  // Clean label to prevent duplicate asterisks
  const cleanedLabel = label ? label.replace(/\s*\*+$/, '') : '';

  // Click outside to close (handles portal element)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target) &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setViewMode('days');
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
  }, [isOpen]);

  // Constraints
  const parsedMin = parseDateSafe(minDate);
  const parsedMax = isDob ? (parseDateSafe(maxDate) || today) : parseDateSafe(maxDate);

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

  const handleSelectDate = (date) => {
    if (isDateDisabled(date)) return;
    const isoString = formatDateForInput(date);
    if (onChange) {
      onChange({ target: { name, value: isoString } }, isoString, date);
      if (typeof onChange === 'function' && onChange.length <= 1) {
        try {
          onChange(isoString, date);
        } catch {
          // Handled
        }
      }
    }
    setInputText(formatDate(date));
    setIsOpen(false);
    setViewMode('days');
  };

  const handleClear = (e) => {
    e?.stopPropagation();
    if (disabled) return;
    if (onChange) {
      onChange({ target: { name, value: '' } }, '', null);
      if (typeof onChange === 'function' && onChange.length <= 1) {
        try {
          onChange('', null);
        } catch {
          // Handled
        }
      }
    }
    setInputText('');
    setIsOpen(false);
  };

  const handleToday = (e) => {
    e?.stopPropagation();
    if (isDateDisabled(today)) return;
    handleSelectDate(today);
  };

  // Controlled manual input handling with DD-MM-YYYY mask
  const handleInputChange = (e) => {
    const rawVal = e.target.value;
    const cleaned = rawVal.replace(/[^\d-]/g, '');
    setInputText(cleaned);

    const match = cleaned.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (match) {
      const d = parseInt(match[1], 10);
      const m = parseInt(match[2], 10) - 1;
      const y = parseInt(match[3], 10);
      const candidateDate = new Date(y, m, d);
      if (
        candidateDate.getFullYear() === y &&
        candidateDate.getMonth() === m &&
        candidateDate.getDate() === d &&
        !isDateDisabled(candidateDate)
      ) {
        const isoString = formatDateForInput(candidateDate);
        if (onChange) {
          onChange({ target: { name, value: isoString } }, isoString, candidateDate);
        }
        setViewYear(y);
        setViewMonth(m);
      }
    } else if (cleaned === '') {
      if (onChange) {
        onChange({ target: { name, value: '' } }, '', null);
      }
    }
  };

  const handleInputBlur = () => {
    if (parsedValue) {
      setInputText(formatDate(parsedValue));
    } else if (inputText !== '') {
      const candidate = parseDateSafe(inputText);
      if (candidate && !isDateDisabled(candidate)) {
        handleSelectDate(candidate);
      } else {
        setInputText('');
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setViewMode('days');
    } else if (e.key === 'Enter') {
      if (!isOpen) {
        setIsOpen(true);
      } else if (inputText) {
        const candidate = parseDateSafe(inputText);
        if (candidate && !isDateDisabled(candidate)) {
          handleSelectDate(candidate);
        }
      }
    }
  };

  // Calendar Grid Builder
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfWeek = (year, month) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Monday as first day
  };

  const daysInCurrentMonth = getDaysInMonth(viewYear, viewMonth);
  const daysInPrevMonth = getDaysInMonth(viewYear, viewMonth - 1);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);

  const prevMonthDays = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    prevMonthDays.push({
      day: daysInPrevMonth - i,
      month: viewMonth - 1,
      year: viewYear,
      isCurrentMonth: false,
    });
  }

  const currentMonthDays = [];
  for (let i = 1; i <= daysInCurrentMonth; i++) {
    currentMonthDays.push({
      day: i,
      month: viewMonth,
      year: viewYear,
      isCurrentMonth: true,
    });
  }

  const totalDaysSoFar = prevMonthDays.length + currentMonthDays.length;
  const nextMonthDaysCount = totalDaysSoFar % 7 === 0 ? 0 : 7 - (totalDaysSoFar % 7);
  const nextMonthDays = [];
  for (let i = 1; i <= nextMonthDaysCount; i++) {
    nextMonthDays.push({
      day: i,
      month: viewMonth + 1,
      year: viewYear,
      isCurrentMonth: false,
    });
  }

  const allCalendarDays = [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];

  // Navigation handlers
  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  return (
    <div className={`w-full relative ${className}`} ref={containerRef}>
      {cleanedLabel && (
        <label htmlFor={inputId} className={`block text-xs font-bold uppercase tracking-wider mb-1 text-slate-700 ${labelClassName}`}>
          {cleanedLabel}
          {required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative rounded-lg shadow-2xs">
        {/* Left Calendar Icon - Click to toggle */}
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className="absolute inset-y-0 left-0 pl-3 flex items-center cursor-pointer text-indigo-600 hover:text-indigo-800 transition-colors disabled:cursor-not-allowed"
        >
          <CalendarIcon className="w-4 h-4 shrink-0" />
        </button>

        {/* Text Input */}
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="text"
          disabled={disabled}
          placeholder={placeholder}
          value={inputText}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          onClick={() => !disabled && setIsOpen(true)}
          className={`w-full rounded-lg border text-xs font-semibold font-mono transition-all duration-150 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 disabled:cursor-not-allowed pl-9 pr-8 py-2 bg-white text-slate-900 placeholder:text-slate-400 placeholder:font-normal placeholder:font-sans ${
            error
              ? 'border-rose-400 text-rose-900 focus:border-rose-500 focus:ring-rose-500/20'
              : 'border-slate-300 hover:border-slate-400'
          } ${disabled ? 'bg-slate-100 text-slate-400' : ''}`}
        />

        {/* Right Action: Clear Button */}
        {clearable && inputText && !disabled && (
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Clear date"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
      {helperText && !error && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}

      {/* Floating Modern Calendar Dropdown - Portaled to document.body */}
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
            className="w-72 xs:w-76 sm:w-80 max-w-[calc(100vw-1.5rem)] rounded-2xl shadow-2xl border border-slate-200 p-3 sm:p-3.5 animate-in fade-in zoom-in-95 duration-100 text-slate-900 bg-white"
          >
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
            {/* Month / Year Clickable Switcher */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'months' ? 'days' : 'months')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors border ${
                  viewMode === 'months'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-slate-50 hover:bg-indigo-50 text-slate-900 hover:text-indigo-600 border-slate-200'
                }`}
              >
                {MONTH_NAMES[viewMonth]}
              </button>
              <button
                type="button"
                onClick={() => {
                  setYearGridStart(Math.floor(viewYear / 12) * 12);
                  setViewMode(viewMode === 'years' ? 'days' : 'years');
                }}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors border ${
                  viewMode === 'years'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-slate-50 hover:bg-indigo-50 text-slate-900 hover:text-indigo-600 border-slate-200'
                }`}
              >
                {viewYear}
              </button>
            </div>

            {/* Previous / Next Month Navigation */}
            {viewMode === 'days' && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 hover:text-indigo-600 border border-slate-200 transition-colors"
                  title="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 hover:text-indigo-600 border border-slate-200 transition-colors"
                  title="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {viewMode === 'years' && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setYearGridStart(yearGridStart - 12)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 hover:text-indigo-600 border border-slate-200 transition-colors"
                  title="Previous 12 years"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-bold font-mono text-slate-600">
                  {yearGridStart}–{yearGridStart + 11}
                </span>
                <button
                  type="button"
                  onClick={() => setYearGridStart(yearGridStart + 12)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 hover:text-indigo-600 border border-slate-200 transition-colors"
                  title="Next 12 years"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* VIEW: Days of Month */}
          {viewMode === 'days' && (
            <div>
              {/* Weekday Labels */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                {DAYS_OF_WEEK.map((d) => (
                  <div key={d} className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-0.5">
                    {d}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {allCalendarDays.map((item, idx) => {
                  const itemDate = new Date(item.year, item.month, item.day);
                  const isCurrent =
                    today.getDate() === item.day &&
                    today.getMonth() === item.month &&
                    today.getFullYear() === item.year;

                  const isSelected =
                    parsedValue &&
                    parsedValue.getDate() === item.day &&
                    parsedValue.getMonth() === item.month &&
                    parsedValue.getFullYear() === item.year;

                  const disabledDay = isDateDisabled(itemDate);

                  let dayStyle = 'text-slate-900 hover:bg-indigo-50 hover:text-indigo-700 font-bold';
                  if (isSelected) {
                    dayStyle = 'bg-indigo-600 text-white font-extrabold shadow-md shadow-indigo-600/30';
                  } else if (isCurrent) {
                    dayStyle = 'bg-indigo-50 text-indigo-700 font-extrabold border border-indigo-400';
                  } else if (!item.isCurrentMonth) {
                    dayStyle = 'text-slate-400 font-medium hover:bg-slate-100 hover:text-slate-700';
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={disabledDay}
                      onClick={() => handleSelectDate(itemDate)}
                      className={`h-8 w-8 mx-auto text-xs rounded-lg flex items-center justify-center transition-all ${dayStyle} ${
                        disabledDay ? 'opacity-25 cursor-not-allowed hover:bg-transparent' : ''
                      }`}
                    >
                      {item.day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW: Month Selector Grid */}
          {viewMode === 'months' && (
            <div className="grid grid-cols-3 gap-2 py-1">
              {SHORT_MONTHS.map((m, idx) => {
                const isCurrentMonth = viewMonth === idx;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setViewMonth(idx);
                      setViewMode('days');
                    }}
                    className={`py-2.5 text-xs font-bold rounded-xl transition-all border ${
                      isCurrentMonth
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-800 border-slate-200'
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          )}

          {/* VIEW: Year Selector Grid (fast DOB & Historical navigation) */}
          {viewMode === 'years' && (
            <div className="grid grid-cols-3 gap-2 py-1 max-h-48 overflow-y-auto">
              {Array.from({ length: 12 }, (_, i) => yearGridStart + i).map((yr) => {
                const isSelectedYear = viewYear === yr;
                return (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => {
                      setViewYear(yr);
                      setViewMode('months');
                    }}
                    className={`py-2.5 text-xs font-bold rounded-xl transition-all font-mono border ${
                      isSelectedYear
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-800 border-slate-200'
                    }`}
                  >
                    {yr}
                  </button>
                );
              })}
            </div>
          )}

          {/* Bottom Action Footer */}
          <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={handleToday}
              disabled={isDateDisabled(today)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 disabled:opacity-30 disabled:no-underline"
            >
              Today
            </button>
            {clearable && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
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

export default DatePicker;
