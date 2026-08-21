/**
 * Indian Standard Time (IST: UTC+05:30) date & time utilities.
 * Ensures consistent timezone handling across all server modules, DB queries, and report aggregations.
 */

export const IST_TIMEZONE = 'Asia/Kolkata';
export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // +05:30 in milliseconds

/**
 * Returns current Date object in IST timezone context.
 * @param {Date|string|number} [date]
 * @returns {Date}
 */
export const getISTDate = (date = new Date()) => {
  if (!date) return new Date();
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return isNaN(d.getTime()) ? new Date() : d;
};

/**
 * Extract date parts (year, month 1-12, day, hours, minutes, seconds) in IST timezone.
 * @param {Date|string|number} [date]
 * @returns {{ year: number, month: number, day: number, hours: number, minutes: number, seconds: number }}
 */
export const getISTDateParts = (date = new Date()) => {
  const d = getISTDate(date);
  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const map = {};
  parts.forEach((p) => {
    map[p.type] = p.value;
  });

  const hourVal = parseInt(map.hour, 10);

  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10),
    day: parseInt(map.day, 10),
    hours: isNaN(hourVal) ? 0 : hourVal % 24,
    minutes: parseInt(map.minute, 10) || 0,
    seconds: parseInt(map.second, 10) || 0,
  };
};

/**
 * Returns formatted YYYY-MM-DD string for current or given date in IST.
 * @param {Date|string|number} [date]
 * @returns {string} e.g. "2026-08-22"
 */
export const getISTDateString = (date = new Date()) => {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    return date.trim();
  }
  const d = getISTDate(date);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d);
};

/**
 * Get exact start of day (00:00:00.000 IST) and end of day (23:59:59.999 IST) as Date objects for Prisma queries.
 * @param {string|Date} [date] Date string (YYYY-MM-DD) or Date object. Defaults to current IST day.
 * @returns {{ startOfDay: Date, endOfDay: Date, dateStr: string }}
 */
export const getISTDayBounds = (date) => {
  let dateStr;
  if (!date) {
    dateStr = getISTDateString();
  } else if (typeof date === 'string') {
    const trimmed = date.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      dateStr = trimmed;
    } else {
      dateStr = getISTDateString(date);
    }
  } else {
    dateStr = getISTDateString(date);
  }

  const startOfDay = new Date(`${dateStr}T00:00:00.000+05:30`);
  const endOfDay = new Date(`${dateStr}T23:59:59.999+05:30`);

  return { startOfDay, endOfDay, dateStr };
};

/**
 * Get start of month (00:00:00.000 IST on 1st) and end of month (23:59:59.999 IST on last day) in IST.
 * @param {number|Date|string} [yearOrDate]
 * @param {number} [month1Indexed] Month (1 = Jan, 12 = Dec)
 * @returns {{ startOfMonth: Date, endOfMonth: Date, year: number, month: number }}
 */
export const getISTMonthBounds = (yearOrDate, month1Indexed) => {
  let year, month;
  if (typeof yearOrDate === 'number' && typeof month1Indexed === 'number') {
    year = yearOrDate;
    month = month1Indexed;
  } else {
    const d = getISTDate(yearOrDate);
    const dateParts = getISTDateParts(d);
    year = dateParts.year;
    month = dateParts.month;
  }

  const mStr = String(month).padStart(2, '0');
  const lastDayNum = new Date(year, month, 0).getDate();
  const lastDayStr = String(lastDayNum).padStart(2, '0');

  const startOfMonth = new Date(`${year}-${mStr}-01T00:00:00.000+05:30`);
  const endOfMonth = new Date(`${year}-${mStr}-${lastDayStr}T23:59:59.999+05:30`);

  return { startOfMonth, endOfMonth, year, month };
};

/**
 * Get start of year (00:00:00.000 IST on Jan 1) and end of year (23:59:59.999 IST on Dec 31) in IST.
 * @param {number|Date|string} [yearOrDate]
 * @returns {{ startOfYear: Date, endOfYear: Date, year: number }}
 */
export const getISTYearBounds = (yearOrDate) => {
  let year;
  if (typeof yearOrDate === 'number') {
    year = yearOrDate;
  } else if (typeof yearOrDate === 'string' && /^\d{4}$/.test(yearOrDate.trim())) {
    year = parseInt(yearOrDate.trim(), 10);
  } else {
    const parts = getISTDateParts(yearOrDate);
    year = parts.year;
  }

  const startOfYear = new Date(`${year}-01-01T00:00:00.000+05:30`);
  const endOfYear = new Date(`${year}-12-31T23:59:59.999+05:30`);

  return { startOfYear, endOfYear, year };
};

export default {
  IST_TIMEZONE,
  IST_OFFSET_MS,
  getISTDate,
  getISTDateParts,
  getISTDateString,
  getISTDayBounds,
  getISTMonthBounds,
  getISTYearBounds,
};
