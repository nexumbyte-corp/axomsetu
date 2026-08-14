import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { getTargetYearForFeeMonth } from './fee-generation.service.js';

/**
 * Student Ledger Service - Purely derived financial history and balances.
 * NEVER stores balance or ledger state in database tables.
 */
export const ledgerService = {
  /**
   * Calculate student ledger entries and current derived balance.
   *
   * @param {string} schoolId
   * @param {string} studentId
   * @param {Object} [options]
   * @param {string} [options.academicYearId]
   * @returns {Promise<Object>} Derived ledger statement
   */
  async getStudentLedger(schoolId, studentId, options = {}) {
    const { academicYearId } = options;

    // Verify student belongs to this school
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId,
      },
      select: {
        id: true,
        name: true,
        admissionNo: true,
        guardianName: true,
        phone: true,
        schoolId: true,
      },
    });

    if (!student) {
      throw new ApiError(404, 'Student not found');
    }

    const whereClause = {
      schoolId,
      studentId,
      ...(academicYearId && { academicYearId }),
    };

    // Fetch all generated charges with valid non-VOID allocations
    const charges = await prisma.studentFeeCharge.findMany({
      where: whereClause,
      include: {
        academicYear: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
        feeType: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        allocations: {
          where: {
            payment: {
              status: {
                not: 'VOID',
              },
            },
          },
          include: {
            payment: {
              select: {
                id: true,
                receiptNumber: true,
                paymentDate: true,
                paymentMode: true,
                referenceNumber: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: [
        { updatedAt: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Compute derived ledger summaries using Decimal math
    let totalChargesDecimal = new Prisma.Decimal(0);
    let totalAllocatedDecimal = new Prisma.Decimal(0);

    const chargeItems = charges.map((charge) => {
      const chargeAmt = new Prisma.Decimal(charge.amount);

      // If charge is VOID or WAIVED, allocated balance impact is adjusted
      const allocatedAmt = charge.status === 'VOID' || charge.status === 'WAIVED'
        ? new Prisma.Decimal(0)
        : charge.allocations.reduce(
            (sum, alloc) => sum.plus(new Prisma.Decimal(alloc.allocatedAmount)),
            new Prisma.Decimal(0)
          );

      let balanceDecimal = new Prisma.Decimal(0);
      if (charge.status === 'WAIVED' || charge.status === 'VOID') {
        balanceDecimal = new Prisma.Decimal(0);
      } else {
        balanceDecimal = Prisma.Decimal.max(new Prisma.Decimal(0), chargeAmt.minus(allocatedAmt));
      }

      if (charge.status !== 'VOID') {
        totalChargesDecimal = totalChargesDecimal.plus(charge.status === 'WAIVED' ? new Prisma.Decimal(0) : chargeAmt);
        totalAllocatedDecimal = totalAllocatedDecimal.plus(allocatedAmt);
      }

      const targetYear = charge.academicYear
        ? getTargetYearForFeeMonth(charge.academicYear, charge.month)
        : null;

      return {
        id: charge.id,
        title: charge.title,
        month: charge.month,
        year: targetYear,
        academicYear: charge.academicYear,
        feeType: charge.feeType,
        amount: Number(chargeAmt),
        originalAmount: charge.originalAmount ? Number(charge.originalAmount) : Number(chargeAmt),
        discountAmount: Number(charge.discountAmount || 0),
        isOverridden: Boolean(charge.isOverridden),
        overrideReason: charge.overrideReason || null,
        paidAmount: Number(allocatedAmt),
        balance: Number(balanceDecimal),
        status: charge.status, // UNPAID, PARTIAL, PAID, WAIVED, VOID
        dueDate: charge.dueDate,
        createdAt: charge.createdAt,
        payments: charge.allocations.map((a) => ({
          allocationId: a.id,
          paymentId: a.paymentId,
          receiptNumber: a.payment.receiptNumber,
          paymentDate: a.payment.paymentDate,
          paymentMode: a.payment.paymentMode,
          referenceNumber: a.payment.referenceNumber,
          allocatedAmount: Number(a.allocatedAmount),
        })),
      };
    });

    const totalBalanceDecimal = Prisma.Decimal.max(new Prisma.Decimal(0), totalChargesDecimal.minus(totalAllocatedDecimal));

    return {
      student,
      summary: {
        totalCharges: Number(totalChargesDecimal),
        totalAllocated: Number(totalAllocatedDecimal),
        totalBalance: Number(totalBalanceDecimal),
      },
      charges: chargeItems,
    };
  },
};

export default ledgerService;
