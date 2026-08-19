import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { isStudentOperationallyActive } from '../students/student.service.js';

/**
 * Ensures a single StudentFeeCharge is created idempotently.
 * Handles duplicate detection based on business identity, applies student-specific overrides/discounts,
 * and gracefully catches concurrent insertion conflicts (P2002).
 */
export const ensureFeeCharge = async (txOrPrisma, candidate) => {
  const tx = txOrPrisma || prisma;
  const {
    schoolId,
    academicYearId,
    studentId,
    studentEnrollmentId: rawEnrollmentId,
    feeTypeId,
    feeStructureId = null,
    generationBatchId = null,
    month,
    title,
    amount: rawAmount,
    originalAmount: rawOriginalAmount,
    discountAmount: rawDiscountAmount = 0,
    isOverridden: rawIsOverridden = false,
    overrideReason = null,
    overriddenById = null,
    overriddenAt = null,
    billingRule = 'MONTHLY',
    dueDate = null,
  } = candidate;

  // 1. Verify Student Status (Only ACTIVE students receive generated fees)
  let student = candidate.student;
  if (!student) {
    student = await tx.student.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, admissionNo: true, status: true },
    });
  }

  if (!student || !isStudentOperationallyActive(student)) {
    return {
      status: 'SKIPPED',
      reason: 'NOT_ACTIVE',
      detail: `Student ${student?.name || studentId} is not active`,
      charge: null,
    };
  }

  // 2. Resolve Student Enrollment ID if not provided
  let studentEnrollmentId = rawEnrollmentId;
  if (!studentEnrollmentId) {
    const enrollment = await tx.studentEnrollment.findUnique({
      where: {
        schoolId_academicYearId_studentId: {
          schoolId,
          academicYearId,
          studentId,
        },
      },
      select: { id: true, status: true },
    });

    if (!enrollment) {
      return {
        status: 'SKIPPED',
        reason: 'NO_ENROLLMENT',
        detail: `No active enrollment found for student ${student.name} in this academic year`,
        charge: null,
      };
    }
    studentEnrollmentId = enrollment.id;
  }

  // 3. Duplicate Protection Check (Logical Identity including title)
  const titleKey = (title || '').trim().toLowerCase();
  let existingCharge = null;
  if (billingRule === 'ONE_TIME_PER_ACADEMIC_YEAR') {
    existingCharge = await tx.studentFeeCharge.findFirst({
      where: {
        schoolId,
        academicYearId,
        studentId,
        feeTypeId,
        title,
      },
    });
  } else {
    existingCharge = await tx.studentFeeCharge.findFirst({
      where: {
        schoolId,
        academicYearId,
        studentId,
        feeTypeId,
        month,
        title,
      },
    });
  }

  if (existingCharge) {
    return {
      status: 'ALREADY_EXISTS',
      reason: 'DUPLICATE',
      detail: `Fee charge '${existingCharge.title}' already exists`,
      charge: existingCharge,
    };
  }

  // 4. Resolve Student Fee Override / Discount if active
  const override = await tx.studentFeeOverride.findUnique({
    where: {
      schoolId_studentId_academicYearId_feeTypeId: {
        schoolId,
        studentId,
        academicYearId,
        feeTypeId,
      },
    },
  });

  const templateAmt = Number(rawOriginalAmount !== undefined && rawOriginalAmount !== null ? rawOriginalAmount : rawAmount);
  let finalAmt = Number(rawAmount);
  let finalOriginalAmt = templateAmt;
  let finalDiscountAmt = Number(rawDiscountAmount);
  let finalIsOverridden = rawIsOverridden;
  let finalOverrideReason = overrideReason;
  let finalOverriddenById = overriddenById;
  let finalOverriddenAt = overriddenAt;

  if (override && override.isActive) {
    const overrideAmt = Number(override.amount);
    finalAmt = overrideAmt;
    finalDiscountAmt = Math.max(0, templateAmt - overrideAmt);
    finalIsOverridden = true;
    if (!finalOverrideReason) finalOverrideReason = 'Student fee override applied';
  }

  // 5. Create Charge inside DB (DB Uniqueness constraint acts as final concurrency safeguard)
  try {
    const charge = await tx.studentFeeCharge.create({
      data: {
        schoolId,
        academicYearId,
        studentId,
        studentEnrollmentId,
        feeTypeId,
        feeStructureId,
        generationBatchId,
        month,
        title,
        amount: new Prisma.Decimal(finalAmt),
        originalAmount: new Prisma.Decimal(finalOriginalAmt),
        discountAmount: new Prisma.Decimal(finalDiscountAmt),
        isOverridden: finalIsOverridden,
        overrideReason: finalOverrideReason,
        overriddenById: finalOverriddenById,
        overriddenAt: finalOverriddenAt,
        paidAmount: new Prisma.Decimal(0),
        dueDate: dueDate ? new Date(dueDate) : null,
        status: 'UNPAID',
      },
    });

    return {
      status: 'CREATED',
      reason: null,
      detail: null,
      charge,
    };
  } catch (err) {
    // Catch P2002 Unique Constraint Violation (concurrent creation race condition)
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const concurrentCharge = await tx.studentFeeCharge.findFirst({
        where: {
          schoolId,
          academicYearId,
          studentId,
          feeTypeId,
          month,
          title,
        },
      });
      return {
        status: 'ALREADY_EXISTS',
        reason: 'CONCURRENT_DUPLICATE',
        detail: 'Charge was created concurrently by another process',
        charge: concurrentCharge,
      };
    }
    throw err;
  }
};

