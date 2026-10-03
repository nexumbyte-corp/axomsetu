import React, { useState, useEffect, useRef, useReducer, useCallback } from 'react';
import {
  Calculator as CalcIcon,
  X,
  Minus,
  Maximize2,
  Copy,
  Check,
  RotateCcw,
  History,
  Delete,
  GripHorizontal,
} from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext.jsx';

// Math precision helper to prevent 0.1 + 0.2 = 0.30000000000000004
const cleanNumber = (val) => {
  if (val === null || val === undefined || isNaN(val) || !isFinite(val)) {
    return 'Error';
  }
  // Eliminate floating point round-off inaccuracies
  const num = Number(parseFloat(val.toPrecision(12)).toFixed(10));
  return String(num);
};

// Format numeric string with thousand separators
const formatDisplay = (val) => {
  if (val === null || val === undefined || val === '') return '0';
  const str = String(val);
  if (str === 'Error' || str === 'Cannot divide by zero') return str;
  if (str === '-') return '-';
  if (str.includes('e') || str.includes('E')) return str;

  const parts = str.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];

  const isNegative = integerPart.startsWith('-');
  const rawInt = isNegative ? integerPart.slice(1) : integerPart;
  const formattedInt = (isNegative ? '-' : '') + (rawInt.replace(/\B(?=(\d{3})+(?!\d))/g, ',') || '0');

  if (parts.length > 1) {
    return `${formattedInt}.${decimalPart}`;
  }
  return formattedInt;
};

// Operator display symbol
const getOpSymbol = (op) => {
  switch (op) {
    case '+': return '+';
    case '-': return '−';
    case '*': return '×';
    case '/': return '÷';
    default: return op || '';
  }
};

// Calculation engine
const compute = (a, b, op) => {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return b !== 0 ? a / b : null;
    default: return b;
  }
};

const initialCalcState = {
  display: '0',
  prevValue: null,
  operator: null,
  formula: '',
  waitingForOperand: false,
  history: [],
};

