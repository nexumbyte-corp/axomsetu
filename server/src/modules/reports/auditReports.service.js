import { prisma } from '../../config/prisma.js';
import { getISTDayBounds } from '../../utils/dateUtils.js';

function formatAuditDetails(newValues, oldValues) {
  const target = newValues || oldValues;
  if (!target) return '-';
  if (typeof target === 'string') return target;
  if (typeof target === 'object') {
    const parts = [];
    for (const [key, val] of Object.entries(target)) {
      if (val === null || val === undefined) continue;
      const cleanKey = key.replace(/([A-Z])/g, ' $1').toLowerCase();
      const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
      parts.push(`${cleanKey}: ${valStr}`);
    }
    return parts.join(' | ') || '-';
  }
  return String(target);
}

export const auditReportsService = {
  /**
   * System Audit Logs Report scoped strictly by school
   */
  async getAuditLogs(schoolId, query = {}) {
    const { startDate, endDate, userId, action, entityType, search, page = 1, limit = 20 } = query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(1000, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const whereClause = {
      schoolId,
      ...(userId && { userId }),
      ...(action && { action }),
      ...(entityType && { entityType }),
    };

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = getISTDayBounds(startDate).startOfDay;
      }
      if (endDate) {
        whereClause.createdAt.lte = getISTDayBounds(endDate).endOfDay;
      }
    }

    if (search && search.trim()) {
      const searchFilter = { contains: search.trim(), mode: 'insensitive' };
      whereClause.OR = [
        { action: searchFilter },
        { entityType: searchFilter },
        { entityId: searchFilter },
        { ipAddress: searchFilter },
        { user: { name: searchFilter } },
        { user: { email: searchFilter } },
      ];
    }

    const [total, logs, distinctUsers] = await Promise.all([
      prisma.auditLog.count({ where: whereClause }),
      prisma.auditLog.findMany({
        where: whereClause,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.auditLog.groupBy({
        by: ['userId'],
        where: { schoolId, userId: { not: null } },
      }),
    ]);

    const data = logs.map((l) => ({
      id: l.id,
      date: l.createdAt,
      createdAt: l.createdAt,
      userId: l.userId,
      userName: l.user?.name || 'System / Guest',
      userEmail: l.user?.email || '-',
      userRole: l.user?.role || 'SYSTEM',
      action: l.action ? l.action.replace(/_/g, ' ') : '-',
      rawAction: l.action,
      module: l.entityType ? l.entityType.replace(/Report$/, '') : '-',
      entityType: l.entityType,
      entityId: l.entityId || '-',
      ipAddress: l.ipAddress || '-',
      userAgent: l.userAgent || '-',
      details: formatAuditDetails(l.newValues, l.oldValues),
      oldValues: l.oldValues,
      newValues: l.newValues,
    }));

    return {
      data,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
      summary: {
        totalAuditEntries: total,
        uniqueOperators: distinctUsers.length,
      },
    };
  },

  /**
   * Filter dropdown options for audit logs in the school
   */
  async getAuditFilterOptions(schoolId) {
    if (!schoolId) {
      return { modules: [], actions: [], users: [] };
    }

    const [entityGroups, actionGroups, schoolUsers] = await Promise.all([
      prisma.auditLog.groupBy({
        by: ['entityType'],
        where: { schoolId },
        _count: true,
      }),
      prisma.auditLog.groupBy({
        by: ['action'],
        where: { schoolId },
        _count: true,
      }),
      prisma.user.findMany({
        where: {
          schoolAdmins: {
            some: { schoolId },
          },
        },
        select: { id: true, name: true, email: true, role: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      modules: entityGroups
        .filter((g) => g.entityType)
        .map((g) => ({
          value: g.entityType,
          label: g.entityType.replace(/([A-Z])/g, ' $1').trim(),
          count: g._count,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      actions: actionGroups
        .filter((g) => g.action)
        .map((g) => ({
          value: g.action,
          label: g.action.replace(/_/g, ' '),
          count: g._count,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      users: schoolUsers.map((u) => ({
        value: u.id,
        label: `${u.name} (${u.role || 'STAFF'})`,
        name: u.name,
        email: u.email,
        role: u.role,
      })),
    };
  },
};
