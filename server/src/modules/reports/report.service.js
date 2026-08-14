import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';

export const REPORT_AUDIT_EVENTS = {
  VIEW_REPORT: 'VIEW_REPORT',
};

/**
 * Fee Financial Reporting Service
 */
export const reportService = {
  /**
   * Daily collection summary grouped by payment mode.
   *
   * @param {string} schoolId
   * @param {Object} query
   * @param {string} [userId]
   */
  async getDailyCollection(schoolId, query = {}, userId) {
    const targetDateStr = query.date || new Date().toISOString().split('T')[0];
    const { academicYearId } = query;

    const startOfDay = new Date(`${targetDateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${targetDateStr}T23:59:59.999Z`);

    const whereClause = {
      schoolId,
      status: 'SUCCESS',
      paymentDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
      ...(academicYearId && { academicYearId }),
    };

    const modeGroups = await prisma.feePayment.groupBy({
      by: ['paymentMode'],
      where: whereClause,
      _sum: {
        receivedAmount: true,
      },
      _count: {
        id: true,
      },
    });

    const defaultModes = ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'DEMAND_DRAFT'];
    const modeBreakdown = {};
    let grandTotalDecimal = new Prisma.Decimal(0);
    let totalReceiptCount = 0;

    for (const mode of defaultModes) {
      modeBreakdown[mode] = 0;
    }

    for (const group of modeGroups) {
      const modeAmount = group._sum.receivedAmount || new Prisma.Decimal(0);
      const count = group._count.id || 0;
      modeBreakdown[group.paymentMode] = Number(modeAmount);
      grandTotalDecimal = grandTotalDecimal.plus(modeAmount);
      totalReceiptCount += count;
    }

    // Record audit log
    await prisma.auditLog.create({
      data: {
        schoolId,
        userId: userId || null,
        action: REPORT_AUDIT_EVENTS.VIEW_REPORT,
        entityType: 'DailyCollectionReport',
        newValues: { date: targetDateStr, grandTotal: grandTotalDecimal.toString() },
      },
    });

    return {
      date: targetDateStr,
      academicYearId: academicYearId || null,
      modeBreakdown,
      grandTotal: Number(grandTotalDecimal),
      receiptCount: totalReceiptCount,
    };
  },

  /**
   * Monthly collection summary across months in an academic or calendar year.
   *
   * @param {string} schoolId
   * @param {Object} query
   * @param {string} [userId]
   */
  async getMonthlyCollection(schoolId, query = {}, userId) {
    const { academicYearId, year } = query;
    const targetYear = Number(year) || new Date().getFullYear();

    const startOfYear = new Date(`${targetYear}-01-01T00:00:00.000Z`);
    const endOfYear = new Date(`${targetYear}-12-31T23:59:59.999Z`);

    const whereClause = {
      schoolId,
      status: 'SUCCESS',
      paymentDate: {
        gte: startOfYear,
        lte: endOfYear,
      },
      ...(academicYearId && { academicYearId }),
    };

    const payments = await prisma.feePayment.findMany({
      where: whereClause,
      select: {
        id: true,
        receivedAmount: true,
        paymentMode: true,
        paymentDate: true,
      },
    });

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    const monthlyData = monthNames.map((name, index) => ({
      monthIndex: index + 1,
      monthName: name,
      receiptCount: 0,
      totalCollection: 0,
      modeBreakdown: { CASH: 0, UPI: 0, BANK_TRANSFER: 0, CHEQUE: 0, DEMAND_DRAFT: 0 },
    }));

    let annualTotalDecimal = new Prisma.Decimal(0);
    let annualReceiptCount = 0;

    for (const p of payments) {
      const mIndex = new Date(p.paymentDate).getMonth(); // 0-11
      const amtDecimal = new Prisma.Decimal(p.receivedAmount);

      monthlyData[mIndex].receiptCount += 1;
      monthlyData[mIndex].totalCollection += Number(amtDecimal);
      monthlyData[mIndex].modeBreakdown[p.paymentMode] =
        (monthlyData[mIndex].modeBreakdown[p.paymentMode] || 0) + Number(amtDecimal);

      annualTotalDecimal = annualTotalDecimal.plus(amtDecimal);
      annualReceiptCount += 1;
    }

    await prisma.auditLog.create({
      data: {
        schoolId,
        userId: userId || null,
        action: REPORT_AUDIT_EVENTS.VIEW_REPORT,
        entityType: 'MonthlyCollectionReport',
        newValues: { year: targetYear, annualTotal: annualTotalDecimal.toString() },
      },
    });

    return {
      year: targetYear,
      academicYearId: academicYearId || null,
      monthlyBreakdown: monthlyData,
      summary: {
        annualTotal: Number(annualTotalDecimal),
        annualReceiptCount,
      },
    };
  },

  /**
   * Class-wise collection and outstanding dues breakdown.
   *
   * @param {string} schoolId
   * @param {Object} query
   * @param {string} [userId]
   */
  async getClassCollection(schoolId, query = {}, userId) {
    const { academicYearId } = query;

    const classes = await prisma.class.findMany({
      where: { schoolId, isActive: true },
      include: {
        enrollments: {
          where: {
            status: 'ACTIVE',
            ...(academicYearId && { academicYearId }),
          },
          select: { id: true, studentId: true },
        },
      },
      orderBy: { order: 'asc' },
    });

    const classSummaries = [];
    let overallCollectionDecimal = new Prisma.Decimal(0);
    let overallOutstandingDecimal = new Prisma.Decimal(0);

    for (const cls of classes) {
      const studentIds = cls.enrollments.map((e) => e.studentId);
      const studentCount = studentIds.length;

      if (studentIds.length === 0) {
        classSummaries.push({
          classId: cls.id,
          className: cls.name,
          studentCount: 0,
          collection: 0,
          outstanding: 0,
        });
        continue;
      }

      // Calculate total collection for students in this class from successful allocations
      const collectionAgg = await prisma.paymentAllocation.aggregate({
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
        _sum: {
          allocatedAmount: true,
        },
      });

      const totalCollection = collectionAgg._sum.allocatedAmount || new Prisma.Decimal(0);

      // Calculate outstanding dues for non-VOID, non-WAIVED charges
      const outstandingCharges = await prisma.studentFeeCharge.findMany({
        where: {
          schoolId,
          studentId: { in: studentIds },
          status: { in: ['UNPAID', 'PARTIAL'] },
          ...(academicYearId && { academicYearId }),
        },
        select: {
          amount: true,
          paidAmount: true,
        },
      });

      let classOutstandingDecimal = new Prisma.Decimal(0);
      for (const c of outstandingCharges) {
        const cAmt = new Prisma.Decimal(c.amount);
        const cPaid = new Prisma.Decimal(c.paidAmount || 0);
        const remaining = Prisma.Decimal.max(new Prisma.Decimal(0), cAmt.minus(cPaid));
        classOutstandingDecimal = classOutstandingDecimal.plus(remaining);
      }

      overallCollectionDecimal = overallCollectionDecimal.plus(totalCollection);
      overallOutstandingDecimal = overallOutstandingDecimal.plus(classOutstandingDecimal);

      classSummaries.push({
        classId: cls.id,
        className: cls.name,
        studentCount,
        collection: Number(totalCollection),
        outstanding: Number(classOutstandingDecimal),
      });
    }

    await prisma.auditLog.create({
      data: {
        schoolId,
        userId: userId || null,
        action: REPORT_AUDIT_EVENTS.VIEW_REPORT,
        entityType: 'ClassCollectionReport',
        newValues: { totalClasses: classes.length },
      },
    });

    return {
      academicYearId: academicYearId || null,
      classes: classSummaries,
      summary: {
        totalCollection: Number(overallCollectionDecimal),
        totalOutstanding: Number(overallOutstandingDecimal),
      },
    };
  },

  /**
   * Outstanding dues report filtered by class, section, medium, stream, and student.
   *
   * @param {string} schoolId
   * @param {Object} query
   * @param {string} [userId]
   */
  async getDuesReport(schoolId, query = {}, userId) {
    const {
      academicYearId,
      classId,
      sectionId,
      mediumId,
      streamId,
      studentId,
      status,
      page = 1,
      limit = 10,
    } = query;

    const skip = (Number(page) - 1) * Number(limit);

    const chargeWhere = {
      schoolId,
      status: status ? status : { in: ['UNPAID', 'PARTIAL'] },
      ...(academicYearId && { academicYearId }),
      ...(studentId && { studentId }),
    };

    if (classId || sectionId || mediumId || streamId) {
      chargeWhere.studentEnrollment = {
        ...(classId && { classId }),
        ...(sectionId && { sectionId }),
        ...(mediumId && { mediumId }),
        ...(streamId && { streamId }),
      };
    }

    // Group charges by student to form student dues statement
    const charges = await prisma.studentFeeCharge.findMany({
      where: chargeWhere,
      include: {
        student: {
          select: { id: true, name: true, admissionNo: true, phone: true },
        },
        studentEnrollment: {
          include: {
            class: { select: { id: true, name: true } },
            section: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const studentDuesMap = new Map();

    for (const c of charges) {
      const sId = c.studentId;
      if (!studentDuesMap.has(sId)) {
        studentDuesMap.set(sId, {
          studentId: sId,
          studentName: c.student?.name,
          admissionNo: c.student?.admissionNo,
          phone: c.student?.phone,
          className: c.studentEnrollment?.class?.name || '',
          sectionName: c.studentEnrollment?.section?.name || '',
          totalChargesDecimal: new Prisma.Decimal(0),
          totalPaidDecimal: new Prisma.Decimal(0),
          unpaidChargesCount: 0,
        });
      }

      const entry = studentDuesMap.get(sId);
      const amtDecimal = new Prisma.Decimal(c.amount);
      const paidDecimal = new Prisma.Decimal(c.paidAmount || 0);

      entry.totalChargesDecimal = entry.totalChargesDecimal.plus(amtDecimal);
      entry.totalPaidDecimal = entry.totalPaidDecimal.plus(paidDecimal);
      entry.unpaidChargesCount += 1;
    }

    const allDuesList = Array.from(studentDuesMap.values()).map((entry) => {
      const outstandingDecimal = Prisma.Decimal.max(
        new Prisma.Decimal(0),
        entry.totalChargesDecimal.minus(entry.totalPaidDecimal)
      );

      return {
        studentId: entry.studentId,
        studentName: entry.studentName,
        admissionNo: entry.admissionNo,
        phone: entry.phone,
        className: entry.className,
        sectionName: entry.sectionName,
        totalCharges: Number(entry.totalChargesDecimal),
        totalPaid: Number(entry.totalPaidDecimal),
        outstandingBalance: Number(outstandingDecimal),
        unpaidChargesCount: entry.unpaidChargesCount,
      };
    });

    const totalStudents = allDuesList.length;
    const paginatedList = allDuesList.slice(skip, skip + Number(limit));

    const totalOutstandingDecimal = allDuesList.reduce(
      (sum, item) => sum.plus(new Prisma.Decimal(item.outstandingBalance)),
      new Prisma.Decimal(0)
    );

    await prisma.auditLog.create({
      data: {
        schoolId,
        userId: userId || null,
        action: REPORT_AUDIT_EVENTS.VIEW_REPORT,
        entityType: 'DuesReport',
        newValues: { totalStudentsWithDue: totalStudents },
      },
    });

    return {
      data: paginatedList,
      pagination: {
        total: totalStudents,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalStudents / Number(limit)),
      },
      summary: {
        totalStudentsWithDue: totalStudents,
        totalOutstanding: Number(totalOutstandingDecimal),
      },
    };
  },

  /**
   * Export-ready payments JSON report dataset.
   *
   * @param {string} schoolId
   * @param {Object} query
   * @param {string} [userId]
   */
  async getExportPayments(schoolId, query = {}, userId) {
    const { academicYearId, startDate, endDate, paymentMode, status, classId } = query;

    const whereClause = {
      schoolId,
      ...(academicYearId && { academicYearId }),
      ...(status && { status }),
      ...(paymentMode && { paymentMode }),
    };

    if (startDate || endDate) {
      whereClause.paymentDate = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(`${endDate}T23:59:59.999Z`) }),
      };
    }

    if (classId) {
      whereClause.allocations = {
        some: {
          charge: {
            studentEnrollment: { classId },
          },
        },
      };
    }

    const payments = await prisma.feePayment.findMany({
      where: whereClause,
      include: {
        student: { select: { id: true, name: true, admissionNo: true } },
        academicYear: { select: { id: true, name: true } },
        receivedBy: { select: { id: true, name: true } },
        allocations: {
          include: {
            charge: {
              include: {
                studentEnrollment: {
                  include: { class: { select: { name: true } } },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const exportRows = payments.map((p) => {
      const firstClass = p.allocations[0]?.charge?.studentEnrollment?.class?.name || 'N/A';
      return {
        receiptNumber: p.receiptNumber,
        paymentDate: p.paymentDate,
        studentName: p.student?.name,
        admissionNo: p.student?.admissionNo,
        className: firstClass,
        receivedAmount: Number(p.receivedAmount),
        paymentMode: p.paymentMode,
        referenceNumber: p.referenceNumber || '',
        collectedBy: p.receivedBy?.name || '',
        status: p.status,
        remarks: p.remarks || '',
      };
    });

    await prisma.auditLog.create({
      data: {
        schoolId,
        userId: userId || null,
        action: REPORT_AUDIT_EVENTS.VIEW_REPORT,
        entityType: 'ExportPaymentsReport',
        newValues: { exportRowCount: exportRows.length },
      },
    });

    return exportRows;
  },
};

export default reportService;
