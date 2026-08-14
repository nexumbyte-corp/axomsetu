import { asyncHandler } from '../../utils/asyncHandler.js';
import { adminAuditLogService } from './auditLog.service.js';

export const adminAuditLogController = {
  listAuditLogs: asyncHandler(async (req, res) => {
    const { page, limit, search, action, entityType, schoolId, userId, startDate, endDate } = req.query;
    const result = await adminAuditLogService.listAuditLogs({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      search,
      action,
      entityType,
      schoolId,
      userId,
      startDate,
      endDate,
    });
    res.status(200).json({
      success: true,
      message: 'Audit logs retrieved successfully',
      data: result.items,
      pagination: result.pagination,
    });
  }),
};
