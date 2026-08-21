/**
 * Standardized currency, number, and date formatters for School SaaS System.
 * Global presentation standard: DD-MM-YYYY (e.g. 21-08-2026)
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

export const TIMEZONE = 'Asia/Kolkata';

/**
 * Timezone-safe calendar date parser.
 * Handles DD-MM-YYYY, YYYY-MM-DD, ISO timestamps, and Date objects.
 * @param {Date|string|number} value
 * @returns {Date|null}
 */
export const parseDateSafe = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  const str = String(value).trim();
  if (!str) return null;

  // DD-MM-YYYY format
  const ddmmyyyyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (ddmmyyyyMatch) {
    const day = parseInt(ddmmyyyyMatch[1], 10);
    const month = parseInt(ddmmyyyyMatch[2], 10) - 1;
    const year = parseInt(ddmmyyyyMatch[3], 10);
    const date = new Date(year, month, day);
    return date.getDate() === day && date.getMonth() === month && date.getFullYear() === year ? date : null;
  }

  // YYYY-MM-DD format (date-only)
  const yyyymmddMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (yyyymmddMatch) {
    const year = parseInt(yyyymmddMatch[1], 10);
    const month = parseInt(yyyymmddMatch[2], 10) - 1;
    const day = parseInt(yyyymmddMatch[3], 10);
    const date = new Date(year, month, day);
    return isNaN(date.getTime()) ? null : date;
  }

  // General ISO timestamp / string
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Format dates strictly into global DD-MM-YYYY standard representation (e.g. 21-08-2026) in IST timezone.
 * Safe against UTC day-shift on date-only strings.
 * @param {Date|string|number} date 
 * @param {string} fallback 
 * @returns {string}
 */
export const formatDate = (date, fallback = '—') => {
  if (!date) return fallback;

  if (typeof date === 'string') {
    const str = date.trim();
    // Direct regex match for YYYY-MM-DD date-only strings to avoid any timezone distortion
    const yyyymmddMatch = str.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
    if (yyyymmddMatch) {
      const [, y, m, d] = yyyymmddMatch;
      return `${d}-${m}-${y}`;
    }

    // Direct match for already formatted DD-MM-YYYY
    const ddmmyyyyMatch = str.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
    if (ddmmyyyyMatch) {
      const [, d, m, y] = ddmmyyyyMatch;
      return `${d}-${m}-${y}`;
    }
  }

  const d = parseDateSafe(date);
  if (!d) return fallback;

  try {
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const parts = formatter.formatToParts(d);
    const map = {};
    parts.forEach((p) => { map[p.type] = p.value; });
    return `${map.day}-${map.month}-${map.year}`;
  } catch {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }
};

/**
 * Format date & time into global standard representation in IST timezone (e.g. 21-08-2026, 04:30 PM).
 * @param {Date|string|number} date 
 * @param {string} fallback 
 * @param {boolean} includeSeconds 
 * @returns {string}
 */
export const formatDateTime = (date, fallback = '—', includeSeconds = false) => {
  if (!date) return fallback;
  const d = parseDateSafe(date);
  if (!d) return fallback;

  try {
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: includeSeconds ? '2-digit' : undefined,
      hour12: true,
    });
    const parts = formatter.formatToParts(d);
    const map = {};
    parts.forEach((p) => { map[p.type] = p.value; });

    const day = map.day;
    const month = map.month;
    const year = map.year;
    const hour = map.hour || '12';
    const minute = map.minute || '00';
    const second = map.second;
    const dayPeriod = (map.dayPeriod || '').toUpperCase();

    const timeStr = includeSeconds
      ? `${hour}:${minute}:${second} ${dayPeriod}`.trim()
      : `${hour}:${minute} ${dayPeriod}`.trim();

    return `${day}-${month}-${year}, ${timeStr}`;
  } catch {
    const datePart = formatDate(d, fallback);
    if (datePart === fallback) return fallback;
    const hoursRaw = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const ampm = hoursRaw >= 12 ? 'PM' : 'AM';
    const hours12 = hoursRaw % 12 || 12;
    const hours = String(hours12).padStart(2, '0');
    const timePart = includeSeconds
      ? `${hours}:${minutes}:${seconds} ${ampm}`
      : `${hours}:${minutes} ${ampm}`;
    return `${datePart}, ${timePart}`;
  }
};

/**
 * Format a date value into machine-readable YYYY-MM-DD for internal state or API payloads in IST timezone.
 * @param {Date|string} date 
 * @returns {string}
 */
export const formatDateForInput = (date) => {
  if (!date) return '';
  if (typeof date === 'string') {
    const trimmed = date.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const ddmmyyyy = trimmed.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
    if (ddmmyyyy) {
      return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
    }
  }
  const d = parseDateSafe(date);
  if (!d) return '';

  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(d);
  } catch {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
};

export default {
  TIMEZONE,
  formatCurrency,
  formatNumber,
  formatDate,
  formatDateTime,
  formatDateForInput,
  parseDateSafe,
};
