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
};
