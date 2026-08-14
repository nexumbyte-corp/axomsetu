import { Router } from 'express';

import authRouter from '../modules/auth/auth.routes.js';
import academicYearRouter from '../modules/academic-years/academic-year.routes.js';
import { classesRouter, sectionsRouter, mediumsRouter, streamsRouter } from '../modules/academics/academic.routes.js';
import studentRouter from '../modules/students/student.routes.js';
import { feesRouter } from '../modules/fees/fee.routes.js';
import paymentRouter from '../modules/fees/payment.routes.js';
import expenseRouter, { categoryRouter } from '../modules/expenses/expense.routes.js';
import financeRouter from '../modules/finance/finance.routes.js';
import fundRouter, { fundSourceRouter } from '../modules/funds/fund.routes.js';
import staffRouter from '../modules/staff/staff.routes.js';
import payrollRouter from '../modules/payroll/payroll.routes.js';
import dashboardRouter from '../modules/dashboard/dashboard.routes.js';
import reportRouter from '../modules/reports/report.routes.js';
import schoolUsersRouter from '../modules/school-users/school-user.routes.js';
import tenantSchoolRouter from '../modules/schools/tenantSchool.routes.js';
import hostelRouter from '../modules/hostel/hostel.routes.js';


import adminSchoolsRouter from '../modules/schools/school.routes.js';
import {
  adminUsersRouter,
  adminAuditLogsRouter,
  adminDashboardRouter,
  adminReportsRouter,
  adminSettingsRouter,
} from '../modules/admin/admin.routes.js';

import subscriptionRouter from '../modules/subscriptions/subscription.routes.js';
import adminSubscriptionRouter from '../modules/admin/adminSubscription.routes.js';
import platformRouter from '../modules/platform/platform.routes.js';
import { requireActiveSubscription } from '../middleware/subscription.middleware.js';

import { prisma } from '../config/prisma.js';

const router = Router();

export const healthCheckHandler = async (req, res) => {
  let dbStatus = 'healthy';
  let dbError = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    dbStatus = 'unhealthy';
    dbError = err.message;
  }

  const memoryUsage = process.memoryUsage();
  const statusCode = dbStatus === 'healthy' ? 200 : 503;

  res.status(statusCode).json({
    success: dbStatus === 'healthy',
    status: dbStatus === 'healthy' ? 'UP' : 'DOWN',
    message: 'AxomSetu API Health Check',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: dbStatus,
      ...(dbError && { error: dbError }),
    },
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
    },
  });
};

// Health Check Endpoint (Probes database connection, memory, and uptime)
router.get('/health', healthCheckHandler);


// Authentication & Platform Config
router.use('/auth', authRouter);
router.use('/platform', platformRouter);

// School Subscriptions Portal Routes
router.use('/subscriptions', subscriptionRouter);

// School Operations (Tenant Scoped - guarded by subscription check)
router.use('/academic-years', requireActiveSubscription, academicYearRouter);
router.use('/classes', requireActiveSubscription, classesRouter);
router.use('/sections', requireActiveSubscription, sectionsRouter);
router.use('/mediums', requireActiveSubscription, mediumsRouter);
router.use('/streams', requireActiveSubscription, streamsRouter);
router.use('/students', requireActiveSubscription, studentRouter);
router.use('/fees', requireActiveSubscription, feesRouter);
router.use('/payments', requireActiveSubscription, paymentRouter);
router.use('/fee-payments', requireActiveSubscription, paymentRouter);
router.use('/finance', requireActiveSubscription, financeRouter);
router.use('/expenses', requireActiveSubscription, expenseRouter);
router.use('/expense-categories', requireActiveSubscription, categoryRouter);
router.use('/funds', requireActiveSubscription, fundRouter);
router.use('/fund-sources', requireActiveSubscription, fundSourceRouter);
router.use('/staff', requireActiveSubscription, staffRouter);
router.use('/payroll', requireActiveSubscription, payrollRouter);
router.use('/hostel', requireActiveSubscription, hostelRouter);
router.use('/dashboard', dashboardRouter);
router.use('/reports', requireActiveSubscription, reportRouter);
router.use('/school-users', requireActiveSubscription, schoolUsersRouter);
router.use('/schools', tenantSchoolRouter);

// Super Admin Management Routes
router.use('/admin/dashboard', adminDashboardRouter);
router.use('/admin/reports', adminReportsRouter);
router.use('/admin/settings', adminSettingsRouter);
router.use('/admin/schools', adminSchoolsRouter);
router.use('/admin/subscriptions', adminSubscriptionRouter);
router.use('/admin/users', adminUsersRouter);
router.use('/admin/audit-logs', adminAuditLogsRouter);

export default router;

