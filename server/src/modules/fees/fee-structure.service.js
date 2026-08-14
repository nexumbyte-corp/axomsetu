import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { ensureCurrentAcademicYear } from '../academic-years/academicYear.service.js';

/**
 * Validates target academic configuration (Academic Year, Class, Medium, Stream).
 */
const validateStructureConfiguration = async ({
  schoolId,
  academicYearId,
  classId,
  mediumId,
  streamId = null,
  tx = prisma,
}) => {
  // Academic Year
  const academicYear = await tx.academicYear.findUnique({
    where: { id: academicYearId },
  });
  if (!academicYear || academicYear.schoolId !== schoolId) {
    throw ApiError.notFound('Academic year not found for this school');
  }

  // Class
  const cls = await tx.class.findUnique({
    where: { id: classId },
  });
  if (!cls || cls.schoolId !== schoolId) {
    throw ApiError.notFound('Class not found for this school');
  }
  if (!cls.isActive) {
    throw ApiError.badRequest(`Class '${cls.name}' is inactive`);
  }

  // Medium
  const medium = await tx.medium.findUnique({
    where: { id: mediumId },
  });
  if (!medium || medium.schoolId !== schoolId) {
    throw ApiError.notFound('Medium not found for this school');
  }
  if (!medium.isActive) {
    throw ApiError.badRequest(`Medium '${medium.name}' is inactive`);
  }

  // Stream requirement check
  let stream = null;
  if (cls.hasStream) {
    if (!streamId) {
      throw ApiError.badRequest(`Stream is required for class '${cls.name}'`);
    }
    stream = await tx.stream.findUnique({
      where: { id: streamId },
    });
    if (!stream || stream.schoolId !== schoolId) {
      throw ApiError.notFound('Stream not found for this school');
    }
    if (!stream.isActive) {
      throw ApiError.badRequest(`Stream '${stream.name}' is inactive`);
    }
  } else {
    if (streamId) {
      throw ApiError.badRequest(`Stream cannot be set for class '${cls.name}' which does not have streams`);
    }
  }

  return { academicYear, class: cls, medium, stream };
};

export const listFeeStructures = async (schoolId, query = {}) => {
  let academicYearId = query.academicYearId;
  if (!academicYearId) {
    const currentYear = await ensureCurrentAcademicYear(schoolId);
    academicYearId = currentYear.id;
  }

  const where = {
    schoolId,
    academicYearId,
  };

  if (query.classId) where.classId = query.classId;
  if (query.mediumId) where.mediumId = query.mediumId;
  if (query.streamId) where.streamId = query.streamId;
  if (query.isActive === 'true') where.isActive = true;
  if (query.isActive === 'false') where.isActive = false;

  const structures = await prisma.feeStructure.findMany({
    where,
    orderBy: [
      { class: { order: 'asc' } },
      { createdAt: 'asc' },
    ],
    include: {
      academicYear: { select: { id: true, name: true, isCurrent: true, isLocked: true } },
      class: { select: { id: true, name: true, code: true, hasStream: true } },
      medium: { select: { id: true, name: true } },
      stream: { select: { id: true, name: true } },
      heads: {
        orderBy: { feeType: { order: 'asc' } },
        include: {
          feeType: { select: { id: true, name: true, code: true, description: true, isActive: true } },
        },
      },
    },
  });

  return structures.map((s) => {
    const totalAmount = s.heads.reduce((sum, h) => {
      return h.isActive ? sum + Number(h.amount) : sum;
    }, 0);

    return {
      ...s,
      totalAmount,
    };
  });
};

export const getFeeStructureById = async (schoolId, structureId) => {
  const structure = await prisma.feeStructure.findUnique({
    where: { id: structureId },
    include: {
      academicYear: { select: { id: true, name: true, isCurrent: true, isLocked: true } },
      class: { select: { id: true, name: true, code: true, hasStream: true } },
      medium: { select: { id: true, name: true } },
      stream: { select: { id: true, name: true } },
      heads: {
        orderBy: { feeType: { order: 'asc' } },
        include: {
          feeType: { select: { id: true, name: true, code: true, description: true, isActive: true } },
        },
      },
    },
  });

  if (!structure || structure.schoolId !== schoolId) {
    throw ApiError.notFound('Fee structure not found');
  }

  const totalAmount = structure.heads.reduce((sum, h) => {
    return h.isActive ? sum + Number(h.amount) : sum;
  }, 0);

  return {
    ...structure,
    totalAmount,
  };
};

