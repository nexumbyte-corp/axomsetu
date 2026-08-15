import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { memoryCache } from '../../utils/cache.js';

/**
 * Calculates academic year parameters based on April 1 -> March 31 cycle.
 * E.g., 10 Aug 2026 -> 2026-27 (2026-04-01 to 2027-03-31)
 *       10 Feb 2027 -> 2026-27 (2026-04-01 to 2027-03-31)
 */
export const getAcademicYearFromDate = (dateInput = new Date()) => {
  const date = new Date(dateInput);
  const month = date.getMonth(); // 0-indexed: April = 3
  const year = date.getFullYear();

  let startYear, endYear;
  if (month >= 3) {
    startYear = year;
    endYear = year + 1;
  } else {
    startYear = year - 1;
    endYear = year;
  }

  const name = `${startYear}-${String(endYear).slice(-2)}`;
  const startDate = new Date(Date.UTC(startYear, 3, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(endYear, 2, 31, 23, 59, 59, 999));

  return {
    name,
    startDate,
    endDate,
    startYear,
    endYear,
  };
};

/**
 * Concurrency-safe automatic current Academic Year creation/detection for a school.
 */
export const ensureCurrentAcademicYear = async (schoolId, tx = prisma) => {
  const { name, startDate, endDate } = getAcademicYearFromDate(new Date());

  let currentYear = await tx.academicYear.findUnique({
    where: {
      schoolId_name: {
        schoolId,
        name,
      },
    },
  });

  if (!currentYear) {
    // Unset current flag on existing years for this school
    await tx.academicYear.updateMany({
      where: { schoolId, isCurrent: true },
      data: { isCurrent: false },
    });

    currentYear = await tx.academicYear.create({
      data: {
        schoolId,
        name,
        startDate,
        endDate,
        isCurrent: true,
        isLocked: false,
      },
    });
    memoryCache.invalidatePrefix(`academicYear:${schoolId}`);
  } else if (!currentYear.isCurrent) {
    await tx.academicYear.updateMany({
      where: {
        schoolId,
        isCurrent: true,
        NOT: { id: currentYear.id },
      },
      data: { isCurrent: false },
    });

    currentYear = await tx.academicYear.update({
      where: { id: currentYear.id },
      data: { isCurrent: true },
    });
    memoryCache.invalidatePrefix(`academicYear:${schoolId}`);
  }

  return currentYear;
};

/**
 * List all Academic Years for the authenticated school (ordered newest first).
 */
export const listAcademicYears = async (schoolId) => {
  return memoryCache.getOrSet(`academicYear:${schoolId}:list`, async () => {
    await ensureCurrentAcademicYear(schoolId);
    return await prisma.academicYear.findMany({
      where: { schoolId },
      orderBy: { startDate: 'desc' },
    });
  }, 600);
};

/**
 * Get the current active Academic Year for the authenticated school.
 */
export const getCurrentAcademicYear = async (schoolId) => {
  return memoryCache.getOrSet(`academicYear:${schoolId}:current`, async () => {
    await ensureCurrentAcademicYear(schoolId);

    const current = await prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
    });

    if (!current) {
      throw ApiError.notFound('Current academic year not found');
    }

    return current;
  }, 600);
};

/**
 * Locks a historical academic year. Rejects locking the current academic year.
 */
export const lockAcademicYear = async (schoolId, academicYearId, actorUserId) => {
  const academicYear = await prisma.academicYear.findUnique({
    where: { id: academicYearId },
  });

  if (!academicYear || academicYear.schoolId !== schoolId) {
    throw ApiError.notFound('Academic year not found');
  }

  if (academicYear.isCurrent) {
    throw ApiError.badRequest('The current academic year cannot be locked');
  }

  const updated = await prisma.academicYear.update({
    where: { id: academicYearId },
    data: { isLocked: true },
  });
  memoryCache.invalidatePrefix(`academicYear:${schoolId}`);

  await prisma.auditLog.create({
    data: {
      schoolId,
      userId: actorUserId,
      action: 'LOCK_ACADEMIC_YEAR',
      entityType: 'AcademicYear',
      entityId: academicYearId,
      oldValues: { isLocked: academicYear.isLocked },
      newValues: { isLocked: true },
    },
  });

  return updated;
};

/**
 * Unlocks a historical academic year.
 */
export const unlockAcademicYear = async (schoolId, academicYearId, actorUserId) => {
  const academicYear = await prisma.academicYear.findUnique({
    where: { id: academicYearId },
  });

  if (!academicYear || academicYear.schoolId !== schoolId) {
    throw ApiError.notFound('Academic year not found');
  }

  const updated = await prisma.academicYear.update({
    where: { id: academicYearId },
    data: { isLocked: false },
  });
  memoryCache.invalidatePrefix(`academicYear:${schoolId}`);

  await prisma.auditLog.create({
    data: {
      schoolId,
      userId: actorUserId,
      action: 'UNLOCK_ACADEMIC_YEAR',
      entityType: 'AcademicYear',
      entityId: academicYearId,
      oldValues: { isLocked: academicYear.isLocked },
      newValues: { isLocked: false },
    },
  });

  return updated;
};

/**
 * Reusable assertion to ensure an Academic Year is valid for write operations.
 */
export const assertAcademicYearWritable = async ({ schoolId, academicYearId }) => {
  const academicYear = await prisma.academicYear.findUnique({
    where: { id: academicYearId },
  });

  if (!academicYear || academicYear.schoolId !== schoolId) {
    throw ApiError.notFound('Academic year not found for this school');
  }

  if (academicYear.isLocked) {
    throw ApiError.forbidden('This academic year is locked and historical data cannot be modified');
  }

  return academicYear;
};
