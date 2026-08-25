import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { financialLedgerService } from '../finance/financialLedger.service.js';
import { getISTDayBounds } from '../../utils/dateUtils.js';

export const expenseService = {
  /**
   * Record a new expense. Automatically creates DEBIT / EXPENSE financial ledger entry inside atomic transaction.
   */
  async createExpense(schoolId, data, userId) {
    const {
      categoryId,
      expenseDate,
      amount,
      paymentMode = 'CASH',
      referenceNumber,
      referenceNo,
      description,
      academicYearId,
    } = data;

    const refNo = referenceNumber || referenceNo || null;

    if (!categoryId) {
      throw ApiError.badRequest('Expense category is required');
    }
    if (!amount || Number(amount) <= 0) {
      throw ApiError.badRequest('Expense amount must be greater than zero');
    }
    if (!expenseDate) {
      throw ApiError.badRequest('Expense date is required');
    }

    // Verify expense category exists and is active
    const category = await prisma.expenseCategory.findFirst({
      where: { id: categoryId, schoolId },
    });

    if (!category) {
      throw ApiError.notFound('Expense category not found.');
    }
    if (!category.isActive) {
      throw ApiError.badRequest(`Expense category "${category.name}" is inactive and cannot accept new expenses.`);
    }

    const decimalAmount = new Prisma.Decimal(amount);
    const dateVal = new Date(expenseDate);

    return await prisma.$transaction(async (tx) => {
      // 1. Create Expense record
      const expense = await tx.expense.create({
        data: {
          schoolId,
          academicYearId: academicYearId || null,
          categoryId,
          expenseDate: dateVal,
          amount: decimalAmount,
          description: description || null,
          paymentMode,
          paymentMethod: paymentMode === 'BANK_TRANSFER' ? 'BANK' : (['CASH', 'UPI', 'CARD', 'OTHER'].includes(paymentMode) ? paymentMode : 'OTHER'),
          referenceNo: refNo,
          status: 'ACTIVE',
          createdById: userId || null,
        },
        include: {
          category: true,
          academicYear: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });

      // 2. Create FinancialLedger DEBIT transaction
      const ledgerTxn = await financialLedgerService.createTransaction(tx, {
        schoolId,
        academicYearId: academicYearId || null,
        transactionDate: dateVal,
        type: 'DEBIT',
        sourceType: 'EXPENSE',
        sourceId: expense.id,
        amount: decimalAmount,
        paymentMode,
        referenceNumber: refNo,
        description: description || `Expense: ${category.name}`,
        createdById: userId || null,
      });

      return {
        expense: {
          ...expense,
          amount: Number(expense.amount),
        },
        financialTransactionId: ledgerTxn.id,
      };
    });
  },

  /**
   * Cancel/reverse an expense. Creates CREDIT reversal entry in the ledger. Immutable history is preserved.
   */
  async cancelExpense(schoolId, expenseId, reason, userId) {
    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, schoolId },
      include: { category: true },
    });

    if (!expense) {
      throw ApiError.notFound('Expense record not found.');
    }

    if (expense.status === 'CANCELLED') {
      throw ApiError.badRequest('Expense has already been cancelled.');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Update Expense status to CANCELLED
      const updatedExpense = await tx.expense.update({
        where: { id: expenseId },
        data: { status: 'CANCELLED' },
      });

      // 2. Find original ledger transaction
      const originalLedger = await tx.financialTransaction.findFirst({
        where: {
          schoolId,
          sourceType: 'EXPENSE',
          sourceId: expenseId,
          isReversal: false,
        },
      });

      let reversalTxn = null;
      if (originalLedger) {
        reversalTxn = await financialLedgerService.createReversalTransaction(
          tx,
          originalLedger,
          reason || 'Expense cancelled by administrator',
          userId
        );
      } else {
        // Fallback: create opposite CREDIT transaction directly
        reversalTxn = await financialLedgerService.createTransaction(tx, {
          schoolId,
          academicYearId: expense.academicYearId,
          transactionDate: new Date(),
          type: 'CREDIT',
          sourceType: 'EXPENSE',
          sourceId: expense.id,
          amount: expense.amount,
          paymentMode: expense.paymentMode,
          referenceNumber: expense.referenceNo,
          description: `REVERSAL: Expense cancelled - ${reason || 'Admin action'}`,
          isReversal: true,
          createdById: userId,
        });
      }

      // Record Audit Log
      await tx.auditLog.create({
        data: {
          schoolId,
          userId: userId || null,
          action: 'EXPENSE_CANCELLED',
          entityType: 'Expense',
          entityId: expenseId,
          oldValues: { status: 'ACTIVE', amount: Number(expense.amount) },
          newValues: { status: 'CANCELLED', reason: reason || 'Admin action' },
        },
      });

      return {
        success: true,
        message: 'Expense cancelled and ledger reversal recorded.',
        expense: {
          ...updatedExpense,
          amount: Number(updatedExpense.amount),
        },
        reversalTransactionId: reversalTxn?.id,
      };
    });
  },

  /**
   * List expenses with filters, pagination, and multi-field search.
   */
  async getExpenses(schoolId, query = {}) {
    const {
      categoryId,
      academicYearId,
      paymentMode,
      status,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 20,
    } = query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const where = { schoolId };

    if (categoryId) where.categoryId = categoryId;
    if (academicYearId) where.academicYearId = academicYearId;
    if (paymentMode) where.paymentMode = paymentMode;
    if (status) where.status = status;

    if (startDate || endDate) {
      where.expenseDate = {
        ...(startDate && { gte: getISTDayBounds(startDate).startOfDay }),
        ...(endDate && { lte: getISTDayBounds(endDate).endOfDay }),
      };
    }

    if (search && search.trim() !== '') {
      const term = search.trim();
      where.OR = [
        { description: { contains: term, mode: 'insensitive' } },
        { referenceNo: { contains: term, mode: 'insensitive' } },
        { category: { name: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [total, expenses] = await Promise.all([
      prisma.expense.count({ where }),
      prisma.expense.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          academicYear: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { expenseDate: 'desc' },
        skip,
        take: limitNum,
      }),
    ]);

    return {
      expenses: expenses.map((exp) => ({
        id: exp.id,
        expenseDate: exp.expenseDate,
        amount: Number(exp.amount),
        category: exp.category,
        paymentMode: exp.paymentMode,
        referenceNo: exp.referenceNo,
        description: exp.description,
        status: exp.status,
        academicYear: exp.academicYear,
        createdBy: exp.createdBy?.name,
        createdAt: exp.createdAt,
      })),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  },

  /**
   * Get detailed single expense.
   */
  async getExpenseById(schoolId, expenseId) {
    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, schoolId },
      include: {
        category: true,
        academicYear: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!expense) {
      throw ApiError.notFound('Expense record not found.');
    }

    return {
      ...expense,
      amount: Number(expense.amount),
    };
  },
};
