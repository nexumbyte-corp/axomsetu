/**
 * Helper utility to determine if a staff member is operationally active.
 *
 * Operational staff are active or on leave.
 * Staff members who are RESIGNED, TERMINATED, RETIRED, or SUSPENDED are not operationally active
 * and must not appear in normal monthly salary preparation.
 *
 * @param {Object} staff
 * @returns {Boolean}
 */
export const isStaffOperationallyActive = (staff) => {
  if (!staff || !staff.status) return false;
  const statusUpper = String(staff.status).toUpperCase();
  const nonOperational = ['INACTIVE', 'RESIGNED', 'TERMINATED', 'RETIRED', 'SUSPENDED'];
  return !nonOperational.includes(statusUpper);
};

const FEE_MONTH_INDEX_MAP = {
  JANUARY: 0,
  FEBRUARY: 1,
  MARCH: 2,
  APRIL: 3,
  MAY: 4,
  JUNE: 5,
  JULY: 6,
  AUGUST: 7,
  SEPTEMBER: 8,
  OCTOBER: 9,
  NOVEMBER: 10,
  DECEMBER: 11,
};

export const FEE_MONTHS_LIST = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];

/**
 * Returns the start date and end date for a given FeeMonth and Year.
 * Example: getMonthDateRange('AUGUST', 2026) -> { start: 2026-08-01, end: 2026-08-31T23:59:59.999Z }
 */
const getMonthDateRange = (month, year) => {
  const monthIdx = FEE_MONTH_INDEX_MAP[month?.toUpperCase()] ?? 0;
  const yr = Number(year) || new Date().getFullYear();

  const start = new Date(Date.UTC(yr, monthIdx, 1, 0, 0, 0));
  // Last day of the month
  const end = new Date(Date.UTC(yr, monthIdx + 1, 0, 23, 59, 59, 999));

  return { start, end };
};

/**
 * Checks whether a staff member was employed during a given month/year based on joiningDate and leavingDate.
 */
export const isStaffEligibleForMonth = (staff, month, year) => {
  if (!isStaffOperationallyActive(staff)) return false;

  const { start, end } = getMonthDateRange(month, year);

  if (staff.joiningDate) {
    const jDate = new Date(staff.joiningDate);
    if (jDate > end) {
      // Joined after the month ended
      return false;
    }
  }

  if (staff.leavingDate) {
    const lDate = new Date(staff.leavingDate);
    if (lDate < start) {
      // Left before the month started
      return false;
    }
  }

  return true;
};
