import { formatDate } from '../../../utils/formatters.js';

export const INSTRUCTIONS_LIST = [
  'Without a valid Admit Card, no candidate will be allowed to enter the examination hall.',
  'Candidates must reach the examination hall at least 30 minutes before commencement of exam.',
  'Mobile phones, smart watches, and unauthorized materials are strictly prohibited inside hall.',
];

/**
 * Normalizes all admit card props and extracts ready-to-render strings and data structures.
 */
export function extractAdmitCardData({
  school = {},
  academicYearName = '',
  examName = '',
  validUpto = '',
  student = null,
  enrollment = null,
}) {
  const displayStudent = student || {
    name: 'JOHN DOE',
    guardianName: 'ROBERT DOE',
    admissionNo: 'ADM-2026-001',
    photoUrl: null,
  };

  const displayEnrollment = enrollment || {
    rollNo: '01',
    rollNumber: '01',
    class: { name: 'Class X', hasStream: false },
    section: { name: 'Section A' },
    medium: { name: 'English' },
    stream: null,
  };

  const studentName = displayStudent.name || '—';
  const guardianName = displayStudent.guardianName || '—';
  const admissionNo = displayStudent.admissionNo || '';
  const photoUrl = displayStudent.photoUrl || null;

  const classNameVal = displayEnrollment.class?.name || '—';
  const hasStream = Boolean(displayEnrollment.class?.hasStream);
  const sectionNameVal = displayEnrollment.section?.name || '—';
  const mediumNameVal = displayEnrollment.medium?.name || '—';
  const streamNameVal = displayEnrollment.stream?.name || '—';
  const rollNoVal = displayEnrollment.rollNo ?? displayEnrollment.rollNumber ?? '—';

  const formattedValidUpto = validUpto ? formatDate(validUpto) : '';

  const qrPayload = [
    studentName !== '—' ? studentName : '',
    rollNoVal !== '—' ? `Roll:${rollNoVal}` : '',
    classNameVal !== '—' ? `Class:${classNameVal}` : '',
    admissionNo ? `Adm:${admissionNo}` : '',
    formattedValidUpto ? `Valid:${formattedValidUpto}` : '',
  ].filter(Boolean).join(' | ');

  const locationParts = [];
  if (school.address) locationParts.push(school.address);
  if (school.district) locationParts.push(school.district);
  if (school.state) locationParts.push(school.state);
  if (school.pincode) locationParts.push(`PIN: ${school.pincode}`);
  const locationText = locationParts.join(', ');

  const contactParts = [];
  if (school.phone) contactParts.push(`Ph: ${school.phone}`);
  if (school.email) contactParts.push(`Email: ${school.email}`);
  const contactText = contactParts.join(' | ');

  const codeParts = [];
  if (school.udiseCode) codeParts.push(`UDISE: ${school.udiseCode}`);
  if (school.affiliationNo) codeParts.push(`Affiliation No: ${school.affiliationNo}`);
  const codesText = codeParts.join(' | ');

  const formattedExamName = (examName || 'EXAMINATION').toUpperCase();
  const rawExamName = examName || 'Examination';
  const formattedAcademicYear = academicYearName || '2026-2027';
  const schoolName = school.name || 'SCHOOL NAME';
  const schoolLogoUrl = school.logoUrl || null;
  const schoolInitials = school.name ? school.name.substring(0, 2).toUpperCase() : 'SCH';

  return {
    student: displayStudent,
    enrollment: displayEnrollment,
    studentName,
    guardianName,
    admissionNo,
    photoUrl,
    classNameVal,
    hasStream,
    sectionNameVal,
    mediumNameVal,
    streamNameVal,
    rollNoVal,
    formattedValidUpto,
    qrPayload: qrPayload || 'AXOMSETU ADMIT CARD',
    schoolName,
    schoolLogoUrl,
    schoolInitials,
    locationText,
    contactText,
    codesText,
    formattedExamName,
    rawExamName,
    formattedAcademicYear,
    instructions: INSTRUCTIONS_LIST,
  };
}

