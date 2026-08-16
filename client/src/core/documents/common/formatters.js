/**
 * Centralized Document Formatters for AxomSetu PDF Generation.
 * Ensures consistent formatting of Currency, Dates, Numbers, and School Branding across all frontend documents.
 */

/**
 * Format currency values in INR with the Rupee symbol (₹).
 * @param {number|string} amount
 * @param {boolean} showFraction
 * @returns {string}
 */
export const formatDocCurrency = (amount, showFraction = true) => {
  const num = Number(amount) || 0;
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: showFraction ? 2 : 0,
    maximumFractionDigits: showFraction ? 2 : 0,
  })}`;
};

/**
 * Format date values to standard document date format (e.g. 16 Aug 2026).
 * @param {Date|string} date
 * @returns {string}
 */
export const formatDocDate = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Clean up and sanitize text fields to prevent rendering undefined, null, or NaN.
 * @param {any} value
 * @param {string} fallback
 * @returns {string}
 */
export const sanitizeDocText = (value, fallback = '-') => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'number' && isNaN(value)) return fallback;
  return String(value);
};

/**
 * Extract normalized school branding object with fallback details.
 * @param {object} school
 * @returns {object}
 */
export const getSchoolBranding = (school = {}) => {
  return {
    name: school.name || school.schoolName || 'AXOMSETU SAAS WORKSPACE',
    address: school.address || school.location || 'School Address Line 1',
    phone: school.phone || school.contactNo || '',
    email: school.email || '',
    district: school.district || '',
    state: school.state || '',
    pincode: school.pincode || '',
    udiseCode: school.udiseCode || '',
    affiliationNo: school.affiliationNo || '',
    website: school.website || '',
    logoUrl: school.logoUrl || school.logo || null,
    logoBase64: school.logoBase64 || null,
  };
};

/**
 * Format fee month and year into full month name along with year (e.g. "April 2026").
 * @param {string|number} rawMonth
 * @param {string|number} rawYear
 * @param {string|number|Date} fallbackDateOrYear
 * @returns {string}
 */
export const formatFeeMonthYear = (rawMonth, rawYear, fallbackDateOrYear) => {
  if (!rawMonth || rawMonth === '—' || rawMonth === 'N/A') {
    return '—';
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  let monthName = '';
  const monthNum = parseInt(rawMonth, 10);
  if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
    monthName = monthNames[monthNum - 1];
  } else {
    const rawStr = String(rawMonth).trim();
    const foundIdx = monthNames.findIndex(
      (m) => m.toLowerCase().startsWith(rawStr.toLowerCase().slice(0, 3))
    );
    if (foundIdx !== -1) {
      monthName = monthNames[foundIdx];
    } else {
      monthName = rawStr.charAt(0).toUpperCase() + rawStr.slice(1).toLowerCase();
    }
  }

  let year = rawYear;
  if (!year && fallbackDateOrYear) {
    if (typeof fallbackDateOrYear === 'number' || (typeof fallbackDateOrYear === 'string' && /^\d{4}$/.test(fallbackDateOrYear.trim()))) {
      year = String(fallbackDateOrYear).trim();
    } else if (typeof fallbackDateOrYear === 'string' && (fallbackDateOrYear.includes('-') || fallbackDateOrYear.includes('–'))) {
      if (fallbackDateOrYear.length > 7 && fallbackDateOrYear.includes('-') && !fallbackDateOrYear.includes('–')) {
        const parsedDate = new Date(fallbackDateOrYear);
        if (!isNaN(parsedDate.getTime())) {
          year = parsedDate.getFullYear();
        }
      } else {
        const parts = fallbackDateOrYear.split(/[-–]/).map((s) => s.trim());
        const y1 = parts[0];
        const y2 = parts[1];
        if (y1 && y2) {
          const mLower = monthName.toLowerCase();
          if (['january', 'february', 'march'].includes(mLower)) {
            year = y2.length === 2 ? `20${y2}` : y2;
          } else {
            year = y1;
          }
        } else {
          year = y1;
        }
      }
    }
  }

  if (!year) {
    year = new Date().getFullYear();
  }

  if (String(monthName).includes(String(year))) {
    return monthName;
  }

  return `${monthName} ${year}`;
};

export default {
  formatDocCurrency,
  formatDocDate,
  sanitizeDocText,
  getSchoolBranding,
  formatFeeMonthYear,
};

