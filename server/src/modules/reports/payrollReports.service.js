import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';

export const payrollReportsService = {
  /**
   * Monthly Salary Report using historical MonthlyPayroll snapshots
   */
  async getMonthlySalaryReport(schoolId, query = {}) {
    const { academicYearId, month, year, department, designation, status } = query;

    const payrollWhere = {
      schoolId,
      ...(academicYearId && { academicYearId }),
      ...(month && { month }),
      ...(year && { year: Number(year) }),
      ...(status && { status }),
    };

    if (department || designation) {
      payrollWhere.staff = {
        ...(department && { department }),
        ...(designation && { designation }),
      };
    }

    const payrolls = await prisma.monthlyPayroll.findMany({
      where: payrollWhere,
      include: {
        staff: {
          select: { id: true, employeeId: true, name: true, department: true, designation: true },
        },
        academicYear: { select: { name: true } },
      },
      orderBy: [{ year: 'desc' }, { staff: { name: 'asc' } }],
    });

    let totalBaseSalary = new Prisma.Decimal(0);
    let totalNetSalary = new Prisma.Decimal(0);
    let totalPaidAmount = new Prisma.Decimal(0);

    const data = payrolls.map((p) => {
      const base = new Prisma.Decimal(p.baseSalary);
      const net = new Prisma.Decimal(p.netSalary);
      const paid = new Prisma.Decimal(p.paidAmount || 0);

      totalBaseSalary = totalBaseSalary.plus(base);
      totalNetSalary = totalNetSalary.plus(net);
      totalPaidAmount = totalPaidAmount.plus(paid);

      return {
        id: p.id,
        staffId: p.staffId,
        employeeId: p.staff?.employeeId || '-',
        staffName: p.staff?.name || '-',
        department: p.staff?.department || 'General',
        designation: p.staff?.designation || 'Staff',
        month: p.month,
        year: p.year,
        workingDays: p.workingDays,
        workedDays: p.workedDays,
        paidLeave: p.paidLeave,
        unpaidLeave: p.unpaidLeave,
        baseSalary: Number(base),
        attendanceDeduction: Number(p.attendanceDeduction || 0),
        bonus: Number(p.bonus || 0),
        advanceDeduction: Number(p.advanceDeduction || 0),
        otherDeduction: Number(p.otherDeduction || 0),
        netSalary: Number(net),
        paidAmount: Number(paid),
        balance: Number(net.minus(paid)),
        status: p.status,
      };
    });

    return {
      data,
      summary: {
        totalRecords: data.length,
        totalBaseSalary: Number(totalBaseSalary),
        totalNetSalary: Number(totalNetSalary),
        totalPaidAmount: Number(totalPaidAmount),
        totalPendingAmount: Number(totalNetSalary.minus(totalPaidAmount)),
      },
    };
  },

  /**
   * Salary Payment Vouchers Report
   */
  async getSalaryPaymentReport(schoolId, query = {}) {
    const { academicYearId, startDate, endDate, paymentMode, staffId } = query;

    const paymentWhere = {
      schoolId,
      ...(academicYearId && { academicYearId }),
      ...(paymentMode && { paymentMode }),
      ...(staffId && { staffId }),
    };

    if (startDate || endDate) {
      paymentWhere.paymentDate = {
        ...(startDate && { gte: new Date(`${startDate}T00:00:00.000Z`) }),
        ...(endDate && { lte: new Date(`${endDate}T23:59:59.999Z`) }),
      };
    }

    const payments = await prisma.salaryPayment.findMany({
      where: paymentWhere,
      include: {
        staff: { select: { employeeId: true, name: true, department: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { paymentDate: 'desc' },
    });

    let totalDisbursed = 0;
    const data = payments.map((sp) => {
      const net = Number(sp.netSalary);
      totalDisbursed += net;

      return {
        id: sp.id,
        paymentNumber: sp.paymentNumber,
        paymentDate: sp.paymentDate,
        staffName: sp.staff?.name || '-',
        employeeId: sp.staff?.employeeId || '-',
        department: sp.staff?.department || 'General',
        months: (sp.months || []).join(', '),
        year: sp.year,
        netSalary: net,
        paymentMode: sp.paymentMode,
        referenceNo: sp.referenceNo || '-',
        createdBy: sp.createdBy?.name || 'System',
      };
    });

    return {
      data,
      summary: {
        totalVouchers: data.length,
        totalDisbursedAmount: totalDisbursed,
      },
    };
  },

  /**
   * Individual Staff Salary Ledger Report
   */
  async getStaffSalaryLedger(schoolId, query = {}) {
    const { staffId, academicYearId } = query;
    if (!staffId) {
      return { data: [], summary: { currentBalance: 0 } };
    }

    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: { id: true, name: true, employeeId: true, department: true, designation: true },
    });

    const [payrolls, payments] = await Promise.all([
      prisma.monthlyPayroll.findMany({
        where: {
          schoolId,
          staffId,
          ...(academicYearId && { academicYearId }),
        },
        orderBy: [{ year: 'asc' }, { createdAt: 'asc' }],
      }),
      prisma.salaryPayment.findMany({
        where: {
          schoolId,
          staffId,
          ...(academicYearId && { academicYearId }),
        },
        orderBy: { paymentDate: 'asc' },
      }),
    ]);

    const timeline = [];

    for (const p of payrolls) {
      timeline.push({
        date: p.createdAt,
        type: 'PAYROLL',
        description: `Payroll for ${p.month} ${p.year}`,
        salaryAmount: Number(p.netSalary),
        paymentAmount: 0,
        refNo: '-',
      });
    }

    for (const sp of payments) {
      timeline.push({
        date: sp.paymentDate,
        type: 'PAYMENT',
        description: `Salary Payment #${sp.paymentNumber} (${(sp.months || []).join(', ')})`,
        salaryAmount: 0,
        paymentAmount: Number(sp.netSalary),
        refNo: sp.paymentNumber,
      });
    }

    timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

    let runningBalance = 0;
    const ledger = timeline.map((t) => {
      runningBalance += t.salaryAmount - t.paymentAmount;
      return {
        ...t,
        balance: runningBalance,
      };
    });

    return {
      staff,
      data: ledger,
      summary: {
        totalSalaryGenerated: ledger.reduce((s, i) => s + i.salaryAmount, 0),
        totalPaid: ledger.reduce((s, i) => s + i.paymentAmount, 0),
        currentBalance: runningBalance,
      },
    };
  },

  /**
   * Pending Salary Report
   */
  async getPendingSalaryReport(schoolId, query = {}) {
    const { academicYearId, month, department, status } = query;

    const payrollWhere = {
      schoolId,
      status: status ? status : { in: ['UNPAID', 'PARTIAL'] },
      ...(academicYearId && { academicYearId }),
      ...(month && { month }),
    };

    if (department) {
      payrollWhere.staff = { department };
    }

    const pendingPayrolls = await prisma.monthlyPayroll.findMany({
      where: payrollWhere,
      include: {
        staff: { select: { employeeId: true, name: true, department: true, phone: true } },
      },
      orderBy: [{ year: 'desc' }, { staff: { name: 'asc' } }],
    });

    let totalPendingDecimal = new Prisma.Decimal(0);

    const data = pendingPayrolls.map((p) => {
      const net = new Prisma.Decimal(p.netSalary);
      const paid = new Prisma.Decimal(p.paidAmount || 0);
      const bal = net.minus(paid);

      totalPendingDecimal = totalPendingDecimal.plus(bal);

      return {
        id: p.id,
        staffId: p.staffId,
        employeeId: p.staff?.employeeId || '-',
        staffName: p.staff?.name || '-',
        phone: p.staff?.phone || '-',
        department: p.staff?.department || 'General',
        month: p.month,
        year: p.year,
        netSalary: Number(net),
        paidAmount: Number(paid),
        balance: Number(bal),
        status: p.status,
      };
    });

    return {
      data,
      summary: {
        totalPendingRecords: data.length,
        totalPendingAmount: Number(totalPendingDecimal),
      },
    };
  },

  /**
   * Staff Advance Report & Remastered Combined Transaction Ledger
   */
  async getStaffAdvanceReport(schoolId, query = {}) {
    const { staffId, startDate, endDate, transactionType, status } = query;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (staffId && uuidRegex.test(staffId)) {
      return this.getIndividualStaffAdvanceLedger(schoolId, query);
    }

    const dateFilter = {};
    if (startDate || endDate) {
      if (startDate) dateFilter.gte = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate) dateFilter.lte = new Date(`${endDate}T23:59:59.999Z`);
    }

    const [advances, pendingPayrolls, salaryPayments, staffAggregate] = await Promise.all([
      prisma.staffAdvance.findMany({
        where: {
          schoolId,
          ...(startDate || endDate ? { advanceDate: dateFilter } : {}),
        },
        include: {
          staff: { select: { employeeId: true, name: true, department: true } },
        },
        orderBy: { advanceDate: 'asc' },
      }),
      prisma.monthlyPayroll.findMany({
        where: {
          schoolId,
          advanceDeduction: { gt: 0 },
          status: { in: ['UNPAID', 'PARTIAL'] },
          ...(startDate || endDate ? { createdAt: dateFilter } : {}),
        },
        include: {
          staff: { select: { employeeId: true, name: true, department: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.salaryPayment.findMany({
        where: {
          schoolId,
          advanceDeducted: { gt: 0 },
          ...(startDate || endDate ? { paymentDate: dateFilter } : {}),
        },
        include: {
          staff: { select: { employeeId: true, name: true, department: true } },
        },
        orderBy: { paymentDate: 'asc' },
      }),
      prisma.staff.aggregate({
        where: { schoolId },
        _sum: { advanceBalance: true },
      }),
    ]);

    const timeline = [];

    for (const adv of advances) {
      timeline.push({
        id: adv.id,
        staffId: adv.staffId,
        staffName: adv.staff?.name || '-',
        employeeId: adv.staff?.employeeId || '-',
        department: adv.staff?.department || 'General',
        date: adv.advanceDate,
        createdAt: adv.createdAt,
        type: 'DISBURSEMENT',
        reference: adv.referenceNo || `ADV-${adv.id.slice(0, 6).toUpperCase()}`,
        payrollPeriod: '—',
        disbursed: Number(adv.amount),
        recovered: 0,
        paymentMode: adv.paymentMode || 'CASH',
        status: Number(adv.recovered) >= Number(adv.amount) ? 'RECOVERED' : 'DISBURSED',
        details: adv.remarks || 'Staff Advance Disbursed',
      });
    }

    for (const mp of pendingPayrolls) {
      timeline.push({
        id: mp.id,
        staffId: mp.staffId,
        staffName: mp.staff?.name || '-',
        employeeId: mp.staff?.employeeId || '-',
        department: mp.staff?.department || 'General',
        date: mp.createdAt,
        createdAt: mp.createdAt,
        type: 'RECOVERY_PENDING',
        reference: `PAY-${mp.month.slice(0, 3)}-${mp.year}`,
        payrollPeriod: `${mp.month} ${mp.year}`,
        disbursed: 0,
        recovered: Number(mp.advanceDeduction),
        paymentMode: 'PAYROLL_DEDUCTION',
        status: 'PENDING',
        details: `Reserved in ${mp.month} ${mp.year} Payroll (Unpaid)`,
      });
    }

    for (const sp of salaryPayments) {
      timeline.push({
        id: sp.id,
        staffId: sp.staffId,
        staffName: sp.staff?.name || '-',
        employeeId: sp.staff?.employeeId || '-',
        department: sp.staff?.department || 'General',
        date: sp.paymentDate,
        createdAt: sp.createdAt,
        type: 'RECOVERY',
        reference: sp.paymentNumber,
        payrollPeriod: (sp.months || []).join(', ') + ` ${sp.year}`,
        disbursed: 0,
        recovered: Number(sp.advanceDeducted),
        paymentMode: sp.paymentMode || 'PAYROLL_DEDUCTION',
        status: 'RECOVERED',
        details: `Recovered via Payroll Voucher #${sp.paymentNumber}`,
      });
    }

    // Filter by transactionType if provided
    let filteredTimeline = timeline;
    if (transactionType && transactionType !== 'ALL') {
      filteredTimeline = timeline.filter((t) => t.type === transactionType);
    }

    if (status && status !== 'ALL') {
      filteredTimeline = filteredTimeline.filter((t) => t.status === status);
    }

    // Sort chronologically (oldest to newest) to compute historical running balance
    timeline.sort((a, b) => {
      const diff = new Date(a.date) - new Date(b.date);
      if (diff !== 0) return diff;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    let runningBalance = 0;
    const ledgerMap = new Map();

    for (const item of timeline) {
      if (item.type === 'DISBURSEMENT') {
        runningBalance += item.disbursed;
      } else if (item.type === 'RECOVERY') {
        runningBalance -= item.recovered;
      }
      ledgerMap.set(item.id, Math.max(0, runningBalance));
    }

    const data = filteredTimeline.map((item) => ({
      ...item,
      balance: ledgerMap.get(item.id) ?? 0,
    }));

    // Sort DESCENDING (newest first) for presentation
    data.sort((a, b) => {
      const diff = new Date(b.date) - new Date(a.date);
      if (diff !== 0) return diff;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const totalDisbursed = advances.reduce((sum, a) => sum + Number(a.amount), 0);
    const totalRecovered = salaryPayments.reduce((sum, sp) => sum + Number(sp.advanceDeducted), 0);
    const pendingRecovery = pendingPayrolls.reduce((sum, mp) => sum + Number(mp.advanceDeduction), 0);
    const totalOutstanding = Number(staffAggregate._sum.advanceBalance || 0);
    const availableForAllocation = Math.max(0, totalOutstanding - pendingRecovery);

    return {
      data,
      summary: {
        totalDisbursed,
        totalRecovered,
        pendingRecovery,
        totalOutstanding,
        availableForAllocation,
      },
    };
  },

  /**
   * Individual Staff Advance Ledger / Statement (Chronological Running Balance, DESC Display)
   */
  async getIndividualStaffAdvanceLedger(schoolId, query = {}) {
    const { staffId, startDate, endDate } = query;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!staffId || typeof staffId !== 'string' || !uuidRegex.test(staffId)) {
      return {
        data: [],
        summary: {
          totalDisbursed: 0,
          totalRecovered: 0,
          pendingRecovery: 0,
          totalOutstanding: 0,
          availableForAllocation: 0,
        },
      };
    }

    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: {
        id: true,
        name: true,
        employeeId: true,
        department: true,
        designation: true,
        phone: true,
        email: true,
        baseSalary: true,
        advanceBalance: true,
        status: true,
      },
    });

    if (!staff) {
      return {
        data: [],
        summary: {
          totalDisbursed: 0,
          totalRecovered: 0,
          pendingRecovery: 0,
          totalOutstanding: 0,
          availableForAllocation: 0,
        },
      };
    }

    const dateFilter = {};
    if (startDate || endDate) {
      if (startDate) dateFilter.gte = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate) dateFilter.lte = new Date(`${endDate}T23:59:59.999Z`);
    }

    const [advances, pendingPayrolls, salaryPayments] = await Promise.all([
      prisma.staffAdvance.findMany({
        where: {
          schoolId,
          staffId,
          ...(startDate || endDate ? { advanceDate: dateFilter } : {}),
        },
        orderBy: { advanceDate: 'asc' },
      }),
      prisma.monthlyPayroll.findMany({
        where: {
          schoolId,
          staffId,
          advanceDeduction: { gt: 0 },
          status: { in: ['UNPAID', 'PARTIAL'] },
          ...(startDate || endDate ? { createdAt: dateFilter } : {}),
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.salaryPayment.findMany({
        where: {
          schoolId,
          staffId,
          advanceDeducted: { gt: 0 },
          ...(startDate || endDate ? { paymentDate: dateFilter } : {}),
        },
        orderBy: { paymentDate: 'asc' },
      }),
    ]);

    const timeline = [];

    for (const adv of advances) {
      timeline.push({
        id: adv.id,
        date: adv.advanceDate,
        createdAt: adv.createdAt,
        type: 'DISBURSEMENT',
        description: adv.remarks ? `Advance Disbursed: ${adv.remarks}` : 'Staff Advance Cash Disbursed',
        refNo: adv.referenceNo || `ADV-${adv.id.slice(0, 6).toUpperCase()}`,
        payrollPeriod: '—',
        disbursedAmount: Number(adv.amount),
        recoveredAmount: 0,
        paymentMode: adv.paymentMode || 'CASH',
        status: Number(adv.recovered) >= Number(adv.amount) ? 'RECOVERED' : 'DISBURSED',
        remarks: adv.remarks || '-',
      });
    }

    for (const mp of pendingPayrolls) {
      timeline.push({
        id: mp.id,
        date: mp.createdAt,
        createdAt: mp.createdAt,
        type: 'RECOVERY_PENDING',
        description: `Advance Allocated in ${mp.month} ${mp.year} Payroll (Unpaid)`,
        refNo: `PAY-${mp.month.slice(0, 3)}-${mp.year}`,
        payrollPeriod: `${mp.month} ${mp.year}`,
        disbursedAmount: 0,
        recoveredAmount: Number(mp.advanceDeduction),
        paymentMode: 'PAYROLL_DEDUCTION',
        status: 'PENDING',
        remarks: `Reserved in ${mp.month} ${mp.year} payroll`,
      });
    }

    for (const sp of salaryPayments) {
      const monthsStr = (sp.months || []).join(', ');
      timeline.push({
        id: sp.id,
        date: sp.paymentDate,
        createdAt: sp.createdAt,
        type: 'RECOVERY',
        description: `Payroll Advance Recovery (${monthsStr} ${sp.year}) - Voucher #${sp.paymentNumber}`,
        refNo: sp.paymentNumber,
        payrollPeriod: `${monthsStr} ${sp.year}`,
        disbursedAmount: 0,
        recoveredAmount: Number(sp.advanceDeducted),
        paymentMode: sp.paymentMode || 'PAYROLL_DEDUCTION',
        status: 'RECOVERED',
        remarks: sp.remarks || `Recovered via salary payment #${sp.paymentNumber}`,
      });
    }

    // Sort chronologically to compute running balance correctly
    timeline.sort((a, b) => {
      const diff = new Date(a.date) - new Date(b.date);
      if (diff !== 0) return diff;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    let runningBalance = 0;
    const ledgerWithBalance = timeline.map((entry) => {
      if (entry.type === 'DISBURSEMENT') {
        runningBalance += entry.disbursedAmount;
      } else if (entry.type === 'RECOVERY') {
        runningBalance -= entry.recoveredAmount;
      }
      return {
        ...entry,
        balance: Math.max(0, runningBalance),
      };
    });

    // Reverse for DESCENDING display presentation (newest first)
    const ledger = [...ledgerWithBalance].sort((a, b) => {
      const diff = new Date(b.date) - new Date(a.date);
      if (diff !== 0) return diff;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const totalDisbursed = advances.reduce((sum, a) => sum + Number(a.amount), 0);
    const totalRecovered = salaryPayments.reduce((sum, sp) => sum + Number(sp.advanceDeducted), 0);
    const pendingRecovery = pendingPayrolls.reduce((sum, mp) => sum + Number(mp.advanceDeduction), 0);
    const totalOutstanding = Number(staff.advanceBalance || 0);
    const availableForAllocation = Math.max(0, totalOutstanding - pendingRecovery);

    return {
      staff: {
        ...staff,
        advanceBalance: totalOutstanding,
        pendingRecovery,
        availableForAllocation,
      },
      data: ledger,
      summary: {
        totalDisbursed,
        totalRecovered,
        pendingRecovery,
        totalOutstanding,
        availableForAllocation,
      },
    };
  },
};

