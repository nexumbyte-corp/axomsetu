import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { getISTDayBounds } from '../../utils/dateUtils.js';

const SOURCE_TYPE_LABELS = {
  FEE_COLLECTION: 'Fee Collection',
  FUND_ADDED: 'Fund Contribution',
  SALARY_PAYMENT: 'Salary Disbursement',
  EXPENSE: 'School Expenditure',
  STAFF_ADVANCE: 'Staff Advance Issued',
  ADVANCE_RECOVERY: 'Salary Advance Recovery',
  FEE_REFUND: 'Fee Refund',
  OPENING_BALANCE: 'Opening Balance',
  OTHER: 'Other Transaction',
};

export const financeReportsService = {
  /**
   * Financial Summary Report with source breakdown
   */
  async getFinancialSummary(schoolId, query = {}) {
    const { startDate, endDate, academicYearId } = query;

    const whereClause = {
      schoolId,
    };
    if (academicYearId) {
      whereClause.OR = [
        { academicYearId },
        { sourceType: 'OPENING_BALANCE' }
      ];
    }

    if (startDate || endDate) {
      whereClause.transactionDate = {
        ...(startDate && { gte: getISTDayBounds(startDate).startOfDay }),
        ...(endDate && { lte: getISTDayBounds(endDate).endOfDay }),
      };
    }

    const txns = await prisma.financialTransaction.findMany({
      where: whereClause,
      select: {
        type: true,
        sourceType: true,
        amount: true,
      },
    });

    let totalCredit = new Prisma.Decimal(0);
    let totalDebit = new Prisma.Decimal(0);

    const creditBreakdown = {
      FEE_COLLECTION: 0,
      FUND_ADDED: 0,
      ADVANCE_RECOVERY: 0,
      OPENING_BALANCE: 0,
      OTHER: 0,
    };

    const debitBreakdown = {
      SALARY_PAYMENT: 0,
      EXPENSE: 0,
      STAFF_ADVANCE: 0,
      FEE_REFUND: 0,
      OTHER: 0,
    };

    for (const t of txns) {
      const amt = new Prisma.Decimal(t.amount);

      if (t.type === 'CREDIT') {
        totalCredit = totalCredit.plus(amt);
        if (creditBreakdown[t.sourceType] !== undefined) {
          creditBreakdown[t.sourceType] += Number(amt);
        } else {
          creditBreakdown.OTHER += Number(amt);
        }
      } else if (t.type === 'DEBIT') {
        totalDebit = totalDebit.plus(amt);
        if (debitBreakdown[t.sourceType] !== undefined) {
          debitBreakdown[t.sourceType] += Number(amt);
        } else {
          debitBreakdown.OTHER += Number(amt);
        }
      }
    }

    const netBalance = totalCredit.minus(totalDebit);

    return {
      summary: {
        totalCredit: Number(totalCredit),
        totalDebit: Number(totalDebit),
        netBalance: Number(netBalance),
        creditBreakdown,
        debitBreakdown,
      },
    };
  },

  /**
   * Financial Transaction Ledger Report
   */
  async getTransactionReport(schoolId, query = {}) {
    const { startDate, endDate, type, sourceType, paymentMode, academicYearId, page = 1, limit = 20 } = query;

    const skip = (Number(page) - 1) * Number(limit);

    const whereClause = {
      schoolId,
      ...(academicYearId && { academicYearId }),
      ...(type && { type }),
      ...(sourceType && { sourceType }),
      ...(paymentMode && { paymentMode }),
    };

    if (startDate || endDate) {
      whereClause.transactionDate = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }

    const [total, txns] = await Promise.all([
      prisma.financialTransaction.count({ where: whereClause }),
      prisma.financialTransaction.findMany({
        where: whereClause,
        include: {
          createdBy: { select: { name: true } },
        },
        orderBy: { transactionDate: 'desc' },
        skip,
        take: Number(limit),
      }),
    ]);

    const data = txns.map((t) => ({
      id: t.id,
      date: t.transactionDate,
      description: t.description || '-',
      sourceType: SOURCE_TYPE_LABELS[t.sourceType] || t.sourceType || 'Other',
      type: t.type,
      paymentMode: t.paymentMode,
      referenceNumber: t.referenceNumber || '-',
      amount: Number(t.amount),
      createdBy: t.createdBy?.name || 'System',
    }));

    return {
      data,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
      summary: {
        totalTransactions: total,
      },
    };
  },

  /**
   * Expense Report with Category Breakdown
   */
  async getExpenseReport(schoolId, query = {}) {
    const { startDate, endDate, categoryId, paymentMode, academicYearId } = query;

    const expenseWhere = {
      schoolId,
      status: 'ACTIVE',
      ...(academicYearId && { academicYearId }),
      ...(categoryId && { categoryId }),
      ...(paymentMode && { paymentMode }),
    };

    if (startDate || endDate) {
      expenseWhere.expenseDate = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }

    const expenses = await prisma.expense.findMany({
      where: expenseWhere,
      include: {
        category: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { expenseDate: 'desc' },
    });

    const categorySummary = {};
    let totalExpense = new Prisma.Decimal(0);

    const data = expenses.map((e) => {
      const amt = new Prisma.Decimal(e.amount);
      const catName = e.category?.name || 'Uncategorized';

      totalExpense = totalExpense.plus(amt);
      categorySummary[catName] = (categorySummary[catName] || 0) + Number(amt);

      return {
        id: e.id,
        date: e.expenseDate,
        category: catName,
        description: e.description || '-',
        paymentMode: e.paymentMode || e.paymentMethod,
        referenceNo: e.referenceNo || '-',
        amount: Number(amt),
        createdBy: e.createdBy?.name || 'System',
      };
    });

    return {
      data,
      summary: {
        totalExpense: Number(totalExpense),
        categoryBreakdown: categorySummary,
      },
    };
  },

  /**
   * Fund Contribution Report
   */
  async getFundReport(schoolId, query = {}) {
    const { startDate, endDate, fundSourceId, paymentMode, academicYearId } = query;

    const fundWhere = {
      schoolId,
      status: 'ACTIVE',
      ...(academicYearId && { academicYearId }),
      ...(fundSourceId && { fundSourceId }),
      ...(paymentMode && { paymentMode }),
    };

    if (startDate || endDate) {
      fundWhere.transactionDate = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }

    const funds = await prisma.fundTransaction.findMany({
      where: fundWhere,
      include: {
        fundSource: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { transactionDate: 'desc' },
    });

    let totalFundAdded = new Prisma.Decimal(0);

    const data = funds.map((f) => {
      const amt = new Prisma.Decimal(f.amount);
      totalFundAdded = totalFundAdded.plus(amt);

      return {
        id: f.id,
        date: f.transactionDate,
        fundSource: f.fundSource?.name || 'External Fund',
        amount: Number(amt),
        paymentMode: f.paymentMode,
        referenceNumber: f.referenceNumber || '-',
        remarks: f.remarks || '-',
        createdBy: f.createdBy?.name || 'System',
      };
    });

    return {
      data,
      summary: {
        totalFundContribution: Number(totalFundAdded),
        transactionCount: data.length,
      },
    };
  },

  /**
   * Cash / Payment Mode Movement Summary
   */
  async getPaymentModeSummary(schoolId, query = {}) {
    const { startDate, endDate, academicYearId } = query;

    const whereClause = {
      schoolId,
      ...(academicYearId && { academicYearId }),
    };
    if (startDate || endDate) {
      whereClause.transactionDate = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }

    const txns = await prisma.financialTransaction.findMany({
      where: whereClause,
      select: {
        type: true,
        paymentMode: true,
        amount: true,
      },
    });

    const modes = ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'DEMAND_DRAFT', 'OTHER'];
    const summary = {};

    for (const m of modes) {
      summary[m] = { credit: 0, debit: 0, netMovement: 0 };
    }

    for (const t of txns) {
      const m = t.paymentMode || 'OTHER';
      if (!summary[m]) {
        summary[m] = { credit: 0, debit: 0, netMovement: 0 };
      }
      const amt = Number(t.amount);
      if (t.type === 'CREDIT') {
        summary[m].credit += amt;
        summary[m].netMovement += amt;
      } else if (t.type === 'DEBIT') {
        summary[m].debit += amt;
        summary[m].netMovement -= amt;
      }
    }

    return {
      data: summary,
    };
  },

  /**
   * Financial Analytics Charts Report with strict scope rules:
   * Student/Fee Analytics: Academic Year -> Class -> Medium -> Stream -> Month
   * School Expense Analytics: Academic Year -> Month
   */
  async getFinancialChartsReport(schoolId, query = {}) {
    const { academicYearId, classId, mediumId, streamId, month } = query;

    // 1. Fetch Target Academic Year
    let targetYear = null;
    if (academicYearId) {
      targetYear = await prisma.academicYear.findFirst({
        where: { id: academicYearId, schoolId },
      });
    }
    if (!targetYear) {
      targetYear =
        (await prisma.academicYear.findFirst({
          where: { schoolId, isCurrent: true },
        })) ||
        (await prisma.academicYear.findFirst({
          where: { schoolId },
          orderBy: { startDate: 'desc' },
        }));
    }

    const yearId = targetYear?.id;

    const enumMonths = [
      'JANUARY',
      'FEBRUARY',
      'MARCH',
      'APRIL',
      'MAY',
      'JUNE',
      'JULY',
      'AUGUST',
      'SEPTEMBER',
      'OCTOBER',
      'NOVEMBER',
      'DECEMBER',
    ];

    const monthLabels = {
      JANUARY: 'Jan',
      FEBRUARY: 'Feb',
      MARCH: 'Mar',
      APRIL: 'Apr',
      MAY: 'May',
      JUNE: 'Jun',
      JULY: 'Jul',
      AUGUST: 'Aug',
      SEPTEMBER: 'Sep',
      OCTOBER: 'Oct',
      NOVEMBER: 'Nov',
      DECEMBER: 'Dec',
    };

    // Dynamically derive academic month sequence from targetYear.startDate & targetYear.endDate
    const academicMonths = [];
    const monthFullLabels = {};

    if (targetYear?.startDate && targetYear?.endDate) {
      const start = new Date(targetYear.startDate);
      const end = new Date(targetYear.endDate);

      let cur = new Date(start.getFullYear(), start.getMonth(), 1);
      const endMonthObj = new Date(end.getFullYear(), end.getMonth(), 1);

      while (cur <= endMonthObj) {
        const mIdx = cur.getMonth();
        const mKey = enumMonths[mIdx];
        const yearNum = cur.getFullYear();

        if (!academicMonths.includes(mKey)) {
          academicMonths.push(mKey);
        }
        monthFullLabels[mKey] = `${monthLabels[mKey]} ${yearNum}`;

        cur.setMonth(cur.getMonth() + 1);
      }
    }

    if (academicMonths.length === 0) {
      const defaultSequence = [
        'APRIL',
        'MAY',
        'JUNE',
        'JULY',
        'AUGUST',
        'SEPTEMBER',
        'OCTOBER',
        'NOVEMBER',
        'DECEMBER',
        'JANUARY',
        'FEBRUARY',
        'MARCH',
      ];
      const startYr = targetYear?.startDate
        ? new Date(targetYear.startDate).getFullYear()
        : new Date().getFullYear();

      defaultSequence.forEach((mKey, idx) => {
        academicMonths.push(mKey);
        const yr = idx >= 9 ? startYr + 1 : startYr;
        monthFullLabels[mKey] = `${monthLabels[mKey]} ${yr}`;
      });
    }

    const getFullMonthLabel = (mKey) => {
      return monthFullLabels[mKey] || `${monthLabels[mKey] || mKey}`;
    };

    // 2. Student/Fee Charge Where Clause (Expected Collection)
    const feeChargeWhere = {
      schoolId,
      status: { not: 'VOID' },
      ...(yearId && { academicYearId: yearId }),
    };

    if (classId || mediumId || streamId) {
      feeChargeWhere.studentEnrollment = {
        ...(classId && { classId }),
        ...(mediumId && { mediumId }),
        ...(streamId && { streamId }),
      };
    }

    // 3. Payment Allocation Where Clause (Actual Collection)
    const paymentAllocWhere = {
      payment: {
        schoolId,
        status: 'SUCCESS',
        ...(yearId && { academicYearId: yearId }),
      },
      charge: {
        schoolId,
        status: { not: 'VOID' },
        ...(yearId && { academicYearId: yearId }),
        ...(classId || mediumId || streamId
          ? {
              studentEnrollment: {
                ...(classId && { classId }),
                ...(mediumId && { mediumId }),
                ...(streamId && { streamId }),
              },
            }
          : {}),
      },
    };

    // 4. Expense Where Clause (School Expenses: Academic Year + Month ONLY)
    const expenseWhere = {
      schoolId,
      status: 'ACTIVE',
      ...(yearId && { academicYearId: yearId }),
    };

    // Execute queries in parallel
    const [charges, allocations, expenses] = await Promise.all([
      prisma.studentFeeCharge.findMany({
        where: feeChargeWhere,
        select: {
          id: true,
          month: true,
          amount: true,
          discountAmount: true,
        },
      }),
      prisma.paymentAllocation.findMany({
        where: paymentAllocWhere,
        select: {
          id: true,
          allocatedAmount: true,
          charge: {
            select: {
              month: true,
            },
          },
        },
      }),
      prisma.expense.findMany({
        where: expenseWhere,
        include: {
          category: { select: { id: true, name: true } },
        },
      }),
    ]);

    // Aggregate monthly metrics
    const monthlyExpected = {};
    const monthlyActual = {};
    const monthlyExpense = {};

    academicMonths.forEach((m) => {
      monthlyExpected[m] = new Prisma.Decimal(0);
      monthlyActual[m] = new Prisma.Decimal(0);
      monthlyExpense[m] = new Prisma.Decimal(0);
    });

    // Sum charges (Expected Collection)
    charges.forEach((c) => {
      if (c.month && monthlyExpected[c.month] !== undefined) {
        const netAmt = new Prisma.Decimal(c.amount).minus(new Prisma.Decimal(c.discountAmount || 0));
        monthlyExpected[c.month] = monthlyExpected[c.month].plus(Prisma.Decimal.max(new Prisma.Decimal(0), netAmt));
      }
    });

    // Sum allocations (Actual Collection)
    allocations.forEach((a) => {
      const m = a.charge?.month;
      if (m && monthlyActual[m] !== undefined) {
        monthlyActual[m] = monthlyActual[m].plus(new Prisma.Decimal(a.allocatedAmount));
      }
    });

    // Sum expenses (School Expenses)
    expenses.forEach((e) => {
      if (e.expenseDate) {
        const dateObj = new Date(e.expenseDate);
        const monthIndex = dateObj.getMonth();
        const mKey = enumMonths[monthIndex];
        if (mKey && monthlyExpense[mKey] !== undefined) {
          monthlyExpense[mKey] = monthlyExpense[mKey].plus(new Prisma.Decimal(e.amount));
        }
      }
    });

    // Selected month normalization
    const normalizedMonth = month && month !== 'ALL' ? String(month).toUpperCase() : 'ALL';

    // Build Monthly Chart Data
    const monthlyChartData = academicMonths.map((mKey) => {
      const expDecimal = monthlyExpected[mKey] || new Prisma.Decimal(0);
      const actDecimal = monthlyActual[mKey] || new Prisma.Decimal(0);
      const exDecimal = monthlyExpense[mKey] || new Prisma.Decimal(0);

      const isSelected = normalizedMonth === 'ALL' || normalizedMonth === mKey;

      return {
        month: mKey,
        label: monthLabels[mKey],
        fullLabel: getFullMonthLabel(mKey),
        expectedCollection: Number(expDecimal),
        actualCollection: Number(actDecimal),
        expense: Number(exDecimal),
        isSelected,
      };
    });

    // Expense Distribution (by ExpenseCategory for selected month / all months)
    const categoryTotals = {};
    let totalExpenseForPeriod = new Prisma.Decimal(0);

    expenses.forEach((e) => {
      if (e.expenseDate) {
        const dateObj = new Date(e.expenseDate);
        const monthIndex = dateObj.getMonth();
        const mKey = enumMonths[monthIndex];

        if (normalizedMonth === 'ALL' || normalizedMonth === mKey) {
          const amtDecimal = new Prisma.Decimal(e.amount);
          const catName = e.category?.name || 'Uncategorized';

          totalExpenseForPeriod = totalExpenseForPeriod.plus(amtDecimal);
          categoryTotals[catName] = (categoryTotals[catName] || new Prisma.Decimal(0)).plus(amtDecimal);
        }
      }
    });

    const expenseDistribution = Object.entries(categoryTotals)
      .map(([catName, amtDecimal]) => {
        const amt = Number(amtDecimal);
        const total = Number(totalExpenseForPeriod);
        const percentage = total > 0 ? Number(((amt / total) * 100).toFixed(1)) : 0;
        return {
          categoryName: catName,
          amount: amt,
          percentage,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    // Summary Cards Calculation
    let totalExpected = new Prisma.Decimal(0);
    let totalActual = new Prisma.Decimal(0);
    let totalExpenseSummary = totalExpenseForPeriod;

    academicMonths.forEach((mKey) => {
      if (normalizedMonth === 'ALL' || normalizedMonth === mKey) {
        totalExpected = totalExpected.plus(monthlyExpected[mKey] || 0);
        totalActual = totalActual.plus(monthlyActual[mKey] || 0);
      }
    });

    const netCollection = totalActual.minus(totalExpenseSummary);
    const outstandingDues = Prisma.Decimal.max(new Prisma.Decimal(0), totalExpected.minus(totalActual));

    const totalExpNum = Number(totalExpected);
    const totalActNum = Number(totalActual);
    const collectionRate = totalExpNum > 0 ? Number(((totalActNum / totalExpNum) * 100).toFixed(1)) : 0;

    const hasData = totalExpNum > 0 || totalActNum > 0 || Number(totalExpenseSummary) > 0;

    return {
      academicYear: {
        id: targetYear?.id,
        name: targetYear?.name,
        startDate: targetYear?.startDate,
        endDate: targetYear?.endDate,
      },
      selectedFilters: {
        academicYearId: yearId,
        classId: classId || null,
        mediumId: mediumId || null,
        streamId: streamId || null,
        month: normalizedMonth,
      },
      summaryCards: {
        expectedCollection: totalExpNum,
        actualCollection: totalActNum,
        totalExpense: Number(totalExpenseSummary),
        netBalance: Number(netCollection),
        outstandingDues: Number(outstandingDues),
        collectionRate,
        hasData,
      },
      monthlyChartData,
      expenseDistribution,
    };
  },
};