const calcReducer = (state, action) => {
  switch (action.type) {
    case 'INPUT_DIGIT': {
      const digit = action.payload;
      const isError = state.display === 'Error' || state.display === 'Cannot divide by zero';

      if (isError || state.waitingForOperand) {
        return {
          ...state,
          display: digit,
          waitingForOperand: false,
        };
      }

      if (state.display === '0') {
        return {
          ...state,
          display: digit,
        };
      }

      if (state.display === '-0') {
        return {
          ...state,
          display: '-' + digit,
        };
      }

      // Max 15 digits to avoid overflow
      if (state.display.replace(/[^0-9]/g, '').length >= 15) {
        return state;
      }

      return {
        ...state,
        display: state.display + digit,
      };
    }

    case 'INPUT_DECIMAL': {
      const isError = state.display === 'Error' || state.display === 'Cannot divide by zero';

      if (isError || state.waitingForOperand) {
        return {
          ...state,
          display: '0.',
          waitingForOperand: false,
        };
      }

      if (!state.display.includes('.')) {
        return {
          ...state,
          display: state.display + '.',
        };
      }

      return state;
    }

    case 'SET_OPERATOR': {
      const newOp = action.payload;
      const isError = state.display === 'Error' || state.display === 'Cannot divide by zero';
      if (isError) return state;

      const current = parseFloat(state.display);

      // If operator was just set and user changes mind
      if (state.operator !== null && state.waitingForOperand) {
        return {
          ...state,
          operator: newOp,
          formula: `${formatDisplay(state.prevValue)} ${getOpSymbol(newOp)}`,
        };
      }

      // If chaining calculations (e.g. 5 + 3 + 2)
      if (state.prevValue !== null && state.operator !== null) {
        const computed = compute(state.prevValue, current, state.operator);
        if (computed === null) {
          return {
            ...state,
            display: 'Cannot divide by zero',
            formula: `${formatDisplay(state.prevValue)} ÷ 0 =`,
            prevValue: null,
            operator: null,
            waitingForOperand: true,
          };
        }

        const cleanRes = cleanNumber(computed);
        const eqStr = `${formatDisplay(state.prevValue)} ${getOpSymbol(state.operator)} ${formatDisplay(current)} =`;
        const newHistory = [{ equation: eqStr, result: cleanRes, id: Date.now() }, ...state.history].slice(0, 15);

        return {
          ...state,
          display: cleanRes,
          prevValue: computed,
          operator: newOp,
          formula: `${formatDisplay(cleanRes)} ${getOpSymbol(newOp)}`,
          waitingForOperand: true,
          history: newHistory,
        };
      }

      // First operator
      return {
        ...state,
        prevValue: current,
        operator: newOp,
        formula: `${formatDisplay(state.display)} ${getOpSymbol(newOp)}`,
        waitingForOperand: true,
      };
    }

    case 'EQUALS': {
      if (state.operator === null || state.prevValue === null) {
        return state;
      }

      const current = parseFloat(state.display);
      if (state.operator === '/' && current === 0) {
        return {
          ...state,
          display: 'Cannot divide by zero',
          formula: `${formatDisplay(state.prevValue)} ÷ 0 =`,
          prevValue: null,
          operator: null,
          waitingForOperand: true,
        };
      }

      const computed = compute(state.prevValue, current, state.operator);
      const cleanRes = cleanNumber(computed);
      const eqStr = `${formatDisplay(state.prevValue)} ${getOpSymbol(state.operator)} ${formatDisplay(current)} =`;
      const newHistory = [{ equation: eqStr, result: cleanRes, id: Date.now() }, ...state.history].slice(0, 15);

      return {
        ...state,
        display: cleanRes,
        formula: eqStr,
        prevValue: null,
        operator: null,
        waitingForOperand: true,
        history: newHistory,
      };
    }

    case 'PERCENTAGE': {
      const isError = state.display === 'Error' || state.display === 'Cannot divide by zero';
      if (isError) return state;

      const current = parseFloat(state.display);
      let percentVal;

      if (state.prevValue !== null && (state.operator === '+' || state.operator === '-')) {
        percentVal = (state.prevValue * current) / 100;
      } else {
        percentVal = current / 100;
      }

      return {
        ...state,
        display: cleanNumber(percentVal),
        waitingForOperand: false,
      };
    }

    case 'TOGGLE_SIGN': {
      const isError = state.display === 'Error' || state.display === 'Cannot divide by zero';
      if (isError || state.display === '0') return state;

      if (state.display.startsWith('-')) {
        return {
          ...state,
          display: state.display.slice(1),
        };
      } else {
        return {
          ...state,
          display: '-' + state.display,
        };
      }
    }

    case 'CLEAR_ENTRY': {
      return {
        ...state,
        display: '0',
      };
    }

    case 'ALL_CLEAR': {
      return {
        ...state,
        display: '0',
        prevValue: null,
        operator: null,
        formula: '',
        waitingForOperand: false,
      };
    }

    case 'BACKSPACE': {
      const isError = state.display === 'Error' || state.display === 'Cannot divide by zero';
      if (isError || state.waitingForOperand) return state;

      if (state.display.length === 1 || (state.display.length === 2 && state.display.startsWith('-'))) {
        return {
          ...state,
          display: '0',
        };
      }

      return {
        ...state,
        display: state.display.slice(0, -1),
      };
    }

    case 'RESTORE_HISTORY': {
      return {
        ...state,
        display: action.payload.result,
        formula: `Restored: ${action.payload.equation}`,
        waitingForOperand: true,
      };
    }

    case 'CLEAR_HISTORY': {
      return {
        ...state,
        history: [],
      };
    }

    default:
      return state;
  }
};