export const createFeeStructure = async (schoolId, data, actorUserId) => {
  const streamIdVal = data.streamId || null;

  return await prisma.$transaction(async (tx) => {
    // 1. Validate configuration
    const config = await validateStructureConfiguration({
      schoolId,
      academicYearId: data.academicYearId,
      classId: data.classId,
      mediumId: data.mediumId,
      streamId: streamIdVal,
      tx,
    });

    // 2. Check duplicate structure
    const existing = await tx.feeStructure.findFirst({
      where: {
        schoolId,
        academicYearId: data.academicYearId,
        classId: data.classId,
        mediumId: data.mediumId,
        streamId: streamIdVal,
      },
    });

    if (existing) {
      throw ApiError.conflict(
        `Fee structure already exists for ${config.class.name} (${config.medium.name}${
          config.stream ? ' - ' + config.stream.name : ''
        }) in ${config.academicYear.name}`
      );
    }

    // 3. Validate fee types
    const feeTypeIds = data.heads.map((h) => h.feeTypeId);
    const uniqueFeeTypeIds = new Set(feeTypeIds);
    if (uniqueFeeTypeIds.size !== feeTypeIds.length) {
      throw ApiError.badRequest('Duplicate fee items cannot be added within the same fee structure');
    }

    const validFeeTypes = await tx.feeType.findMany({
      where: { schoolId, id: { in: feeTypeIds } },
    });
    if (validFeeTypes.length !== feeTypeIds.length) {
      throw ApiError.badRequest('One or more invalid fee types provided');
    }

    // 4. Create structure & heads
    const structure = await tx.feeStructure.create({
      data: {
        schoolId,
        academicYearId: data.academicYearId,
        classId: data.classId,
        mediumId: data.mediumId,
        streamId: streamIdVal,
        isActive: data.isActive ?? true,
        heads: {
          create: data.heads.map((h) => ({
            feeTypeId: h.feeTypeId,
            amount: new Prisma.Decimal(h.amount),
            isActive: h.isActive ?? true,
          })),
        },
      },
      include: {
        academicYear: { select: { id: true, name: true } },
        class: { select: { id: true, name: true, hasStream: true } },
        medium: { select: { id: true, name: true } },
        stream: { select: { id: true, name: true } },
        heads: {
          include: {
            feeType: { select: { id: true, name: true, code: true, description: true, isActive: true } },
          },
        },
      },
    });

    if (actorUserId) {
      await tx.auditLog.create({
        data: {
          schoolId,
          userId: actorUserId,
          action: 'CREATE_FEE_STRUCTURE',
          entityType: 'FeeStructure',
          entityId: structure.id,
          newValues: {
            academicYearId: data.academicYearId,
            classId: data.classId,
            mediumId: data.mediumId,
            streamId: streamIdVal,
            headsCount: data.heads.length,
          },
        },
      });
    }

    const totalAmount = structure.heads.reduce((sum, h) => {
      return h.isActive ? sum + Number(h.amount) : sum;
    }, 0);

    return { ...structure, totalAmount };
  });
};

