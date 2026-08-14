import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';

export const SYSTEM_FEE_TYPES = [
  {
    systemCode: 'ADMISSION',
    name: 'Admission',
    code: 'ADMISSION',
    category: 'ACADEMIC',
    billingRule: 'ONE_TIME_PER_ACADEMIC_YEAR',
    order: 1,
    description: 'System Fee Type for Admission Fee',
  },
  {
    systemCode: 'TUITION',
    name: 'Tuition',
    code: 'TUITION',
    category: 'ACADEMIC',
    billingRule: 'MONTHLY',
    order: 2,
    description: 'System Fee Type for Tuition Fee',
  },
  {
    systemCode: 'MISC',
    name: 'Miscellaneous',
    code: 'MISC',
    category: 'ACADEMIC',
    billingRule: 'MONTHLY',
    order: 3,
    description: 'System Fee Type for Miscellaneous & Temporary Fees',
  },
  {
    systemCode: 'HOSTEL_ADMISSION',
    name: 'Hostel Admission Fee',
    code: 'HOSTEL_ADM',
    category: 'HOSTEL',
    billingRule: 'ONE_TIME_PER_ACADEMIC_YEAR',
    order: 4,
    description: 'System Fee Type for Hostel Admission Fee',
  },
  {
    systemCode: 'HOSTEL',
    name: 'Hostel Monthly Fee',
    code: 'HOSTEL_MONTHLY',
    category: 'HOSTEL',
    billingRule: 'MONTHLY',
    order: 5,
    description: 'System Fee Type for Monthly Hostel Charges',
  },
];

/**
 * Ensures that all predefined System Fee Types exist for a school.
 * Idempotent implementation that reuses existing matching FeeTypes by systemCode or name.
 *
 * @param {string} schoolId
 * @param {Object} [tx=prisma]
 */
export const initializeSystemFeeTypes = async (schoolId, tx = prisma) => {
  for (const def of SYSTEM_FEE_TYPES) {
    // 1. Check if already present by systemCode
    const existingByCode = await tx.feeType.findUnique({
      where: {
        schoolId_systemCode: {
          schoolId,
          systemCode: def.systemCode,
        },
      },
    });

    if (existingByCode) {
      if (!existingByCode.isSystem) {
        await tx.feeType.update({
          where: { id: existingByCode.id },
          data: { isSystem: true, category: def.category, billingRule: def.billingRule },
        });
      }
      continue;
    }

    // 2. If not found by systemCode, check if a fee type exists by name (e.g. Admission, Tuition, Hostel, Miscellaneous)
    const existingByName = await tx.feeType.findUnique({
      where: {
        schoolId_name: {
          schoolId,
          name: def.name,
        },
      },
    });

    if (existingByName) {
      await tx.feeType.update({
        where: { id: existingByName.id },
        data: {
          isSystem: true,
          systemCode: def.systemCode,
          category: def.category,
          billingRule: def.billingRule,
        },
      });
      continue;
    }

    // 3. Otherwise create the System Fee Type
    await tx.feeType.create({
      data: {
        schoolId,
        name: def.name,
        code: def.code,
        description: def.description,
        order: def.order,
        category: def.category,
        billingRule: def.billingRule,
        isActive: true,
        isSystem: true,
        systemCode: def.systemCode,
      },
    });
  }
};

/**
 * Retrieves a System Fee Type for a school by its systemCode.
 * Automatically initializes system fee types for the school if missing.
 *
 * @param {string} schoolId
 * @param {string} systemCode - Enum value ADMISSION | TUITION | HOSTEL | MISC
 * @param {Object} [tx=prisma]
 * @returns {Promise<Object>} FeeType record
 */
