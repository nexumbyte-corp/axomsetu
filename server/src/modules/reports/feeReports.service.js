import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';

export const feeReportsService = {
  /**
   * Detailed Fee Collection Report
   */
  async getCollectionReport(schoolId, query = {}, userId) {
    const {
      academicYearId,
      startDate,
      endDate,
      classId,
      mediumId,
      streamId,
      feeTypeId,
      paymentMode,
      page = 1,
      limit = 20,
    } = query;

    const skip = (Number(page) - 1) * Number(limit);

    const paymentWhere = {
      schoolId,
      status: 'SUCCESS',
      ...(academicYearId && { academicYearId }),
      ...(paymentMode && { paymentMode }),
    };

    if (startDate || endDate) {
      paymentWhere.paymentDate = {
        ...(startDate && { gte: new Date(`${startDate}T00:00:00.000Z`) }),
        ...(endDate && { lte: new Date(`${endDate}T23:59:59.999Z`) }),
      };
    }

    if (classId || mediumId || streamId || feeTypeId) {
      paymentWhere.allocations = {
        some: {
          charge: {
            ...(feeTypeId && { feeTypeId }),
            studentEnrollment: {
              ...(classId && { classId }),
              ...(mediumId && { mediumId }),
              ...(streamId && { streamId }),
            },
          },
        },
      };
    }

    const [total, payments] = await Promise.all([
      prisma.feePayment.count({ where: paymentWhere }),
      prisma.feePayment.findMany({
        where: paymentWhere,
        include: {
          student: { select: { id: true, name: true, admissionNo: true } },
          allocations: {
            include: {
              charge: {
                include: {
                  feeType: { select: { name: true } },
                  studentEnrollment: {
                    include: { class: { select: { name: true } } },
                  },
                },
              },
            },
          },
        },
        orderBy: { paymentDate: 'desc' },
        skip,
        take: Number(limit),
      }),
    ]);

    // Mode totals across filtered set (using aggregate)
    const modeAgg = await prisma.feePayment.groupBy({
      by: ['paymentMode'],
      where: paymentWhere,
      _sum: { receivedAmount: true },
      _count: { id: true },
    });

    const modeSummary = {
      CASH: 0,
      UPI: 0,
      BANK_TRANSFER: 0,
      CHEQUE: 0,
      DEMAND_DRAFT: 0,
      OTHER: 0,
    };
    let totalCollectionDecimal = new Prisma.Decimal(0);

    for (const group of modeAgg) {
      const amt = group._sum.receivedAmount || new Prisma.Decimal(0);
      modeSummary[group.paymentMode] = Number(amt);
      totalCollectionDecimal = totalCollectionDecimal.plus(amt);
    }

    const data = payments.map((p) => {
      const firstAlloc = p.allocations[0];
      const className = firstAlloc?.charge?.studentEnrollment?.class?.name || '-';
      const feeTypes = Array.from(
        new Set(p.allocations.map((a) => a.charge?.feeType?.name).filter(Boolean))
      ).join(', ') || 'General Fee';

      return {
        id: p.id,
        date: p.paymentDate,
        receiptNo: p.receiptNumber,
        studentName: p.student?.name || '-',
        admissionNo: p.student?.admissionNo || '-',
        className,
        feeType: feeTypes,
        amount: Number(p.receivedAmount),
        paymentMode: p.paymentMode,
        referenceNumber: p.referenceNumber || '-',
      };
    });

    return {
      data,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
      summary: {
        totalCollection: Number(totalCollectionDecimal),
        receiptCount: total,
        modeBreakdown: modeSummary,
      },
    };
  },

  /**
   * Outstanding Dues Report
   */
  async getOutstandingReport(schoolId, query = {}, userId) {
    const {
      academicYearId,
      classId,
      sectionId,
      mediumId,
      streamId,
      status,
      page = 1,
      limit = 20,
    } = query;

    const skip = (Number(page) - 1) * Number(limit);

    const chargeWhere = {
      schoolId,
      status: status ? status : { in: ['UNPAID', 'PARTIAL'] },
      ...(academicYearId && { academicYearId }),
    };

    if (classId || sectionId || mediumId || streamId) {
      chargeWhere.studentEnrollment = {
        ...(classId && { classId }),
        ...(sectionId && { sectionId }),
        ...(mediumId && { mediumId }),
        ...(streamId && { streamId }),
      };
    }

    const charges = await prisma.studentFeeCharge.findMany({
      where: chargeWhere,
      include: {
        student: { select: { id: true, name: true, admissionNo: true, phone: true } },
        feeType: { select: { name: true } },
        studentEnrollment: {
          include: {
            class: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const studentMap = new Map();

    for (const c of charges) {
      const sId = c.studentId;
      if (!studentMap.has(sId)) {
        studentMap.set(sId, {
          studentId: sId,
          studentName: c.student?.name || '-',
          admissionNo: c.student?.admissionNo || '-',
          phone: c.student?.phone || '-',
          className: c.studentEnrollment?.class?.name || '-',
          sectionName: c.studentEnrollment?.section?.name || '-',
          totalChargedDecimal: new Prisma.Decimal(0),
          totalPaidDecimal: new Prisma.Decimal(0),
          chargesCount: 0,
        });
      }

      const item = studentMap.get(sId);
      const amt = new Prisma.Decimal(c.amount);
      const paid = new Prisma.Decimal(c.paidAmount || 0);

      item.totalChargedDecimal = item.totalChargedDecimal.plus(amt);
      item.totalPaidDecimal = item.totalPaidDecimal.plus(paid);
      item.chargesCount += 1;
    }

    const allDues = Array.from(studentMap.values()).map((item) => {
      const balanceDecimal = Prisma.Decimal.max(
        new Prisma.Decimal(0),
        item.totalChargedDecimal.minus(item.totalPaidDecimal)
      );
      return {
        studentId: item.studentId,
        studentName: item.studentName,
        admissionNo: item.admissionNo,
        phone: item.phone,
        className: item.className,
        sectionName: item.sectionName,
        totalCharged: Number(item.totalChargedDecimal),
        paidAmount: Number(item.totalPaidDecimal),
        balance: Number(balanceDecimal),
        status: item.totalPaidDecimal.gt(0) ? 'PARTIAL' : 'UNPAID',
      };
    });

    const totalStudents = allDues.length;
    const paginatedDues = allDues.slice(skip, skip + Number(limit));

    const totalOutstandingDecimal = allDues.reduce(
      (sum, d) => sum.plus(new Prisma.Decimal(d.balance)),
      new Prisma.Decimal(0)
    );

    return {
      data: paginatedDues,
      pagination: {
        total: totalStudents,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalStudents / Number(limit)),
      },
      summary: {
        totalOutstanding: Number(totalOutstandingDecimal),
        totalStudentsWithDues: totalStudents,
      },
    };
  },

  /**
   * Student Fee Ledger Report
   */
  async getStudentLedger(schoolId, query = {}) {
    const { studentId, academicYearId } = query;
    if (!studentId) {
      return { data: [], summary: { currentBalance: 0 } };
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, admissionNo: true, phone: true },
    });

    const [charges, payments] = await Promise.all([
      prisma.studentFeeCharge.findMany({
        where: {
          schoolId,
          studentId,
          status: { notIn: ['VOID', 'WAIVED'] },
          ...(academicYearId && { academicYearId }),
        },
        include: { feeType: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.feePayment.findMany({
        where: {
          schoolId,
          studentId,
          status: 'SUCCESS',
          ...(academicYearId && { academicYearId }),
        },
        orderBy: { paymentDate: 'asc' },
      }),
    ]);

    // Combine charges and payments into chronological timeline
    const timeline = [];

    for (const c of charges) {
      timeline.push({
        date: c.createdAt,
        type: 'CHARGE',
        description: `${c.feeType?.name || 'Fee Charge'} (${c.month || 'Regular'})`,
        chargeAmount: Number(c.amount),
        paymentAmount: 0,
        refNo: '-',
      });
    }

    for (const p of payments) {
      timeline.push({
        date: p.paymentDate,
        type: 'PAYMENT',
        description: `Payment Received - Receipt #${p.receiptNumber}`,
        chargeAmount: 0,
        paymentAmount: Number(p.receivedAmount),
        refNo: p.receiptNumber,
      });
    }

    timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

    let runningBalance = 0;
    const ledgerData = timeline.map((item) => {
      runningBalance += item.chargeAmount - item.paymentAmount;
      return {
        ...item,
        balance: runningBalance,
      };
    });

    return {
      student,
      data: ledgerData,
      summary: {
        totalCharged: ledgerData.reduce((s, i) => s + i.chargeAmount, 0),
        totalPaid: ledgerData.reduce((s, i) => s + i.paymentAmount, 0),
        currentBalance: runningBalance,
      },
    };
  },

  /**
   * Class-wise Fee Collection Summary
   */
  async getClassFeeCollection(schoolId, query = {}) {
    const { academicYearId } = query;

    const classes = await prisma.class.findMany({
      where: { schoolId, isActive: true },
      include: {
        enrollments: {
          where: {
            status: 'ACTIVE',
            ...(academicYearId && { academicYearId }),
          },
          select: { studentId: true },
        },
      },
      orderBy: { order: 'asc' },
    });

    const result = [];
    let grandCollectionDecimal = new Prisma.Decimal(0);
    let grandOutstandingDecimal = new Prisma.Decimal(0);

    for (const cls of classes) {
      const studentIds = cls.enrollments.map((e) => e.studentId);
      if (studentIds.length === 0) {
        result.push({
          classId: cls.id,
          className: cls.name,
          studentCount: 0,
          collection: 0,
          outstanding: 0,
        });
        continue;
      }

      // Aggregate payments
      const collAgg = await prisma.paymentAllocation.aggregate({
        where: {
          payment: {
            schoolId,
            status: 'SUCCESS',
            ...(academicYearId && { academicYearId }),
          },
          charge: {
            studentId: { in: studentIds },
          },
        },
        _sum: { allocatedAmount: true },
      });

      const totalColl = collAgg._sum.allocatedAmount || new Prisma.Decimal(0);

      // Aggregate dues
      const duesCharges = await prisma.studentFeeCharge.findMany({
        where: {
          schoolId,
          studentId: { in: studentIds },
          status: { in: ['UNPAID', 'PARTIAL'] },
          ...(academicYearId && { academicYearId }),
        },
        select: { amount: true, paidAmount: true },
      });

      let classOutstanding = new Prisma.Decimal(0);
      for (const d of duesCharges) {
        const remaining = Prisma.Decimal.max(
          new Prisma.Decimal(0),
          new Prisma.Decimal(d.amount).minus(new Prisma.Decimal(d.paidAmount || 0))
        );
        classOutstanding = classOutstanding.plus(remaining);
      }

      grandCollectionDecimal = grandCollectionDecimal.plus(totalColl);
      grandOutstandingDecimal = grandOutstandingDecimal.plus(classOutstanding);

      result.push({
        classId: cls.id,
        className: cls.name,
        studentCount: studentIds.length,
        collection: Number(totalColl),
        outstanding: Number(classOutstanding),
      });
    }

    return {
      data: result,
      summary: {
        totalCollection: Number(grandCollectionDecimal),
        totalOutstanding: Number(grandOutstandingDecimal),
      },
    };
  },

  /**
   * Fee Generation Batches Report
   */
  async getGenerationBatchesReport(schoolId, query = {}) {
    const { academicYearId } = query;

    const batches = await prisma.feeGenerationBatch.findMany({
      where: {
        schoolId,
        ...(academicYearId && { academicYearId }),
      },
      include: {
        academicYear: { select: { name: true } },
        class: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = batches.map((b) => ({
      id: b.id,
      date: b.createdAt,
      academicYear: b.academicYear?.name || '-',
      month: b.month,
      mode: b.mode,
      targetClass: b.class?.name || 'Entire School',
      totalStudents: b.totalStudents,
      generatedCount: b.generatedCount,
      skippedCount: b.skippedCount,
      totalAmount: Number(b.totalAmount),
      generatedBy: b.createdBy?.name || 'System',
    }));

    return {
      data,
      summary: {
        totalBatches: batches.length,
        grandAmountGenerated: data.reduce((sum, item) => sum + item.totalAmount, 0),
      },
    };
  },
};
