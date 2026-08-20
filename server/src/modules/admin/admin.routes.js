import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';
import { adminUserController } from './user.controller.js';
import { adminAuditLogController } from './auditLog.controller.js';
import { adminDashboardController } from './adminDashboard.controller.js';
import { adminReportsController } from './adminReports.controller.js';
import { adminSettingsController } from './adminSettings.controller.js';


export const adminUsersRouter = Router();
adminUsersRouter.use(authenticate, requireRole('SUPER_ADMIN'));

adminUsersRouter.get('/', adminUserController.listUsers);
adminUsersRouter.post('/super-admin', adminUserController.createSuperAdmin);
adminUsersRouter.put('/:id', adminUserController.updateUserProfile);
adminUsersRouter.patch('/:id/role', adminUserController.changeUserRole);
adminUsersRouter.post('/:id/reset-password', adminUserController.resetUserPassword);

export const adminAuditLogsRouter = Router();
adminAuditLogsRouter.use(authenticate, requireRole('SUPER_ADMIN'));

adminAuditLogsRouter.get('/', adminAuditLogController.listAuditLogs);

export const adminDashboardRouter = Router();
adminDashboardRouter.use(authenticate, requireRole('SUPER_ADMIN'));
adminDashboardRouter.get('/', adminDashboardController.getSummary);

export const adminReportsRouter = Router();
adminReportsRouter.use(authenticate, requireRole('SUPER_ADMIN'));
adminReportsRouter.get('/revenue', adminReportsController.getRevenueReport);
adminReportsRouter.get('/growth', adminReportsController.getGrowthReport);

export const adminSettingsRouter = Router();
adminSettingsRouter.use(authenticate, requireRole('SUPER_ADMIN'));
adminSettingsRouter.get('/', adminSettingsController.getSettings);
adminSettingsRouter.put('/', adminSettingsController.updateSettings);
adminSettingsRouter.delete('/contact-persons/:id', adminSettingsController.deleteContactPerson);

