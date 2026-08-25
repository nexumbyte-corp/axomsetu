import { prisma } from '../../config/prisma.js';
import { getISTDayBounds } from '../../utils/dateUtils.js';

export const adminAuditLogService = {
  /**
   * Super Admin: Query system audit logs with filters and pagination.
   */
  async listAuditLogs({
    page = 1,
    limit = 20,
    search,
    action,
    entityType,
    schoolId,
    userId,
    startDate,
    endDate,
  }) {
    const where = {};

    if (schoolId) where.schoolId = schoolId;
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = getISTDayBounds(startDate).startOfDay;
      if (endDate) where.createdAt.lte = getISTDayBounds(endDate).endOfDay;
    }

    if (search) {
      const searchFilter = { contains: search, mode: 'insensitive' };
      where.OR = [
        { action: searchFilter },
        { entityType: searchFilter },
        { entityId: searchFilter },
        { school: { name: searchFilter } },
        { user: { name: searchFilter } },
        { user: { email: searchFilter } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);

    const skip = (pageNum - 1) * limitNum;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          school: {
            select: { id: true, name: true, code: true },
          },
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
    ]);

    return {
      items: logs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  },
};