/**
 * Bulk idempotent fee generation engine.
 * Pre-fetches students, enrollments, existing charges, and fee overrides to perform
 * batch validation and create charges efficiently using createMany.
 */
export const ensureFeeChargesBulk = async (txOrPrisma, payload) => {
  const tx = txOrPrisma || prisma;
  const { schoolId, academicYearId, month, generationBatchId = null, candidates = [] } = payload;

  if (candidates.length === 0) {
    return {
      createdCount: 0,
      alreadyExistsCount: 0,
      skippedCount: 0,
      totalAmount: 0,
      skippedBreakdown: {
        notActive: 0,
        alreadyExists: 0,
        noEnrollment: 0,
      },
      skippedStudents: [],
      chargesToCreate: [],
    };
  }

  // Extract unique IDs
  const studentIds = Array.from(new Set(candidates.map((c) => c.studentId)));

  // Batch load master student info, existing charges, and student fee overrides
  const [students, existingCharges, studentOverrides] = await Promise.all([
    tx.student.findMany({
      where: { id: { in: studentIds }, schoolId },
      select: { id: true, name: true, admissionNo: true, status: true },
    }),
    tx.studentFeeCharge.findMany({
      where: {
        schoolId,
        academicYearId,
        studentId: { in: studentIds },
      },
      select: {
        id: true,
        studentId: true,
        studentEnrollmentId: true,
        feeTypeId: true,
        month: true,
        title: true,
      },
    }),
    tx.studentFeeOverride.findMany({
      where: {
        schoolId,
        academicYearId,
        studentId: { in: studentIds },
        isActive: true,
      },
    }),
  ]);

  const studentMap = new Map();
  students.forEach((s) => studentMap.set(s.id, s));

  // Build lookup sets for existing charges
  const monthlyChargeSet = new Set();
  const oneTimeChargeSet = new Set();

  existingCharges.forEach((c) => {
    const titleKey = (c.title || '').trim().toLowerCase();
    monthlyChargeSet.add(`${c.studentId}_${c.feeTypeId}_${c.month}_${titleKey}`);
    oneTimeChargeSet.add(`${c.studentId}_${c.feeTypeId}_${titleKey}`);
  });

  // Map student overrides
  const overrideMap = new Map();
  studentOverrides.forEach((o) => {
    overrideMap.set(`${o.studentId}_${o.feeTypeId}`, Number(o.amount));
  });

  let createdCount = 0;
  let alreadyExistsCount = 0;
  let skippedCount = 0;
  let totalAmount = 0;
  const skippedStudents = [];
  const skippedBreakdown = {
    notActive: 0,
    alreadyExists: 0,
    noEnrollment: 0,
  };

  const dbPayloads = [];

  for (const c of candidates) {
    const student = studentMap.get(c.studentId);

    // 1. Operational status check
    if (!student || !isStudentOperationallyActive(student)) {
      skippedStudents.push({
        studentId: c.studentId,
        studentName: student?.name || 'Unknown',
        admissionNo: student?.admissionNo || 'N/A',
        feeHeadTitle: c.title,
        reason: `Inactive Student (${student?.status || 'INACTIVE'})`,
      });
      skippedBreakdown.notActive += 1;
      skippedCount += 1;
      continue;
    }

    if (!c.studentEnrollmentId) {
      skippedStudents.push({
        studentId: c.studentId,
        studentName: student.name,
        admissionNo: student.admissionNo,
        feeHeadTitle: c.title,
        reason: 'No Enrollment Found for Academic Year',
      });
      skippedBreakdown.noEnrollment += 1;
      skippedCount += 1;
      continue;
    }

    // 2. Idempotency Check
    const titleKey = (c.title || '').trim().toLowerCase();
    const isOneTime = c.billingRule === 'ONE_TIME_PER_ACADEMIC_YEAR';
    const isDup = isOneTime
      ? oneTimeChargeSet.has(`${c.studentId}_${c.feeTypeId}_${titleKey}`)
      : monthlyChargeSet.has(`${c.studentId}_${c.feeTypeId}_${c.month || month}_${titleKey}`);

    if (isDup) {
      skippedStudents.push({
        studentId: c.studentId,
        studentName: student.name,
        admissionNo: student.admissionNo,
        feeHeadTitle: c.title,
        reason: 'Fee Charge Already Exists',
      });
      skippedBreakdown.alreadyExists += 1;
      alreadyExistsCount += 1;
      continue;
    }

    // 3. Resolve Amount & Student Override
    const templateAmt = Number(c.originalAmount !== undefined && c.originalAmount !== null ? c.originalAmount : c.amount);
    const overrideAmt = overrideMap.get(`${c.studentId}_${c.feeTypeId}`);

    let finalAmt = Number(c.amount);
    let discountAmt = Number(c.discountAmount || 0);
    let isOverridden = Boolean(c.isOverridden);

    if (overrideAmt !== undefined) {
      finalAmt = overrideAmt;
      discountAmt = Math.max(0, templateAmt - overrideAmt);
      isOverridden = true;
    }

    dbPayloads.push({
      schoolId,
      academicYearId,
      studentId: c.studentId,
      studentEnrollmentId: c.studentEnrollmentId,
      feeTypeId: c.feeTypeId,
      feeStructureId: c.feeStructureId || null,
      generationBatchId,
      month: c.month || month,
      title: c.title,
      amount: new Prisma.Decimal(finalAmt),
      originalAmount: new Prisma.Decimal(templateAmt),
      discountAmount: new Prisma.Decimal(discountAmt),
      isOverridden,
      overrideReason: isOverridden ? (c.overrideReason || 'Student fee override applied') : null,
      overriddenById: c.overriddenById || null,
      overriddenAt: c.overriddenAt || null,
      paidAmount: new Prisma.Decimal(0),
      dueDate: c.dueDate ? new Date(c.dueDate) : null,
      status: 'UNPAID',
    });

    // Add to in-memory set to prevent internal duplicates within the same candidate array
    monthlyChargeSet.add(`${c.studentId}_${c.feeTypeId}_${c.month || month}_${titleKey}`);
    oneTimeChargeSet.add(`${c.studentId}_${c.feeTypeId}_${titleKey}`);

    totalAmount += finalAmt;
    createdCount += 1;
  }

  // 4. Batch Create
  if (dbPayloads.length > 0) {
    const chunkSize = 500;
    for (let i = 0; i < dbPayloads.length; i += chunkSize) {
      const chunk = dbPayloads.slice(i, i + chunkSize);
      await tx.studentFeeCharge.createMany({
        data: chunk,
        skipDuplicates: true,
      });
    }
  }

  return {
    createdCount,
    alreadyExistsCount,
    skippedCount,
    skippedBreakdown,
    skippedStudents,
    totalAmount,
  };
};
