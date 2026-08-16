import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { generateNextDocumentNumber } from '../../utils/documentSequence.js';
import { isStaffOperationallyActive } from '../../utils/staffHelpers.js';
import { financialLedgerService } from '../finance/financialLedger.service.js';
import { ensureCurrentAcademicYear } from '../academic-years/academicYear.service.js';

export const staffService = {
  // -------------------------------------------------------------
  // STAFF CRUD
  // -------------------------------------------------------------

  /**
   * Create a new Staff member
   */
  async createStaff(schoolId, data, userId) {
    return await prisma.$transaction(async (tx) => {
      let employeeId = data.employeeId?.trim();
      if (!employeeId) {
        employeeId = await generateNextDocumentNumber(tx, {
          schoolId,
          documentType: 'STAFF_EMPLOYEE_CODE',
          prefix: 'EMP-',
        });
      } else {
        const existing = await tx.staff.findUnique({
          where: {
            schoolId_employeeId: {
              schoolId,
              employeeId,
            },
          },
        });

        if (existing) {
          throw ApiError.conflict(`Staff member with Employee ID "${employeeId}" already exists.`);
        }
      }

      const staff = await tx.staff.create({
        data: {
          schoolId,
          employeeId,
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          role: data.role || 'TEACHER',
          department: data.department || null,
          designation: data.designation || null,
          joiningDate: data.joiningDate ? new Date(data.joiningDate) : new Date(),
          baseSalary: data.baseSalary ?? 0,
          bankName: data.bankName || null,
          bankAccountNo: data.bankAccountNo || null,
          ifscCode: data.ifscCode || null,
        },
      });

      return staff;
    });
  },

  /**
   * List staff with pagination & filters
   */
  async listStaff(schoolId, query = {}) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(query.limit || '10', 10)));
    const skip = (page - 1) * limit;

    const where = { schoolId };

    if (query.role && query.role !== 'ALL') {
      where.role = query.role;
    }

    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }

    if (query.department && query.department !== 'ALL') {
      where.department = query.department;
    }

    if (query.designation && query.designation !== 'ALL') {
      where.designation = query.designation;
    }

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
        { designation: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, data, allStaff] = await Promise.all([
      prisma.staff.count({ where }),
      prisma.staff.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.staff.findMany({
        where: { schoolId },
        select: { department: true, designation: true },
      }),
    ]);

    const departments = Array.from(new Set(allStaff.map(s => s.department).filter(Boolean))).sort();
    const designations = Array.from(new Set(allStaff.map(s => s.designation).filter(Boolean))).sort();

    return {
      data,
      metadata: {
        departments,
        designations,
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  /**
   * Get single staff profile with advance balance & payment history
   */
  async getStaffById(schoolId, staffId) {
    const staff = await prisma.staff.findFirst({
      where: { id: staffId, schoolId },
      include: {
        advances: {
          orderBy: { advanceDate: 'desc' },
        },
        salarySetups: {
          include: { academicYear: true },
          orderBy: { effectiveFrom: 'desc' },
        },
        monthlyPayrolls: {
          include: { academicYear: true },
          orderBy: { createdAt: 'desc' },
          take: 24,
        },
        salaryPayments: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!staff) {
      throw ApiError.notFound('Staff member not found.');
    }

    return staff;
  },

  /**
   * Update staff profile
   */
  async updateStaff(schoolId, staffId, data, userId) {
    const staff = await prisma.staff.findFirst({
      where: { id: staffId, schoolId },
    });

    if (!staff) {
      throw ApiError.notFound('Staff member not found.');
    }

    if (data.employeeId && data.employeeId !== staff.employeeId) {
      const existing = await prisma.staff.findUnique({
        where: {
          schoolId_employeeId: {
            schoolId,
            employeeId: data.employeeId,
          },
        },
      });

      if (existing) {
        throw ApiError.conflict(`Employee ID "${data.employeeId}" is already taken by another staff member.`);
      }
    }

    const updated = await prisma.staff.update({
      where: { id: staffId },
      data: {
        employeeId: data.employeeId ?? staff.employeeId,
        name: data.name ?? staff.name,
        email: data.email !== undefined ? (data.email || null) : staff.email,
        phone: data.phone !== undefined ? (data.phone || null) : staff.phone,
        role: data.role ?? staff.role,
        department: data.department !== undefined ? (data.department || null) : staff.department,
        designation: data.designation !== undefined ? (data.designation || null) : staff.designation,
        joiningDate: data.joiningDate ? new Date(data.joiningDate) : staff.joiningDate,
        status: data.status ?? staff.status,
        baseSalary: data.baseSalary !== undefined ? data.baseSalary : staff.baseSalary,
        bankName: data.bankName !== undefined ? (data.bankName || null) : staff.bankName,
        bankAccountNo: data.bankAccountNo !== undefined ? (data.bankAccountNo || null) : staff.bankAccountNo,
        ifscCode: data.ifscCode !== undefined ? (data.ifscCode || null) : staff.ifscCode,
      },
    });

    return updated;
  },

  /**
   * Delete staff member (or mark inactive if payments exist)
   */
  async deleteStaff(schoolId, staffId, userId) {
    const staff = await prisma.staff.findFirst({
      where: { id: staffId, schoolId },
      include: {
        _count: {
          select: { salaryPayments: true, advances: true },
        },
      },
    });

    if (!staff) {
      throw ApiError.notFound('Staff member not found.');
    }

    if (staff._count.salaryPayments > 0 || staff._count.advances > 0) {
      // Soft-delete by setting status to INACTIVE
      const updated = await prisma.staff.update({
        where: { id: staffId },
        data: { status: 'INACTIVE' },
      });
      return { message: 'Staff status updated to INACTIVE due to existing financial history.', staff: updated };
    }

    await prisma.staff.delete({
      where: { id: staffId },
    });

    return { message: 'Staff member deleted successfully.' };
  },

  // -------------------------------------------------------------
  // ADVANCE PAYMENTS
  // -------------------------------------------------------------

  /**
   * Disburse advance money to staff
   */
  async disburseAdvance(schoolId, staffId, data, userId) {
    const staff = await prisma.staff.findFirst({
      where: { id: staffId, schoolId },
    });

    if (!staff) {
      throw ApiError.notFound('Staff member not found.');
    }

    if (!isStaffOperationallyActive(staff)) {
      throw ApiError.badRequest('Advance payment cannot be disbursed to inactive or non-operational staff members.');
    }

    const amount = Number(data.amount);
    if (isNaN(amount) || amount <= 0) {
      throw ApiError.badRequest('Advance amount must be a positive number.');
    }

    let academicYearId = data.academicYearId;
    if (!academicYearId) {
      try {
        const currentAy = await ensureCurrentAcademicYear(schoolId);
        academicYearId = currentAy?.id || null;
      } catch (e) {
        academicYearId = null;
      }
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Create StaffAdvance record
      const advance = await tx.staffAdvance.create({
        data: {
          schoolId,
          staffId,
          amount,
          recovered: 0,
          advanceDate: new Date(data.advanceDate),
          paymentMode: data.paymentMode || 'CASH',
          referenceNo: data.referenceNo || null,
          remarks: data.remarks || null,
        },
      });

      // 2. Increment staff's advanceBalance
      const updatedStaff = await tx.staff.update({
        where: { id: staffId },
        data: {
          advanceBalance: {
            increment: amount,
          },
        },
      });

      // 3. Create Financial Ledger DEBIT for Staff Advance
      await financialLedgerService.createTransaction(tx, {
        schoolId,
        academicYearId: academicYearId || null,
        transactionDate: new Date(data.advanceDate),
        type: 'DEBIT',
        sourceType: 'STAFF_ADVANCE',
        sourceId: advance.id,
        amount,
        paymentMode: data.paymentMode || 'CASH',
        referenceNumber: data.referenceNo || null,
        description: `Staff Advance Disbursed to ${staff.name}`,
        createdById: userId || null,
      });

      return { advance, staff: updatedStaff };
    });
  },

  // -------------------------------------------------------------
  // SALARY PAYMENTS & PAYROLL
  // -------------------------------------------------------------

  /**
   * Record salary payment for staff member (multi-month, allowances, deductions, advance recovery)
   */
  async recordSalaryPayment(schoolId, data, userId) {
    const {
      staffId,
      academicYearId,
      months,
      year,
      allowances = 0,
      deductions = 0,
      advanceDeducted = 0,
      paymentMode = 'CASH',
      referenceNo,
      remarks,
      paymentDate,
    } = data;

    if (!months || !Array.isArray(months) || months.length === 0) {
      throw ApiError.badRequest('At least one month must be selected for salary payment.');
    }

    const staff = await prisma.staff.findFirst({
      where: { id: staffId, schoolId },
    });

    if (!staff) {
      throw ApiError.notFound('Staff member not found.');
    }

    // Check for duplicate salary payments for requested months in the target year
    const existingPayments = await prisma.salaryPayment.findMany({
      where: {
        schoolId,
        staffId,
        year: Number(year),
      },
      select: {
        paymentNumber: true,
        months: true,
      },
    });

    const paidMonthsMap = new Map();
    for (const p of existingPayments) {
      for (const m of p.months) {
        paidMonthsMap.set(m, p.paymentNumber);
      }
    }

    const duplicateMonths = months.filter((m) => paidMonthsMap.has(m));
    if (duplicateMonths.length > 0) {
      const details = duplicateMonths
        .map((m) => `${m} (Voucher #${paidMonthsMap.get(m)})`)
        .join(', ');
      throw ApiError.conflict(
        `Salary for ${staff.name} for ${year} has ALREADY been paid for month(s): ${details}. Duplicate payments are not allowed.`
      );
    }

    const currentAdvanceBal = Number(staff.advanceBalance);
    const advanceDeductedNum = Number(advanceDeducted);

    if (advanceDeductedNum > currentAdvanceBal) {
      throw ApiError.badRequest(
        `Advance deduction (${advanceDeductedNum}) cannot exceed staff's outstanding advance balance (${currentAdvanceBal}).`
      );
    }

    // Calculation logic
    const monthlyRate = Number(staff.baseSalary);
    const totalBaseSalary = monthlyRate * months.length;
    const allowancesNum = Number(allowances);
    const deductionsNum = Number(deductions);

    const netSalary = totalBaseSalary + allowancesNum - deductionsNum - advanceDeductedNum;

    if (netSalary < 0) {
      throw ApiError.badRequest('Calculated net salary cannot be negative.');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Generate sequential payment voucher number
      const paymentNumber = await generateNextDocumentNumber(tx, {
        schoolId,
        academicYearId: academicYearId || null,
        documentType: 'PAYROLL_VOUCHER',
        prefix: 'SAL',
      });

      // 2. Create SalaryPayment record
      const salaryPayment = await tx.salaryPayment.create({
        data: {
          schoolId,
          staffId,
          academicYearId: academicYearId || null,
          paymentNumber,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          months,
          year: Number(year),
          baseSalary: totalBaseSalary,
          allowances: allowancesNum,
          deductions: deductionsNum,
          advanceDeducted: advanceDeductedNum,
          netSalary,
          paymentMode,
          referenceNo: referenceNo || null,
          remarks: remarks || null,
          createdById: userId || null,
        },
        include: {
          staff: true,
          academicYear: true,
        },
      });

      // 3. Update staff advance balance & advance records if advance recovered
      if (advanceDeductedNum > 0) {
        await tx.staff.update({
          where: { id: staffId },
          data: {
            advanceBalance: {
              decrement: advanceDeductedNum,
            },
          },
        });

        // Allocate deduction across open advances for this staff
        let remainingToDeduct = advanceDeductedNum;
        const openAdvances = await tx.staffAdvance.findMany({
          where: {
            staffId,
            schoolId,
          },
          orderBy: { advanceDate: 'asc' },
        });

        for (const adv of openAdvances) {
          if (remainingToDeduct <= 0) break;
          const unrecovered = Number(adv.amount) - Number(adv.recovered);
          if (unrecovered > 0) {
            const allocate = Math.min(unrecovered, remainingToDeduct);
            await tx.staffAdvance.update({
              where: { id: adv.id },
              data: {
                recovered: {
                  increment: allocate,
                },
              },
            });
            remainingToDeduct -= allocate;
          }
        }
      }

      // 4. Create Financial Ledger entries for Salary Payment (DEBIT) and Advance Recovery (CREDIT)
      const grossSalary = netSalary + advanceDeductedNum;
      await financialLedgerService.createTransaction(tx, {
        schoolId,
        academicYearId: academicYearId || null,
        transactionDate: paymentDate ? new Date(paymentDate) : new Date(),
        type: 'DEBIT',
        sourceType: 'SALARY_PAYMENT',
        sourceId: salaryPayment.id,
        amount: grossSalary,
        paymentMode,
        referenceNumber: referenceNo || salaryPayment.paymentNumber,
        description: `Salary Payment for ${staff.name} (${months.join(', ')} ${year})`,
        createdById: userId || null,
      });

      if (advanceDeductedNum > 0) {
        await financialLedgerService.createTransaction(tx, {
          schoolId,
          academicYearId: academicYearId || null,
          transactionDate: paymentDate ? new Date(paymentDate) : new Date(),
          type: 'CREDIT',
          sourceType: 'ADVANCE_RECOVERY',
          sourceId: salaryPayment.id,
          amount: advanceDeductedNum,
          paymentMode,
          referenceNumber: referenceNo || salaryPayment.paymentNumber,
          description: `Staff Advance Recovery via Payroll for ${staff.name}`,
          createdById: userId || null,
        });
      }

      return salaryPayment;
    });
  },

  /**
   * List salary payments across school
   */
  async listSalaryPayments(schoolId, query = {}) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(query.limit || '10', 10)));
    const skip = (page - 1) * limit;

    const where = { schoolId };

    if (query.staffId) {
      where.staffId = query.staffId;
    }

    if (query.year) {
      where.year = parseInt(query.year, 10);
    }

    if (query.month) {
      where.months = {
        has: query.month,
      };
    }

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { paymentNumber: { contains: search, mode: 'insensitive' } },
        { referenceNo: { contains: search, mode: 'insensitive' } },
        { staff: { name: { contains: search, mode: 'insensitive' } } },
        { staff: { employeeId: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.salaryPayment.count({ where }),
      prisma.salaryPayment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paymentDate: 'desc' },
        include: {
          staff: {
            select: {
              id: true,
              employeeId: true,
              name: true,
              role: true,
              department: true,
              designation: true,
            },
          },
        },
      }),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  /**
   * Get full details of a single salary payment (for salary slip view)
   */
  async getSalaryPaymentById(schoolId, paymentId) {
    const payment = await prisma.salaryPayment.findFirst({
      where: { id: paymentId, schoolId },
      include: {
        staff: true,
        school: true,
        academicYear: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!payment) {
      throw ApiError.notFound('Salary payment record not found.');
    }

    return payment;
  },

  /**
   * Get general payroll overview metrics for dashboard
   */
  async getPayrollOverview(schoolId) {
    const [totalStaff, activeStaff, totalAdvanceBalResult, recentPayments] = await Promise.all([
      prisma.staff.count({ where: { schoolId } }),
      prisma.staff.count({ where: { schoolId, status: 'ACTIVE' } }),
      prisma.staff.aggregate({
        where: { schoolId },
        _sum: { advanceBalance: true, baseSalary: true },
      }),
      prisma.salaryPayment.findMany({
        where: { schoolId },
        take: 5,
        orderBy: { paymentDate: 'desc' },
        include: {
          staff: {
            select: { name: true, employeeId: true, role: true },
          },
        },
      }),
    ]);

    return {
      totalStaff,
      activeStaff,
      totalMonthlyBaseSalary: Number(totalAdvanceBalResult._sum.baseSalary || 0),
      totalOutstandingAdvance: Number(totalAdvanceBalResult._sum.advanceBalance || 0),
      recentPayments,
    };
  },

  /**
   * Get list of months already paid for a staff member in a given year
   */
  async getStaffPaidMonths(schoolId, staffId, year) {
    const yr = parseInt(year || new Date().getFullYear(), 10);
    const payments = await prisma.salaryPayment.findMany({
      where: {
        schoolId,
        staffId,
        year: yr,
      },
      select: {
        months: true,
        paymentNumber: true,
        paymentDate: true,
      },
    });

    const paidMonthsSet = new Set();
    const paidDetails = [];

    for (const p of payments) {
      for (const m of p.months) {
        paidMonthsSet.add(m);
        paidDetails.push({
          month: m,
          paymentNumber: p.paymentNumber,
          paymentDate: p.paymentDate,
        });
      }
    }

    return {
      year: yr,
      paidMonths: Array.from(paidMonthsSet),
      paidDetails,
    };
  },
};
