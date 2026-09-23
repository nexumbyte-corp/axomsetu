/**
 * Indian Standard Time (IST: UTC+05:30) date & time utilities.
 * Ensures consistent timezone handling across all server modules, DB queries, and report aggregations.
 */
const IST_TIMEZONE = 'Asia/Kolkata';

const enCAFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: IST_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const enINPartsFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

/**
 * Safely parses any date input (string, number, or Date) into a valid Date object.
 * Defaults to current Date if input is missing or invalid.
 * @param {Date|string|number} [date]
 * @returns {Date}
 */
export const getISTDate = (date = new Date()) => {
  if (!date) return new Date();
  const d = date instanceof Date ? date : new Date(date);
  return isNaN(d.getTime()) ? new Date() : d;
};

/**
 * Extract date parts (year, month 1-12, day, hours, minutes, seconds) in IST timezone.
 * @param {Date|string|number} [date]
 * @returns {{ year: number, month: number, day: number, hours: number, minutes: number, seconds: number }}
 */
export const getISTDateParts = (date = new Date()) => {
  const parts = enINPartsFormatter.formatToParts(getISTDate(date));
  const map = {};
  for (const { type, value } of parts) {
    map[type] = value;
  }

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
  return enCAFormatter.format(getISTDate(date));
};

/**
 * Get exact start of day (00:00:00.000 IST) and end of day (23:59:59.999 IST) as Date objects for Prisma queries.
 * @param {string|Date} [date] Date string (YYYY-MM-DD) or Date object. Defaults to current IST day.
 * @returns {{ startOfDay: Date, endOfDay: Date, dateStr: string }}
 */
export const getISTDayBounds = (date) => {
  const dateStr = getISTDateString(date);
  return {
    startOfDay: new Date(`${dateStr}T00:00:00.000+05:30`),
    endOfDay: new Date(`${dateStr}T23:59:59.999+05:30`),
    dateStr,
  };
};

/**
 * Get start of month (00:00:00.000 IST on 1st) and end of month (23:59:59.999 IST on last day) in IST.
 * @param {number|Date|string} [yearOrDate]
 * @param {number} [month1Indexed] Month (1 = Jan, 12 = Dec)
 * @returns {{ startOfMonth: Date, endOfMonth: Date, year: number, month: number }}
 */
export const getISTMonthBounds = (yearOrDate, month1Indexed) => {
  let year, month;
  if (yearOrDate !== undefined && month1Indexed !== undefined && !isNaN(Number(yearOrDate)) && !isNaN(Number(month1Indexed))) {
    year = Number(yearOrDate);
    month = Number(month1Indexed);
  } else {
    const parts = getISTDateParts(yearOrDate);
    year = parts.year;
    month = parts.month;
  }

  const mStr = String(month).padStart(2, '0');
  const lastDayNum = new Date(year, month, 0).getDate();
  const lastDayStr = String(lastDayNum).padStart(2, '0');

  return {
    startOfMonth: new Date(`${year}-${mStr}-01T00:00:00.000+05:30`),
    endOfMonth: new Date(`${year}-${mStr}-${lastDayStr}T23:59:59.999+05:30`),
    year,
    month,
  };
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
    year = getISTDateParts(yearOrDate).year;
  }

  return {
    startOfYear: new Date(`${year}-01-01T00:00:00.000+05:30`),
    endOfYear: new Date(`${year}-12-31T23:59:59.999+05:30`),
    year,
  };
};

/**
 * Parse date string or Date to UTC Date object representing 00:00:00.000Z on that calendar date.
 * Crucial for PostgreSQL @db.Date columns to avoid 1-day subtraction due to local timezone offset.
 * @param {string|Date|number} dateVal
 * @returns {Date|null}
 */
export const parseDateOnlyToUtc = (dateVal) => {
  if (!dateVal) return null;
  if (typeof dateVal === 'string') {
    const match = dateVal.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0, 0));
    }
  }
  const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
  if (isNaN(d.getTime())) return null;
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0) {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  }
  const [year, month, day] = enCAFormatter.format(d).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
};

export default {
  getISTDate,
  getISTDateParts,
  getISTDateString,
  getISTDayBounds,
  getISTMonthBounds,
  getISTYearBounds,
  parseDateOnlyToUtc,
};

