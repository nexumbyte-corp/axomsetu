import { prisma } from '../../config/prisma.js';

function formatAuditDetails(newValues) {
  if (!newValues) return '-';
  if (typeof newValues === 'string') return newValues;
  if (typeof newValues === 'object') {
    const parts = [];
    for (const [key, val] of Object.entries(newValues)) {
      if (val === null || val === undefined) continue;
      const cleanKey = key.replace(/([A-Z])/g, ' $1').toLowerCase();
      parts.push(`${cleanKey}: ${val}`);
    }
    return parts.join(' | ') || '-';
  }
  return String(newValues);
}

export const auditReportsService = {
  /**
   * System Audit Logs Report
   */
  async getAuditLogs(schoolId, query = {}) {
    const { startDate, endDate, userId, action, entityType, page = 1, limit = 20 } = query;

    const skip = (Number(page) - 1) * Number(limit);

    const whereClause = {
      schoolId,
      ...(userId && { userId }),
      ...(action && { action }),
      ...(entityType && { entityType }),
    };

    if (startDate || endDate) {
      whereClause.createdAt = {
        ...(startDate && { gte: new Date(`${startDate}T00:00:00.000+05:30`) }),
        ...(endDate && { lte: new Date(`${endDate}T23:59:59.999+05:30`) }),
      };
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where: whereClause }),
      prisma.auditLog.findMany({
        where: whereClause,
        include: {
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
    ]);

    const data = logs.map((l) => ({
      id: l.id,
      date: l.createdAt,
      userName: l.user?.name || 'System / Guest',
      userEmail: l.user?.email || '-',
      action: l.action ? l.action.replace(/_/g, ' ') : '-',
      module: l.entityType ? l.entityType.replace(/Report$/, '') : '-',
      details: formatAuditDetails(l.newValues),
    }));

    return {
      data,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
      summary: {
        totalAuditEntries: total,
      },
    };
  },
};
