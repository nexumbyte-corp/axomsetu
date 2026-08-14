import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { getSystemFeeType } from './fee-type.service.js';
import { isStudentOperationallyActive } from '../students/student.service.js';

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

    // Check if class exists
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
 * Computes fee generation dry-run preview or actual batch payload.
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

  // 3. Fetch unique FeeStructures matching target combinations
  const comboKeys = new Set();
  enrollments.forEach((e) => {
    comboKeys.add(`${e.classId}_${e.mediumId}_${e.streamId || 'null'}`);
  });

  const feeStructures = await prisma.feeStructure.findMany({
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
  });

  // Map fee structures by key
  const structureMap = new Map();
  feeStructures.forEach((fs) => {
    const key = `${fs.classId}_${fs.mediumId}_${fs.streamId || 'null'}`;
    structureMap.set(key, fs);
  });

  // Fallback check for missing combinations in target academic year
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

  // 4. Fetch Student Overrides
  const studentIds = enrollments.map((e) => e.studentId);
  const overrides = await prisma.studentFeeOverride.findMany({
    where: {
      schoolId,
      academicYearId,
      studentId: { in: studentIds },
      isActive: true,
    },
  });

  // Map overrides by studentId_feeTypeId
  const overrideMap = new Map();
  overrides.forEach((o) => {
    overrideMap.set(`${o.studentId}_${o.feeTypeId}`, Number(o.amount));
  });



  // 6. Fetch Annual One-Time Charges created in this Academic Year (for ONE_TIME_PER_ACADEMIC_YEAR billing rule)
  const annualCharges = await prisma.studentFeeCharge.findMany({
    where: {
      schoolId,
      academicYearId,
      studentId: { in: studentIds },
    },
    select: {
      studentId: true,
      feeTypeId: true,
    },
  });
  const annualChargeSet = new Set();
  annualCharges.forEach((c) => {
    if (c.feeTypeId) {
      annualChargeSet.add(`${c.studentId}_${c.feeTypeId}`);
    }
  });

  // Fetch MISC system fee type for school (for assigning temporary fees)
  const miscFeeType = await getSystemFeeType(schoolId, 'MISC');

  // 7. Fetch existing generated charges for target month (for duplicate detection)
  const enrollmentIds = enrollments.map((e) => e.id);
  const existingCharges = await prisma.studentFeeCharge.findMany({
    where: {
      schoolId,
      academicYearId,
      month,
      studentEnrollmentId: { in: enrollmentIds },
    },
    select: {
      studentEnrollmentId: true,
      feeTypeId: true,
      title: true,
    },
  });

  const existingChargeSet = new Set();
  existingCharges.forEach((c) => {
    const key = `${c.studentEnrollmentId}_ft_${c.feeTypeId}_title_${c.title}`;
    existingChargeSet.add(key);
  });

  // Custom fee head map by feeTypeId or temporary title (supporting medium-specific overrides)
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

  // Map fee types by ID to get category and billingRule for temporary heads if needed
  const allFeeTypes = await prisma.feeType.findMany({ where: { schoolId } });
  const feeTypeMap = new Map();
  allFeeTypes.forEach((ft) => feeTypeMap.set(ft.id, ft));

  // 8. Build Student Charges Generation Plan
  let totalEstimatedCharges = 0;
  let totalEstimatedAmount = 0;
  const skippedStudents = [];
  const skippedBreakdown = {
    inactiveStudent: 0,
    admissionFeeAlreadyGenerated: 0,
    duplicateCharges: 0,
    noFeeStructure: 0,
  };
  const chargesToCreate = [];
  const noStructureClasses = new Set();

  enrollments.forEach((e) => {
    // Step 2: Validate Student Operational Status (Only ACTIVE students receive fee charges)
    if (!isStudentOperationallyActive(e.student)) {
      skippedStudents.push({
        studentId: e.student.id,
        studentName: e.student.name,
        admissionNo: e.student.admissionNo,
        feeHeadTitle: 'All Heads',
        reason: `Inactive Student (${e.student.status || 'INACTIVE'})`,
      });
      skippedBreakdown.inactiveStudent += 1;
      return;
    }

    const key = `${e.classId}_${e.mediumId}_${e.streamId || 'null'}`;
    const fs = structureMap.get(key);

    const headsToProcess = [];

    // Master structure heads
    if (fs) {
      fs.heads.forEach((h) => {
        const customOverride = mode !== 'ENTIRE_SCHOOL'
          ? (customMap.get(`med_${e.mediumId}_ft_${h.feeTypeId}`) || customMap.get(`ft_${h.feeTypeId}`))
          : null;
        // If explicitly disabled in UI form (in BY_CLASS or BY_STUDENT mode)
        if (customOverride && customOverride.enabled === false && mode !== 'ENTIRE_SCHOOL') {
          return;
        }

        // Priority order for amounts:
        // Priority 1: Student Override (StudentFeeOverride)
        // Priority 2: Temporary Batch Generation Amount (in BY_CLASS or BY_STUDENT mode)
        // Priority 3: Fee Template Amount (FeeStructureHead)
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
          category: h.feeType.category || 'ACADEMIC',
          billingRule: h.feeType.billingRule || 'MONTHLY',
        });
      });
    }

    // Custom non-master fee heads (such as temporary fees or manual fee heads added in UI)
    const customHeadsForStudent = customFeeHeads.filter((c) => {
      if (!c.enabled) return false;
      // If head is tied to a specific medium, match student's medium
      if (c.mediumId && c.mediumId !== e.mediumId) return false;
      // If it's already processed as a master head override in fs.heads, skip duplicate processing
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
        category: tempCategory,
        billingRule: tempBillingRule,
      });
    });

    headsToProcess.forEach((head) => {
      if (!head.feeTypeId) {
        throw ApiError.badRequest(`Fee charge '${head.title}' cannot be generated without a valid Fee Type`);
      }

      const category = head.category || 'ACADEMIC';
      const billingRule = head.billingRule || 'MONTHLY';

      // ==========================================
      // ONE TIME / ADMISSION FEES
      // ==========================================
      if (billingRule === 'ONE_TIME_PER_ACADEMIC_YEAR') {
        if (annualChargeSet.has(`${e.studentId}_${head.feeTypeId}`)) {
          skippedStudents.push({
            studentId: e.student.id,
            studentName: e.student.name,
            admissionNo: e.student.admissionNo,
            feeHeadTitle: head.title,
            reason: 'Admission Fee Already Generated',
          });
          skippedBreakdown.admissionFeeAlreadyGenerated += 1;
          return;
        }
      }

      // ==========================================
      // DUPLICATE CHECK FOR MONTHLY / TITLED CHARGES
      // ==========================================
      const dupKey = `${e.id}_ft_${head.feeTypeId}_title_${head.title}`;

      if (existingChargeSet.has(dupKey)) {
        skippedStudents.push({
          studentId: e.student.id,
          studentName: e.student.name,
          admissionNo: e.student.admissionNo,
          feeHeadTitle: head.title,
          reason: 'Duplicate Charges',
        });
        skippedBreakdown.duplicateCharges += 1;
        return;
      }

      // Add charge to creation plan
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
        status: 'UNPAID',
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
    throw ApiError.badRequest('No new charges to generate. All charges either already exist or have no Fee Structure.');
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Create Batch History Record
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
        },
      },
    });

    // 2. Create Student Fee Charges
    const chargePayloads = preview.chargesToCreate.map((c) => ({
      schoolId,
      academicYearId: c.academicYearId,
      studentId: c.studentId,
      studentEnrollmentId: c.studentEnrollmentId,
      feeTypeId: c.feeTypeId,
      feeStructureId: c.feeStructureId,
      generationBatchId: batch.id,
      month: c.month,
      title: c.title,
      amount: new Prisma.Decimal(c.amount),
      paidAmount: new Prisma.Decimal(0),
      status: 'UNPAID',
    }));

    // Chunk create to prevent potential SQL parameter limits on large batches (500 rows per transaction chunk)
    const chunkSize = 500;
    for (let i = 0; i < chargePayloads.length; i += chunkSize) {
      const chunk = chargePayloads.slice(i, i + chunkSize);
      await tx.studentFeeCharge.createMany({
        data: chunk,
        skipDuplicates: true,
      });
    }

    // 3. Audit Log
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
            generatedCount: preview.generatedCount,
            skippedCount: preview.skippedCount,
            totalAmount: preview.totalEstimatedAmount,
          },
        },
      });
    }

    return {
      batchId: batch.id,
      month: batch.month,
      academicYearId: batch.academicYearId,
      totalStudents: preview.totalStudents,
      generatedCount: preview.generatedCount,
      skippedCount: preview.skippedCount,
      skippedBreakdown: preview.skippedBreakdown,
      totalAmount: preview.totalEstimatedAmount,
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
