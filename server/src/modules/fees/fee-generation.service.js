import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { getSystemFeeType } from './fee-type.service.js';
import { isStudentOperationallyActive } from '../students/student.service.js';
import { ensureFeeChargesBulk } from './fee-creation.service.js';

export const FEE_MONTH_INDEX = {
  JANUARY: 0,
  FEBRUARY: 1,
  MARCH: 2,
  APRIL: 3,
  MAY: 4,
  JUNE: 5,
  JULY: 6,
  AUGUST: 7,
  SEPTEMBER: 8,
  OCTOBER: 9,
  NOVEMBER: 10,
  DECEMBER: 11,
};

/**
 * Computes target calendar year for a given FeeMonth in an AcademicYear.
 */
export const getTargetYearForFeeMonth = (academicYear, generationMonth) => {
  const ayStart = new Date(academicYear.startDate);
  const ayEnd = new Date(academicYear.endDate);
  const startYear = ayStart.getUTCFullYear();
  const startMonthIndex = ayStart.getUTCMonth();
  const endYear = ayEnd.getUTCFullYear();

  const targetMonthIndex = FEE_MONTH_INDEX[generationMonth] ?? 0;

  if (targetMonthIndex >= startMonthIndex) {
    return startYear;
  } else {
    return endYear;
  }
};

/**
 * Reusable helper to check if a service/enrollment (Hostel, Transport, Mess, etc.)
 * is effective for a given month within an AcademicYear.
 * Compares Year + Month (ignoring day of month).
 */
export const isEffectiveForMonth = ({ startDate, endDate, generationMonth, academicYear }) => {
  if (!startDate) return false;

  const targetYear = getTargetYearForFeeMonth(academicYear, generationMonth);
  const targetMonthIndex = FEE_MONTH_INDEX[generationMonth] ?? 0;
  const targetKey = targetYear * 12 + targetMonthIndex;

  const startD = new Date(startDate);
  const startYear = startD.getUTCFullYear();
  const startMonthIndex = startD.getUTCMonth();
  const startKey = startYear * 12 + startMonthIndex;

  if (targetKey < startKey) {
    return false;
  }

  if (endDate) {
    const endD = new Date(endDate);
    const endYear = endD.getUTCFullYear();
    const endMonthIndex = endD.getUTCMonth();
    const endKey = endYear * 12 + endMonthIndex;
    if (targetKey > endKey) {
      return false;
    }
  }

  return true;
};

/**
 * Resolves active student enrollments based on mode and filters.
 */
const getTargetEnrollments = async (schoolId, payload) => {
  const { academicYearId, mode, classId, mediumId, streamId, sectionId, studentId } = payload;

  const where = {
    schoolId,
    academicYearId,
    status: { in: ['ACTIVE', 'PROMOTED'] },
  };

  if (mode === 'BY_CLASS') {
    if (!classId) throw ApiError.badRequest('Class is required for By Class mode');

    const cls = await prisma.class.findUnique({ where: { id: classId } });
    if (!cls || cls.schoolId !== schoolId) {
      throw ApiError.notFound('Class not found');
    }

    where.classId = classId;
    if (mediumId) {
      where.mediumId = mediumId;
    }
    if (cls.hasStream && streamId) {
      where.streamId = streamId;
    }
    if (sectionId) {
      where.sectionId = sectionId;
    }
  } else if (mode === 'BY_STUDENT') {
    if (!studentId) throw ApiError.badRequest('Student is required for By Student mode');
    where.studentId = studentId;
  }

  const enrollments = await prisma.studentEnrollment.findMany({
    where,
    include: {
      student: { select: { id: true, admissionNo: true, name: true, guardianName: true, status: true } },
      class: { select: { id: true, name: true, code: true, hasStream: true } },
      medium: { select: { id: true, name: true } },
      stream: { select: { id: true, name: true } },
      section: { select: { id: true, name: true } },
    },
    orderBy: [
      { class: { order: 'asc' } },
      { rollNo: 'asc' },
    ],
  });

  return enrollments;
};

/**
 * Computes fee generation preview with accurate duplicate detection and eligibility breakdown.
 */
