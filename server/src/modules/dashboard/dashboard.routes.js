import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveSchool } from '../../middleware/school.middleware.js';
import { requirePermission } from '../../middleware/permission.middleware.js';
import { PERMISSIONS } from '../../config/permissions.js';
import { getDashboardSummary } from './dashboard.controller.js';

const router = Router();

router.use(authenticate, resolveSchool);

router.get('/', requirePermission(PERMISSIONS.DASHBOARD_VIEW), getDashboardSummary);
router.get('/summary', requirePermission(PERMISSIONS.DASHBOARD_VIEW), getDashboardSummary);

export default router;
