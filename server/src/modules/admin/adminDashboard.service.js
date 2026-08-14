import { prisma } from '../../config/prisma.js';
import { memoryCache } from '../../utils/cache.js';

export const adminDashboardService = {
  /**
   * Super Admin Platform Dashboard Metrics & Performance Overview
   * Cached for 60 seconds to provide lightning-fast super admin dashboard response across 1000+ schools.
   */
  async getDashboardSummary() {
    return await memoryCache.getOrSet('admin:dashboard:summary', async () => {
      const now = new Date();
      
      // Start of current month & previous month
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const [
        // 1. School Status Group Aggregation
        schoolStatusAgg,
        trialSchools,

        // 2. User Role Group Aggregation
        userRoleAgg,

        // 3. Growth Stats
        newSchoolsCurrentMonth,
        newSchoolsPreviousMonth,

        // 4. Recent Items & Financial Aggregates
        recentSchools,
        currentMonthRevAgg,
        prevMonthRevAgg,
        revenueByPlanType,
        expiringSoonSubs,
        recentPaymentsList,
      ] = await Promise.all([
        // Single group by for all school statuses
        prisma.school.groupBy({
          by: ['status'],
          _count: { _all: true },
        }),
        prisma.schoolSubscription.count({ where: { status: 'ACTIVE', plan: { isTrial: true } } }),

        // Single group by for user roles
        prisma.user.groupBy({
          by: ['role'],
          _count: { _all: true },
        }),

        // New Schools current month vs previous month
        prisma.school.count({ where: { createdAt: { gte: startOfCurrentMonth } } }),
        prisma.school.count({ where: { createdAt: { gte: startOfPreviousMonth, lte: endOfPreviousMonth } } }),

        // Recent 5 registered schools
        prisma.school.findMany({
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            admins: {
              where: { isOwner: true },
              include: { user: { select: { name: true, email: true } } },
            },
          },
        }),

        // Current Month Revenue
        prisma.subscriptionPayment.aggregate({
          where: {
            status: 'PAID',
            approvedAt: { gte: startOfCurrentMonth },
          },
          _sum: { amount: true },
        }),

        // Previous Month Revenue
        prisma.subscriptionPayment.aggregate({
          where: {
            status: 'PAID',
            approvedAt: { gte: startOfPreviousMonth, lte: endOfPreviousMonth },
          },
          _sum: { amount: true },
        }),

        // Revenue breakdown by plan type
        prisma.subscriptionPayment.groupBy({
          by: ['planId'],
          where: { status: 'PAID' },
          _sum: { amount: true },
        }),

        // Subscriptions expiring in next 30 days
        prisma.schoolSubscription.findMany({
          where: {
            status: 'ACTIVE',
            endDate: { gte: now, lte: thirtyDaysFromNow },
          },
          include: {
            school: { select: { id: true, name: true, code: true } },
          },
          orderBy: { endDate: 'asc' },
          take: 10,
        }),

        // Recent 5 subscription payments
        prisma.subscriptionPayment.findMany({
          where: { status: 'PAID' },
          include: {
            school: { select: { id: true, name: true } },
            plan: { select: { name: true, type: true } },
          },
          orderBy: { approvedAt: 'desc' },
          take: 5,
        }),
      ]);

      // Calculate school counts from groupBy
      let totalSchools = 0;
      let activeSchools = 0;
      let suspendedSchools = 0;
      let inactiveSchools = 0;

      schoolStatusAgg.forEach((s) => {
        const count = s._count._all;
        totalSchools += count;
        if (s.status === 'ACTIVE') activeSchools = count;
        if (s.status === 'SUSPENDED') suspendedSchools = count;
        if (s.status === 'INACTIVE') inactiveSchools = count;
      });

      // Calculate user counts from groupBy
      let totalUsers = 0;
      let schoolAdminsCount = 0;
      let superAdminsCount = 0;

      userRoleAgg.forEach((u) => {
        const count = u._count._all;
        totalUsers += count;
        if (u.role === 'SCHOOL_ADMIN') schoolAdminsCount = count;
        if (u.role === 'SUPER_ADMIN') superAdminsCount = count;
      });

      // Map revenue by interval (MONTHLY, QUARTERLY, YEARLY)
      const planIds = revenueByPlanType.map((r) => r.planId);
      const plans = await prisma.subscriptionPlan.findMany({
        where: { id: { in: planIds } },
        select: { id: true, type: true },
      });
      const planTypeMap = new Map();
      plans.forEach((p) => planTypeMap.set(p.id, p.type));

      const revenueByInterval = { MONTHLY: 0, QUARTERLY: 0, YEARLY: 0 };
      revenueByPlanType.forEach((r) => {
        const type = planTypeMap.get(r.planId);
        if (type && revenueByInterval[type] !== undefined) {
          revenueByInterval[type] += Number(r._sum.amount || 0);
        }
      });

      // Growth Stats Calculations
      let schoolGrowthPercentage = null;
      if (newSchoolsPreviousMonth > 0) {
        schoolGrowthPercentage = Math.round(((newSchoolsCurrentMonth - newSchoolsPreviousMonth) / newSchoolsPreviousMonth) * 1000) / 10;
      }

      return {
        schoolStats: {
          total: totalSchools,
          active: activeSchools,
          suspended: suspendedSchools,
          inactive: inactiveSchools,
          trial: trialSchools,
        },
        userStats: {
          total: totalUsers,
          schoolAdmins: schoolAdminsCount,
          superAdmins: superAdminsCount,
        },
        growthStats: {
          newSchoolsCurrentMonth,
          newSchoolsPreviousMonth,
          schoolGrowthPercentage,
        },
        financialSummary: {
          currentMonthRevenue: Number(currentMonthRevAgg._sum.amount || 0),
          previousMonthRevenue: Number(prevMonthRevAgg._sum.amount || 0),
          revenueByInterval,
        },
        expiringSoon: expiringSoonSubs.map((s) => ({
          id: s.id,
          schoolId: s.schoolId,
          schoolName: s.school.name,
          schoolCode: s.school.code,
          planName: s.planNameSnapshot,
          endDate: s.endDate,
          daysRemaining: Math.max(0, Math.ceil((new Date(s.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))),
        })),
        recentPayments: recentPaymentsList.map((p) => ({
          id: p.id,
          schoolName: p.school.name,
          planName: p.plan?.name || 'Subscription Plan',
          paymentMethod: p.paymentMethod,
          amount: Number(p.amount),
          date: p.approvedAt || p.createdAt,
        })),
        recentSchools: recentSchools.map((s) => ({
          id: s.id,
          name: s.name,
          code: s.code,
          email: s.email,
          phone: s.phone,
          status: s.status,
          createdAt: s.createdAt,
          ownerName: s.admins[0]?.user?.name || '-',
          ownerEmail: s.admins[0]?.user?.email || '-',
        })),
      };
    }, 60);
  },
};
