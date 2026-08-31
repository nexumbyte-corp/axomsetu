import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { getTargetYearForFeeMonth, FEE_MONTH_INDEX } from '../fees/fee-generation.service.js';

/**
 * Normalizes date string or Date object to UTC start-of-day.
 */
const normalizeDate = (dateInput) => {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Internal helper to validate transfer prerequisites and load all required master context.
 */
const validateAndFetchTransferContext = async ({
  schoolId,
  studentId,
  targetMediumId,
  targetStreamId = null,
  transferDate,
  tx = prisma,
}) => {
  // 1. Verify Student Master
  const student = await tx.student.findUnique({
    where: { id: studentId },
  });

  if (!student || student.schoolId !== schoolId) {
    throw ApiError.notFound('Student not found for this school');
  }

  if (student.status !== 'ACTIVE') {
    throw ApiError.badRequest(`Student '${student.name}' is not active (${student.status}). Transfers can only be performed for active students.`);
  }

  // 2. Fetch Current Active Enrollment for Student
  const currentEnrollment = await tx.studentEnrollment.findFirst({
    where: {
      schoolId,
      studentId,
      status: 'ACTIVE',
    },
    include: {
      academicYear: true,
      class: true,
      medium: true,
      stream: true,
    },
  });

  if (!currentEnrollment) {
    throw ApiError.notFound('No active enrollment record found for this student');
  }

  const { academicYear, class: currentClass, medium: currentMedium, stream: currentStream } = currentEnrollment;

  if (!academicYear || academicYear.schoolId !== schoolId) {
    throw ApiError.notFound('Academic year not found for current enrollment');
  }

  if (academicYear.isLocked) {
    throw ApiError.forbidden('This academic year is locked and historical transfers cannot be performed');
  }

  // 3. Transfer Date Validation
  const transferDateObj = normalizeDate(transferDate);
  if (!transferDateObj) {
    throw ApiError.badRequest('Invalid transfer date provided');
  }

  const ayStart = normalizeDate(academicYear.startDate);
  const ayEnd = normalizeDate(academicYear.endDate);

  if (transferDateObj < ayStart || transferDateObj > ayEnd) {
    const startStr = ayStart.toISOString().split('T')[0];
    const endStr = ayEnd.toISOString().split('T')[0];
    throw ApiError.badRequest(`Transfer date (${transferDateObj.toISOString().split('T')[0]}) must fall within the current academic year dates (${startStr} to ${endStr})`);
  }

  const todayNormalized = new Date();
  todayNormalized.setHours(0, 0, 0, 0);

  if (transferDateObj < todayNormalized) {
    throw ApiError.badRequest('Transfer date cannot be a backdate prior to today');
  }

  if (student.admissionDate) {
    const admissionDateObj = normalizeDate(student.admissionDate);
    if (transferDateObj < admissionDateObj) {
      const admStr = admissionDateObj.toISOString().split('T')[0];
      throw ApiError.badRequest(`Transfer date cannot be earlier than the student's admission date (${admStr})`);
    }
  }


  // 4. Validate Target Medium
  if (!targetMediumId) {
    throw ApiError.badRequest('Target Medium is required');
  }

  const targetMedium = await tx.medium.findUnique({
    where: { id: targetMediumId },
  });

  if (!targetMedium || targetMedium.schoolId !== schoolId) {
    throw ApiError.notFound('Target Medium not found for this school');
  }

  if (!targetMedium.isActive) {
    throw ApiError.badRequest(`Target Medium '${targetMedium.name}' is inactive`);
  }

  // 5. Validate Target Stream based on Class.hasStream
  let targetStream = null;
  const finalTargetStreamId = currentClass.hasStream ? (targetStreamId || null) : null;

  if (currentClass.hasStream) {
    if (!finalTargetStreamId) {
      throw ApiError.badRequest(`Stream is required for class '${currentClass.name}'`);
    }

    targetStream = await tx.stream.findUnique({
      where: { id: finalTargetStreamId },
    });

    if (!targetStream || targetStream.schoolId !== schoolId) {
      throw ApiError.notFound('Target Stream not found for this school');
    }

    if (!targetStream.isActive) {
      throw ApiError.badRequest(`Target Stream '${targetStream.name}' is inactive`);
    }
  } else {
    if (targetStreamId) {
      throw ApiError.badRequest(`Stream cannot be specified for class '${currentClass.name}' which does not support streams`);
    }
  }

  // 6. Ensure target configuration is different from current configuration
  const isMediumSame = currentEnrollment.mediumId === targetMediumId;
  const isStreamSame = (currentEnrollment.streamId || null) === (finalTargetStreamId || null);

  if (isMediumSame && isStreamSame) {
    throw ApiError.badRequest('Target Medium and Stream configuration is identical to the student\'s current enrollment');
  }

  return {
    student,
    currentEnrollment,
    academicYear,
    class: currentClass,
    currentMedium,
    currentStream,
    targetMedium,
    targetStream,
    finalTargetStreamId,
    transferDateObj,
  };
};

/**
 * Calculates fee summary preview for a proposed mid-session transfer.
 */
export const getTransferPreview = async (schoolId, studentId, { targetMediumId, targetStreamId, transferDate }) => {
  const context = await validateAndFetchTransferContext({
    schoolId,
    studentId,
    targetMediumId,
    targetStreamId,
    transferDate,
    tx: prisma,
  });

  const {
    student,
    currentEnrollment,
    academicYear,
    class: cls,
    currentMedium,
    currentStream,
    targetMedium,
    targetStream,
    finalTargetStreamId,
    transferDateObj,
  } = context;

  // 1. Fetch Current and Target Fee Structures for this class in this academic year
  const [currentStructure, targetStructure, existingCharges] = await Promise.all([
    prisma.feeStructure.findFirst({
      where: {
        schoolId,
        academicYearId: academicYear.id,
        classId: cls.id,
        mediumId: currentEnrollment.mediumId,
        streamId: currentEnrollment.streamId || null,
        isActive: true,
      },
      include: {
        heads: {
          where: { isActive: true },
          include: { feeType: true },
        },
      },
    }),
    prisma.feeStructure.findFirst({
      where: {
        schoolId,
        academicYearId: academicYear.id,
        classId: cls.id,
        mediumId: targetMediumId,
        streamId: finalTargetStreamId || null,
        isActive: true,
      },
      include: {
        heads: {
          where: { isActive: true },
          include: { feeType: true },
        },
      },
    }),
    prisma.studentFeeCharge.findMany({
      where: {
        schoolId,
        academicYearId: academicYear.id,
        studentId,
        studentEnrollmentId: currentEnrollment.id,
      },
      include: {
        feeType: true,
      },
    }),
  ]);

  // Compute monthly and one-time (admission) sums
  const currentMonthlyFee = (currentStructure?.heads || [])
    .filter((h) => h.feeType?.billingRule === 'MONTHLY')
    .reduce((sum, h) => sum + Number(h.amount), 0);

  const targetMonthlyFee = (targetStructure?.heads || [])
    .filter((h) => h.feeType?.billingRule === 'MONTHLY')
    .reduce((sum, h) => sum + Number(h.amount), 0);

  const currentOneTimeFee = (currentStructure?.heads || [])
    .filter((h) => h.feeType?.billingRule === 'ONE_TIME_PER_ACADEMIC_YEAR')
    .reduce((sum, h) => sum + Number(h.amount), 0);

  const targetOneTimeFee = (targetStructure?.heads || [])
    .filter((h) => h.feeType?.billingRule === 'ONE_TIME_PER_ACADEMIC_YEAR')
    .reduce((sum, h) => sum + Number(h.amount), 0);

  const monthlyDifference = targetMonthlyFee - currentMonthlyFee;
  const oneTimeDifference = targetOneTimeFee - currentOneTimeFee;

  // Target Fee Head Amount Map: feeTypeId -> amount
  const targetHeadMap = new Map();
  (targetStructure?.heads || []).forEach((h) => {
    targetHeadMap.set(h.feeTypeId, Number(h.amount));
  });

  // 2. Evaluate Fee Impact on Already Generated Charges (including Admission / One-Time Charges and Monthly charges from Transfer Date)
  let additionalAmountPayable = 0;
  const affectedCharges = [];

  for (const charge of existingCharges) {
    const isOneTimeCharge = charge.feeType?.billingRule === 'ONE_TIME_PER_ACADEMIC_YEAR' || charge.feeType?.systemCode === 'ADMISSION';
    const targetYear = getTargetYearForFeeMonth(academicYear, charge.month);
    const monthIndex = FEE_MONTH_INDEX[charge.month] ?? 0;
    const billingMonthEnd = new Date(targetYear, monthIndex + 1, 0, 23, 59, 59, 999);

    const isApplicablePeriod = isOneTimeCharge || billingMonthEnd >= transferDateObj;

    if (isApplicablePeriod) {
      const baselineAmount = Number(charge.originalAmount !== null ? charge.originalAmount : charge.amount);
      const targetHeadAmt = targetHeadMap.has(charge.feeTypeId) ? targetHeadMap.get(charge.feeTypeId) : 0;

      let deltaPayable = 0;
      let newChargeAmount = Number(charge.amount);

      if (targetHeadAmt > baselineAmount) {
        deltaPayable = targetHeadAmt - baselineAmount;
        newChargeAmount = Number(charge.amount) + deltaPayable;
        additionalAmountPayable += deltaPayable;
      }

      affectedCharges.push({
        id: charge.id,
        title: charge.title,
        month: charge.month,
        feeType: charge.feeType?.name,
        isOneTime: isOneTimeCharge,
        currentAmount: Number(charge.amount),
        targetHeadAmount: targetHeadAmt,
        newAmount: newChargeAmount,
        additionalPayable: deltaPayable,
        status: charge.status,
      });
    }
  }

  const isTargetLower = (targetMonthlyFee + targetOneTimeFee) < (currentMonthlyFee + currentOneTimeFee);


  return {
    student: {
      id: student.id,
      name: student.name,
      admissionNo: student.admissionNo,
      status: student.status,
    },
    academicYear: {
      id: academicYear.id,
      name: academicYear.name,
    },
    class: {
      id: cls.id,
      name: cls.name,
      hasStream: cls.hasStream,
    },
    currentEnrollment: {
      mediumId: currentMedium.id,
      mediumName: currentMedium.name,
      streamId: currentStream?.id || null,
      streamName: currentStream?.name || null,
    },
    targetEnrollment: {
      mediumId: targetMedium.id,
      mediumName: targetMedium.name,
      streamId: targetStream?.id || null,
      streamName: targetStream?.name || null,
    },
    transferDate: transferDateObj.toISOString().split('T')[0],
    feeSummary: {
      currentMonthlyFee,
      targetMonthlyFee,
      monthlyDifference,
      additionalAmountPayable,
      refundOrCredit: 0,
      isTargetLower,
      note: isTargetLower
        ? 'No refund or credit is applicable for a lower target fee structure.'
        : (additionalAmountPayable > 0
          ? `Target fee is higher. Charges from the transfer date will be updated to include the additional payable amount of ₹${additionalAmountPayable.toFixed(2)}.`
          : 'Fee structures are equal or no additional fee adjustment required.'),
    },
    affectedChargesCount: affectedCharges.length,
    affectedCharges,
  };
};

/**
 * Executes an atomic Mid-Session Student Transfer.
 */
export const transferStudentMediumStream = async (
  schoolId,
  studentId,
  { targetMediumId, targetStreamId, transferDate, reason },
  actorUserId
) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Validate Context & Load Records
    const context = await validateAndFetchTransferContext({
      schoolId,
      studentId,
      targetMediumId,
      targetStreamId,
      transferDate,
      tx,
    });

    const {
      student,
      currentEnrollment,
      academicYear,
      class: cls,
      currentMedium,
      currentStream,
      targetMedium,
      targetStream,
      finalTargetStreamId,
      transferDateObj,
    } = context;

    // 2. Load Current and Target Fee Structures
    const [currentStructure, targetStructure, existingCharges] = await Promise.all([
      tx.feeStructure.findFirst({
        where: {
          schoolId,
          academicYearId: academicYear.id,
          classId: cls.id,
          mediumId: currentEnrollment.mediumId,
          streamId: currentEnrollment.streamId || null,
          isActive: true,
        },
        include: {
          heads: {
            where: { isActive: true },
            include: { feeType: true },
          },
        },
      }),
      tx.feeStructure.findFirst({
        where: {
          schoolId,
          academicYearId: academicYear.id,
          classId: cls.id,
          mediumId: targetMediumId,
          streamId: finalTargetStreamId || null,
          isActive: true,
        },
        include: {
          heads: {
            where: { isActive: true },
            include: { feeType: true },
          },
        },
      }),
      tx.studentFeeCharge.findMany({
        where: {
          schoolId,
          academicYearId: academicYear.id,
          studentId,
          studentEnrollmentId: currentEnrollment.id,
        },
        include: {
          feeType: true,
        },
      }),
    ]);

    const currentMonthlyFee = (currentStructure?.heads || [])
      .filter((h) => h.feeType?.billingRule === 'MONTHLY')
      .reduce((sum, h) => sum + Number(h.amount), 0);

    const targetMonthlyFee = (targetStructure?.heads || [])
      .filter((h) => h.feeType?.billingRule === 'MONTHLY')
      .reduce((sum, h) => sum + Number(h.amount), 0);

    const monthlyDifference = targetMonthlyFee - currentMonthlyFee;

    const targetHeadMap = new Map();
    (targetStructure?.heads || []).forEach((h) => {
      targetHeadMap.set(h.feeTypeId, Number(h.amount));
    });

    // 3. Recalculate Charges from Transfer Date Onward
    let totalAdditionalPayable = 0;
    const updatedChargesDetails = [];

    for (const charge of existingCharges) {
      const isOneTimeCharge = charge.feeType?.billingRule === 'ONE_TIME_PER_ACADEMIC_YEAR' || charge.feeType?.systemCode === 'ADMISSION';
      const targetYear = getTargetYearForFeeMonth(academicYear, charge.month);
      const monthIndex = FEE_MONTH_INDEX[charge.month] ?? 0;
      const billingMonthEnd = new Date(targetYear, monthIndex + 1, 0, 23, 59, 59, 999);

      const isApplicablePeriod = isOneTimeCharge || billingMonthEnd >= transferDateObj;

      if (isApplicablePeriod) {

        const baselineAmount = Number(charge.originalAmount !== null ? charge.originalAmount : charge.amount);
        const targetHeadAmt = targetHeadMap.has(charge.feeTypeId) ? targetHeadMap.get(charge.feeTypeId) : 0;

        if (targetHeadAmt > baselineAmount) {
          const delta = targetHeadAmt - baselineAmount;
          const newOriginalAmount = targetHeadAmt;
          const newChargeAmount = Number(charge.amount) + delta;

          totalAdditionalPayable += delta;

          // Determine updated charge status relative to existing payments
          const paidAmt = Number(charge.paidAmount || 0);
          let newStatus = 'UNPAID';
          if (paidAmt >= newChargeAmount) {
            newStatus = 'PAID';
          } else if (paidAmt > 0) {
            newStatus = 'PARTIAL';
          } else {
            newStatus = 'UNPAID';
          }

          await tx.studentFeeCharge.update({
            where: { id: charge.id },
            data: {
              amount: new Prisma.Decimal(newChargeAmount),
              originalAmount: new Prisma.Decimal(newOriginalAmount),
              feeStructureId: targetStructure?.id || null,
              status: newStatus,
            },
          });

          updatedChargesDetails.push({
            chargeId: charge.id,
            month: charge.month,
            title: charge.title,
            previousAmount: Number(charge.amount),
            newAmount: newChargeAmount,
            additionalPayable: delta,
            status: newStatus,
          });
        }
      }
    }

    // 4. Create Historical Transfer Record
    const transferHistory = await tx.studentTransferHistory.create({
      data: {
        schoolId,
        studentId,
        studentEnrollmentId: currentEnrollment.id,
        academicYearId: academicYear.id,
        classId: cls.id,
        fromMediumId: currentEnrollment.mediumId,
        toMediumId: targetMediumId,
        fromStreamId: currentEnrollment.streamId || null,
        toStreamId: finalTargetStreamId || null,
        transferDate: transferDateObj,
        feeDifference: new Prisma.Decimal(monthlyDifference),
        additionalPayable: new Prisma.Decimal(totalAdditionalPayable),
        reason: reason?.trim() || null,
        createdById: actorUserId || null,
      },
      include: {
        fromMedium: { select: { id: true, name: true } },
        toMedium: { select: { id: true, name: true } },
        fromStream: { select: { id: true, name: true } },
        toStream: { select: { id: true, name: true } },
      },
    });

    // 5. Update Student Enrollment record with target Medium & Stream
    const updatedEnrollment = await tx.studentEnrollment.update({
      where: { id: currentEnrollment.id },
      data: {
        mediumId: targetMediumId,
        streamId: finalTargetStreamId || null,
      },
      include: {
        academicYear: { select: { id: true, name: true } },
        class: { select: { id: true, name: true, hasStream: true } },
        section: { select: { id: true, name: true } },
        medium: { select: { id: true, name: true } },
        stream: { select: { id: true, name: true } },
      },
    });

    // 6. Record Audit Log Entry
    await tx.auditLog.create({
      data: {
        schoolId,
        userId: actorUserId || null,
        action: 'STUDENT_MID_SESSION_TRANSFER',
        entityType: 'StudentEnrollment',
        entityId: currentEnrollment.id,
        oldValues: {
          mediumId: currentEnrollment.mediumId,
          mediumName: currentMedium.name,
          streamId: currentEnrollment.streamId || null,
          streamName: currentStream?.name || null,
        },
        newValues: {
          mediumId: targetMediumId,
          mediumName: targetMedium.name,
          streamId: finalTargetStreamId || null,
          streamName: targetStream?.name || null,
          transferDate: transferDateObj.toISOString().split('T')[0],
          additionalPayable: totalAdditionalPayable,
          transferHistoryId: transferHistory.id,
        },
      },
    });

    return {
      success: true,
      message: `Student '${student.name}' transferred to Medium '${targetMedium.name}'${targetStream ? ` and Stream '${targetStream.name}'` : ''} successfully effective from ${transferDateObj.toISOString().split('T')[0]}.`,
      transferHistory: {
        id: transferHistory.id,
        transferDate: transferHistory.transferDate,
        fromMedium: transferHistory.fromMedium,
        toMedium: transferHistory.toMedium,
        fromStream: transferHistory.fromStream,
        toStream: transferHistory.toStream,
        feeDifference: Number(transferHistory.feeDifference),
        additionalPayable: Number(transferHistory.additionalPayable),
        reason: transferHistory.reason,
        createdAt: transferHistory.createdAt,
      },
      enrollment: updatedEnrollment,
      recalculatedChargesCount: updatedChargesDetails.length,
      additionalAmountPayable: totalAdditionalPayable,
    };
  });
};

/**
 * Retrieves mid-session transfer history for a student.
 */
export const getStudentTransferHistory = async (schoolId, studentId) => {
  const histories = await prisma.studentTransferHistory.findMany({
    where: { schoolId, studentId },
    include: {
      academicYear: { select: { id: true, name: true } },
      class: { select: { id: true, name: true } },
      fromMedium: { select: { id: true, name: true } },
      toMedium: { select: { id: true, name: true } },
      fromStream: { select: { id: true, name: true } },
      toStream: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return histories.map((h) => ({
    id: h.id,
    academicYear: h.academicYear,
    class: h.class,
    fromMedium: h.fromMedium,
    toMedium: h.toMedium,
    fromStream: h.fromStream,
    toStream: h.toStream,
    transferDate: h.transferDate.toISOString().split('T')[0],
    feeDifference: Number(h.feeDifference),
    additionalPayable: Number(h.additionalPayable),
    reason: h.reason,
    createdBy: h.createdBy,
    createdAt: h.createdAt,
  }));
};
