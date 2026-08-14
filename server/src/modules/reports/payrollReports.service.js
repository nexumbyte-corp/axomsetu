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
  /**
   * Staff Advance Report & Individual Staff Advance Statement / Ledger
   */
  async getStaffAdvanceReport(schoolId, query = {}) {
    const { staffId, startDate, endDate } = query;

    if (staffId) {
      return this.getIndividualStaffAdvanceLedger(schoolId, query);
    }

    const advanceWhere = {
      schoolId,
    };

    if (startDate || endDate) {
      advanceWhere.advanceDate = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }

    const advances = await prisma.staffAdvance.findMany({
      where: advanceWhere,
      include: {
        staff: { select: { employeeId: true, name: true, department: true } },
      },
      orderBy: { advanceDate: 'desc' },
    });

    let totalAdvDecimal = new Prisma.Decimal(0);
    let totalRecDecimal = new Prisma.Decimal(0);

    const data = advances.map((a) => {
      const amt = new Prisma.Decimal(a.amount);
      const rec = new Prisma.Decimal(a.recovered || 0);
      const bal = amt.minus(rec);

      totalAdvDecimal = totalAdvDecimal.plus(amt);
      totalRecDecimal = totalRecDecimal.plus(rec);

      return {
        id: a.id,
        staffName: a.staff?.name || '-',
        employeeId: a.staff?.employeeId || '-',
        department: a.staff?.department || 'General',
        advanceDate: a.advanceDate,
        amount: Number(amt),
        recovered: Number(rec),
        balance: Number(bal),
        paymentMode: a.paymentMode,
        referenceNo: a.referenceNo || '-',
        status: bal.lte(0) ? 'RECOVERED' : 'PENDING',
      };
    });

    return {
      data,
      summary: {
        totalAdvances: Number(totalAdvDecimal),
        totalRecovered: Number(totalRecDecimal),
        totalOutstandingBalance: Number(totalAdvDecimal.minus(totalRecDecimal)),
      },
    };
  },

  /**
   * Individual Staff Advance Ledger / Statement
   */
  async getIndividualStaffAdvanceLedger(schoolId, query = {}) {
    const { staffId, startDate, endDate } = query;
    if (!staffId) {
      return { data: [], summary: { totalAdvances: 0, totalRecovered: 0, totalOutstandingBalance: 0 } };
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
      return { data: [], summary: { totalAdvances: 0, totalRecovered: 0, totalOutstandingBalance: 0 } };
    }

    const dateFilter = {};
    if (startDate || endDate) {
      if (startDate) dateFilter.gte = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate) dateFilter.lte = new Date(`${endDate}T23:59:59.999Z`);
    }

    const [advances, salaryPayments] = await Promise.all([
      prisma.staffAdvance.findMany({
        where: {
          schoolId,
          staffId,
          ...(startDate || endDate ? { advanceDate: dateFilter } : {}),
        },
        orderBy: { advanceDate: 'asc' },
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
        type: 'DISBURSED',
        description: adv.remarks ? `Advance Disbursed: ${adv.remarks}` : 'Staff Advance Cash Disbursed',
        refNo: adv.referenceNo || `ADV-${adv.id.slice(0, 6).toUpperCase()}`,
        disbursedAmount: Number(adv.amount),
        recoveredAmount: 0,
        paymentMode: adv.paymentMode || 'CASH',
        remarks: adv.remarks || '-',
      });
    }

    for (const sp of salaryPayments) {
      const monthsStr = (sp.months || []).join(', ');
      timeline.push({
        id: sp.id,
        date: sp.paymentDate,
        type: 'RECOVERY',
        description: `Payroll Advance Recovery (${monthsStr} ${sp.year}) - Voucher #${sp.paymentNumber}`,
        refNo: sp.paymentNumber,
        disbursedAmount: 0,
        recoveredAmount: Number(sp.advanceDeducted),
        paymentMode: sp.paymentMode || 'PAYROLL_DEDUCTION',
        remarks: sp.remarks || `Recovered via salary payment #${sp.paymentNumber}`,
      });
    }

    timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

    let runningBalance = 0;
    let totalGiven = 0;
    let totalRecovered = 0;

    const ledger = timeline.map((entry) => {
      if (entry.type === 'DISBURSED') {
        runningBalance += entry.disbursedAmount;
        totalGiven += entry.disbursedAmount;
      } else if (entry.type === 'RECOVERY') {
        runningBalance -= entry.recoveredAmount;
        totalRecovered += entry.recoveredAmount;
      }
      return {
        ...entry,
        balance: Math.max(0, runningBalance),
      };
    });

    return {
      staff,
      data: ledger,
      summary: {
        totalAdvances: totalGiven,
        totalRecovered: totalRecovered,
        totalOutstandingBalance: Math.max(0, runningBalance),
      },
    };
  },
};

