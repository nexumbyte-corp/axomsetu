import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';

const DEFAULT_CLASSES = [
  { name: 'PP', order: 1, hasStream: false },
  { name: 'LKG', order: 2, hasStream: false },
  { name: 'UKG', order: 3, hasStream: false },
  { name: 'I', order: 4, hasStream: false },
  { name: 'II', order: 5, hasStream: false },
  { name: 'III', order: 6, hasStream: false },
  { name: 'IV', order: 7, hasStream: false },
  { name: 'V', order: 8, hasStream: false },
  { name: 'VI', order: 9, hasStream: false },
  { name: 'VII', order: 10, hasStream: false },
  { name: 'VIII', order: 11, hasStream: false },
  { name: 'IX', order: 12, hasStream: false },
  { name: 'X', order: 13, hasStream: false },
  { name: 'XI', order: 14, hasStream: true },
  { name: 'XII', order: 15, hasStream: true },
];

/**
 * Initializes default classes PP through XII for a school inside a transaction.
 */
export const initializeDefaultClasses = async (schoolId, tx = prisma) => {
  for (const cls of DEFAULT_CLASSES) {
    await tx.class.upsert({
      where: {
        schoolId_name: {
          schoolId,
          name: cls.name,
        },
      },
      update: {},
      create: {
        schoolId,
        name: cls.name,
        order: cls.order,
        hasStream: cls.hasStream,
        isActive: true,
      },
    });
  }
};

// ==========================================
// CLASSES SERVICE
// ==========================================

export const listClasses = async (schoolId) => {
  return await prisma.class.findMany({
    where: { schoolId },
    orderBy: { order: 'asc' },
  });
};

export const createClass = async (schoolId, data, actorUserId) => {
  const name = data.name.trim();

  const existing = await prisma.class.findFirst({
    where: {
      schoolId,
      name: { equals: name, mode: 'insensitive' },
    },
  });

  if (existing) {
    throw ApiError.conflict('A class with this name already exists in your school');
  }

  const newClass = await prisma.class.create({
    data: {
      schoolId,
      name,
      order: data.order ?? 0,
      hasStream: data.hasStream ?? false,
      isActive: data.isActive ?? true,
    },
  });

  await prisma.auditLog.create({
    data: {
      schoolId,
      userId: actorUserId,
      action: 'CREATE_CLASS',
      entityType: 'Class',
      entityId: newClass.id,
      newValues: { name: newClass.name, order: newClass.order, hasStream: newClass.hasStream },
    },
  });

  return newClass;
};

export const updateClass = async (schoolId, classId, data, actorUserId) => {
  const cls = await prisma.class.findUnique({
    where: { id: classId },
  });

  if (!cls || cls.schoolId !== schoolId) {
    throw ApiError.notFound('Class not found');
  }

  if (data.name) {
    const trimmedName = data.name.trim();
    const existing = await prisma.class.findFirst({
      where: {
        schoolId,
        name: { equals: trimmedName, mode: 'insensitive' },
        NOT: { id: classId },
      },
    });
    if (existing) {
      throw ApiError.conflict('Another class with this name already exists');
    }
  }

  const updatedClass = await prisma.class.update({
    where: { id: classId },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.order !== undefined && { order: data.order }),
      ...(data.hasStream !== undefined && { hasStream: data.hasStream }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });

  await prisma.auditLog.create({
    data: {
      schoolId,
      userId: actorUserId,
      action: data.isActive === false ? 'DEACTIVATE_CLASS' : 'UPDATE_CLASS',
      entityType: 'Class',
      entityId: classId,
      oldValues: { name: cls.name, order: cls.order, hasStream: cls.hasStream, isActive: cls.isActive },
      newValues: { name: updatedClass.name, order: updatedClass.order, hasStream: updatedClass.hasStream, isActive: updatedClass.isActive },
    },
  });

  return updatedClass;
};

export const deleteClass = async (schoolId, classId, actorUserId) => {
  const cls = await prisma.class.findUnique({
    where: { id: classId },
  });

  if (!cls || cls.schoolId !== schoolId) {
    throw ApiError.notFound('Class not found');
  }

  const enrollmentCount = await prisma.studentEnrollment.count({
    where: { classId },
  });

  if (enrollmentCount > 0) {
    throw ApiError.badRequest(
      `Cannot delete Class '${cls.name}' because ${enrollmentCount} student(s) are currently or historically enrolled in it. You can mark it as inactive instead.`
    );
  }

  return await prisma.$transaction(async (tx) => {
    await tx.feeStructure.deleteMany({ where: { classId } });
    await tx.feeGenerationBatch.deleteMany({ where: { classId } });

    const deleted = await tx.class.delete({
      where: { id: classId },
    });

    await tx.auditLog.create({
      data: {
        schoolId,
        userId: actorUserId,
        action: 'DELETE_CLASS',
        entityType: 'Class',
        entityId: classId,
        oldValues: { name: cls.name, order: cls.order },
      },
    });

    return deleted;
  });
};

// ==========================================
// MEDIUMS SERVICE
// ==========================================

export const listMediums = async (schoolId) => {
  return await prisma.medium.findMany({
    where: { schoolId },
    orderBy: { name: 'asc' },
  });
};

export const createMedium = async (schoolId, data, actorUserId) => {
  const name = data.name.trim();

  const existing = await prisma.medium.findFirst({
    where: {
      schoolId,
      name: { equals: name, mode: 'insensitive' },
    },
  });

  if (existing) {
    throw ApiError.conflict('A medium with this name already exists in your school');
  }

  const newMedium = await prisma.medium.create({
    data: {
      schoolId,
      name,
      isActive: data.isActive ?? true,
    },
  });

  await prisma.auditLog.create({
    data: {
      schoolId,
      userId: actorUserId,
      action: 'CREATE_MEDIUM',
      entityType: 'Medium',
      entityId: newMedium.id,
      newValues: { name: newMedium.name, isActive: newMedium.isActive },
    },
  });

  return newMedium;
};

