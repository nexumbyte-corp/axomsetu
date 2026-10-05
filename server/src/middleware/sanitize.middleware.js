/**
 * Global Request Sanitization & Parameter Normalization Middleware
 * - Strips prototype pollution attempts (__proto__, constructor, prototype)
 * - Removes null bytes (\0) from string inputs
 * - Normalizes HTTP Parameter Pollution (HPP) by flattening unexpected array query parameters
 */

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

// Keys in req.query that are expected to be single scalar strings, not arrays
const SCALAR_QUERY_PARAMS = new Set([
  'search',
  'q',
  'page',
  'limit',
  'status',
  'role',
  'type',
  'action',
  'month',
  'year',
  'academicYearId',
  'classId',
  'sectionId',
  'mediumId',
  'streamId',
  'studentId',
  'staffId',
  'schoolId',
  'userId',
  'categoryId',
  'fundSourceId',
  'feeTypeId',
  'department',
  'designation',
  'paymentMode',
  'startDate',
  'endDate',
  'date',
]);

/**
 * Recursively sanitizes objects against prototype pollution and null bytes.
 */
function sanitizeObject(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 10) {
    return obj;
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      if (typeof obj[i] === 'string') {
        obj[i] = obj[i].replace(/\0/g, '');
      } else if (typeof obj[i] === 'object' && obj[i] !== null) {
        sanitizeObject(obj[i], depth + 1);
      }
    }
    return obj;
  }

  for (const key of Object.keys(obj)) {
    if (DANGEROUS_KEYS.has(key)) {
      delete obj[key];
      continue;
    }

    const val = obj[key];
    if (typeof val === 'string') {
      obj[key] = val.replace(/\0/g, '');
    } else if (typeof val === 'object' && val !== null) {
      sanitizeObject(val, depth + 1);
    }
  }

  return obj;
}

/**
 * Normalizes req.query to guard against HTTP Parameter Pollution (HPP).
 * If a known scalar parameter is provided multiple times (?search=a&search=b),
 * it takes the last provided string value to prevent Array crashes on .trim().
 */
function normalizeQueryParams(query) {
  if (!query || typeof query !== 'object') return;

  for (const key of Object.keys(query)) {
    if (DANGEROUS_KEYS.has(key)) {
      delete query[key];
      continue;
    }

    const val = query[key];
    if (Array.isArray(val)) {
      if (SCALAR_QUERY_PARAMS.has(key) || key.toLowerCase().endsWith('id')) {
        // Take the last item if an array was passed for a scalar field
        const lastVal = val[val.length - 1];
        query[key] = typeof lastVal === 'string' ? lastVal.replace(/\0/g, '') : lastVal;
      }
    } else if (typeof val === 'string') {
      query[key] = val.replace(/\0/g, '');
    }
  }
}

export const sanitizeInput = (req, res, next) => {
  try {
    if (req.body && typeof req.body === 'object') {
      sanitizeObject(req.body);
    }
    if (req.params && typeof req.params === 'object') {
      sanitizeObject(req.params);
    }
    if (req.query && typeof req.query === 'object') {
      normalizeQueryParams(req.query);
      sanitizeObject(req.query);
    }
    next();
  } catch (err) {
    next(err);
  }
};
