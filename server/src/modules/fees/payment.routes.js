import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveSchool } from '../../middleware/school.middleware.js';
import { requirePermission } from '../../middleware/permission.middleware.js';
import { requireVoidReceiptAccess } from '../../middleware/permission.middleware.js';
import { PERMISSIONS } from '../../config/permissions.js';
import * as paymentController from './payment.controller.js';

export const paymentRouter = Router();

// Apply authentication and school tenant resolution
paymentRouter.use(authenticate, resolveSchool);

// 1. Static & Search Routes (Must be declared BEFORE parametric :id routes)
paymentRouter.get('/', requirePermission(PERMISSIONS.FEES_VIEW), paymentController.listPayments);
paymentRouter.post('/', requirePermission(PERMISSIONS.FEES_COLLECT), paymentController.createPayment);
paymentRouter.get('/search', requirePermission(PERMISSIONS.FEES_VIEW), paymentController.searchReceipts);
paymentRouter.get('/dashboard', requirePermission(PERMISSIONS.FEES_VIEW), paymentController.getDashboardSummary);

// 2. Parametric Receipt Routes
paymentRouter.get('/:id', requirePermission(PERMISSIONS.FEES_VIEW), paymentController.getPaymentDetails);
paymentRouter.get('/:id/reprint', requirePermission(PERMISSIONS.FEES_PRINT_RECEIPT), paymentController.getReceiptReprint);

// HARD RULE: Void receipt — OWNER or SCHOOL_ADMIN ONLY. Never STAFF.
paymentRouter.post('/:id/void', requireVoidReceiptAccess(), paymentController.voidPayment);

export default paymentRouter;