export const getSystemFeeType = async (schoolId, systemCode, tx = prisma) => {
  let feeType = await tx.feeType.findUnique({
    where: {
      schoolId_systemCode: {
        schoolId,
        systemCode,
      },
    },
  });

  if (!feeType) {
    await initializeSystemFeeTypes(schoolId, tx);
    feeType = await tx.feeType.findUnique({
      where: {
        schoolId_systemCode: {
          schoolId,
          systemCode,
        },
      },
    });
  }

  if (!feeType) {
    throw ApiError.notFound(`System fee type '${systemCode}' not found for school`);
  }

  return feeType;
};

export const listFeeTypes = async (schoolId, query = {}) => {
  const where = { schoolId };

  if (query.isActive === 'true') {
    where.isActive = true;
  } else if (query.isActive === 'false') {
    where.isActive = false;
  }

  if (query.search && query.search.trim().length > 0) {
    const searchStr = query.search.trim();
    where.OR = [
      { name: { contains: searchStr, mode: 'insensitive' } },
      { code: { contains: searchStr, mode: 'insensitive' } },
      { description: { contains: searchStr, mode: 'insensitive' } },
    ];
  }

  const feeTypes = await prisma.feeType.findMany({
    where,
    orderBy: [
      { order: 'asc' },
      { name: 'asc' },
    ],
  });

  // Ensure system fee types exist if none found
  if (feeTypes.length === 0) {
    await initializeSystemFeeTypes(schoolId);
    return await prisma.feeType.findMany({
      where,
      orderBy: [
        { order: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  return feeTypes;
};

export const getFeeTypeById = async (schoolId, feeTypeId) => {
  const feeType = await prisma.feeType.findUnique({
    where: { id: feeTypeId },
  });

  if (!feeType || feeType.schoolId !== schoolId) {
    throw ApiError.notFound('Fee type not found');
  }

  return feeType;
};

export const createFeeType = async (schoolId, data, actorUserId) => {
  const nameTrimmed = data.name.trim();

  // Check unique name per school
  const existing = await prisma.feeType.findUnique({
    where: {
      schoolId_name: {
        schoolId,
        name: nameTrimmed,
      },
    },
  });

  if (existing) {
    throw ApiError.conflict(`Fee type '${nameTrimmed}' already exists`);
  }

  let category = data.category || (data.feeCategory === 'HOSTEL' ? 'HOSTEL' : 'ACADEMIC');
  let billingRule = data.billingRule || (data.feeCategory === 'ONETIME_PER_YEAR' ? 'ONE_TIME_PER_ACADEMIC_YEAR' : 'MONTHLY');

  if (!data.category && !data.feeCategory) {
    const lowerName = nameTrimmed.toLowerCase();
    const lowerCode = (data.code || '').toLowerCase();
    if (lowerName.includes('hostel') || lowerCode.includes('hostel')) {
      category = 'HOSTEL';
    } else {
      category = 'ACADEMIC';
    }

    if (lowerName.includes('admission') || lowerCode.includes('admission')) {
      billingRule = 'ONE_TIME_PER_ACADEMIC_YEAR';
    } else {
      billingRule = 'MONTHLY';
    }
  }

  const feeType = await prisma.feeType.create({
    data: {
      schoolId,
      name: nameTrimmed,
      code: data.code ? data.code.trim() : null,
      description: data.description ? data.description.trim() : null,
      order: data.order ?? 0,
      category,
      billingRule,
      isActive: data.isActive ?? true,
      isSystem: false,
    },
  });

  if (actorUserId) {
    await prisma.auditLog.create({
      data: {
        schoolId,
        userId: actorUserId,
        action: 'CREATE_FEE_TYPE',
        entityType: 'FeeType',
        entityId: feeType.id,
        newValues: { name: feeType.name, category: feeType.category, billingRule: feeType.billingRule, order: feeType.order, isActive: feeType.isActive },
      },
    });
  }

  return feeType;
};

export const updateFeeType = async (schoolId, feeTypeId, data, actorUserId) => {
  const existing = await getFeeTypeById(schoolId, feeTypeId);

  // System Fee Type Protection Rules
  if (existing.isSystem) {
    if (data.isSystem === false) {
      throw ApiError.badRequest('Cannot convert a system fee type to a normal fee type');
    }
    if (data.systemCode !== undefined && data.systemCode !== existing.systemCode) {
      throw ApiError.badRequest('Cannot modify systemCode of a system fee type');
    }
  }

  const updateData = {};
  if (data.name !== undefined && data.name.trim() !== existing.name) {
    const nameTrimmed = data.name.trim();
    const duplicate = await prisma.feeType.findUnique({
      where: {
        schoolId_name: {
          schoolId,
          name: nameTrimmed,
        },
      },
    });
    if (duplicate && duplicate.id !== feeTypeId) {
      throw ApiError.conflict(`Fee type '${nameTrimmed}' already exists`);
    }
    updateData.name = nameTrimmed;
  }

  if (data.code !== undefined) updateData.code = data.code ? data.code.trim() : null;
  if (data.description !== undefined) updateData.description = data.description ? data.description.trim() : null;
  if (data.order !== undefined) updateData.order = data.order;
  if (data.category !== undefined) {
    updateData.category = data.category;
  }
  if (data.billingRule !== undefined) {
    updateData.billingRule = data.billingRule;
  }
  if (data.feeCategory !== undefined) {
    if (data.feeCategory === 'HOSTEL') updateData.category = 'HOSTEL';
    else if (data.feeCategory === 'ACADEMIC') updateData.category = 'ACADEMIC';
  }
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const updated = await prisma.feeType.update({
    where: { id: feeTypeId },
    data: updateData,
  });

  if (actorUserId) {
    await prisma.auditLog.create({
      data: {
        schoolId,
        userId: actorUserId,
        action: 'UPDATE_FEE_TYPE',
        entityType: 'FeeType',
        entityId: feeTypeId,
        oldValues: { name: existing.name, isActive: existing.isActive },
        newValues: { name: updated.name, isActive: updated.isActive },
      },
    });
  }

  return updated;
};

export const toggleFeeTypeStatus = async (schoolId, feeTypeId, actorUserId) => {
  const existing = await getFeeTypeById(schoolId, feeTypeId);

  const updated = await prisma.feeType.update({
    where: { id: feeTypeId },
    data: { isActive: !existing.isActive },
  });

  if (actorUserId) {
    await prisma.auditLog.create({
      data: {
        schoolId,
        userId: actorUserId,
        action: 'TOGGLE_FEE_TYPE_STATUS',
        entityType: 'FeeType',
        entityId: feeTypeId,
        oldValues: { isActive: existing.isActive },
        newValues: { isActive: updated.isActive },
      },
    });
  }

  return updated;
};

export const deleteFeeType = async (schoolId, feeTypeId, actorUserId) => {
  const existing = await getFeeTypeById(schoolId, feeTypeId);

  // System Fee Type Protection: System Fee Types CANNOT be deleted
  if (existing.isSystem) {
    throw ApiError.forbidden(`Cannot delete system fee type '${existing.name}'. System fee types are required by the platform.`);
  }

  // Check usage
  const [headCount, overrideCount, chargeCount] = await Promise.all([
    prisma.feeStructureHead.count({ where: { feeTypeId } }),
    prisma.studentFeeOverride.count({ where: { feeTypeId } }),
    prisma.studentFeeCharge.count({ where: { feeTypeId } }),
  ]);

  if (headCount > 0 || overrideCount > 0 || chargeCount > 0) {
    throw ApiError.badRequest(
      `Cannot delete fee type '${existing.name}' because it is in use in fee structures, overrides, or charges.`
    );
  }

  await prisma.feeType.delete({
    where: { id: feeTypeId },
  });

  if (actorUserId) {
    await prisma.auditLog.create({
      data: {
        schoolId,
        userId: actorUserId,
        action: 'DELETE_FEE_TYPE',
        entityType: 'FeeType',
        entityId: feeTypeId,
        oldValues: { name: existing.name },
      },
    });
  }

  return { message: 'Fee type deleted successfully' };
};
