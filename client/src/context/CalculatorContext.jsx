import React, { createContext, useContext, useState, useEffect } from 'react';

const CalculatorContext = createContext({
  isOpen: false,
  isMinimized: false,
  openCalculator: () => {},
  closeCalculator: () => {},
  toggleCalculator: () => {},
  setIsMinimized: () => {},
  toggleMinimize: () => {},
});

export const CalculatorProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(() => {
    try {
      return sessionStorage.getItem('axomsetu_calculator_open') === 'true';
    } catch {
      return false;
    }
  });

  const [isMinimized, setIsMinimized] = useState(() => {
    try {
      return sessionStorage.getItem('axomsetu_calculator_minimized') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('axomsetu_calculator_open', isOpen);
    } catch (e) {
      console.warn('Session storage error:', e);
    }
  }, [isOpen]);

  useEffect(() => {
    try {
      sessionStorage.setItem('axomsetu_calculator_minimized', isMinimized);
    } catch (e) {
      console.warn('Session storage error:', e);
    }
  }, [isMinimized]);

  const openCalculator = () => setIsOpen(true);
  const closeCalculator = () => setIsOpen(false);
  const toggleCalculator = () => setIsOpen((prev) => !prev);
  const toggleMinimize = () => setIsMinimized((prev) => !prev);

  return (
    <CalculatorContext.Provider
      value={{
        isOpen,
        isMinimized,
        openCalculator,
        closeCalculator,
        toggleCalculator,
        setIsMinimized,
        toggleMinimize,
      }}
    >
      {children}
    </CalculatorContext.Provider>
  );
};

export const useCalculator = () => useContext(CalculatorContext);
