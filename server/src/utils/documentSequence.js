/**
 * Distinct document type prefix tags.
 */
const DOC_TYPE_TAGS = {
  STUDENT_ADMISSION: 'ADM',
  STAFF_EMPLOYEE_CODE: 'EMP',
  FEE_RECEIPT: 'RCPT',
  SALARY_PAYMENT: 'SLIP',
  PAYROLL_VOUCHER: 'SLIP',
  STAFF_ADVANCE_PAYMENT: 'ADV',
  EXPENSE_VOUCHER: 'EXP',
};

/**
 * Normalizes academic year into YYYY-YY format (e.g. "2026-27").
 */
export const normalizeAcademicYearName = (name) => {
  if (name && typeof name === 'string') {
    const trimmed = name.trim();
    const match = trimmed.match(/(\d{4})[-/](\d{2,4})/);
    if (match) {
      const startYear = match[1];
      const endYearShort = match[2].slice(-2);
      return `${startYear}-${endYearShort}`;
    }
    if (trimmed.length > 0) return trimmed;
  }
  const now = new Date();
  const yyyy = now.getFullYear();
  const nextYY = String(yyyy + 1).slice(-2);
  return `${yyyy}-${nextYY}`;
};

/**
 * Helper to derive school initials from school name or school code.
 * E.g. "Aravali Hill Academy" -> "AHA"
 */
export const getSchoolInitials = (schoolName = '', schoolCode = '') => {
  if (!schoolName || typeof schoolName !== 'string') {
    if (schoolCode && typeof schoolCode === 'string') return schoolCode.trim().toUpperCase();
    return 'SCH';
  }

  const cleaned = schoolName.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const words = cleaned.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    const initials = words.map((w) => w[0].toUpperCase()).join('').slice(0, 6);
    if (initials.length >= 2) return initials;
  } else if (words.length === 1) {
    const word = words[0].toUpperCase();
    if (word.length >= 3) return word.slice(0, 3);
    return word;
  }

  if (schoolCode && typeof schoolCode === 'string') return schoolCode.trim().toUpperCase();
  return 'SCH';
};

/**
 * Generates next sequence document number inside a database transaction safely.
 * Standard Pattern: RCPT/2026-27/000009
 *
 * @param {import('@prisma/client').PrismaClient} tx Prisma Transaction Client
 * @param {Object} params
 * @param {string} params.schoolId
 * @param {string} [params.academicYearId]
 * @param {string} [params.academicYearName]
 * @param {string} params.documentType E.g. "FEE_RECEIPT", "STUDENT_ADMISSION", "PAYROLL_VOUCHER"
 * @param {string} [params.overridePrefix] Optional explicit prefix override
 * @param {number} [params.padLength=6] Number padding length (default 6)
 * @returns {Promise<string>} e.g. "RCPT/2026-27/000009"
 */
export const generateNextDocumentNumber = async (tx, {
  schoolId,
  academicYearId = null,
  academicYearName = null,
  documentType,
  overridePrefix = null,
  padLength = 6,
}) => {
  const docTag = DOC_TYPE_TAGS[documentType] || documentType || 'RCPT';

  // 1. Resolve Academic Year Name if not provided
  let ayName = academicYearName;
  if (!ayName && academicYearId && tx.academicYear) {
    try {
      const ay = await tx.academicYear.findUnique({
        where: { id: academicYearId },
        select: { name: true },
      });
      if (ay?.name) ayName = ay.name;
    } catch {
      // Fallback
    }
  }

  const yearLabel = normalizeAcademicYearName(ayName);

  // 2. Build calculated prefix e.g. "RCPT/2026-27"
  let calculatedPrefix = overridePrefix;
  if (!calculatedPrefix) {
    calculatedPrefix = `${docTag}/${yearLabel}`;
  } else if (!calculatedPrefix.includes('/')) {
    calculatedPrefix = `${calculatedPrefix}/${yearLabel}`;
  }

  const seqKey = academicYearId ? `${academicYearId}_${yearLabel}` : yearLabel;

  // 3. Upsert Sequence Counter
  const sequence = await tx.documentSequence.upsert({
    where: {
      schoolId_documentType_academicYearId: {
        schoolId,
        documentType,
        academicYearId: seqKey,
      },
    },
    update: {
      currentNumber: {
        increment: 1,
      },
      prefix: calculatedPrefix,
    },
    create: {
      schoolId,
      academicYearId: seqKey,
      documentType,
      prefix: calculatedPrefix,
      currentNumber: 1,
    },
  });

  // 4. Format zero-padded number & auto-resolve collisions if number exists in entity table
  let currentNum = sequence.currentNumber;
  const buildCandidate = (num) => {
    const padded = String(num).padStart(padLength, '0');
    return calculatedPrefix.endsWith('/') ? `${calculatedPrefix}${padded}` : `${calculatedPrefix}/${padded}`;
  };

  let candidate = buildCandidate(currentNum);
  let hasCollision = true;

  while (hasCollision) {
    let exists = false;

    if (documentType === 'FEE_RECEIPT' && tx.feePayment) {
      const found = await tx.feePayment.findUnique({
        where: {
          schoolId_receiptNumber: {
            schoolId,
            receiptNumber: candidate,
          },
        },
        select: { id: true },
      });
      if (found) exists = true;
    } else if (documentType === 'STUDENT_ADMISSION' && tx.student) {
      const found = await tx.student.findFirst({
        where: {
          schoolId,
          admissionNo: candidate,
        },
        select: { id: true },
      });
      if (found) exists = true;
    } else if (documentType === 'STAFF_EMPLOYEE_CODE' && tx.staff) {
      const found = await tx.staff.findFirst({
        where: {
          schoolId,
          employeeId: candidate,
        },
        select: { id: true },
      });
      if (found) exists = true;
    }

    if (exists) {
      currentNum += 1;
      candidate = buildCandidate(currentNum);
    } else {
      hasCollision = false;
    }
  }

  // Sync document sequence in DB if sequence was auto-advanced to bypass existing numbers
  if (currentNum !== sequence.currentNumber) {
    await tx.documentSequence.update({
      where: { id: sequence.id },
      data: { currentNumber: currentNum },
    });
  }

  return candidate;
};

