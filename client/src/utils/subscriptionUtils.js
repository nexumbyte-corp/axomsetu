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
    : fallbackSubscription?.maxStudentLimitSnapshot ?? 300;

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
