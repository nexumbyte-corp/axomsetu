/**
 * Utility functions for Hostel Management UI and Data Cleanliness
 */

/**
 * Format student class information into a clean string (e.g. "Class IX • Section A", "Class XI • Science • Section A").
 * Completely prevents "undefined", "null", "N/A", "IX - undefined", etc.
 * 
 * @param {Object} studentOrEnrollment 
 * @returns {string} Clean class description string
 */
export const formatStudentClassInfo = (studentOrEnrollment) => {
  if (!studentOrEnrollment) return '-';

  // Support student object with enrollments array, direct class attributes, or nested class relation
  let clsName = '';
  let secName = '';
  let strmName = '';

  if (typeof studentOrEnrollment === 'object') {
    // If it's a student object with enrollments
    const primaryEnrollment =
      studentOrEnrollment.enrollment ||
      (Array.isArray(studentOrEnrollment.enrollments) ? studentOrEnrollment.enrollments[0] : null) ||
      studentOrEnrollment.academic ||
      studentOrEnrollment;

    clsName = primaryEnrollment?.className || primaryEnrollment?.class?.name || studentOrEnrollment.className || studentOrEnrollment.class?.name || '';
    secName = primaryEnrollment?.sectionName || primaryEnrollment?.section?.name || studentOrEnrollment.sectionName || studentOrEnrollment.section?.name || '';
    strmName = primaryEnrollment?.streamName || primaryEnrollment?.stream?.name || studentOrEnrollment.streamName || studentOrEnrollment.stream?.name || '';
  }

  // Filter out bad/empty strings
  const sanitize = (val) => {
    if (!val || typeof val !== 'string') return '';
    const trimmed = val.trim();
    if (['undefined', 'null', 'nan', 'n/a', 'none', '-'].includes(trimmed.toLowerCase())) return '';
    return trimmed;
  };

  const cleanClass = sanitize(clsName);
  const cleanSection = sanitize(secName);
  const cleanStream = sanitize(strmName);

  if (!cleanClass) return '-';

  const parts = [];
  
  // Format class name cleanly (ensure "Class " prefix if just a number/roman numeral)
  const classDisplay = /^class/i.test(cleanClass) ? cleanClass : `Class ${cleanClass}`;
  parts.push(classDisplay);

  if (cleanStream) {
    parts.push(cleanStream);
  }

  if (cleanSection) {
    const sectionDisplay = /^section/i.test(cleanSection) ? cleanSection : `Section ${cleanSection}`;
    parts.push(sectionDisplay);
  }

  return parts.join(' • ');
};

/**
 * Helper to get clean status badge variant
 */
export const getBedStatusVariant = (status) => {
  switch (status) {
    case 'AVAILABLE': return 'green';
    case 'OCCUPIED': return 'blue';
    case 'MAINTENANCE': return 'amber';
    case 'BLOCKED': return 'gray';
    default: return 'gray';
  }
};