export const processFeeGenerationPreview = async (schoolId, payload) => {
  const { academicYearId, month, mode, customFeeHeads = [] } = payload;

  // 1. Verify Academic Year
  const academicYear = await prisma.academicYear.findUnique({
    where: { id: academicYearId },
  });

  if (!academicYear || academicYear.schoolId !== schoolId) {
    throw ApiError.notFound('Academic year not found for this school');
  }

  if (academicYear.isLocked) {
    throw ApiError.forbidden('This academic year is locked. Fee generation is strictly blocked.');
  }

  // 2. Fetch target enrollments
  const enrollments = await getTargetEnrollments(schoolId, payload);
  if (enrollments.length === 0) {
    throw ApiError.badRequest('No active students found matching the selected filters');
  }

  // 3. Batch fetch configuration, overrides, existing charges, and fee types
  const studentIds = enrollments.map((e) => e.studentId);

  const [
    feeStructures,
    overrides,
    existingCharges,
    miscFeeType,
    allFeeTypes,
  ] = await Promise.all([
    prisma.feeStructure.findMany({
      where: {
        schoolId,
        academicYearId,
        isActive: true,
      },
      include: {
        class: { select: { id: true, name: true } },
        medium: { select: { id: true, name: true } },
        stream: { select: { id: true, name: true } },
        heads: {
          where: { isActive: true },
          include: {
            feeType: { select: { id: true, name: true, code: true, category: true, billingRule: true } },
          },
        },
      },
    }),
    prisma.studentFeeOverride.findMany({
      where: {
        schoolId,
        academicYearId,
        studentId: { in: studentIds },
        isActive: true,
      },
    }),
    prisma.studentFeeCharge.findMany({
      where: {
        schoolId,
        academicYearId,
        studentId: { in: studentIds },
      },
      select: {
        studentId: true,
        feeTypeId: true,
        month: true,
        title: true,
      },
    }),
    getSystemFeeType(schoolId, 'MISC'),
    prisma.feeType.findMany({ where: { schoolId } }),
  ]);

  // Map fee structures by class_medium_stream key
  const comboKeys = new Set();
  enrollments.forEach((e) => {
    comboKeys.add(`${e.classId}_${e.mediumId}_${e.streamId || 'null'}`);
  });

  const structureMap = new Map();
  feeStructures.forEach((fs) => {
    const key = `${fs.classId}_${fs.mediumId}_${fs.streamId || 'null'}`;
    structureMap.set(key, fs);
  });

  // Fallback for missing combos in current academic year
  for (const comboKey of comboKeys) {
    if (!structureMap.has(comboKey)) {
      const [classId, mediumId, streamIdStr] = comboKey.split('_');
      const streamId = streamIdStr === 'null' ? null : streamIdStr;

      const fallbackFs = await prisma.feeStructure.findFirst({
        where: {
          schoolId,
          classId,
          mediumId,
          streamId,
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
        include: {
          class: { select: { id: true, name: true } },
          medium: { select: { id: true, name: true } },
          stream: { select: { id: true, name: true } },
          heads: {
            where: { isActive: true },
            include: {
              feeType: { select: { id: true, name: true, code: true, category: true, billingRule: true } },
            },
          },
        },
      });

      if (fallbackFs) {
        structureMap.set(comboKey, fallbackFs);
      }
    }
  }

  // Map overrides by studentId_feeTypeId
  const overrideMap = new Map();
  overrides.forEach((o) => {
    overrideMap.set(`${o.studentId}_${o.feeTypeId}`, Number(o.amount));
  });

  // Idempotent duplicate check lookup sets (Logical identity ONLY: Student + AcademicYear + FeeType + Month)
  const monthlyExistingSet = new Set();
  const oneTimeExistingSet = new Set();

  existingCharges.forEach((c) => {
    monthlyExistingSet.add(`${c.studentId}_${c.feeTypeId}_${c.month}`);
    oneTimeExistingSet.add(`${c.studentId}_${c.feeTypeId}`);
  });

  // Custom fee head map
  const customMap = new Map();
  customFeeHeads.forEach((c) => {
    if (c.mediumId && c.feeTypeId) {
      customMap.set(`med_${c.mediumId}_ft_${c.feeTypeId}`, c);
    } else if (c.feeTypeId) {
      customMap.set(`ft_${c.feeTypeId}`, c);
    }
    if (c.title) {
      customMap.set(`title_${c.title}`, c);
    }
  });

  const feeTypeMap = new Map();
  allFeeTypes.forEach((ft) => feeTypeMap.set(ft.id, ft));

  // Build Charges Generation Candidates & Breakdown
  let totalEstimatedCharges = 0;
  let totalEstimatedAmount = 0;
  let alreadyExistsCount = 0;
  const skippedStudents = [];
  const skippedBreakdown = {
    notActive: 0,
    alreadyExists: 0,
    noFeeStructure: 0,
  };
  const chargesToCreate = [];
  const noStructureClasses = new Set();

  enrollments.forEach((e) => {
    // 1. Verify Student Operational Status
    if (!isStudentOperationallyActive(e.student)) {
      skippedStudents.push({
        studentId: e.student.id,
        studentName: e.student.name,
        admissionNo: e.student.admissionNo,
        feeHeadTitle: 'All Heads',
        reason: `Inactive Student (${e.student.status || 'INACTIVE'})`,
      });
      skippedBreakdown.notActive += 1;
      return;
    }

    const key = `${e.classId}_${e.mediumId}_${e.streamId || 'null'}`;
    const fs = structureMap.get(key);

    const headsToProcess = [];

    if (fs) {
      fs.heads.forEach((h) => {
        const customOverride = mode !== 'ENTIRE_SCHOOL'
          ? (customMap.get(`med_${e.mediumId}_ft_${h.feeTypeId}`) || customMap.get(`ft_${h.feeTypeId}`))
          : null;
        if (customOverride && customOverride.enabled === false && mode !== 'ENTIRE_SCHOOL') {
          return;
        }

        const studentOverrideAmt = overrideMap.get(`${e.studentId}_${h.feeTypeId}`);
        let finalAmount;
        if (studentOverrideAmt !== undefined) {
          finalAmount = studentOverrideAmt;
        } else if (mode !== 'ENTIRE_SCHOOL' && customOverride && customOverride.amount !== undefined) {
          finalAmount = Number(customOverride.amount);
        } else {
          finalAmount = Number(h.amount);
        }

        headsToProcess.push({
          feeTypeId: h.feeTypeId,
          feeStructureId: fs.id,
          title: h.feeType.name,
          amount: finalAmount,
          originalAmount: Number(h.amount),
          category: h.feeType.category || 'ACADEMIC',
          billingRule: h.feeType.billingRule || 'MONTHLY',
        });
      });
    }

    const customHeadsForStudent = customFeeHeads.filter((c) => {
      if (!c.enabled) return false;
      if (c.mediumId && c.mediumId !== e.mediumId) return false;
      if (fs && fs.heads.some((h) => h.feeTypeId === c.feeTypeId)) return false;
      return true;
    });

    if (!fs && customHeadsForStudent.length === 0) {
      noStructureClasses.add(`${e.class.name} (${e.medium.name}${e.stream ? ' - ' + e.stream.name : ''})`);
      skippedStudents.push({
        studentId: e.student.id,
        studentName: e.student.name,
        admissionNo: e.student.admissionNo,
        feeHeadTitle: 'All Heads',
        reason: 'No Fee Structure defined for class',
      });
      skippedBreakdown.noFeeStructure += 1;
      return;
    }

    customHeadsForStudent.forEach((temp) => {
      let tempCategory = 'ACADEMIC';
      let tempBillingRule = 'MONTHLY';
      let targetFeeTypeId = miscFeeType.id;

      if (temp.feeTypeId && feeTypeMap.has(temp.feeTypeId)) {
        const ft = feeTypeMap.get(temp.feeTypeId);
        tempCategory = ft.category || 'ACADEMIC';
        tempBillingRule = ft.billingRule || 'MONTHLY';
        targetFeeTypeId = temp.feeTypeId;
      }

      headsToProcess.push({
        feeTypeId: targetFeeTypeId,
        feeStructureId: null,
        title: temp.title,
        amount: Number(temp.amount),
        originalAmount: Number(temp.amount),
        category: tempCategory,
        billingRule: tempBillingRule,
      });
    });

    headsToProcess.forEach((head) => {
      if (!head.feeTypeId) {
        throw ApiError.badRequest(`Fee charge '${head.title}' cannot be generated without a valid Fee Type`);
      }

      const billingRule = head.billingRule || 'MONTHLY';

      // Logical identity duplicate check (ignoring title, amount, batch)
      const isOneTime = billingRule === 'ONE_TIME_PER_ACADEMIC_YEAR';
      const isDuplicate = isOneTime
        ? oneTimeExistingSet.has(`${e.studentId}_${head.feeTypeId}`)
        : monthlyExistingSet.has(`${e.studentId}_${head.feeTypeId}_${month}`);

      if (isDuplicate) {
        skippedStudents.push({
          studentId: e.student.id,
          studentName: e.student.name,
          admissionNo: e.student.admissionNo,
          feeHeadTitle: head.title,
          reason: 'Fee Charge Already Exists',
        });
        skippedBreakdown.alreadyExists += 1;
        alreadyExistsCount += 1;
        return;
      }

      chargesToCreate.push({
        schoolId,
        academicYearId,
        studentId: e.studentId,
        studentEnrollmentId: e.id,
        feeTypeId: head.feeTypeId,
        feeStructureId: head.feeStructureId,
        title: head.title,
        month,
        amount: head.amount,
        originalAmount: head.originalAmount,
        billingRule,
      });
      totalEstimatedCharges += 1;
      totalEstimatedAmount += head.amount;
    });
  });

  const generatedCount = chargesToCreate.length;
  const skippedCount = skippedStudents.length;

  return {
    academicYear: { id: academicYear.id, name: academicYear.name },
    month,
    mode,
    totalStudents: enrollments.length,
    eligibleStudents: enrollments.length - skippedBreakdown.noFeeStructure,
    generatedCount,
    alreadyExistsCount,
    skippedCount,
    skippedBreakdown,
    totalEstimatedCharges,
    totalEstimatedAmount,
    noStructureClasses: Array.from(noStructureClasses),
    skippedStudents,
    chargesToCreate,
  };
};

export const executeFeeGeneration = async (schoolId, payload, actorUserId) => {
  const preview = await processFeeGenerationPreview(schoolId, payload);

  if (preview.chargesToCreate.length === 0) {
    if (preview.alreadyExistsCount > 0) {
      return {
        batchId: null,
        month: payload.month,
        academicYearId: payload.academicYearId,
        totalStudents: preview.totalStudents,
        generatedCount: 0,
        alreadyExistsCount: preview.alreadyExistsCount,
        skippedCount: preview.skippedCount,
        skippedBreakdown: preview.skippedBreakdown,
        totalAmount: 0,
        noStructureClasses: preview.noStructureClasses,
        skippedStudents: preview.skippedStudents,
        message: 'All fees for the selected criteria already exist. No new charges were generated.',
      };
    }
    throw ApiError.badRequest('No new charges to generate. All students either already have charges generated or have no Fee Structure configured.');
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Create Batch Audit Record
    const batch = await tx.feeGenerationBatch.create({
      data: {
        schoolId,
        academicYearId: payload.academicYearId,
        month: payload.month,
        mode: payload.mode,
        classId: payload.classId || null,
        mediumId: payload.mediumId || null,
        streamId: payload.streamId || null,
        sectionId: payload.sectionId || null,
        studentId: payload.studentId || null,
        totalStudents: preview.totalStudents,
        generatedCount: preview.generatedCount,
        skippedCount: preview.skippedCount,
        totalAmount: new Prisma.Decimal(preview.totalEstimatedAmount),
        createdById: actorUserId || null,
        details: {
          noStructureClasses: preview.noStructureClasses,
          skippedStudents: preview.skippedStudents,
          skippedBreakdown: preview.skippedBreakdown,
          alreadyExistsCount: preview.alreadyExistsCount,
        },
      },
    });

    // 2. Delegate Charge Creation to Central Idempotent Fee Engine
    const result = await ensureFeeChargesBulk(tx, {
      schoolId,
      academicYearId: payload.academicYearId,
      month: payload.month,
      generationBatchId: batch.id,
      candidates: preview.chargesToCreate,
    });

    // 3. Create Audit Log
    if (actorUserId) {
      await tx.auditLog.create({
        data: {
          schoolId,
          userId: actorUserId,
          action: 'EXECUTE_FEE_GENERATION',
          entityType: 'FeeGenerationBatch',
          entityId: batch.id,
          newValues: {
            month: payload.month,
            mode: payload.mode,
            generatedCount: result.createdCount,
            alreadyExistsCount: result.alreadyExistsCount,
            skippedCount: result.skippedCount,
            totalAmount: result.totalAmount,
          },
        },
      });
    }

    return {
      batchId: batch.id,
      month: batch.month,
      academicYearId: batch.academicYearId,
      totalStudents: preview.totalStudents,
      generatedCount: result.createdCount,
      alreadyExistsCount: preview.alreadyExistsCount + result.alreadyExistsCount,
      skippedCount: preview.skippedCount,
      skippedBreakdown: preview.skippedBreakdown,
      totalAmount: result.totalAmount,
      noStructureClasses: preview.noStructureClasses,
      skippedStudents: preview.skippedStudents,
    };
  });
};

