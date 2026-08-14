import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { financialLedgerService } from '../finance/financialLedger.service.js';

export const fundService = {
  /**
   * Add new fund contribution to school. Automatically creates CREDIT / FUND_ADDED financial ledger entry inside atomic transaction.
   */
  async addFund(schoolId, data, userId) {
    const {
      fundSourceId,
      transactionDate,
      amount,
      paymentMode = 'BANK_TRANSFER',
      referenceNumber,
      remarks,
      academicYearId,
    } = data;

    if (!fundSourceId) {
      throw ApiError.badRequest('Fund source is required');
    }
    if (!amount || Number(amount) <= 0) {
      throw ApiError.badRequest('Fund amount must be greater than zero');
    }
    if (!transactionDate) {
      throw ApiError.badRequest('Transaction date is required');
    }

    // Verify fund source exists and is active
    const fundSource = await prisma.fundSource.findFirst({
      where: { id: fundSourceId, schoolId },
    });

    if (!fundSource) {
      throw ApiError.notFound('Fund source not found.');
    }
    if (!fundSource.isActive) {
      throw ApiError.badRequest(`Fund source "${fundSource.name}" is inactive and cannot accept new funds.`);
    }

    const decimalAmount = new Prisma.Decimal(amount);
    const dateVal = new Date(transactionDate);

    return await prisma.$transaction(async (tx) => {
      // 1. Create FundTransaction record
      const fundTxn = await tx.fundTransaction.create({
        data: {
          schoolId,
          academicYearId: academicYearId || null,
          fundSourceId,
          transactionDate: dateVal,
          amount: decimalAmount,
          paymentMode,
          referenceNumber: referenceNumber || null,
          remarks: remarks || null,
          status: 'ACTIVE',
          createdById: userId || null,
        },
        include: {
          fundSource: true,
          academicYear: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });

      // 2. Create FinancialLedger CREDIT transaction
      const ledgerTxn = await financialLedgerService.createTransaction(tx, {
        schoolId,
        academicYearId: academicYearId || null,
        transactionDate: dateVal,
        type: 'CREDIT',
        sourceType: 'FUND_ADDED',
        sourceId: fundTxn.id,
        amount: decimalAmount,
        paymentMode,
        referenceNumber: referenceNumber || null,
        description: remarks || `Fund Added: ${fundSource.name}`,
        createdById: userId || null,
      });

      return {
        fundTransaction: {
          ...fundTxn,
          amount: Number(fundTxn.amount),
        },
        financialTransactionId: ledgerTxn.id,
      };
    });
  },

  /**
   * Cancel/reverse a fund addition. Creates DEBIT reversal entry in the ledger.
   */
  async cancelFund(schoolId, fundId, reason, userId) {
    const fundTxn = await prisma.fundTransaction.findFirst({
      where: { id: fundId, schoolId },
      include: { fundSource: true },
    });

    if (!fundTxn) {
      throw ApiError.notFound('Fund record not found.');
    }

    if (fundTxn.status === 'CANCELLED') {
      throw ApiError.badRequest('Fund record has already been cancelled.');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Update status to CANCELLED
      const updatedFund = await tx.fundTransaction.update({
        where: { id: fundId },
        data: { status: 'CANCELLED' },
      });

      // 2. Find original ledger transaction
      const originalLedger = await tx.financialTransaction.findFirst({
        where: {
          schoolId,
          sourceType: 'FUND_ADDED',
          sourceId: fundId,
          isReversal: false,
        },
      });

      let reversalTxn = null;
      if (originalLedger) {
        reversalTxn = await financialLedgerService.createReversalTransaction(
          tx,
          originalLedger,
          reason || 'Fund transaction cancelled by administrator',
          userId
        );
      } else {
        // Fallback: create opposite DEBIT transaction directly
        reversalTxn = await financialLedgerService.createTransaction(tx, {
          schoolId,
          academicYearId: fundTxn.academicYearId,
          transactionDate: new Date(),
          type: 'DEBIT',
          sourceType: 'FUND_ADDED',
          sourceId: fundTxn.id,
          amount: fundTxn.amount,
          paymentMode: fundTxn.paymentMode,
          referenceNumber: fundTxn.referenceNumber,
          description: `REVERSAL: Fund cancelled - ${reason || 'Admin action'}`,
          isReversal: true,
          createdById: userId,
        });
      }

      // Record Audit Log
      await tx.auditLog.create({
        data: {
          schoolId,
          userId: userId || null,
          action: 'FUND_CANCELLED',
          entityType: 'FundTransaction',
          entityId: fundId,
          oldValues: { status: 'ACTIVE', amount: Number(fundTxn.amount) },
          newValues: { status: 'CANCELLED', reason: reason || 'Admin action' },
        },
      });

      return {
        success: true,
        message: 'Fund transaction cancelled and ledger reversal recorded.',
        fundTransaction: {
          ...updatedFund,
          amount: Number(updatedFund.amount),
        },
        reversalTransactionId: reversalTxn?.id,
      };
    });
  },

  /**
   * List fund transactions with multi-attribute filtering & search.
   */
  async getFunds(schoolId, query = {}) {
    const {
      fundSourceId,
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

    if (fundSourceId) where.fundSourceId = fundSourceId;
    if (academicYearId) where.academicYearId = academicYearId;
    if (paymentMode) where.paymentMode = paymentMode;
    if (status) where.status = status;

    if (startDate || endDate) {
      where.transactionDate = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(`${endDate}T23:59:59.999Z`) }),
      };
    }

    if (search && search.trim() !== '') {
      const term = search.trim();
      where.OR = [
        { remarks: { contains: term, mode: 'insensitive' } },
        { referenceNumber: { contains: term, mode: 'insensitive' } },
        { fundSource: { name: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [total, funds] = await Promise.all([
      prisma.fundTransaction.count({ where }),
      prisma.fundTransaction.findMany({
        where,
        include: {
          fundSource: { select: { id: true, name: true } },
          academicYear: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { transactionDate: 'desc' },
        skip,
        take: limitNum,
      }),
    ]);

    return {
      funds: funds.map((f) => ({
        id: f.id,
        transactionDate: f.transactionDate,
        amount: Number(f.amount),
        fundSource: f.fundSource,
        paymentMode: f.paymentMode,
        referenceNumber: f.referenceNumber,
        remarks: f.remarks,
        status: f.status,
        academicYear: f.academicYear,
        createdBy: f.createdBy?.name,
        createdAt: f.createdAt,
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
   * Get single fund transaction details.
   */
  async getFundById(schoolId, fundId) {
    const fund = await prisma.fundTransaction.findFirst({
      where: { id: fundId, schoolId },
      include: {
        fundSource: true,
        academicYear: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!fund) {
      throw ApiError.notFound('Fund transaction record not found.');
    }

    return {
      ...fund,
      amount: Number(fund.amount),
    };
  },
};
