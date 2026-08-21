import { prisma } from '../../config/prisma.js';
import { financialLedgerService } from '../finance/financialLedger.service.js';
import { memoryCache } from '../../utils/cache.js';
import { getISTDayBounds } from '../../utils/dateUtils.js';

export const dashboardService = {
  /**
   * Calculate and aggregate all operational dashboard metrics for a school.
   * Cached for 30 seconds to provide near-instant page loads under high multi-tenant traffic.
   * @param {string} schoolId 
   * @param {object} query - { academicYearId }
   * @returns {object} Dashboard summary payload
   */
  async getSummary(schoolId, query = {}) {
    const cacheKey = `dashboard:${schoolId}:${query.academicYearId || 'default'}`;

    return await memoryCache.getOrSet(cacheKey, async () => {
      const now = new Date();
      let { academicYearId } = query;

    // 1. Fetch School profile and active academic year
    const [school, activeAcademicYear] = await Promise.all([
      prisma.school.findUnique({
        where: { id: schoolId },
        select: {
          id: true,
          name: true,
          code: true,
          address: true,
          phone: true,
          email: true,
          logoUrl: true,
          status: true,
        },
      }),

      academicYearId
        ? prisma.academicYear.findFirst({ where: { id: academicYearId, schoolId } })
        : prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true } }),
    ]);

    if (activeAcademicYear) {
      academicYearId = activeAcademicYear.id;
    }

    // 2. Parallel aggregation queries
    const chargeWhere = {
      schoolId,
      status: { in: ['UNPAID', 'PARTIAL'] },
      ...(academicYearId && { academicYearId }),
    };

    const payrollWhere = {
      schoolId,
      status: { in: ['UNPAID', 'PARTIAL'] },
      ...(academicYearId && { academicYearId }),
    };

    const [
      totalStudentsCount,
      activeEnrolledStudentsCount,
      activeStaffCount,
      teachingStaffCount,
      pendingFeeChargesAgg,
      pendingFeeStudentsGroup,
      pendingPayrollAgg,
      pendingPayrollStaffGroup,
      ledgerOverview,
      recentFeePayments,
      recentExpenses,
      recentSalaryPayments,
      latestSubscription,
    ] = await Promise.all([
      // Total active students in system
      prisma.student.count({ where: { schoolId, status: 'ACTIVE' } }),

      // Active enrolled students for selected academic year
      prisma.studentEnrollment.count({
        where: {
          schoolId,
          status: 'ACTIVE',
          ...(academicYearId && { academicYearId }),
        },
      }),

      // Total active staff
      prisma.staff.count({ where: { schoolId, status: 'ACTIVE' } }),

      // Active teaching staff
      prisma.staff.count({ where: { schoolId, status: 'ACTIVE', role: 'TEACHER' } }),

      // Pending Fee calculation
      prisma.studentFeeCharge.aggregate({
        where: chargeWhere,
        _sum: { amount: true, paidAmount: true },
      }),

      // Unique students with fee dues
      prisma.studentFeeCharge.groupBy({
        by: ['studentId'],
        where: chargeWhere,
      }),

      // Pending Salary calculation
      prisma.monthlyPayroll.aggregate({
        where: payrollWhere,
        _sum: { netSalary: true, paidAmount: true },
      }),

      // Unique staff with pending salary
      prisma.monthlyPayroll.groupBy({
        by: ['staffId'],
        where: payrollWhere,
      }),

      // Unified Financial Ledger continuous overview
      financialLedgerService.getOverview(schoolId),

      // Recent Fee Collections (5 latest)
      prisma.feePayment.findMany({
        where: {
          schoolId,
          status: 'SUCCESS',
          ...(academicYearId && { academicYearId }),
        },
        include: {
          student: { select: { id: true, name: true, admissionNo: true } },
        },
        orderBy: { paymentDate: 'desc' },
        take: 5,
      }),

      // Recent Expenses (5 latest)
      prisma.expense.findMany({
        where: {
          schoolId,
          status: 'ACTIVE',
          ...(academicYearId && { academicYearId }),
        },
        include: {
          category: { select: { id: true, name: true } },
        },
        orderBy: { expenseDate: 'desc' },
        take: 5,
      }),

      // Recent Salary Payments (5 latest)
      prisma.salaryPayment.findMany({
        where: {
          schoolId,
          ...(academicYearId && { academicYearId }),
        },
        include: {
          staff: { select: { id: true, name: true, employeeId: true } },
        },
        orderBy: { paymentDate: 'desc' },
        take: 5,
      }),

      // Latest School Subscription (13th query)
      prisma.schoolSubscription.findFirst({
        where: { schoolId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const needsAttention = [];

    // Calculate subscription metrics
    let subscriptionWidget = null;
    if (latestSubscription) {
      const subEndDate = latestSubscription.endDate ? new Date(latestSubscription.endDate) : null;
      const diffTime = subEndDate ? subEndDate.getTime() - now.getTime() : 0;
      const remainingDays = subEndDate ? Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24))) : 0;
      const isExpired = latestSubscription.status === 'EXPIRED' || !subEndDate || remainingDays === 0 || subEndDate < now;

      subscriptionWidget = {
        id: latestSubscription.id,
        planName: latestSubscription.planNameSnapshot,
        status: isExpired ? 'EXPIRED' : latestSubscription.status,
        startDate: latestSubscription.startDate,
        endDate: latestSubscription.endDate,
        remainingDays,
      };

      if (isExpired || latestSubscription.status === 'SUSPENDED') {
        needsAttention.unshift({
          id: 'sub-expired',
          category: 'SUBSCRIPTION',
          title: latestSubscription.status === 'SUSPENDED' ? 'Subscription Suspended' : 'Subscription Expired',
          description: 'Operational mutations are restricted. Please purchase/renew subscription plan.',
          actionUrl: '/app/subscription',
          actionLabel: 'Renew Subscription',
          severity: 'danger',
        });
      } else if (remainingDays <= 7) {
        needsAttention.unshift({
          id: 'sub-expiring-soon',
          category: 'SUBSCRIPTION',
          title: 'Subscription Expiring Soon',
          description: `Your ${latestSubscription.planNameSnapshot} plan expires in ${remainingDays} day${remainingDays === 1 ? '' : 's'}.`,
          actionUrl: '/app/subscription',
          actionLabel: 'Renew Now',
          severity: 'warning',
        });
      }
    }

    // Format pending fees values
    const pendingFeeAmount = Math.max(
      0,
      Number(pendingFeeChargesAgg._sum.amount || 0) - Number(pendingFeeChargesAgg._sum.paidAmount || 0)
    );
    const pendingFeeStudentCount = pendingFeeStudentsGroup.length;

    // Format pending salary values
    const pendingSalaryAmount = Math.max(
      0,
      Number(pendingPayrollAgg._sum.netSalary || 0) - Number(pendingPayrollAgg._sum.paidAmount || 0)
    );
    const pendingSalaryStaffCount = pendingPayrollStaffGroup.length;

    // Non-teaching staff count
    const nonTeachingStaffCount = Math.max(0, activeStaffCount - teachingStaffCount);

    if (pendingFeeStudentCount > 0) {
      needsAttention.push({
        id: 'pending-fees',
        category: 'FEE',
        title: 'Pending Fee Dues',
        description: `${pendingFeeStudentCount} student${pendingFeeStudentCount === 1 ? '' : 's'} have outstanding fees`,
        actionUrl: '/app/fees',
        actionLabel: 'View Dues',
        severity: 'warning',
      });
    }

    if (pendingSalaryStaffCount > 0) {
      needsAttention.push({
        id: 'pending-salary',
        category: 'PAYROLL',
        title: 'Pending Salary Payments',
        description: `${pendingSalaryStaffCount} staff member${pendingSalaryStaffCount === 1 ? '' : 's'} have unpaid or partial salary`,
        actionUrl: '/app/staff',
        actionLabel: 'View Payroll',
        severity: 'warning',
      });
    }

    return {
      school,
      subscription: subscriptionWidget,
      academicYear: activeAcademicYear
        ? {
          id: activeAcademicYear.id,
          name: activeAcademicYear.name,
          startDate: activeAcademicYear.startDate,
          endDate: activeAcademicYear.endDate,
          isCurrent: activeAcademicYear.isCurrent,
        }
        : null,
      metrics: {
        students: {
          total: totalStudentsCount,
          active: activeEnrolledStudentsCount || totalStudentsCount,
        },
        staff: {
          active: activeStaffCount,
          teaching: teachingStaffCount,
          nonTeaching: nonTeachingStaffCount,
        },
        pendingFees: {
          amount: pendingFeeAmount,
          studentsCount: pendingFeeStudentCount,
        },
        pendingSalary: {
          amount: pendingSalaryAmount,
          staffCount: pendingSalaryStaffCount,
        },
        financialBalance: {
          currentBalance: ledgerOverview.currentBalance,
          totalCredit: ledgerOverview.totalCredit,
          totalDebit: ledgerOverview.totalDebit,
        },
      },
      needsAttention,
      recentActivity: {
        feeCollections: recentFeePayments.map((p) => ({
          id: p.id,
          date: p.paymentDate,
          receiptNo: p.receiptNumber,
          studentName: p.student?.name || 'Student',
          admissionNo: p.student?.admissionNo || '-',
          amount: Number(p.receivedAmount),
          paymentMode: p.paymentMode,
        })),
        expenses: recentExpenses.map((e) => ({
          id: e.id,
          date: e.expenseDate,
          categoryName: e.category?.name || 'General',
          description: e.description || 'Expense Item',
          amount: Number(e.amount),
        })),
        salaryPayments: recentSalaryPayments.map((s) => ({
          id: s.id,
          date: s.paymentDate,
          staffName: s.staff?.name || 'Staff Member',
          month: (s.months || []).join(', ') || 'Current Month',
          amount: Number(s.netSalary),
          status: 'PAID',
        })),
      },
    };
    }, 30);
  },

  /**
   * Fetch daily fee collection summary and transactions list for a specific date
   * @param {string} schoolId
   * @param {object} query - { date, academicYearId }
   */
  async getTodayCollection(schoolId, query = {}) {
    const { academicYearId, date } = query;
    const { startOfDay, endOfDay, dateStr: formattedDateString } = getISTDayBounds(date);

    const paymentWhere = {
      schoolId,
      status: 'SUCCESS',
      paymentDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
      ...(academicYearId && { academicYearId }),
    };

    const [totalAggregate, modeGroup, studentGroup, paymentsList] = await Promise.all([
      prisma.feePayment.aggregate({
        where: paymentWhere,
        _sum: { receivedAmount: true },
        _count: { id: true },
      }),

      prisma.feePayment.groupBy({
        by: ['paymentMode'],
        where: paymentWhere,
        _sum: { receivedAmount: true },
        _count: { id: true },
      }),

      prisma.feePayment.groupBy({
        by: ['studentId'],
        where: paymentWhere,
      }),

      prisma.feePayment.findMany({
        where: paymentWhere,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              admissionNo: true,
              enrollments: {
                select: {
                  class: { select: { name: true } },
                  section: { select: { name: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
          receivedBy: { select: { id: true, name: true } },
        },
        orderBy: { paymentDate: 'desc' },
        take: 50,
      }),
    ]);

    const totalAmount = Number(totalAggregate._sum.receivedAmount || 0);
    const transactionCount = totalAggregate._count.id || 0;
    const studentCount = studentGroup.length;

    const modeBreakdown = modeGroup.map((mg) => ({
      mode: mg.paymentMode,
      amount: Number(mg._sum.receivedAmount || 0),
      count: mg._count.id,
    }));

    const payments = paymentsList.map((p) => {
      const enrollment = p.student?.enrollments?.[0];
      const className = enrollment?.class?.name || '';
      const sectionName = enrollment?.section?.name || '';
      const classSection = className ? (sectionName ? `${className} - ${sectionName}` : className) : '-';

      return {
        id: p.id,
        receiptNumber: p.receiptNumber,
        paymentDate: p.paymentDate,
        receivedAmount: Number(p.receivedAmount),
        paymentMode: p.paymentMode,
        transactionId: p.transactionId,
        remarks: p.remarks,
        studentName: p.student?.name || 'Student',
        admissionNo: p.student?.admissionNo || '-',
        classSection,
        receivedByName: p.receivedBy?.name || 'System',
      };
    });

    return {
      date: formattedDateString,
      totalAmount,
      transactionCount,
      studentCount,
      modeBreakdown,
      payments,
    };
  },
};