export const listGenerationHistory = async (schoolId, query = {}) => {
  const page = Math.max(1, parseInt(query.page || 1, 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || 20, 10)));
  const skip = (page - 1) * limit;

  const where = { schoolId };

  if (query.academicYearId) where.academicYearId = query.academicYearId;
  if (query.month) where.month = query.month;

  const [total, batches] = await Promise.all([
    prisma.feeGenerationBatch.count({ where }),
    prisma.feeGenerationBatch.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        academicYear: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
        medium: { select: { id: true, name: true } },
        stream: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
        student: { select: { id: true, name: true, admissionNo: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  return {
    data: batches,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getGenerationBatchById = async (schoolId, batchId, query = {}) => {
  const chargesLimit = Math.min(500, Math.max(1, parseInt(query.limit || 100, 10)));

  const batch = await prisma.feeGenerationBatch.findUnique({
    where: { id: batchId },
    include: {
      academicYear: { select: { id: true, name: true } },
      class: { select: { id: true, name: true } },
      medium: { select: { id: true, name: true } },
      stream: { select: { id: true, name: true } },
      section: { select: { id: true, name: true } },
      student: { select: { id: true, name: true, admissionNo: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      charges: {
        take: chargesLimit,
        include: {
          student: { select: { id: true, name: true, admissionNo: true } },
          feeType: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!batch || batch.schoolId !== schoolId) {
    throw ApiError.notFound('Fee generation batch record not found');
  }

  return batch;
};
