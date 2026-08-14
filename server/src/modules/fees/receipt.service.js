import { generateNextDocumentNumber } from '../../utils/documentSequence.js';

/**
 * Receipt Service - Generates concurrency-safe receipt numbers using DocumentSequence.
 */
export const receiptService = {
  /**
   * Generates the next sequential receipt number for a school within a transaction.
   *
   * @param {import('@prisma/client').PrismaClient} tx Prisma Transaction Client
   * @param {Object} params
   * @param {string} params.schoolId
   * @param {string} [params.academicYearId]
   * @param {string} [params.academicYearName]
   * @returns {Promise<string>} e.g. "RCPT-2026-000001" or "RCPT/2026-27/000001"
   */
  async generateReceiptNumber(tx, { schoolId, academicYearId, academicYearName = '' }) {
    return generateNextDocumentNumber(tx, {
      schoolId,
      academicYearId,
      academicYearName,
      documentType: 'FEE_RECEIPT',
      prefix: 'RCPT',
    });
  },
};

export default receiptService;