export const updateFeeStructure = async (schoolId, structureId, data, actorUserId) => {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.feeStructure.findUnique({
      where: { id: structureId },
      include: { class: true, heads: true },
    });

    if (!existing || existing.schoolId !== schoolId) {
      throw ApiError.notFound('Fee structure not found');
    }

    const classIdVal = data.classId || existing.classId;
    const mediumIdVal = data.mediumId || existing.mediumId;
    const streamIdVal = data.streamId !== undefined ? data.streamId : existing.streamId;

    // Validate config if changed
    if (data.classId || data.mediumId || data.streamId !== undefined) {
      const config = await validateStructureConfiguration({
        schoolId,
        academicYearId: existing.academicYearId,
        classId: classIdVal,
        mediumId: mediumIdVal,
        streamId: streamIdVal,
        tx,
      });

      // Check unique constraint
      const duplicate = await tx.feeStructure.findFirst({
        where: {
          schoolId,
          academicYearId: existing.academicYearId,
          classId: classIdVal,
          mediumId: mediumIdVal,
          streamId: streamIdVal,
        },
      });

      if (duplicate && duplicate.id !== structureId) {
        throw ApiError.conflict(
          `Fee structure already exists for ${config.class.name} (${config.medium.name}${
            config.stream ? ' - ' + config.stream.name : ''
          }) in ${config.academicYear.name}`
        );
      }
    }

    const updatePayload = {};
    if (data.classId) updatePayload.classId = data.classId;
    if (data.mediumId) updatePayload.mediumId = data.mediumId;
    if (data.streamId !== undefined) updatePayload.streamId = data.streamId;
    if (data.isActive !== undefined) updatePayload.isActive = data.isActive;

    // Granular Item Audit Diffing
    const itemAuditLogs = [];
    if (data.heads) {
      const feeTypeIds = data.heads.map((h) => h.feeTypeId);
      const uniqueFeeTypeIds = new Set(feeTypeIds);
      if (uniqueFeeTypeIds.size !== feeTypeIds.length) {
        throw ApiError.badRequest('Duplicate fee items cannot be added within the same fee structure');
      }

      const validFeeTypes = await tx.feeType.findMany({
        where: { schoolId, id: { in: feeTypeIds } },
      });
      if (validFeeTypes.length !== feeTypeIds.length) {
        throw ApiError.badRequest('One or more invalid fee types provided');
      }

      // Existing heads map by feeTypeId
      const oldHeadsMap = new Map();
      existing.heads.forEach((h) => oldHeadsMap.set(h.feeTypeId, h));

      // New heads map by feeTypeId
      const newHeadsMap = new Map();
      data.heads.forEach((h) => newHeadsMap.set(h.feeTypeId, h));

      // Detect added & updated heads
      data.heads.forEach((h) => {
        const oldH = oldHeadsMap.get(h.feeTypeId);
        if (!oldH) {
          itemAuditLogs.push({
            schoolId,
            userId: actorUserId,
            action: 'FEE_STRUCTURE_ITEM_ADDED',
            entityType: 'FeeStructureItem',
            entityId: structureId,
            newValues: { feeTypeId: h.feeTypeId, amount: h.amount, isActive: h.isActive ?? true },
          });
        } else if (Number(oldH.amount) !== Number(h.amount) || oldH.isActive !== (h.isActive ?? true)) {
          itemAuditLogs.push({
            schoolId,
            userId: actorUserId,
            action: 'FEE_STRUCTURE_ITEM_UPDATED',
            entityType: 'FeeStructureItem',
            entityId: oldH.id,
            oldValues: { amount: Number(oldH.amount), isActive: oldH.isActive },
            newValues: { amount: Number(h.amount), isActive: h.isActive ?? true },
          });
        }
      });

      // Detect removed heads
      existing.heads.forEach((oldH) => {
        if (!newHeadsMap.has(oldH.feeTypeId)) {
          itemAuditLogs.push({
            schoolId,
            userId: actorUserId,
            action: 'FEE_STRUCTURE_ITEM_REMOVED',
            entityType: 'FeeStructureItem',
            entityId: oldH.id,
            oldValues: { feeTypeId: oldH.feeTypeId, amount: Number(oldH.amount), isActive: oldH.isActive },
          });
        }
      });

      await tx.feeStructureHead.deleteMany({
        where: { feeStructureId: structureId },
      });

      updatePayload.heads = {
        create: data.heads.map((h) => ({
          feeTypeId: h.feeTypeId,
          amount: new Prisma.Decimal(h.amount),
          isActive: h.isActive ?? true,
        })),
      };
    }

    const updated = await tx.feeStructure.update({
      where: { id: structureId },
      data: updatePayload,
      include: {
        academicYear: { select: { id: true, name: true } },
        class: { select: { id: true, name: true, hasStream: true } },
        medium: { select: { id: true, name: true } },
        stream: { select: { id: true, name: true } },
        heads: {
          include: {
            feeType: { select: { id: true, name: true, code: true, description: true, isActive: true } },
          },
        },
      },
    });

    if (actorUserId) {
      await tx.auditLog.create({
        data: {
          schoolId,
          userId: actorUserId,
          action: 'FEE_STRUCTURE_UPDATED',
          entityType: 'FeeStructure',
          entityId: structureId,
          oldValues: { isActive: existing.isActive },
          newValues: { isActive: updated.isActive, headsCount: updated.heads.length },
        },
      });

      for (const auditData of itemAuditLogs) {
        if (auditData.userId) {
          await tx.auditLog.create({ data: auditData });
        }
      }
    }

    const totalAmount = updated.heads.reduce((sum, h) => {
      return h.isActive ? sum + Number(h.amount) : sum;
    }, 0);

    return { ...updated, totalAmount };
  });
};

export const toggleFeeStructureStatus = async (schoolId, structureId, actorUserId) => {
  const existing = await prisma.feeStructure.findUnique({
    where: { id: structureId },
  });

  if (!existing || existing.schoolId !== schoolId) {
    throw ApiError.notFound('Fee structure not found');
  }

  const updated = await prisma.feeStructure.update({
    where: { id: structureId },
    data: { isActive: !existing.isActive },
  });

  if (actorUserId) {
    await prisma.auditLog.create({
      data: {
        schoolId,
        userId: actorUserId,
        action: 'TOGGLE_FEE_STRUCTURE_STATUS',
        entityType: 'FeeStructure',
        entityId: structureId,
        oldValues: { isActive: existing.isActive },
        newValues: { isActive: updated.isActive },
      },
    });
  }

  return updated;
};

