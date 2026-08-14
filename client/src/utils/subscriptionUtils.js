/**
 * Centralized fixed-day subscription end date calculator for frontend UI.
 * Rules:
 * - 1 Month = strictly 30 days (N months = N * 30 days)
 * - 1 Year = strictly 365 days (N years = N * 365 days)
 * - 1 Day = strictly 1 day (N days = N * 1 days)
 * 
 * @param {Date|string} startDate - Subscription start date
 * @param {string} durationUnit - 'MONTH' | 'YEAR' | 'DAY'
 * @param {number} durationValue - Duration multiplier
 * @returns {Date} Calculated end date
 */
export const calculateSubscriptionEndDate = (startDate, durationUnit = 'MONTH', durationValue = 1) => {
  const start = startDate ? new Date(startDate) : new Date();
  const end = new Date(start.getTime());
  const val = Math.max(1, parseInt(durationValue, 10) || 1);
  const unitUpper = String(durationUnit || 'MONTH').toUpperCase();

  let daysToAdd = val * 30; // Default: 1 month = 30 days

  if (unitUpper === 'YEAR') {
    daysToAdd = val * 365;
  } else if (unitUpper === 'DAY') {
    daysToAdd = val;
  } else if (unitUpper === 'MONTH') {
    daysToAdd = val * 30;
  }

  end.setDate(end.getDate() + daysToAdd);
  return end;
};

/**
 * Format calculated date as YYYY-MM-DD for HTML date inputs.
 */
export const formatDateInput = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};
