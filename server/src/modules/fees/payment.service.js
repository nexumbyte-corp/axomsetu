import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { getISTDayBounds, getISTMonthBounds } from '../../utils/dateUtils.js';
import receiptService from './receipt.service.js';
import { getTargetYearForFeeMonth } from './fee-generation.service.js';
import { financialLedgerService } from '../finance/financialLedger.service.js';

const PAYMENT_AUDIT_EVENTS = {
  CREATE_PAYMENT: 'CREATE_PAYMENT',
  VOID_PAYMENT: 'VOID_PAYMENT',
  VIEW_PAYMENT: 'VIEW_PAYMENT',
  REPRINT_RECEIPT: 'REPRINT_RECEIPT',
  DELETE_FEE_CHARGE: 'DELETE_FEE_CHARGE',
};

/**
 * Complete Fee Payment & History Engine Service
 */
export const paymentService = {
  /**
   * Process a fee payment with charge allocations inside an atomic Prisma transaction.
   *
   * @param {string} schoolId Tenant ID
   * @param {Object} payload Payment details & selected charge allocations
   * @param {string} [userId] Authenticated cashier/admin User ID
   * @returns {Promise<Object>} Payment receipt confirmation payload
   */
  async collectPayment(schoolId, payload, userId) {
    if (!schoolId) {
      throw new ApiError(400, 'School ID is required');
    }

    const { studentId, paymentMode, paymentDate, remarks, referenceNumber, referenceNo } = payload;
    const refNumber = referenceNumber || referenceNo || null;

    // 1. Verify student exists and belongs to school
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
    });

    if (!student) {
      throw new ApiError(404, 'Student not found in this school');
    }

    // Standardize requested charge allocations
    const rawItems = payload.charges || payload.allocations || [];
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      throw new ApiError(400, 'At least one charge allocation is required');
    }

    // Create normalized allocation map
    const allocationMap = new Map();
    let totalAllocatedDecimal = new Prisma.Decimal(0);

    for (const item of rawItems) {
      const chargeId = item.chargeId;
      const rawAmt = item.amount !== undefined ? item.amount : item.allocatedAmount;

      if (!chargeId || rawAmt === undefined || rawAmt === null) {
        throw new ApiError(400, 'Invalid charge allocation format');
      }

      const amtDecimal = new Prisma.Decimal(rawAmt);
      if (amtDecimal.lessThanOrEqualTo(0)) {
        throw new ApiError(400, 'Allocation amount for each charge must be greater than zero');
      }

      if (allocationMap.has(chargeId)) {
        throw new ApiError(400, 'Duplicate charge selection in the same payment is not allowed');
      }

      allocationMap.set(chargeId, amtDecimal);
      totalAllocatedDecimal = totalAllocatedDecimal.plus(amtDecimal);
    }

    // Determine total received amount
    const totalReceivedDecimal = payload.receivedAmount !== undefined
      ? new Prisma.Decimal(payload.receivedAmount)
      : totalAllocatedDecimal;

    if (!totalReceivedDecimal.equals(totalAllocatedDecimal)) {
      throw new ApiError(400, `Total received amount (${totalReceivedDecimal}) must equal sum of charge allocations (${totalAllocatedDecimal})`);
    }

    if (totalReceivedDecimal.lessThanOrEqualTo(0)) {
      throw new ApiError(400, 'Payment amount must be greater than zero');
    }

    // 2. Fetch and validate all target charges
    const selectedChargeIds = Array.from(allocationMap.keys());
    const dbCharges = await prisma.studentFeeCharge.findMany({
      where: {
        id: { in: selectedChargeIds },
        schoolId,
      },
      include: {
        academicYear: {
          select: { id: true, name: true },
        },
      },
    });

    if (dbCharges.length !== selectedChargeIds.length) {
      throw new ApiError(404, 'One or more selected fee charges were not found in this school');
    }

    // Check student ownership and valid statuses
    const firstAcademicYearId = dbCharges[0].academicYearId;

    for (const charge of dbCharges) {
      if (charge.studentId !== studentId) {
        throw new ApiError(400, `Charge '${charge.title}' does not belong to the selected student`);
      }
      if (charge.status === 'VOID') {
        throw new ApiError(400, `Charge '${charge.title}' is VOID and cannot accept payments`);
      }
      if (charge.status === 'WAIVED') {
        throw new ApiError(400, `Charge '${charge.title}' is WAIVED and cannot accept payments`);
      }
      if (charge.academicYearId !== firstAcademicYearId) {
        throw new ApiError(400, 'All selected charges in a single payment must belong to the same academic year');
      }
    }

    // 3. Compute current remaining balances for all selected charges based on successful (non-VOID) allocations
    const existingAllocationsGroup = await prisma.paymentAllocation.groupBy({
      by: ['chargeId'],
      where: {
        chargeId: { in: selectedChargeIds },
        payment: {
          status: { not: 'VOID' },
        },
      },
      _sum: {
        allocatedAmount: true,
      },
    });

    const existingPaidMap = new Map();
    for (const group of existingAllocationsGroup) {
      existingPaidMap.set(group.chargeId, group._sum.allocatedAmount || new Prisma.Decimal(0));
    }

    let totalRemainingDecimal = new Prisma.Decimal(0);

    for (const charge of dbCharges) {
      const chargeAmount = new Prisma.Decimal(charge.amount);
      const alreadyPaid = existingPaidMap.get(charge.id) || new Prisma.Decimal(0);
      const remainingBalance = chargeAmount.minus(alreadyPaid);
      const requestedAllocation = allocationMap.get(charge.id);

      if (requestedAllocation.greaterThan(remainingBalance)) {
        throw new ApiError(
          400,
          `Allocation of ${requestedAllocation} for charge '${charge.title}' exceeds remaining balance of ${remainingBalance}`
        );
      }

      totalRemainingDecimal = totalRemainingDecimal.plus(remainingBalance);
    }

    if (totalReceivedDecimal.greaterThan(totalRemainingDecimal)) {
      throw new ApiError(400, 'Received payment amount exceeds total remaining balance of selected charges');
    }

    // 4. Execute Payment & Allocations inside an Atomic Prisma Transaction
    return await prisma.$transaction(async (tx) => {
      // Generate concurrency-safe receipt number
      const receiptNumber = await receiptService.generateReceiptNumber(tx, {
        schoolId,
        academicYearId: firstAcademicYearId,
        academicYearName: dbCharges[0].academicYear?.name || '',
      });

      // Create FeePayment record
      const payment = await tx.feePayment.create({
        data: {
          schoolId,
          academicYearId: firstAcademicYearId,
          studentId,
          receiptNumber,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          paymentMode,
          referenceNumber: refNumber,
          receivedAmount: totalReceivedDecimal,
          remarks: remarks || null,
          receivedById: userId || null,
          status: 'SUCCESS',
        },
      });

      // Create PaymentAllocation records
      const allocationRecords = Array.from(allocationMap.entries()).map(([chargeId, allocatedAmt]) => ({
        paymentId: payment.id,
        chargeId,
        allocatedAmount: allocatedAmt,
      }));

      await tx.paymentAllocation.createMany({
        data: allocationRecords,
      });

      // Update status and paidAmount for each affected charge
      for (const charge of dbCharges) {
        const chargeAmount = new Prisma.Decimal(charge.amount);
        const alreadyPaid = existingPaidMap.get(charge.id) || new Prisma.Decimal(0);
        const newAllocated = allocationMap.get(charge.id);
        const newTotalPaid = alreadyPaid.plus(newAllocated);
        const remaining = chargeAmount.minus(newTotalPaid);

        let newStatus = 'UNPAID';
        if (remaining.equals(0)) {
          newStatus = 'PAID';
        } else if (newTotalPaid.greaterThan(0)) {
          newStatus = 'PARTIAL';
        }

        await tx.studentFeeCharge.update({
          where: { id: charge.id },
          data: {
            paidAmount: newTotalPaid,
            status: newStatus,
          },
        });
      }

      // Record FinancialLedger CREDIT transaction
      await financialLedgerService.createTransaction(tx, {
        schoolId,
        academicYearId: firstAcademicYearId,
        transactionDate: paymentDate ? new Date(paymentDate) : new Date(),
        type: 'CREDIT',
        sourceType: 'FEE_COLLECTION',
        sourceId: payment.id,
        amount: totalReceivedDecimal,
        paymentMode,
        referenceNumber: refNumber || payment.receiptNumber,
        description: `Fee Collection (Receipt #${payment.receiptNumber})`,
        createdById: userId || null,
      });

      // Record AuditLog entry
      await tx.auditLog.create({
        data: {
          schoolId,
          userId: userId || null,
          action: PAYMENT_AUDIT_EVENTS.CREATE_PAYMENT,
          entityType: 'FeePayment',
          entityId: payment.id,
          newValues: {
            receiptNumber,
            receivedAmount: totalReceivedDecimal.toString(),
            paymentMode,
            referenceNumber: refNumber,
            studentId,
            chargesPaid: allocationRecords.length,
          },
        },
      });

      return {
        success: true,
        paymentId: payment.id,
        receiptNumber: payment.receiptNumber,
        receivedAmount: payment.receivedAmount.toString(),
        allocatedAmount: totalAllocatedDecimal.toString(),
        chargesPaid: allocationRecords.length,
        paymentDate: payment.paymentDate,
        paymentMode: payment.paymentMode,
      };
    });
  },

  /**
   * Void a payment, recalculate affected charge statuses, and maintain audit history.
   *
   * @param {string} schoolId
   * @param {string} paymentId
   * @param {Object} voidData
   * @param {string} [userId]
   */
  async voidPayment(schoolId, paymentId, voidData, userId) {
    if (!schoolId || !paymentId) {
      throw new ApiError(400, 'School ID and Payment ID are required');
    }

    return await prisma.$transaction(async (tx) => {
      const payment = await tx.feePayment.findFirst({
        where: { id: paymentId, schoolId },
        include: {
          allocations: true,
        },
      });

      if (!payment) {
        throw new ApiError(404, 'Payment record not found');
      }

      if (payment.status === 'VOID') {
        throw new ApiError(400, 'Payment is already voided');
      }

      await tx.feePayment.update({
        where: { id: paymentId },
        data: { status: 'VOID' },
      });

      const affectedChargeIds = payment.allocations.map((a) => a.chargeId);

      for (const chargeId of affectedChargeIds) {
        const charge = await tx.studentFeeCharge.findUnique({
          where: { id: chargeId },
        });

        if (!charge) continue;

        const activeAllocationsAggregate = await tx.paymentAllocation.aggregate({
          where: {
            chargeId,
            payment: {
              status: { not: 'VOID' },
            },
          },
          _sum: {
            allocatedAmount: true,
          },
        });

        const newTotalPaid = activeAllocationsAggregate._sum.allocatedAmount || new Prisma.Decimal(0);
        const chargeAmount = new Prisma.Decimal(charge.amount);
        const remaining = chargeAmount.minus(newTotalPaid);

        let restoredStatus = 'UNPAID';
        if (remaining.equals(0)) {
          restoredStatus = 'PAID';
        } else if (newTotalPaid.greaterThan(0)) {
          restoredStatus = 'PARTIAL';
        }

        await tx.studentFeeCharge.update({
          where: { id: chargeId },
          data: {
            paidAmount: newTotalPaid,
            status: restoredStatus,
          },
        });
      }

      // Record FinancialLedger Reversal for voided fee payment
      const originalLedger = await tx.financialTransaction.findFirst({
        where: {
          schoolId,
          sourceType: 'FEE_COLLECTION',
          sourceId: paymentId,
          isReversal: false,
        },
      });

      if (originalLedger) {
        await financialLedgerService.createReversalTransaction(
          tx,
          originalLedger,
          voidData.reason || voidData.remarks || 'Fee payment voided by admin',
          userId
        );
      } else {
        await financialLedgerService.createTransaction(tx, {
          schoolId,
          academicYearId: payment.academicYearId,
          transactionDate: new Date(),
          type: 'DEBIT',
          sourceType: 'FEE_REFUND',
          sourceId: paymentId,
          amount: payment.receivedAmount,
          paymentMode: payment.paymentMode,
          referenceNumber: payment.receiptNumber,
          description: `Fee Refund / Reversal for Receipt #${payment.receiptNumber}`,
          isReversal: true,
          createdById: userId || null,
        });
      }

      const voidReason = voidData.reason || voidData.remarks || 'Payment voided by admin';
      await tx.auditLog.create({
        data: {
          schoolId,
          userId: userId || null,
          action: PAYMENT_AUDIT_EVENTS.VOID_PAYMENT,
          entityType: 'FeePayment',
          entityId: paymentId,
          oldValues: {
            status: 'SUCCESS',
            receiptNumber: payment.receiptNumber,
            receivedAmount: payment.receivedAmount.toString(),
          },
          newValues: {
            status: 'VOID',
            reason: voidReason,
          },
        },
      });

      return {
        success: true,
        paymentId,
        receiptNumber: payment.receiptNumber,
        status: 'VOID',
        message: 'Payment voided successfully and charge statuses restored',
      };
    });
  },

  /**
   * Retrieve full receipt details by payment ID.
   *
   * @param {string} schoolId
   * @param {string} paymentId
   */
  async getReceipt(schoolId, paymentId) {
    const payment = await prisma.feePayment.findFirst({
      where: { id: paymentId, schoolId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            admissionNo: true,
            guardianName: true,
            phone: true,
            photoUrl: true,
            address: true,
            enrollments: {
              select: {
                id: true,
                status: true,
                classId: true,
                sectionId: true,
                mediumId: true,
                streamId: true,
                rollNo: true,
                class: { select: { id: true, name: true, order: true } },
                section: { select: { id: true, name: true } },
                medium: { select: { id: true, name: true } },
                stream: { select: { id: true, name: true } },
              },
            },
          },
        },
        academicYear: {
          select: { id: true, name: true },
        },
        receivedBy: {
          select: { id: true, name: true, email: true },
        },
        allocations: {
          include: {
            charge: {
              include: {
                academicYear: {
                  select: { id: true, name: true, startDate: true, endDate: true },
                },
                feeType: {
                  select: { id: true, name: true, code: true },
                },
                allocations: {
                  where: {
                    payment: {
                      status: 'SUCCESS',
                    },
                  },
                  select: {
                    id: true,
                    allocatedAmount: true,
                    payment: {
                      select: { id: true, createdAt: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new ApiError(404, 'Payment receipt not found');
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        phone: true,
        email: true,
        district: true,
        state: true,
        pincode: true,
        udiseCode: true,
        affiliationNo: true,
        website: true,
        logoUrl: true,
      },
    });

    const totalAllocated = payment.allocations.reduce(
      (sum, item) => sum.plus(new Prisma.Decimal(item.allocatedAmount)),
      new Prisma.Decimal(0)
    );

    return {
      id: payment.id,
      receiptNumber: payment.receiptNumber,
      paymentDate: payment.paymentDate,
      paymentMode: payment.paymentMode,
      referenceNumber: payment.referenceNumber,
      receivedAmount: Number(payment.receivedAmount),
      allocatedAmount: Number(totalAllocated),
      status: payment.status,
      remarks: payment.remarks,
      student: payment.student,
      academicYear: payment.academicYear,
      receivedBy: payment.receivedBy ? { id: payment.receivedBy.id, name: payment.receivedBy.name } : null,
      schoolHeader: school,
      allocations: payment.allocations.map((alloc) => {
        const currentPaymentTime = new Date(payment.createdAt).getTime();
        const prevAllocations = (alloc.charge.allocations || []).filter((other) => {
          if (!other.payment) return false;
          const otherTime = new Date(other.payment.createdAt).getTime();
          if (otherTime < currentPaymentTime) return true;
          if (otherTime === currentPaymentTime && other.payment.id < payment.id) return true;
          return false;
        });

        const previouslyPaidAmount = prevAllocations.reduce(
          (sum, a) => sum + Number(a.allocatedAmount || 0),
          0
        );

        const chargeAmt = Number(alloc.charge.amount);
        const allocatedAmt = Number(alloc.allocatedAmount);
        const totalPaidAfterThis = previouslyPaidAmount + allocatedAmt;
        const remaining = Math.max(0, chargeAmt - totalPaidAfterThis);
        const targetYear = alloc.charge.academicYear
          ? getTargetYearForFeeMonth(alloc.charge.academicYear, alloc.charge.month)
          : null;

        return {
          id: alloc.id,
          chargeId: alloc.chargeId,
          title: alloc.charge.title,
          month: alloc.charge.month,
          year: targetYear,
          feeType: alloc.charge.feeType,
          originalAmount: chargeAmt,
          chargeAmount: chargeAmt,
          amount: chargeAmt,
          previouslyPaidAmount,
          allocatedAmount: allocatedAmt,
          paidNowAmount: allocatedAmt,
          totalPaidAmount: totalPaidAfterThis,
          paidAmount: totalPaidAfterThis,
          remainingBalance: remaining,
          chargeStatus: alloc.charge.status,
        };
      }),
      createdAt: payment.createdAt,
    };
  },

  /**
   * Retrieve receipt details for reprint, enriched with school branding information.
   *
   * @param {string} schoolId
   * @param {string} paymentId
   * @param {string} [userId]
   */
  async getReceiptReprint(schoolId, paymentId, userId) {
    const receipt = await this.getReceipt(schoolId, paymentId);
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        phone: true,
        email: true,
        district: true,
        state: true,
        pincode: true,
        udiseCode: true,
        affiliationNo: true,
        website: true,
        logoUrl: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        schoolId,
        userId: userId || null,
        action: PAYMENT_AUDIT_EVENTS.REPRINT_RECEIPT,
        entityType: 'FeePayment',
        entityId: paymentId,
        newValues: { receiptNumber: receipt.receiptNumber },
      },
    });

    return {
      ...receipt,
      schoolHeader: school,
    };
  },

  /**
   * Helper to format student enrollment & class info for receipts
   */
  _formatPaymentClassData(payment) {
    const allocWithEnrollment = payment.allocations?.find((a) => a.charge?.studentEnrollment);
    const chargeEnrollment = allocWithEnrollment?.charge?.studentEnrollment;

    const yearId = payment.academicYearId || payment.academicYear?.id;
    const studentEnrollments = payment.student?.enrollments || [];
    const activeEnrollment =
      (yearId ? studentEnrollments.find((e) => e.academicYearId === yearId && e.status === 'ACTIVE') : null) ||
      (yearId ? studentEnrollments.find((e) => e.academicYearId === yearId) : null) ||
      studentEnrollments.find((e) => e.status === 'ACTIVE') ||
      studentEnrollments[0];

    const enr = chargeEnrollment || activeEnrollment;

    const rawClassName = enr?.class?.name || null;
    const className = rawClassName
      ? rawClassName.toLowerCase().startsWith('class')
        ? rawClassName
        : `Class ${rawClassName}`
      : null;
    const sectionName = enr?.section?.name || null;
    const mediumName = enr?.medium?.name || null;
    const streamName = enr?.stream?.name || null;

    const studentObj = payment.student
      ? {
          id: payment.student.id,
          name: payment.student.name,
          admissionNo: payment.student.admissionNo,
          phone: payment.student.phone,
          guardianName: payment.student.guardianName,
          enrollment: enr || null,
          enrollments: payment.student.enrollments || (enr ? [enr] : []),
        }
      : null;

    return {
      student: studentObj,
      className,
      sectionName,
      mediumName,
      streamName,
    };
  },

  /**
   * Search receipts by receipt number, student name, admission number, phone, reference, or remarks.
   * Optimized with instant exact receipt number lookup.
   *
   * @param {string} schoolId
   * @param {Object} query
   */
  async searchReceipts(schoolId, query = {}) {
    const searchTerm = (query.q || query.receiptNumber || '').trim();
    if (!searchTerm) {
      return { data: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } };
    }

    const studentSelect = {
      id: true,
      name: true,
      admissionNo: true,
      phone: true,
      guardianName: true,
      enrollments: {
        select: {
          id: true,
          academicYearId: true,
          status: true,
          class: { select: { id: true, name: true } },
          section: { select: { id: true, name: true } },
          medium: { select: { id: true, name: true } },
          stream: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    };

    const allocationsInclude = {
      include: {
        charge: {
          select: {
            id: true,
            title: true,
            month: true,
            amount: true,
            studentEnrollment: {
              select: {
                class: { select: { id: true, name: true } },
                section: { select: { id: true, name: true } },
                medium: { select: { id: true, name: true } },
                stream: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    };

    const academicYearId = query.academicYearId;

    // Direct exact lookup optimization for receipt numbers
    const exactReceipt = await prisma.feePayment.findFirst({
      where: {
        schoolId,
        ...(academicYearId && { academicYearId }),
        receiptNumber: { equals: searchTerm, mode: 'insensitive' },
      },
      include: {
        student: { select: studentSelect },
        academicYear: { select: { id: true, name: true } },
        receivedBy: { select: { id: true, name: true } },
        allocations: allocationsInclude,
      },
    });

    if (exactReceipt) {
      const classData = this._formatPaymentClassData(exactReceipt);
      return {
        data: [
          {
            id: exactReceipt.id,
            receiptNumber: exactReceipt.receiptNumber,
            studentName: exactReceipt.student?.name,
            admissionNo: exactReceipt.student?.admissionNo,
            receivedAmount: Number(exactReceipt.receivedAmount),
            paymentMode: exactReceipt.paymentMode,
            referenceNumber: exactReceipt.referenceNumber,
            status: exactReceipt.status,
            paymentDate: exactReceipt.paymentDate,
            academicYear: exactReceipt.academicYear,
            student: classData.student,
            className: classData.className,
            sectionName: classData.sectionName,
            mediumName: classData.mediumName,
            streamName: classData.streamName,
          },
        ],
        pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
    }

    // Fuzzy search across student & payment attributes
    const whereClause = {
      schoolId,
      ...(academicYearId && { academicYearId }),
      OR: [
        { receiptNumber: { contains: searchTerm, mode: 'insensitive' } },
        { referenceNumber: { contains: searchTerm, mode: 'insensitive' } },
        { remarks: { contains: searchTerm, mode: 'insensitive' } },
        { student: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { student: { admissionNo: { contains: searchTerm, mode: 'insensitive' } } },
        { student: { guardianName: { contains: searchTerm, mode: 'insensitive' } } },
        { student: { phone: { contains: searchTerm, mode: 'insensitive' } } },
      ],
    };

    const limit = Number(query.limit) || 20;
    const page = Number(query.page) || 1;
    const skip = (page - 1) * limit;

    const [total, payments] = await Promise.all([
      prisma.feePayment.count({ where: whereClause }),
      prisma.feePayment.findMany({
        where: whereClause,
        include: {
          student: { select: studentSelect },
          academicYear: { select: { id: true, name: true } },
          allocations: allocationsInclude,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: payments.map((p) => {
        const classData = this._formatPaymentClassData(p);
        return {
          id: p.id,
          receiptNumber: p.receiptNumber,
          studentName: p.student?.name,
          admissionNo: p.student?.admissionNo,
          receivedAmount: Number(p.receivedAmount),
          paymentMode: p.paymentMode,
          referenceNumber: p.referenceNumber,
          status: p.status,
          paymentDate: p.paymentDate,
          academicYear: p.academicYear,
          student: classData.student,
          className: classData.className,
          sectionName: classData.sectionName,
          mediumName: classData.mediumName,
          streamName: classData.streamName,
        };
      }),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * List payments with advanced search, multi-field filters, custom sorting, and pagination.
   *
   * @param {string} schoolId
   * @param {Object} query
   */
  async getPayments(schoolId, query = {}) {
    const {
      search,
      studentId,
      academicYearId,
      month,
      paymentMode,
      status,
      classId,
      sectionId,
      mediumId,
      streamId,
      startDate,
      endDate,
      collectedById,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
    } = query;

    const skip = (Number(page) - 1) * Number(limit);

    const whereClause = {
      schoolId,
      ...(studentId && { studentId }),
      ...(academicYearId && { academicYearId }),
      ...(status && { status }),
      ...(paymentMode && { paymentMode }),
      ...(collectedById && { receivedById: collectedById }),
    };

    if (startDate || endDate) {
      whereClause.paymentDate = {
        ...(startDate && { gte: getISTDayBounds(startDate).startOfDay }),
        ...(endDate && { lte: getISTDayBounds(endDate).endOfDay }),
      };
    }

    if (search && search.trim() !== '') {
      const term = search.trim();
      whereClause.OR = [
        { receiptNumber: { contains: term, mode: 'insensitive' } },
        { referenceNumber: { contains: term, mode: 'insensitive' } },
        { remarks: { contains: term, mode: 'insensitive' } },
        { student: { name: { contains: term, mode: 'insensitive' } } },
        { student: { admissionNo: { contains: term, mode: 'insensitive' } } },
        { student: { guardianName: { contains: term, mode: 'insensitive' } } },
        { student: { phone: { contains: term, mode: 'insensitive' } } },
      ];
    }

    // Filter by student enrollment criteria if class/medium/stream/section specified
    if (classId || sectionId || mediumId || streamId || month) {
      whereClause.allocations = {
        some: {
          charge: {
            ...(month && { month }),
            studentEnrollment: {
              ...(classId && { classId }),
              ...(sectionId && { sectionId }),
              ...(mediumId && { mediumId }),
              ...(streamId && { streamId }),
            },
          },
        },
      };
    }

    // Handle custom sorting
    let orderByObj = { createdAt: 'desc' };
    if (sortBy === 'studentName') {
      orderByObj = { student: { name: sortOrder } };
    } else if (['paymentDate', 'receiptNumber', 'receivedAmount', 'createdAt'].includes(sortBy)) {
      orderByObj = { [sortBy]: sortOrder };
    }

    const [total, payments] = await Promise.all([
      prisma.feePayment.count({ where: whereClause }),
      prisma.feePayment.findMany({
        where: whereClause,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              admissionNo: true,
              phone: true,
              photoUrl: true,
              guardianName: true,
              enrollments: {
                select: {
                  id: true,
                  academicYearId: true,
                  status: true,
                  class: { select: { id: true, name: true } },
                  section: { select: { id: true, name: true } },
                  medium: { select: { id: true, name: true } },
                  stream: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: 'desc' },
              },
            },
          },
          academicYear: {
            select: { id: true, name: true },
          },
          receivedBy: {
            select: { id: true, name: true },
          },
          allocations: {
            include: {
              charge: {
                select: {
                  id: true,
                  title: true,
                  month: true,
                  amount: true,
                  studentEnrollment: {
                    select: {
                      class: { select: { id: true, name: true } },
                      section: { select: { id: true, name: true } },
                      medium: { select: { id: true, name: true } },
                      stream: { select: { id: true, name: true } },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: orderByObj,
        skip,
        take: Number(limit),
      }),
    ]);

    return {
      payments: payments.map((p) => {
        const classData = this._formatPaymentClassData(p);
        return {
          id: p.id,
          receiptNumber: p.receiptNumber,
          studentName: p.student?.name,
          admissionNo: p.student?.admissionNo,
          amount: Number(p.receivedAmount),
          receivedAmount: Number(p.receivedAmount),
          paymentMode: p.paymentMode,
          referenceNumber: p.referenceNumber,
          status: p.status,
          paymentDate: p.paymentDate,
          academicYear: p.academicYear,
          collectedBy: p.receivedBy?.name,
          chargesPaidCount: p.allocations.length,
          createdAt: p.createdAt,
          student: classData.student,
          className: classData.className,
          sectionName: classData.sectionName,
          mediumName: classData.mediumName,
          streamName: classData.streamName,
        };
      }),
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  },

  /**
   * Retrieve all payments for a single student.
   *
   * @param {string} schoolId
   * @param {string} studentId
   */
  async getStudentPayments(schoolId, studentId) {
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
    });

    if (!student) {
      throw new ApiError(404, 'Student not found');
    }

    const payments = await prisma.feePayment.findMany({
      where: {
        schoolId,
        studentId,
      },
      include: {
        academicYear: { select: { id: true, name: true } },
        receivedBy: { select: { id: true, name: true } },
        allocations: {
          include: {
            charge: {
              select: { id: true, title: true, month: true, amount: true },
            },
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
    });

    return payments.map((p) => ({
      id: p.id,
      receiptNumber: p.receiptNumber,
      paymentDate: p.paymentDate,
      paymentMode: p.paymentMode,
      referenceNumber: p.referenceNumber,
      amount: Number(p.receivedAmount),
      status: p.status,
      remarks: p.remarks,
      academicYear: p.academicYear,
      collectedBy: p.receivedBy?.name,
      allocations: p.allocations.map((a) => ({
        chargeId: a.chargeId,
        title: a.charge.title,
        month: a.charge.month,
        allocatedAmount: Number(a.allocatedAmount),
      })),
    }));
  },

  /**
   * Retrieve outstanding fee charges and dues summary for a student.
   *
   * @param {string} schoolId
   * @param {string} studentId
   */
  async getStudentOutstanding(schoolId, studentId) {
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: {
        enrollments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            class: { select: { id: true, name: true } },
            section: { select: { id: true, name: true } },
            medium: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!student) {
      throw new ApiError(404, 'Student not found');
    }

    const charges = await prisma.studentFeeCharge.findMany({
      where: {
        schoolId,
        studentId,
        status: { in: ['UNPAID', 'PARTIAL'] },
      },
      include: {
        academicYear: {
          select: { id: true, name: true, startDate: true, endDate: true },
        },
        feeType: { select: { id: true, name: true, code: true } },
        allocations: {
          where: {
            payment: { status: { not: 'VOID' } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    let totalChargesDecimal = new Prisma.Decimal(0);
    let totalPaidDecimal = new Prisma.Decimal(0);

    const chargeItems = charges.map((c) => {
      const chargeAmt = new Prisma.Decimal(c.amount);
      const paidAmt = c.allocations.reduce(
        (sum, a) => sum.plus(new Prisma.Decimal(a.allocatedAmount)),
        new Prisma.Decimal(0)
      );
      const dueAmt = Prisma.Decimal.max(new Prisma.Decimal(0), chargeAmt.minus(paidAmt));

      totalChargesDecimal = totalChargesDecimal.plus(chargeAmt);
      totalPaidDecimal = totalPaidDecimal.plus(paidAmt);

      const targetYear = c.academicYear
        ? getTargetYearForFeeMonth(c.academicYear, c.month)
        : null;

      return {
        id: c.id,
        title: c.title,
        month: c.month,
        year: targetYear,
        academicYear: c.academicYear,
        feeType: c.feeType,
        chargeAmount: Number(chargeAmt),
        paidAmount: Number(paidAmt),
        dueAmount: Number(dueAmt),
        balance: Number(dueAmt),
        status: c.status,
        dueDate: c.dueDate,
      };
    });

    const outstandingDecimal = Prisma.Decimal.max(new Prisma.Decimal(0), totalChargesDecimal.minus(totalPaidDecimal));

    return {
      student,
      charges: chargeItems,
      summary: {
        totalCharges: Number(totalChargesDecimal),
        totalPaid: Number(totalPaidDecimal),
        outstanding: Number(outstandingDecimal),
        totalOutstanding: Number(outstandingDecimal),
        dueAmount: Number(outstandingDecimal),
        unpaidCount: charges.length,
      },
    };
  },

  /**
   * Retrieve high-level dashboard financial metrics & recent payments.
   *
   * @param {string} schoolId
   */
  async getDashboardSummary(schoolId, query = {}) {
    const academicYearId = query.academicYearId;
    const { startOfDay: startOfToday, endOfDay: endOfToday } = getISTDayBounds();
    const { startOfMonth, endOfMonth } = getISTMonthBounds();

    const paymentWhere = {
      schoolId,
      ...(academicYearId && { academicYearId }),
    };

    const chargeWhere = {
      schoolId,
      ...(academicYearId && { academicYearId }),
    };

    const [
      todayAggregate,
      monthAggregate,
      totalReceiptsCount,
      todayPaidStudentsGroup,
      dueStudentsGroup,
      outstandingCharges,
      recentPayments,
    ] = await Promise.all([
      // Today Collection
      prisma.feePayment.aggregate({
        where: {
          ...paymentWhere,
          status: 'SUCCESS',
          paymentDate: { gte: startOfToday, lte: endOfToday },
        },
        _sum: { receivedAmount: true },
      }),
      // Month Collection
      prisma.feePayment.aggregate({
        where: {
          ...paymentWhere,
          status: 'SUCCESS',
          paymentDate: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { receivedAmount: true },
      }),
      // Total Receipts
      prisma.feePayment.count({
        where: { ...paymentWhere, status: 'SUCCESS' },
      }),
      // Students Paid Today
      prisma.feePayment.groupBy({
        by: ['studentId'],
        where: {
          ...paymentWhere,
          status: 'SUCCESS',
          paymentDate: { gte: startOfToday, lte: endOfToday },
        },
      }),
      // Students With Due
      prisma.studentFeeCharge.groupBy({
        by: ['studentId'],
        where: {
          ...chargeWhere,
          status: { in: ['UNPAID', 'PARTIAL'] },
        },
      }),
      // Outstanding Dues Aggregation
      prisma.studentFeeCharge.findMany({
        where: {
          ...chargeWhere,
          status: { in: ['UNPAID', 'PARTIAL'] },
        },
        select: {
          amount: true,
          paidAmount: true,
        },
      }),
      // Top 10 Recent Payments
      prisma.feePayment.findMany({
        where: paymentWhere,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              admissionNo: true,
              phone: true,
              guardianName: true,
              enrollments: {
                select: {
                  id: true,
                  academicYearId: true,
                  status: true,
                  class: { select: { id: true, name: true } },
                  section: { select: { id: true, name: true } },
                  medium: { select: { id: true, name: true } },
                  stream: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
          receivedBy: { select: { id: true, name: true } },
          allocations: {
            include: {
              charge: {
                select: {
                  id: true,
                  studentEnrollment: {
                    select: {
                      class: { select: { id: true, name: true } },
                      section: { select: { id: true, name: true } },
                      medium: { select: { id: true, name: true } },
                      stream: { select: { id: true, name: true } },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const todayCollection = Number(todayAggregate._sum.receivedAmount || 0);
    const monthCollection = Number(monthAggregate._sum.receivedAmount || 0);

    let totalOutstanding = 0;
    for (const c of outstandingCharges) {
      const chargeAmt = Number(c.amount || 0);
      const paidAmt = Number(c.paidAmount || 0);
      totalOutstanding += Math.max(0, chargeAmt - paidAmt);
    }

    return {
      todayCollection,
      monthCollection,
      outstanding: totalOutstanding,
      totalReceipts: totalReceiptsCount,
      studentsPaidToday: todayPaidStudentsGroup.length,
      studentsWithDue: dueStudentsGroup.length,
      recentPayments: recentPayments.map((p) => {
        const classData = this._formatPaymentClassData(p);
        return {
          id: p.id,
          receiptNumber: p.receiptNumber,
          studentName: p.student?.name,
          admissionNo: p.student?.admissionNo,
          amount: Number(p.receivedAmount),
          paymentMode: p.paymentMode,
          status: p.status,
          paymentDate: p.paymentDate,
          collectedBy: p.receivedBy?.name,
          student: classData.student,
          className: classData.className,
          sectionName: classData.sectionName,
          mediumName: classData.mediumName,
          streamName: classData.streamName,
        };
      }),
    };
  },

  /**
   * Hard delete a particular unpaid fee charge.
   * Permission restricted to School Admin / Owner only.
   * Hard rule: Charge MUST be strictly UNPAID with 0 paidAmount and no active allocations.
   *
   * @param {string} schoolId
   * @param {string} chargeId
   * @param {string} [userId]
   */
  async deleteUnpaidFeeCharge(schoolId, chargeId, userId) {
    if (!schoolId || !chargeId) {
      throw new ApiError(400, 'School ID and Charge ID are required');
    }

    const charge = await prisma.studentFeeCharge.findFirst({
      where: { id: chargeId, schoolId },
      include: {
        allocations: {
          where: {
            payment: {
              status: { not: 'VOID' },
            },
          },
        },
      },
    });

    if (!charge) {
      throw new ApiError(404, 'Fee charge not found');
    }

    const paidAmt = new Prisma.Decimal(charge.paidAmount || 0);
    if (charge.status !== 'UNPAID' || paidAmt.greaterThan(0) || charge.allocations.length > 0) {
      throw new ApiError(
        400,
        `Cannot delete charge '${charge.title}' because it has partial or full payments. Only UNPAID charges with no payment history can be deleted.`
      );
    }

    return await prisma.$transaction(async (tx) => {
      await tx.studentFeeCharge.delete({
        where: { id: chargeId },
      });

      await tx.auditLog.create({
        data: {
          schoolId,
          userId: userId || null,
          action: PAYMENT_AUDIT_EVENTS.DELETE_FEE_CHARGE,
          entityType: 'StudentFeeCharge',
          entityId: chargeId,
          oldValues: {
            title: charge.title,
            amount: charge.amount.toString(),
            studentId: charge.studentId,
            month: charge.month,
            status: charge.status,
          },
        },
      });

      return {
        success: true,
        message: `Unpaid fee charge '${charge.title}' deleted successfully`,
      };
    });
  },
};

export default paymentService;
