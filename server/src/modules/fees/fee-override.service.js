import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { ensureCurrentAcademicYear } from '../academic-years/academicYear.service.js';

export const getStudentFeeOverrides = async (schoolId, studentId, query = {}) => {
  let academicYearId = query.academicYearId;
  if (!academicYearId) {
    const currentYear = await ensureCurrentAcademicYear(schoolId);
    academicYearId = currentYear.id;
  }

  // 1. Verify student & active enrollment in academic year
  const enrollment = await prisma.studentEnrollment.findFirst({
    where: {
      schoolId,
      studentId,
      academicYearId,
    },
    include: {
      class: { select: { id: true, name: true, hasStream: true } },
      medium: { select: { id: true, name: true } },
      stream: { select: { id: true, name: true } },
    },
  });

  if (!enrollment) {
    throw ApiError.notFound('Student is not enrolled in the specified academic year');
  }

  // 2. Fetch master fee structure matching student enrollment
  const feeStructure = await prisma.feeStructure.findFirst({
    where: {
      schoolId,
      academicYearId,
      classId: enrollment.classId,
      mediumId: enrollment.mediumId,
      streamId: enrollment.streamId || null,
      isActive: true,
    },
    include: {
      heads: {
        where: { isActive: true },
        include: {
          feeType: { select: { id: true, name: true, code: true, description: true } },
        },
      },
    },
  });

  // 3. Fetch student overrides for this academic year
  const overrides = await prisma.studentFeeOverride.findMany({
    where: {
      schoolId,
      studentId,
      academicYearId,
    },
    include: {
      feeType: { select: { id: true, name: true, code: true } },
    },
  });

  const overrideMap = new Map();
  overrides.forEach((o) => overrideMap.set(o.feeTypeId, o));

  // Merge master heads with overrides
  const effectiveHeads = (feeStructure?.heads || []).map((head) => {
    const override = overrideMap.get(head.feeTypeId);
    return {
      feeTypeId: head.feeTypeId,
      feeTypeName: head.feeType.name,
      masterAmount: Number(head.amount),
      overrideId: override?.id || null,
      overrideAmount: override ? Number(override.amount) : null,
      effectiveAmount: override && override.isActive ? Number(override.amount) : Number(head.amount),
      isOverridden: Boolean(override && override.isActive),
    };
  });

  return {
    studentId,
    academicYearId,
    enrollment: {
      class: enrollment.class,
      medium: enrollment.medium,
      stream: enrollment.stream,
    },
    hasFeeStructure: Boolean(feeStructure),
    effectiveHeads,
    overrides,
  };
};

export const upsertFeeOverride = async (schoolId, studentId, data, actorUserId) => {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });

  if (!student || student.schoolId !== schoolId) {
    throw ApiError.notFound('Student not found');
  }

  const feeType = await prisma.feeType.findUnique({
    where: { id: data.feeTypeId },
  });

  if (!feeType || feeType.schoolId !== schoolId) {
    throw ApiError.notFound('Fee type not found');
  }

  const override = await prisma.studentFeeOverride.upsert({
    where: {
      schoolId_studentId_academicYearId_feeTypeId: {
        schoolId,
        studentId,
        academicYearId: data.academicYearId,
        feeTypeId: data.feeTypeId,
      },
    },
    update: {
      amount: new Prisma.Decimal(data.amount),
      isActive: data.isActive ?? true,
    },
    create: {
      schoolId,
      studentId,
      academicYearId: data.academicYearId,
      feeTypeId: data.feeTypeId,
      amount: new Prisma.Decimal(data.amount),
      isActive: data.isActive ?? true,
    },
  });

  if (actorUserId) {
    await prisma.auditLog.create({
      data: {
        schoolId,
        userId: actorUserId,
        action: 'UPSERT_STUDENT_FEE_OVERRIDE',
        entityType: 'StudentFeeOverride',
        entityId: override.id,
        newValues: { studentId, feeTypeId: data.feeTypeId, amount: data.amount },
      },
    });
  }

  return override;
};

export const deleteFeeOverride = async (schoolId, studentId, overrideId, actorUserId) => {
  const override = await prisma.studentFeeOverride.findUnique({
    where: { id: overrideId },
  });

  if (!override || override.schoolId !== schoolId || override.studentId !== studentId) {
    throw ApiError.notFound('Student fee override not found');
  }

  await prisma.studentFeeOverride.delete({
    where: { id: overrideId },
  });

  if (actorUserId) {
    await prisma.auditLog.create({
      data: {
        schoolId,
        userId: actorUserId,
        action: 'DELETE_STUDENT_FEE_OVERRIDE',
        entityType: 'StudentFeeOverride',
        entityId: overrideId,
      },
    });
  }

  return { message: 'Student fee override removed successfully' };
};
