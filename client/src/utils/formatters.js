/**
 * Standardized currency, number, and date formatters for School SaaS System.
 */

/**
 * Format monetary values in INR currency (Indian Numbering System: ₹8,45,000).
 * @param {number|string} amount 
 * @returns {string}
 */
export const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(num);
};

/**
 * Format numbers with standard comma separators (e.g. 1,248).
 * @param {number|string} num 
 * @returns {string}
 */
export const formatNumber = (num) => {
  const val = Number(num) || 0;
  return new Intl.NumberFormat('en-IN').format(val);
};

/**
 * Format dates into clean human readable representation (e.g. 09 Aug 2026).
 * @param {Date|string} date 
 * @param {object} options 
 * @returns {string}
 */
export const formatDate = (date, options = {}) => {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';

  const defaultOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  };

  return d.toLocaleDateString('en-GB', defaultOptions);
};
