/**
 * Generates next sequence document number inside a database transaction safely.
 *
 * @param {import('@prisma/client').PrismaClient} tx Prisma Transaction Client
 * @param {Object} params
 * @param {string} params.schoolId
 * @param {string} [params.academicYearId]
 * @param {string} [params.academicYearName] E.g. "2026-27"
 * @param {string} params.documentType E.g. "FEE_RECEIPT", "PAYROLL_VOUCHER", "EXPENSE_VOUCHER"
 * @param {string} [params.prefix] E.g. "AHA"
 * @returns {Promise<string>} Sequential document number (e.g. "AHA/2026-27/000153")
 */
export const generateNextDocumentNumber = async (tx, {
  schoolId,
  academicYearId = null,
  academicYearName = '',
  documentType,
  prefix = 'REC',
}) => {
  // Find or create sequence row for school & documentType
  const sequence = await tx.documentSequence.upsert({
    where: {
      schoolId_documentType_academicYearId: {
        schoolId,
        documentType,
        academicYearId: academicYearId || '',
      },
    },
    update: {
      currentNumber: {
        increment: 1,
      },
    },
    create: {
      schoolId,
      academicYearId: academicYearId || '',
      documentType,
      prefix,
      currentNumber: 1,
    },
  });

  const paddedNum = String(sequence.currentNumber).padStart(6, '0');
  const seqPrefix = sequence.prefix || prefix;

  if (seqPrefix.endsWith('-')) {
    return `${seqPrefix}${paddedNum}`;
  }

  const yearPart = academicYearName ? `/${academicYearName}` : '';
  return `${seqPrefix}${yearPart}/${paddedNum}`;
};