export const updateMedium = async (schoolId, mediumId, data, actorUserId) => {
  const medium = await prisma.medium.findUnique({
    where: { id: mediumId },
  });

  if (!medium || medium.schoolId !== schoolId) {
    throw ApiError.notFound('Medium not found');
  }

  if (data.name) {
    const trimmedName = data.name.trim();
    const existing = await prisma.medium.findFirst({
      where: {
        schoolId,
        name: { equals: trimmedName, mode: 'insensitive' },
        NOT: { id: mediumId },
      },
    });
    if (existing) {
      throw ApiError.conflict('Another medium with this name already exists');
    }
  }

  const updatedMedium = await prisma.medium.update({
    where: { id: mediumId },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });

  await prisma.auditLog.create({
    data: {
      schoolId,
      userId: actorUserId,
      action: data.isActive === false ? 'DEACTIVATE_MEDIUM' : 'UPDATE_MEDIUM',
      entityType: 'Medium',
      entityId: mediumId,
      oldValues: { name: medium.name, isActive: medium.isActive },
      newValues: { name: updatedMedium.name, isActive: updatedMedium.isActive },
    },
  });

  return updatedMedium;
};

// ==========================================
// SECTIONS SERVICE
// ==========================================

export const listSections = async (schoolId) => {
  return await prisma.section.findMany({
    where: { schoolId },
    orderBy: { name: 'asc' },
  });
};

export const createSection = async (schoolId, data, actorUserId) => {
  const name = data.name.trim();

  const existing = await prisma.section.findFirst({
    where: {
      schoolId,
      name: { equals: name, mode: 'insensitive' },
    },
  });

  if (existing) {
    throw ApiError.conflict('A section with this name already exists in your school');
  }

  const newSection = await prisma.section.create({
    data: {
      schoolId,
      name,
      isActive: data.isActive ?? true,
    },
  });

  await prisma.auditLog.create({
    data: {
      schoolId,
      userId: actorUserId,
      action: 'CREATE_SECTION',
      entityType: 'Section',
      entityId: newSection.id,
      newValues: { name: newSection.name, isActive: newSection.isActive },
    },
  });

  return newSection;
};

export const updateSection = async (schoolId, sectionId, data, actorUserId) => {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
  });

  if (!section || section.schoolId !== schoolId) {
    throw ApiError.notFound('Section not found');
  }

  if (data.name) {
    const trimmedName = data.name.trim();
    const existing = await prisma.section.findFirst({
      where: {
        schoolId,
        name: { equals: trimmedName, mode: 'insensitive' },
        NOT: { id: sectionId },
      },
    });
    if (existing) {
      throw ApiError.conflict('Another section with this name already exists');
    }
  }

  const updatedSection = await prisma.section.update({
    where: { id: sectionId },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });

  await prisma.auditLog.create({
    data: {
      schoolId,
      userId: actorUserId,
      action: data.isActive === false ? 'DEACTIVATE_SECTION' : 'UPDATE_SECTION',
      entityType: 'Section',
      entityId: sectionId,
      oldValues: { name: section.name, isActive: section.isActive },
      newValues: { name: updatedSection.name, isActive: updatedSection.isActive },
    },
  });

  return updatedSection;
};

// ==========================================
// STREAMS SERVICE
// ==========================================

export const listStreams = async (schoolId) => {
  return await prisma.stream.findMany({
    where: { schoolId },
    orderBy: { name: 'asc' },
  });
};

export const createStream = async (schoolId, data, actorUserId) => {
  const name = data.name.trim();

  const existing = await prisma.stream.findFirst({
    where: {
      schoolId,
      name: { equals: name, mode: 'insensitive' },
    },
  });

  if (existing) {
    throw ApiError.conflict('A stream with this name already exists in your school');
  }

  const newStream = await prisma.stream.create({
    data: {
      schoolId,
      name,
      isActive: data.isActive ?? true,
    },
  });

  await prisma.auditLog.create({
    data: {
      schoolId,
      userId: actorUserId,
      action: 'CREATE_STREAM',
      entityType: 'Stream',
      entityId: newStream.id,
      newValues: { name: newStream.name, isActive: newStream.isActive },
    },
  });

  return newStream;
};

export const updateStream = async (schoolId, streamId, data, actorUserId) => {
  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
  });

  if (!stream || stream.schoolId !== schoolId) {
    throw ApiError.notFound('Stream not found');
  }

  if (data.name) {
    const trimmedName = data.name.trim();
    const existing = await prisma.stream.findFirst({
      where: {
        schoolId,
        name: { equals: trimmedName, mode: 'insensitive' },
        NOT: { id: streamId },
      },
    });
    if (existing) {
      throw ApiError.conflict('Another stream with this name already exists');
    }
  }

  const updatedStream = await prisma.stream.update({
    where: { id: streamId },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });

  await prisma.auditLog.create({
    data: {
      schoolId,
      userId: actorUserId,
      action: data.isActive === false ? 'DEACTIVATE_STREAM' : 'UPDATE_STREAM',
      entityType: 'Stream',
      entityId: streamId,
      oldValues: { name: stream.name, isActive: stream.isActive },
      newValues: { name: updatedStream.name, isActive: updatedStream.isActive },
    },
  });

  return updatedStream;
};
