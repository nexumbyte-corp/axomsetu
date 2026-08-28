/**
 * Utility to extract field-level validation errors from backend error objects
 * @param {Error|Object} err
 * @returns {Record<string, string>} Mapping of field name to validation message
 */
export const getFormErrors = (err) => {
  if (!err) return {};

  // 1. Check if error object already has pre-formatted fieldErrors
  if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
    return err.fieldErrors;
  }

  // 2. Extract from raw errors array (ApiError / ZodError format)
  const rawErrors = err.errors || err.response?.data?.errors;
  if (Array.isArray(rawErrors)) {
    const mapped = {};
    rawErrors.forEach((item) => {
      if (!item) return;
      const key =
        item.field ||
        (Array.isArray(item.path) ? item.path.join('.') : item.path);
      if (key && item.message) {
        mapped[key] = item.message;
      }
    });
    return mapped;
  }

  // 3. Handle object format errors
  if (rawErrors && typeof rawErrors === 'object' && !Array.isArray(rawErrors)) {
    return rawErrors;
  }

  return {};
};