export const CalculatorWidget = () => {
  const { isOpen, isMinimized, closeCalculator, toggleMinimize } = useCalculator();
  const [calcState, dispatch] = useReducer(calcReducer, initialCalcState);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);

  // Dragging state
  const [position, setPosition] = useState(null); // { x, y }
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const widgetRef = useRef(null);

  // Copy result to clipboard
  const handleCopy = () => {
    if (calcState.display && calcState.display !== 'Error' && calcState.display !== 'Cannot divide by zero') {
      navigator.clipboard.writeText(calcState.display).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      // Don't intercept if user is typing into an input field on the page
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isEditable = document.activeElement?.isContentEditable;
      if (
        (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select' || isEditable) &&
        !widgetRef.current?.contains(document.activeElement)
      ) {
        return;
      }

      const key = e.key;

      if (/^[0-9]$/.test(key)) {
        e.preventDefault();
        dispatch({ type: 'INPUT_DIGIT', payload: key });
      } else if (key === '.') {
        e.preventDefault();
        dispatch({ type: 'INPUT_DECIMAL' });
      } else if (key === '+' || key === '-') {
        e.preventDefault();
        dispatch({ type: 'SET_OPERATOR', payload: key });
      } else if (key === '*' || key.toLowerCase() === 'x') {
        e.preventDefault();
        dispatch({ type: 'SET_OPERATOR', payload: '*' });
      } else if (key === '/') {
        e.preventDefault();
        dispatch({ type: 'SET_OPERATOR', payload: '/' });
      } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        dispatch({ type: 'EQUALS' });
      } else if (key === 'Backspace') {
        e.preventDefault();
        dispatch({ type: 'BACKSPACE' });
      } else if (key === 'Escape') {
        e.preventDefault();
        dispatch({ type: 'ALL_CLEAR' });
      } else if (key.toLowerCase() === 'c') {
        e.preventDefault();
        if (calcState.display !== '0') {
          dispatch({ type: 'CLEAR_ENTRY' });
        } else {
          dispatch({ type: 'ALL_CLEAR' });
        }
      } else if (key === '%') {
        e.preventDefault();
        dispatch({ type: 'PERCENTAGE' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, calcState.display]);

  // Drag listeners
  const startDrag = (e) => {
    // Only drag with left mouse button or touch
    if (e.button && e.button !== 0) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    if (!widgetRef.current) return;
    const rect = widgetRef.current.getBoundingClientRect();
    dragOffsetRef.current = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const widgetWidth = widgetRef.current?.offsetWidth || 300;
      const widgetHeight = widgetRef.current?.offsetHeight || 380;

      // Constrain within viewport
      const minX = 8;
      const maxX = window.innerWidth - widgetWidth - 8;
      const minY = 60; // below sticky header
      const maxY = window.innerHeight - widgetHeight - 8;

      const targetX = clientX - dragOffsetRef.current.x;
      const targetY = clientY - dragOffsetRef.current.y;

      const boundedX = Math.max(minX, Math.min(maxX, targetX));
      const boundedY = Math.max(minY, Math.min(maxY, targetY));

      setPosition({ x: boundedX, y: boundedY });
    };

    const onEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onEnd);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isDragging]);

  // Double click header to reset to top-right default
  const handleResetPosition = () => {
    setPosition(null);
  };

  if (!isOpen) return null;

  // Minimized Widget View
  if (isMinimized) {
    return (
      <div
        ref={widgetRef}
        style={position ? { top: `${position.y}px`, left: `${position.x}px` } : undefined}
        className={`fixed ${!position ? 'top-16 sm:top-18 right-3 sm:right-6 md:right-8' : ''} z-40 select-none animate-in fade-in zoom-in-95 duration-150`}
      >
        <div className="bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl rounded-full pl-3 pr-2 py-1.5 flex items-center gap-2.5 text-slate-800">
          <div
            onMouseDown={startDrag}
            onTouchStart={startDrag}
            className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing text-indigo-600 font-bold text-xs"
            title="Drag to reposition (Double-click to reset)"
            onDoubleClick={handleResetPosition}
          >
            <GripHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <CalcIcon className="w-3.5 h-3.5" />
          </div>

          <div
            onClick={toggleMinimize}
            className="cursor-pointer font-mono font-bold text-xs sm:text-sm text-slate-900 max-w-[120px] truncate"
            title="Click to expand calculator"
          >
            {formatDisplay(calcState.display)}
          </div>

          <div className="flex items-center gap-1 border-l border-slate-200 pl-1.5">
            <button
              type="button"
              onClick={toggleMinimize}
              className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
              title="Expand Calculator"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={closeCalculator}
              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Close Calculator"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isClearEntry = calcState.display !== '0';

  return (
    <div
      ref={widgetRef}
      style={position ? { top: `${position.y}px`, left: `${position.x}px` } : undefined}
      className={`fixed ${!position ? 'top-16 sm:top-18 right-3 sm:right-6 md:right-8' : ''} z-40 w-76 sm:w-80 select-none shadow-2xl rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 overflow-hidden animate-in fade-in zoom-in-95 duration-150 transition-shadow`}
    >
      {/* Widget Header */}
      <div
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        onDoubleClick={handleResetPosition}
        className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 cursor-grab active:cursor-grabbing select-none"
        title="Drag to reposition (Double-click to reset top-right)"
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className="w-4 h-4 text-slate-400" />
          <div className="flex items-center gap-1.5">
            <CalcIcon className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-800 tracking-wide">Calculator</span>
          </div>
        </div>

        {/* Header Controls */}
        <div className="flex items-center gap-1">
          {/* History Toggle */}
          <button
            type="button"
            onClick={() => setShowHistory((prev) => !prev)}
            className={`p-1.5 rounded-lg transition-colors ${
              showHistory
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
            }`}
            title={showHistory ? 'Show Keypad' : 'Calculation History'}
          >
            <History className="w-3.5 h-3.5" />
          </button>

          {/* Copy Current Display */}
          <button
            type="button"
            onClick={handleCopy}
            className={`p-1.5 rounded-lg transition-colors ${
              copied
                ? 'bg-emerald-100 text-emerald-700'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
            }`}
            title={copied ? 'Copied to clipboard!' : 'Copy Result'}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Minimize */}
          <button
            type="button"
            onClick={toggleMinimize}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={closeCalculator}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Close Calculator"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-3 sm:p-3.5">
        {/* Modern Clean Light Calculator Screen */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 sm:p-3.5 mb-3 shadow-inner relative overflow-hidden flex flex-col justify-between min-h-[86px]">
          {/* Subtle status indicator & formula */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono font-medium">
            <span className="truncate max-w-[190px]">
              {calcState.formula || (calcState.prevValue !== null ? `${formatDisplay(calcState.prevValue)} ${getOpSymbol(calcState.operator)}` : '')}
            </span>
            {calcState.operator && (
              <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold border border-indigo-200/60 text-[10px]">
                {getOpSymbol(calcState.operator)}
              </span>
            )}
          </div>

          {/* Large Result Display */}
          <div className="text-right overflow-x-auto overflow-y-hidden select-all mt-1">
            <span
              className={`font-mono tracking-tight font-extrabold transition-all ${
                calcState.display === 'Error' || calcState.display === 'Cannot divide by zero'
                  ? 'text-rose-600 text-sm sm:text-base'
                  : calcState.display.length > 10
                  ? 'text-xl sm:text-2xl text-slate-900'
                  : 'text-2xl sm:text-3xl text-slate-900'
              }`}
            >
              {formatDisplay(calcState.display)}
            </span>
          </div>
        </div>

        {/* History Panel or Standard Keypad */}
        {showHistory ? (
          <div className="h-[268px] flex flex-col justify-between bg-slate-50/80 rounded-xl p-2 border border-slate-200">
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-200 px-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <span>Recent History</span>
              {calcState.history.length > 0 && (
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'CLEAR_HISTORY' })}
                  className="text-[10px] text-rose-600 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Delete className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            <div className="overflow-y-auto flex-1 space-y-1.5 pr-1">
              {calcState.history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-8">
                  <RotateCcw className="w-6 h-6 mb-1 text-slate-300 stroke-[1.5]" />
                  <span>No calculations yet</span>
                </div>
              ) : (
                calcState.history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      dispatch({ type: 'RESTORE_HISTORY', payload: item });
                      setShowHistory(false);
                    }}
                    className="p-2 rounded-lg bg-white border border-slate-200/80 hover:border-indigo-300 hover:bg-indigo-50/50 cursor-pointer transition-all text-right group"
                    title="Click to load into calculator"
                  >
                    <div className="text-[11px] text-slate-400 font-mono truncate">{item.equation}</div>
                    <div className="text-sm font-bold text-slate-800 font-mono group-hover:text-indigo-600">
                      {formatDisplay(item.result)}
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowHistory(false)}
              className="mt-2 w-full py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              Back to Keypad
            </button>
          </div>
        ) : (
          /* Standard Calculator Keypad */
          <div className="grid grid-cols-4 gap-1.5">
            {/* Row 1: Clear / Sign / Percent / Divide */}
            <button
              type="button"
              onClick={() => dispatch({ type: isClearEntry ? 'CLEAR_ENTRY' : 'ALL_CLEAR' })}
              className="py-2.5 sm:py-3 rounded-xl bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-800 border border-amber-200/60 font-bold text-xs sm:text-sm transition-transform active:scale-95 cursor-pointer shadow-2xs"
              title={isClearEntry ? 'Clear Current Entry (C)' : 'Clear All (AC)'}
            >
              {isClearEntry ? 'C' : 'AC'}
            </button>

            <button
              type="button"
              onClick={() => dispatch({ type: 'TOGGLE_SIGN' })}
              className="py-2.5 sm:py-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-semibold text-xs sm:text-sm transition-transform active:scale-95 cursor-pointer shadow-2xs"
              title="Toggle Sign (+/-)"
            >
              +/−
            </button>

            <button
              type="button"
              onClick={() => dispatch({ type: 'PERCENTAGE' })}
              className="py-2.5 sm:py-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-semibold text-xs sm:text-sm transition-transform active:scale-95 cursor-pointer shadow-2xs"
              title="Percentage (%)"
            >
              %
            </button>

            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_OPERATOR', payload: '/' })}
              className={`py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base transition-transform active:scale-95 cursor-pointer shadow-2xs ${
                calcState.operator === '/'
                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100/70'
              }`}
              title="Divide (÷)"
            >
              ÷
            </button>

            {/* Row 2: 7 / 8 / 9 / Multiply */}
            <button
              type="button"
              onClick={() => dispatch({ type: 'INPUT_DIGIT', payload: '7' })}
              className="py-2.5 sm:py-3 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-bold text-sm sm:text-base border border-slate-200/90 shadow-2xs transition-transform active:scale-95 cursor-pointer"
            >
              7
            </button>

            <button
              type="button"
              onClick={() => dispatch({ type: 'INPUT_DIGIT', payload: '8' })}
              className="py-2.5 sm:py-3 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-bold text-sm sm:text-base border border-slate-200/90 shadow-2xs transition-transform active:scale-95 cursor-pointer"
            >
              8
            </button>

            <button
              type="button"
              onClick={() => dispatch({ type: 'INPUT_DIGIT', payload: '9' })}
              className="py-2.5 sm:py-3 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-bold text-sm sm:text-base border border-slate-200/90 shadow-2xs transition-transform active:scale-95 cursor-pointer"
            >
              9
            </button>

            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_OPERATOR', payload: '*' })}
              className={`py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base transition-transform active:scale-95 cursor-pointer shadow-2xs ${
                calcState.operator === '*'
                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100/70'
              }`}
              title="Multiply (×)"
            >
              ×
            </button>

            {/* Row 3: 4 / 5 / 6 / Subtract */}
            <button
              type="button"
              onClick={() => dispatch({ type: 'INPUT_DIGIT', payload: '4' })}
              className="py-2.5 sm:py-3 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-bold text-sm sm:text-base border border-slate-200/90 shadow-2xs transition-transform active:scale-95 cursor-pointer"
            >
              4
            </button>

            <button
              type="button"
              onClick={() => dispatch({ type: 'INPUT_DIGIT', payload: '5' })}
              className="py-2.5 sm:py-3 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-bold text-sm sm:text-base border border-slate-200/90 shadow-2xs transition-transform active:scale-95 cursor-pointer"
            >
              5
            </button>

            <button
              type="button"
              onClick={() => dispatch({ type: 'INPUT_DIGIT', payload: '6' })}
              className="py-2.5 sm:py-3 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-bold text-sm sm:text-base border border-slate-200/90 shadow-2xs transition-transform active:scale-95 cursor-pointer"
            >
              6
            </button>

            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_OPERATOR', payload: '-' })}
              className={`py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base transition-transform active:scale-95 cursor-pointer shadow-2xs ${
                calcState.operator === '-'
                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100/70'
              }`}
              title="Subtract (−)"
            >
              −
            </button>

            {/* Row 4: 1 / 2 / 3 / Add */}
            <button
              type="button"
              onClick={() => dispatch({ type: 'INPUT_DIGIT', payload: '1' })}
              className="py-2.5 sm:py-3 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-bold text-sm sm:text-base border border-slate-200/90 shadow-2xs transition-transform active:scale-95 cursor-pointer"
            >
              1
            </button>

            <button
              type="button"
              onClick={() => dispatch({ type: 'INPUT_DIGIT', payload: '2' })}
              className="py-2.5 sm:py-3 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-bold text-sm sm:text-base border border-slate-200/90 shadow-2xs transition-transform active:scale-95 cursor-pointer"
            >
              2
            </button>

            <button
              type="button"
              onClick={() => dispatch({ type: 'INPUT_DIGIT', payload: '3' })}
              className="py-2.5 sm:py-3 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-bold text-sm sm:text-base border border-slate-200/90 shadow-2xs transition-transform active:scale-95 cursor-pointer"
            >
              3
            </button>

            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_OPERATOR', payload: '+' })}
              className={`py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base transition-transform active:scale-95 cursor-pointer shadow-2xs ${
                calcState.operator === '+'
                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100/70'
              }`}
              title="Add (+)"
            >
              +
            </button>

            {/* Row 5: 0 / Decimal / Backspace / Equals */}
            <button
              type="button"
              onClick={() => dispatch({ type: 'INPUT_DIGIT', payload: '0' })}
              className="py-2.5 sm:py-3 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-bold text-sm sm:text-base border border-slate-200/90 shadow-2xs transition-transform active:scale-95 cursor-pointer"
            >
              0
            </button>

            <button
              type="button"
              onClick={() => dispatch({ type: 'INPUT_DECIMAL' })}
              className="py-2.5 sm:py-3 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-bold text-base border border-slate-200/90 shadow-2xs transition-transform active:scale-95 cursor-pointer"
              title="Decimal (.)"
            >
              .
            </button>

            <button
              type="button"
              onClick={() => dispatch({ type: 'BACKSPACE' })}
              className="py-2.5 sm:py-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-2xs"
              title="Backspace / Delete"
            >
              <Delete className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => dispatch({ type: 'EQUALS' })}
              className="py-2.5 sm:py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-extrabold text-base sm:text-lg shadow-md shadow-indigo-600/20 transition-transform active:scale-95 cursor-pointer"
              title="Equals (= or Enter)"
            >
              =
            </button>
          </div>
        )}

        {/* Keyboard shortcut hint banner */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            Keyboard active
          </span>
          <span className="font-sans">Enter = &bull; Esc AC</span>
        </div>
      </div>
    </div>
  );
};
