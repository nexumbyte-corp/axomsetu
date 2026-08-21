import { prisma } from '../../config/prisma.js';
import { getISTMonthBounds, getISTYearBounds, getISTDateParts } from '../../utils/dateUtils.js';

export const adminReportsService = {
  /**
   * Platform Revenue Report
   */
  async getRevenueReport({ startDate, endDate, planId, paymentMethod, schoolId }) {
    const where = { status: 'SUCCESS' };

    if (schoolId) {
      where.subscription = { schoolId };
    }

    if (planId) {
      where.subscription = {
        ...(where.subscription),
        planId,
      };
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(`${startDate}T00:00:00.000+05:30`);
      if (endDate) where.paymentDate.lte = new Date(`${endDate}T23:59:59.999+05:30`);
    }

    const { year: currentYear, month: currentMonth } = getISTDateParts();
    const { startOfYear } = getISTYearBounds(currentYear);
    const { startOfMonth: startOfCurrentMonth } = getISTMonthBounds(currentYear, currentMonth);
    const prevMonthNum = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYearNum = currentMonth === 1 ? currentYear - 1 : currentYear;
    const { startOfMonth: startOfPreviousMonth, endOfMonth: endOfPreviousMonth } = getISTMonthBounds(prevYearNum, prevMonthNum);

    const [
      totalRevenueAgg,
      ytdRevenueAgg,
      currentMonthAgg,
      prevMonthAgg,
      paymentsList,
    ] = await Promise.all([
      prisma.subscriptionPayment.aggregate({
        where,
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.subscriptionPayment.aggregate({
        where: { ...where, paymentDate: { gte: startOfYear } },
        _sum: { amount: true },
      }),
      prisma.subscriptionPayment.aggregate({
        where: { ...where, paymentDate: { gte: startOfCurrentMonth } },
        _sum: { amount: true },
      }),
      prisma.subscriptionPayment.aggregate({
        where: { ...where, paymentDate: { gte: startOfPreviousMonth, lte: endOfPreviousMonth } },
        _sum: { amount: true },
      }),
      prisma.subscriptionPayment.findMany({
        where,
        orderBy: { paymentDate: 'desc' },
        include: {
          subscription: {
            include: {
              school: { select: { id: true, name: true, code: true } },
              plan: { select: { id: true, name: true, billingInterval: true } },
            },
          },
        },
      }),
    ]);

    // Breakdowns
    const byPlan = {};
    const byPaymentMethod = {};
    const byMonth = {};

    paymentsList.forEach((p) => {
      const amt = Number(p.amount || 0);

      // By Plan
      const planName = p.subscription?.plan?.name || 'Unknown Plan';
      byPlan[planName] = (byPlan[planName] || 0) + amt;

      // By Payment Method
      const method = p.paymentMethod || 'OTHER';
      byPaymentMethod[method] = (byPaymentMethod[method] || 0) + amt;

      // By Month (YYYY-MM)
      const dateObj = new Date(p.paymentDate);
      const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
      byMonth[monthKey] = (byMonth[monthKey] || 0) + amt;
    });

    return {
      totalRevenue: Number(totalRevenueAgg._sum.amount || 0),
      totalTransactions: totalRevenueAgg._count.id || 0,
      ytdRevenue: Number(ytdRevenueAgg._sum.amount || 0),
      currentMonthRevenue: Number(currentMonthAgg._sum.amount || 0),
      previousMonthRevenue: Number(prevMonthAgg._sum.amount || 0),
      breakdown: {
        byPlan,
        byPaymentMethod,
        byMonth,
      },
      recentTransactions: paymentsList.slice(0, 20).map((p) => ({
        id: p.id,
        date: p.paymentDate,
        schoolName: p.subscription?.school?.name || 'School',
        schoolCode: p.subscription?.school?.code || '-',
        planName: p.subscription?.plan?.name || '-',
        amount: Number(p.amount),
        paymentMethod: p.paymentMethod,
        transactionRef: p.transactionRef || p.referenceNumber || '-',
        status: p.status,
      })),
    };
  },

  /**
   * School Growth Analytics Report
   */
  async getGrowthReport() {
    const now = new Date();

    // Past 12 months growth aggregation
    const monthlyGrowth = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextD = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });

      const [newCount, totalUpTo] = await Promise.all([
        prisma.school.count({
          where: {
            createdAt: { gte: d, lt: nextD },
          },
        }),
        prisma.school.count({
          where: {
            createdAt: { lt: nextD },
          },
        }),
      ]);

      monthlyGrowth.push({
        month: label,
        newSchools: newCount,
        totalSchools: totalUpTo,
      });
    }

    const totalSchools = await prisma.school.count();
    const activeSchools = await prisma.school.count({ where: { status: 'ACTIVE' } });

    return {
      totalSchools,
      activeSchools,
      monthlyGrowth,
    };
  },
};
