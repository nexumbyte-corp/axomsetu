import { prisma } from '../../config/prisma.js';
import { Prisma } from '@prisma/client';
import { memoryCache } from '../../utils/cache.js';
import { getISTDayBounds, parseDateOnlyToUtc } from '../../utils/dateUtils.js';

export const dashboardService = {
  /**
   * Calculate and aggregate all operational dashboard metrics for a school.
   * High-performance implementation:
   * - PostgreSQL aggregate grouping for monthly fees (12 rows vs full-table dump)
   * - Single-query distinct count + dues calculation for pending fees & salaries
   * - Direct SQL continuous ledger balance calculation
   * - Cached for 30 seconds to provide lightning-fast concurrent page loads
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

      // Dynamic Academic Year filters for raw queries
      const ayFilterCharges = academicYearId ? Prisma.sql`AND academic_year_id = ${academicYearId}::uuid` : Prisma.empty;
      const ayFilterPayroll = academicYearId ? Prisma.sql`AND academic_year_id = ${academicYearId}::uuid` : Prisma.empty;
      const ayFilterPayments = academicYearId ? Prisma.sql`AND academic_year_id = ${academicYearId}::uuid` : Prisma.empty;

      // 2. Parallel optimized queries
      const [
        totalStudentsCount,
        activeEnrolledStudentsCount,
        activeStaffCount,
        teachingStaffCount,
        feeStatsResult,
        payrollStatsResult,
        ledgerStatsResult,
        recentFeePayments,
        recentExpenses,
        recentSalaryPayments,
        latestSubscription,
        monthlyAggregates,
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

        // Pending Fee calculation (amount dues + distinct students in 1 fast query)
        prisma.$queryRaw`
          SELECT 
            COALESCE(SUM(amount - paid_amount), 0)::FLOAT AS "pendingAmount",
            COUNT(DISTINCT student_id)::INT AS "studentCount"
          FROM student_fee_charges
          WHERE school_id = ${schoolId}::uuid
            AND status IN ('UNPAID', 'PARTIAL')
            ${ayFilterCharges}
        `,

        // Pending Salary calculation (net salary dues + distinct staff in 1 fast query)
        prisma.$queryRaw`
          SELECT 
            COALESCE(SUM(net_salary - paid_amount), 0)::FLOAT AS "pendingAmount",
            COUNT(DISTINCT staff_id)::INT AS "staffCount"
          FROM monthly_payrolls
          WHERE school_id = ${schoolId}::uuid
            AND status IN ('UNPAID', 'PARTIAL')
            ${ayFilterPayroll}
        `,

        // Continuous Financial Ledger balance (credit & debit in 1 fast query)
        prisma.$queryRaw`
          SELECT 
            COALESCE(SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END), 0)::FLOAT AS "totalCredit",
            COALESCE(SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END), 0)::FLOAT AS "totalDebit"
          FROM financial_transactions
          WHERE school_id = ${schoolId}::uuid
        `,

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

        // Latest School Subscription
        prisma.schoolSubscription.findFirst({
          where: { schoolId },
          orderBy: { createdAt: 'desc' },
        }),

        // Monthly fee collections grouped directly in PostgreSQL (max 12 rows, zero memory bloat)
        prisma.$queryRaw`
          SELECT 
            TO_CHAR(payment_date, 'YYYY-MM') AS "monthKey",
            COALESCE(SUM(received_amount), 0)::FLOAT AS "totalAmount",
            COUNT(id)::INT AS "count"
          FROM fee_payments
          WHERE school_id = ${schoolId}::uuid
            AND status = 'SUCCESS'
            AND payment_date <= ${now}
            ${ayFilterPayments}
          GROUP BY TO_CHAR(payment_date, 'YYYY-MM')
        `,
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
      const feeRow = feeStatsResult?.[0] || { pendingAmount: 0, studentCount: 0 };
      const pendingFeeAmount = Math.max(0, Number(feeRow.pendingAmount || 0));
      const pendingFeeStudentCount = Number(feeRow.studentCount || 0);

      // Format pending salary values
      const payrollRow = payrollStatsResult?.[0] || { pendingAmount: 0, staffCount: 0 };
      const pendingSalaryAmount = Math.max(0, Number(payrollRow.pendingAmount || 0));
      const pendingSalaryStaffCount = Number(payrollRow.staffCount || 0);

      // Financial balance values
      const ledgerRow = ledgerStatsResult?.[0] || { totalCredit: 0, totalDebit: 0 };
      const totalCredit = Number(ledgerRow.totalCredit || 0);
      const totalDebit = Number(ledgerRow.totalDebit || 0);
      const currentBalance = totalCredit - totalDebit;

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

      // Aggregate monthly collections up to current month (strictly no future months)
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      let startMonthDate = activeAcademicYear?.startDate ? new Date(activeAcademicYear.startDate) : new Date(now.getFullYear(), 0, 1);
      if (isNaN(startMonthDate.getTime()) || startMonthDate > now) {
        startMonthDate = new Date(now.getFullYear(), 0, 1);
      }

      const monthlyCollectionSlots = [];
      const currentCursor = new Date(startMonthDate.getFullYear(), startMonthDate.getMonth(), 1);
      const endMonthCutoff = new Date(now.getFullYear(), now.getMonth(), 1);

      while (currentCursor <= endMonthCutoff) {
        const year = currentCursor.getFullYear();
        const monthIdx = currentCursor.getMonth();
        const label = monthNames[monthIdx];
        const monthKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;

        monthlyCollectionSlots.push({
          key: monthKey,
          label,
          fullLabel: `${label} ${year}`,
          year,
          monthIndex: monthIdx,
          totalAmount: 0,
          count: 0,
        });

        currentCursor.setMonth(currentCursor.getMonth() + 1);
      }

      // Map the PostgreSQL grouped monthly aggregates into slots in O(N) where N <= 12
      if (monthlyAggregates && monthlyAggregates.length > 0) {
        const slotMap = new Map(monthlyCollectionSlots.map((s) => [s.key, s]));

        for (const row of monthlyAggregates) {
          const slot = slotMap.get(row.monthKey);
          if (slot) {
            slot.totalAmount = Number(row.totalAmount || 0);
            slot.count = Number(row.count || 0);
          }
        }
      }

      return {
        school,
        subscription: subscriptionWidget,
        monthlyCollections: monthlyCollectionSlots.map(({ key, ...rest }) => rest),
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
            currentBalance,
            totalCredit,
            totalDebit,
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
   * Cached for 15 seconds to eliminate repeated queries on date switching
   * @param {string} schoolId
   * @param {object} query - { date, academicYearId }
   */
  async getDailyCollection(schoolId, query = {}) {
    const { academicYearId, date } = query;
    const { startOfDay, endOfDay, dateStr: formattedDateString } = getISTDayBounds(date);
    const cacheKey = `dashboard:daily-col:${schoolId}:${formattedDateString}:${academicYearId || 'default'}`;

    return await memoryCache.getOrSet(cacheKey, async () => {
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

      const expenses = await this.getDailyExpenses(schoolId, query);

      return {
        date: formattedDateString,
        totalAmount,
        transactionCount,
        studentCount,
        modeBreakdown,
        payments,
        expenses,
      };
    }, 15);
  },

  /**
   * Fetch daily expenses summary and vouchers list for a specific date
   * Cached for 15 seconds to eliminate repeated queries
   * @param {string} schoolId
   * @param {object} query - { date, academicYearId }
   */
  async getDailyExpenses(schoolId, query = {}) {
    const { academicYearId, date } = query;
    const { startOfDay, endOfDay, dateStr: formattedDateString } = getISTDayBounds(date);
    const cacheKey = `dashboard:daily-exp:${schoolId}:${formattedDateString}:${academicYearId || 'default'}`;

    return await memoryCache.getOrSet(cacheKey, async () => {
      const targetDateUtc = parseDateOnlyToUtc(formattedDateString);

      const expenseWhere = {
        schoolId,
        status: 'ACTIVE',
        ...(targetDateUtc && { expenseDate: targetDateUtc }),
        ...(academicYearId && { academicYearId }),
      };

      const [totalAggregate, modeGroup, categoryGroup, expensesList] = await Promise.all([
        prisma.expense.aggregate({
          where: expenseWhere,
          _sum: { amount: true },
          _count: { id: true },
        }),

        prisma.expense.groupBy({
          by: ['paymentMode'],
          where: expenseWhere,
          _sum: { amount: true },
          _count: { id: true },
        }),

        prisma.expense.groupBy({
          by: ['categoryId'],
          where: expenseWhere,
        }),

        prisma.expense.findMany({
          where: expenseWhere,
          include: {
            category: { select: { id: true, name: true } },
            createdBy: { select: { id: true, name: true } },
          },
          orderBy: { expenseDate: 'desc' },
          take: 50,
        }),
      ]);

      const totalAmount = Number(totalAggregate._sum.amount || 0);
      const expenseCount = totalAggregate._count.id || 0;
      const categoryCount = categoryGroup.length;

      const modeBreakdown = modeGroup.map((mg) => ({
        mode: mg.paymentMode,
        amount: Number(mg._sum.amount || 0),
        count: mg._count.id,
      }));

      const expenses = expensesList.map((e) => ({
        id: e.id,
        expenseDate: e.expenseDate,
        amount: Number(e.amount),
        paymentMode: e.paymentMode,
        categoryName: e.category?.name || 'General',
        referenceNo: e.referenceNo || '-',
        description: e.description || '',
        createdByName: e.createdBy?.name || 'System',
      }));

      return {
        date: formattedDateString,
        totalAmount,
        expenseCount,
        categoryCount,
        modeBreakdown,
        expenses,
      };
    }, 15);
  },

  async getTodayCollection(schoolId, query = {}) {
    return this.getDailyCollection(schoolId, query);
  },
};


