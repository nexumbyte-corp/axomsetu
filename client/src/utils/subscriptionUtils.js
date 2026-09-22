/**
 * Helper utility for detecting and parsing subscription student limit errors.
 */

export const isStudentLimitError = (err) => {
  if (!err) return false;
  const msg = typeof err === 'string' ? err : err?.message || '';
  const lower = msg.toLowerCase();

  return (
    lower.includes('student limit reached') ||
    (lower.includes('maximum of') && lower.includes('active students')) ||
    (lower.includes('student limit') && lower.includes('subscription'))
  );
};

export const parseStudentLimitError = (err, fallbackSubscription = null) => {
  const msg = typeof err === 'string' ? err : err?.message || '';

  // Extract using regex from backend message format:
  // "Student limit reached. Your subscription plan 'Free Trial' allows a maximum of 300 active students. Current active students: 300. Please upgrade your subscription plan."
  const planMatch = msg.match(/plan ['"]([^'"]+)['"]/i);
  const maxMatch = msg.match(/maximum of (\d+) active students/i);
  const currentMatch = msg.match(/Current active students: (\d+)/i);

  const planName = planMatch
    ? planMatch[1]
    : fallbackSubscription?.planNameSnapshot || fallbackSubscription?.name || 'Free Trial';

  const maxStudents = maxMatch
    ? parseInt(maxMatch[1], 10)
    : fallbackSubscription?.maxStudentLimitSnapshot ?? fallbackSubscription?.maxStudentLimit ?? 100;

  const currentStudents = currentMatch
    ? parseInt(currentMatch[1], 10)
    : maxStudents;

  return {
    planName,
    maxStudents,
    currentStudents,
    rawMessage: msg,
  };
};

/**
 * Calculates per month cost automatically based on finalPrice and plan duration.
 * @param {Object} plan - Subscription plan object
 * @returns {number} Calculated per month cost rounded to nearest integer
 */
export const calculateMonthlyPrice = (plan) => {
  if (!plan) return 0;
  const finalPrice = Number(plan.finalPrice ?? plan.basePrice ?? 0);
  if (finalPrice <= 0) return 0;

  const durationVal = Number(plan.durationValue) || 1;
  const durationUnit = (plan.durationUnit || 'MONTH').toUpperCase();

  let totalMonths = 1;
  if (durationUnit === 'YEAR') {
    totalMonths = durationVal * 12;
  } else if (durationUnit === 'MONTH') {
    totalMonths = durationVal;
  } else if (durationUnit === 'DAY') {
    totalMonths = durationVal / 30;
  }

  if (totalMonths <= 0) return finalPrice;
  return Math.round(finalPrice / totalMonths);
};

