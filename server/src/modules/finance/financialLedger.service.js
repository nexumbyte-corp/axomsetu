import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { getISTMonthBounds } from '../../utils/dateUtils.js';

export const financialLedgerService = {
  /**
   * Create an immutable financial ledger entry.
   * Ensures idempotency: duplicate (schoolId, sourceType, sourceId) calls are safely returned without duplication.
   */
  async createTransaction(txOrPrisma, data) {
    const client = txOrPrisma || prisma;
    const {
      schoolId,
      academicYearId,
      transactionDate,
      type,
      sourceType,
      sourceId,
      amount,
      paymentMode = 'CASH',
      referenceNumber,
      description,
      isReversal = false,
      reversedTransactionId,
      createdById,
    } = data;

    if (!schoolId) {
      throw ApiError.badRequest('School ID is required for financial transaction');
    }
    if (!type || !['CREDIT', 'DEBIT'].includes(type)) {
      throw ApiError.badRequest('Valid financial transaction type (CREDIT or DEBIT) is required');
    }
    if (!sourceType) {
      throw ApiError.badRequest('Financial source type is required');
    }

    const decimalAmount = new Prisma.Decimal(amount || 0);
    if (decimalAmount.lessThanOrEqualTo(0)) {
      throw ApiError.badRequest('Transaction amount must be greater than zero');
    }

    // Idempotency check: If sourceId is provided and not a reversal, check for existing entry
    if (sourceId && !isReversal) {
      const existing = await client.financialTransaction.findFirst({
        where: {
          schoolId,
          sourceType,
          sourceId,
          isReversal: false,
        },
      });

      if (existing) {
        return existing;
      }
    }

    const dateVal = transactionDate ? new Date(transactionDate) : new Date();

    const transaction = await client.financialTransaction.create({
      data: {
        schoolId,
        academicYearId: academicYearId || null,
        transactionDate: dateVal,
        type,
        sourceType,
        sourceId: sourceId || null,
        amount: decimalAmount,
        paymentMode,
        referenceNumber: referenceNumber || null,
        description: description || null,
        isReversal,
        reversedTransactionId: reversedTransactionId || null,
        createdById: createdById || null,
      },
    });

    return transaction;
  },

  /**
   * Create a reversal transaction for cancelling an existing ledger record.
   */
  async createReversalTransaction(txOrPrisma, originalTxn, reason, userId) {
    const client = txOrPrisma || prisma;
    const reversalType = originalTxn.type === 'CREDIT' ? 'DEBIT' : 'CREDIT';

    return await client.financialTransaction.create({
      data: {
        schoolId: originalTxn.schoolId,
        academicYearId: originalTxn.academicYearId,
        transactionDate: new Date(),
        type: reversalType,
        sourceType: originalTxn.sourceType,
        sourceId: originalTxn.sourceId,
        amount: originalTxn.amount,
        paymentMode: originalTxn.paymentMode,
        referenceNumber: originalTxn.referenceNumber,
        description: `REVERSAL: ${reason || 'Transaction cancelled'}`,
        isReversal: true,
        reversedTransactionId: originalTxn.id,
        createdById: userId || null,
      },
    });
  },

  /**
   * Calculate total credit, debit, current balance, and category breakdowns for overview dashboard.
   */
  async getOverview(schoolId, query = {}) {
    const { academicYearId, startDate, endDate } = query;

    const where = { schoolId };
    if (academicYearId) where.academicYearId = academicYearId;
    if (startDate || endDate) {
      where.transactionDate = {
        ...(startDate && { gte: new Date(`${startDate}T00:00:00.000+05:30`) }),
        ...(endDate && { lte: new Date(`${endDate}T23:59:59.999+05:30`) }),
      };
    }

    const { startOfMonth, endOfMonth } = getISTMonthBounds();

    const [creditsAgg, debitsAgg, sourceGroupAgg, monthGroupAgg] = await Promise.all([
      prisma.financialTransaction.aggregate({
        where: { ...where, type: 'CREDIT' },
        _sum: { amount: true },
      }),
      prisma.financialTransaction.aggregate({
        where: { ...where, type: 'DEBIT' },
        _sum: { amount: true },
      }),
      prisma.financialTransaction.groupBy({
        by: ['sourceType', 'type'],
        where,
        _sum: { amount: true },
      }),
      prisma.financialTransaction.groupBy({
        by: ['sourceType', 'type'],
        where: {
          schoolId,
          transactionDate: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { amount: true },
      }),
    ]);

    const totalCredit = Number(creditsAgg._sum.amount || 0);
    const totalDebit = Number(debitsAgg._sum.amount || 0);
    const currentBalance = totalCredit - totalDebit;

    // Map source breakdowns
    const breakdown = {
      feeCollection: 0,
      fundAdded: 0,
      advanceRecovery: 0,
      openingBalance: 0,
      otherCredit: 0,
      salaryPayment: 0,
      expense: 0,
      staffAdvance: 0,
      feeRefund: 0,
      otherDebit: 0,
    };

    for (const group of sourceGroupAgg) {
      const sumVal = Number(group._sum.amount || 0);
      switch (group.sourceType) {
        case 'FEE_COLLECTION':
          breakdown.feeCollection += sumVal;
          break;
        case 'FUND_ADDED':
          breakdown.fundAdded += sumVal;
          break;
        case 'ADVANCE_RECOVERY':
          breakdown.advanceRecovery += sumVal;
          break;
        case 'OPENING_BALANCE':
          breakdown.openingBalance += sumVal;
          break;
        case 'SALARY_PAYMENT':
          breakdown.salaryPayment += sumVal;
          break;
        case 'EXPENSE':
          breakdown.expense += sumVal;
          break;
        case 'STAFF_ADVANCE':
          breakdown.staffAdvance += sumVal;
          break;
        case 'FEE_REFUND':
          breakdown.feeRefund += sumVal;
          break;
        case 'OTHER':
          if (group.type === 'CREDIT') breakdown.otherCredit += sumVal;
          else breakdown.otherDebit += sumVal;
          break;
      }
    }

    const currentMonth = {
      feeCollection: 0,
      fundAdded: 0,
      advanceRecovery: 0,
      openingBalance: 0,
      otherCredit: 0,
      salaryPayment: 0,
      expense: 0,
      staffAdvance: 0,
      feeRefund: 0,
      otherDebit: 0,
      totalCredit: 0,
      totalDebit: 0,
      netFlow: 0,
    };

    for (const group of monthGroupAgg) {
      const sumVal = Number(group._sum.amount || 0);
      if (group.type === 'CREDIT') currentMonth.totalCredit += sumVal;
      if (group.type === 'DEBIT') currentMonth.totalDebit += sumVal;

      switch (group.sourceType) {
        case 'FEE_COLLECTION': currentMonth.feeCollection += sumVal; break;
        case 'FUND_ADDED': currentMonth.fundAdded += sumVal; break;
        case 'ADVANCE_RECOVERY': currentMonth.advanceRecovery += sumVal; break;
        case 'OPENING_BALANCE': currentMonth.openingBalance += sumVal; break;
        case 'SALARY_PAYMENT': currentMonth.salaryPayment += sumVal; break;
        case 'EXPENSE': currentMonth.expense += sumVal; break;
        case 'STAFF_ADVANCE': currentMonth.staffAdvance += sumVal; break;
        case 'FEE_REFUND': currentMonth.feeRefund += sumVal; break;
        case 'OTHER':
          if (group.type === 'CREDIT') currentMonth.otherCredit += sumVal;
          else currentMonth.otherDebit += sumVal;
          break;
      }
    }
    currentMonth.netFlow = currentMonth.totalCredit - currentMonth.totalDebit;

    return {
      totalCredit,
      totalDebit,
      currentBalance,
      breakdown,
      currentMonth,
    };
  },

  /**
   * Get paginated financial ledger transactions with multi-field search and filtering.
   */
  async getTransactions(schoolId, query = {}) {
    const {
      search,
      type,
      sourceType,
      paymentMode,
      startDate,
      endDate,
      academicYearId,
      page = 1,
      limit = 20,
    } = query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const where = { schoolId };
    if (academicYearId) where.academicYearId = academicYearId;
    if (type && ['CREDIT', 'DEBIT'].includes(type)) where.type = type;
    if (sourceType) where.sourceType = sourceType;
    if (paymentMode) where.paymentMode = paymentMode;

    if (startDate || endDate) {
      where.transactionDate = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(`${endDate}T23:59:59.999Z`) }),
      };
    }

    if (search && search.trim() !== '') {
      const term = search.trim();
      where.OR = [
        { referenceNumber: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { sourceType: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, txns] = await Promise.all([
      prisma.financialTransaction.count({ where }),
      prisma.financialTransaction.findMany({
        where,
        include: {
          academicYear: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: [
          { updatedAt: 'desc' },
          { createdAt: 'desc' },
          { transactionDate: 'desc' },
        ],
        skip,
        take: limitNum,
      }),
    ]);

    return {
      transactions: txns.map((t) => ({
        id: t.id,
        schoolId: t.schoolId,
        academicYear: t.academicYear,
        transactionDate: t.transactionDate,
        type: t.type,
        sourceType: t.sourceType,
        sourceId: t.sourceId,
        amount: Number(t.amount),
        paymentMode: t.paymentMode,
        referenceNumber: t.referenceNumber,
        description: t.description,
        isReversal: t.isReversal,
        reversedTransactionId: t.reversedTransactionId,
        createdBy: t.createdBy?.name,
        createdAt: t.createdAt,
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
   * Retrieve single financial transaction details.
   */
  async getTransactionById(schoolId, id) {
    const txn = await prisma.financialTransaction.findFirst({
      where: { id, schoolId },
      include: {
        academicYear: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!txn) {
      throw ApiError.notFound('Financial transaction not found.');
    }

    return {
      ...txn,
      amount: Number(txn.amount),
    };
  },

  /**
   * Record initial opening balance for cash/bank accounts.
   */
  async recordOpeningBalance(schoolId, data, userId) {
    const { amount, paymentMode = 'CASH', referenceNumber, remarks, transactionDate, academicYearId } = data;

    const decimalAmt = new Prisma.Decimal(amount || 0);
    if (decimalAmt.lessThanOrEqualTo(0)) {
      throw ApiError.badRequest('Opening balance amount must be greater than zero');
    }

    const txn = await this.createTransaction(prisma, {
      schoolId,
      academicYearId: academicYearId || null,
      transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
      type: 'CREDIT',
      sourceType: 'OPENING_BALANCE',
      amount: decimalAmt,
      paymentMode,
      referenceNumber: referenceNumber || null,
      description: remarks || `Initial Opening Balance (${paymentMode})`,
      createdById: userId,
    });

    return txn;
  },

  /**
   * Backfill historical Fee Payments, Salary Payments, Staff Advances, and Expenses into Unified Ledger.
   */
  async backfillHistoricalLedger(schoolId) {
    let feeCount = 0;
    let salaryCount = 0;
    let advanceRecoveryCount = 0;
    let staffAdvanceCount = 0;
    let expenseCount = 0;

    // Fetch existing ledger transactions in a single batch query for fast in-memory lookup
    const existingTxns = await prisma.financialTransaction.findMany({
      where: { schoolId },
      select: { sourceType: true, sourceId: true, isReversal: true },
    });
    const existingSet = new Set(
      existingTxns.filter((t) => t.sourceId).map((t) => `${t.sourceType}_${t.sourceId}_${t.isReversal}`)
    );

    const txnsToCreate = [];

    // 1. Fee Payments
    const feePayments = await prisma.feePayment.findMany({
      where: { schoolId, status: 'SUCCESS' },
    });

    for (const fp of feePayments) {
      const key = `FEE_COLLECTION_${fp.id}_false`;
      if (!existingSet.has(key)) {
        txnsToCreate.push({
          schoolId,
          academicYearId: fp.academicYearId,
          transactionDate: fp.paymentDate,
          type: 'CREDIT',
          sourceType: 'FEE_COLLECTION',
          sourceId: fp.id,
          amount: fp.receivedAmount,
          paymentMode: fp.paymentMode,
          referenceNumber: fp.receiptNumber || fp.referenceNumber,
          description: `Fee Collection (Receipt #${fp.receiptNumber})`,
          createdById: fp.receivedById,
        });
        existingSet.add(key);
        feeCount++;
      }
    }

    // 2. Salary Payments
    const salaryPayments = await prisma.salaryPayment.findMany({
      where: { schoolId },
      include: { staff: true },
    });

    for (const sp of salaryPayments) {
      const advDeducted = Number(sp.advanceDeducted || 0);
      const netSalary = Number(sp.netSalary || 0);
      const grossSalary = netSalary + advDeducted;

      const salKey = `SALARY_PAYMENT_${sp.id}_false`;
      if (!existingSet.has(salKey) && grossSalary > 0) {
        txnsToCreate.push({
          schoolId,
          academicYearId: sp.academicYearId,
          transactionDate: sp.paymentDate,
          type: 'DEBIT',
          sourceType: 'SALARY_PAYMENT',
          sourceId: sp.id,
          amount: new Prisma.Decimal(grossSalary),
          paymentMode: sp.paymentMode,
          referenceNumber: sp.paymentNumber || sp.referenceNo,
          description: `Salary Payment for ${sp.staff?.name || 'Staff'} (${(sp.months || []).join(', ')} ${sp.year})`,
          createdById: sp.createdById,
        });
        existingSet.add(salKey);
        salaryCount++;
      }

      if (advDeducted > 0) {
        const advRecKey = `ADVANCE_RECOVERY_${sp.id}_false`;
        if (!existingSet.has(advRecKey)) {
          txnsToCreate.push({
            schoolId,
            academicYearId: sp.academicYearId,
            transactionDate: sp.paymentDate,
            type: 'CREDIT',
            sourceType: 'ADVANCE_RECOVERY',
            sourceId: sp.id,
            amount: new Prisma.Decimal(advDeducted),
            paymentMode: sp.paymentMode,
            referenceNumber: sp.paymentNumber || sp.referenceNo,
            description: `Staff Advance Recovery via Payroll (${sp.staff?.name || 'Staff'})`,
            createdById: sp.createdById,
          });
          existingSet.add(advRecKey);
          advanceRecoveryCount++;
        }
      }
    }

    // 3. Staff Advances
    const [staffAdvances, academicYears] = await Promise.all([
      prisma.staffAdvance.findMany({
        where: { schoolId },
        include: { staff: true },
      }),
      prisma.academicYear.findMany({
        where: { schoolId },
        orderBy: { startDate: 'asc' },
      }),
    ]);

    for (const sa of staffAdvances) {
      const saKey = `STAFF_ADVANCE_${sa.id}_false`;
      const saDate = new Date(sa.advanceDate);
      const matchedAy = academicYears.find(
        (ay) => saDate >= new Date(ay.startDate) && saDate <= new Date(ay.endDate)
      );
      const ayId = matchedAy ? matchedAy.id : (academicYears[academicYears.length - 1]?.id || null);

      if (!existingSet.has(saKey)) {
        txnsToCreate.push({
          schoolId,
          academicYearId: ayId,
          transactionDate: sa.advanceDate,
          type: 'DEBIT',
          sourceType: 'STAFF_ADVANCE',
          sourceId: sa.id,
          amount: sa.amount,
          paymentMode: sa.paymentMode,
          referenceNumber: sa.referenceNo,
          description: `Staff Advance Disbursed to ${sa.staff?.name || 'Staff'}`,
        });
        existingSet.add(saKey);
        staffAdvanceCount++;
      }
    }

    // 4. Expenses
    const expenses = await prisma.expense.findMany({
      where: { schoolId, status: 'ACTIVE' },
      include: { category: true },
    });

    for (const exp of expenses) {
      const expKey = `EXPENSE_${exp.id}_false`;
      if (!existingSet.has(expKey)) {
        txnsToCreate.push({
          schoolId,
          academicYearId: exp.academicYearId,
          transactionDate: exp.expenseDate,
          type: 'DEBIT',
          sourceType: 'EXPENSE',
          sourceId: exp.id,
          amount: exp.amount,
          paymentMode: exp.paymentMode || exp.paymentMethod || 'CASH',
          referenceNumber: exp.referenceNo,
          description: exp.description || `Expense: ${exp.category?.name || 'General'}`,
          createdById: exp.createdById,
        });
        existingSet.add(expKey);
        expenseCount++;
      }
    }

    // Bulk insert transactions in chunks of 500
    const chunkSize = 500;
    for (let i = 0; i < txnsToCreate.length; i += chunkSize) {
      const chunk = txnsToCreate.slice(i, i + chunkSize);
      await prisma.financialTransaction.createMany({
        data: chunk,
        skipDuplicates: true,
      });
    }

    return {
      message: 'Historical financial ledger backfill completed successfully.',
      backfilled: {
        feePayments: feeCount,
        salaryPayments: salaryCount,
        advanceRecoveries: advanceRecoveryCount,
        staffAdvances: staffAdvanceCount,
        expenses: expenseCount,
      },
    };
  },
};