export const deleteFeeStructure = async (schoolId, structureId, actorUserId) => {
  const existing = await prisma.feeStructure.findUnique({
    where: { id: structureId },
  });

  if (!existing || existing.schoolId !== schoolId) {
    throw ApiError.notFound('Fee structure not found');
  }

  // Check if charges were generated from this structure
  const chargeCount = await prisma.studentFeeCharge.count({
    where: { feeStructureId: structureId },
  });

  if (chargeCount > 0) {
    // Soft-delete/deactivate fee structure so historical charges are preserved
    await prisma.feeStructure.update({
      where: { id: structureId },
      data: { isActive: false },
    });

    if (actorUserId) {
      await prisma.auditLog.create({
        data: {
          schoolId,
          userId: actorUserId,
          action: 'DELETE_FEE_STRUCTURE',
          entityType: 'FeeStructure',
          entityId: structureId,
          oldValues: { isActive: existing.isActive },
          newValues: { isActive: false, archived: true },
        },
      });
    }

    return { message: 'Fee structure deactivated because historical charges reference it.' };
  }

  await prisma.feeStructure.delete({
    where: { id: structureId },
  });

  if (actorUserId) {
    await prisma.auditLog.create({
      data: {
        schoolId,
        userId: actorUserId,
        action: 'DELETE_FEE_STRUCTURE',
        entityType: 'FeeStructure',
        entityId: structureId,
      },
    });
  }

  return { message: 'Fee structure deleted successfully' };
};

/**
 * Bulk creates or updates fee structures for a target academic year.
 */
export const bulkCreateFeeStructures = async (schoolId, data, actorUserId) => {
  const { targetAcademicYearId, structures } = data;

  return await prisma.$transaction(async (tx) => {
    // 1. Verify Academic Year
    const academicYear = await tx.academicYear.findUnique({
      where: { id: targetAcademicYearId },
    });
    if (!academicYear || academicYear.schoolId !== schoolId) {
      throw ApiError.notFound('Target academic year not found for this school');
    }

    let createdCount = 0;
    let updatedCount = 0;
    const results = [];

    for (const item of structures) {
      const streamIdVal = item.streamId || null;

      // Validate config
      await validateStructureConfiguration({
        schoolId,
        academicYearId: targetAcademicYearId,
        classId: item.classId,
        mediumId: item.mediumId,
        streamId: streamIdVal,
        tx,
      });

      // Check existing structure
      const existing = await tx.feeStructure.findFirst({
        where: {
          schoolId,
          academicYearId: targetAcademicYearId,
          classId: item.classId,
          mediumId: item.mediumId,
          streamId: streamIdVal,
        },
      });

      if (existing) {
        // Delete old heads and recreate
        await tx.feeStructureHead.deleteMany({
          where: { feeStructureId: existing.id },
        });

        const updated = await tx.feeStructure.update({
          where: { id: existing.id },
          data: {
            isActive: item.isActive ?? true,
            heads: {
              create: item.heads.map((h) => ({
                feeTypeId: h.feeTypeId,
                amount: new Prisma.Decimal(h.amount),
                isActive: h.isActive ?? true,
              })),
            },
          },
          include: {
            class: { select: { id: true, name: true } },
            medium: { select: { id: true, name: true } },
            stream: { select: { id: true, name: true } },
            heads: true,
          },
        });

        updatedCount++;
        results.push(updated);
      } else {
        const created = await tx.feeStructure.create({
          data: {
            schoolId,
            academicYearId: targetAcademicYearId,
            classId: item.classId,
            mediumId: item.mediumId,
            streamId: streamIdVal,
            isActive: item.isActive ?? true,
            heads: {
              create: item.heads.map((h) => ({
                feeTypeId: h.feeTypeId,
                amount: new Prisma.Decimal(h.amount),
                isActive: h.isActive ?? true,
              })),
            },
          },
          include: {
            class: { select: { id: true, name: true } },
            medium: { select: { id: true, name: true } },
            stream: { select: { id: true, name: true } },
            heads: true,
          },
        });

        createdCount++;
        results.push(created);
      }
    }

    if (actorUserId) {
      await tx.auditLog.create({
        data: {
          schoolId,
          userId: actorUserId,
          action: 'BULK_CREATE_FEE_STRUCTURES',
          entityType: 'FeeStructure',
          entityId: targetAcademicYearId,
          newValues: {
            targetAcademicYearId,
            processedCount: structures.length,
            createdCount,
            updatedCount,
          },
        },
      });
    }

    return {
      message: `Successfully processed ${results.length} fee template(s) for ${academicYear.name}.`,
      processedCount: results.length,
      createdCount,
      updatedCount,
    };
  });
};
