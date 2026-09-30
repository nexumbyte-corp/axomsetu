import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';

export const feeReportsService = {
  /**
   * Detailed Fee Collection Report
   */
  async getCollectionReport(schoolId, query = {}, _userId) {
    const {
      academicYearId,
      startDate,
      endDate,
      classId,
      mediumId,
      streamId,
      feeTypeId,
      paymentMode,
      month,
      page = 1,
      limit = 20,
    } = query;

    const numLimit = Number(limit);
    const isUnlimited = numLimit <= 0 || numLimit >= 10000;
    const skip = isUnlimited ? undefined : (Number(page) - 1) * numLimit;

    const paymentWhere = {
      schoolId,
      status: 'SUCCESS',
      ...(academicYearId && { academicYearId }),
      ...(paymentMode && { paymentMode }),
    };

    if (startDate || endDate) {
      paymentWhere.paymentDate = {
        ...(startDate && { gte: new Date(`${startDate}T00:00:00.000+05:30`) }),
        ...(endDate && { lte: new Date(`${endDate}T23:59:59.999+05:30`) }),
      };
    }

    if (classId || mediumId || streamId || feeTypeId || month) {
      paymentWhere.allocations = {
        some: {
          charge: {
            ...(feeTypeId && { feeTypeId }),
            ...(month && { month: String(month).toUpperCase() }),
            studentEnrollment: {
              ...(classId && { classId }),
              ...(mediumId && { mediumId }),
              ...(streamId && { streamId }),
            },
          },
        },
      };
    }

    const [total, payments, modeAgg] = await Promise.all([
      prisma.feePayment.count({ where: paymentWhere }),
      prisma.feePayment.findMany({
        where: paymentWhere,
        include: {
          student: { select: { id: true, name: true, admissionNo: true } },
          allocations: {
            include: {
              charge: {
                select: {
                  feeType: { select: { name: true } },
                  studentEnrollment: {
                    select: {
                      class: { select: { name: true } },
                      section: { select: { name: true } },
                      medium: { select: { name: true } },
                      stream: { select: { name: true } },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { paymentDate: 'desc' },
        ...(skip !== undefined && { skip }),
        ...(!isUnlimited && { take: numLimit }),
      }),
      prisma.feePayment.groupBy({
        by: ['paymentMode'],
        where: paymentWhere,
        _sum: { receivedAmount: true },
        _count: { id: true },
      }),
    ]);

    const modeSummary = {
      CASH: 0,
      UPI: 0,
      BANK_TRANSFER: 0,
      CHEQUE: 0,
      DEMAND_DRAFT: 0,
      POS: 0,
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
      const enr = firstAlloc?.charge?.studentEnrollment;
      const clsName = enr?.class?.name || '-';
      const secName = enr?.section?.name;
      const medName = enr?.medium?.name;
      const strmName = enr?.stream?.name;

      let fullClass = clsName;
      if (secName && secName !== '-') fullClass += ` - ${secName}`;
      const extras = [medName, strmName].filter((x) => x && x !== '-').join(' / ');
      if (extras) fullClass += ` (${extras})`;

      const feeTypes = Array.from(
        new Set(p.allocations.map((a) => a.charge?.feeType?.name).filter(Boolean))
      ).join(', ') || 'General Fee';

      return {
        id: p.id,
        date: p.paymentDate,
        receiptNo: p.receiptNumber,
        studentName: p.student?.name || '-',
        admissionNo: p.student?.admissionNo || '-',
        className: fullClass,
        sectionName: secName || '-',
        mediumName: medName || '-',
        streamName: strmName || '-',
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
  async getOutstandingReport(schoolId, query = {}, _userId) {
    const {
      academicYearId,
      classId,
      sectionId,
      mediumId,
      streamId,
      status,
      month,
      page = 1,
      limit = 20,
    } = query;

    const numLimit = Number(limit);
    const isUnlimited = numLimit <= 0 || numLimit >= 10000;
    const skip = isUnlimited ? 0 : (Number(page) - 1) * numLimit;

    const chargeWhere = {
      schoolId,
      status: status ? status : { in: ['UNPAID', 'PARTIAL'] },
      ...(academicYearId && { academicYearId }),
      ...(month && { month: String(month).toUpperCase() }),
    };

    if (classId || sectionId || mediumId || streamId) {
      chargeWhere.studentEnrollment = {
        ...(classId && { classId }),
        ...(sectionId && { sectionId }),
        ...(mediumId && { mediumId }),
        ...(streamId && { streamId }),
      };
    }

    // 1. Group by studentId directly in DB with aggregates
    const groups = await prisma.studentFeeCharge.groupBy({
      by: ['studentId'],
      where: chargeWhere,
      _sum: { amount: true, paidAmount: true },
      _count: { id: true },
    });

    let totalOutstanding = 0;
    const allDues = [];

    for (const g of groups) {
      const charged = Number(g._sum.amount || 0);
      const paid = Number(g._sum.paidAmount || 0);
      const balance = Math.max(0, charged - paid);

      if (status === 'PAID' || balance > 0) {
        totalOutstanding += balance;
        allDues.push({
          studentId: g.studentId,
          totalCharged: charged,
          paidAmount: paid,
          balance,
          status: paid > 0 ? 'PARTIAL' : 'UNPAID',
        });
      }
    }

    // Order by highest outstanding balance first
    allDues.sort((a, b) => b.balance - a.balance);

    const totalStudents = allDues.length;
    const paginatedDues = isUnlimited ? allDues : allDues.slice(skip, skip + numLimit);
    const targetStudentIds = paginatedDues.map((d) => d.studentId);

    // 2. Fetch student profile & active enrollment for ONLY the paginated slice
    const studentInfoMap = new Map();
    if (targetStudentIds.length > 0) {
      const students = await prisma.student.findMany({
        where: { id: { in: targetStudentIds } },
        select: {
          id: true,
          name: true,
          admissionNo: true,
          phone: true,
          guardianName: true,
          enrollments: {
            where: {
              schoolId,
              ...(academicYearId && { academicYearId }),
              ...(classId && { classId }),
              ...(sectionId && { sectionId }),
            },
            select: {
              class: { select: { name: true } },
              section: { select: { name: true } },
              medium: { select: { name: true } },
              stream: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      for (const s of students) {
        const enr = s.enrollments?.[0];
        const clsName = enr?.class?.name || '-';
        const secName = enr?.section?.name;
        const medName = enr?.medium?.name;
        const strmName = enr?.stream?.name;

        let fullClass = clsName;
        if (secName && secName !== '-') fullClass += ` - ${secName}`;
        const extras = [medName, strmName].filter((x) => x && x !== '-').join(' / ');
        if (extras) fullClass += ` (${extras})`;

        studentInfoMap.set(s.id, {
          studentName: s.name || '-',
          admissionNo: s.admissionNo || '-',
          guardianName: s.guardianName || '-',
          phone: s.phone || '-',
          className: fullClass,
          sectionName: secName || '-',
        });
      }
    }

    const finalData = paginatedDues.map((item) => {
      const info = studentInfoMap.get(item.studentId) || {};
      return {
        studentId: item.studentId,
        studentName: info.studentName || '-',
        admissionNo: info.admissionNo || '-',
        guardianName: info.guardianName || '-',
        phone: info.phone || '-',
        className: info.className || '-',
        sectionName: info.sectionName || '-',
        totalCharged: item.totalCharged,
        paidAmount: item.paidAmount,
        balance: item.balance,
        status: item.status,
      };
    });

    return {
      data: finalData,
      pagination: {
        total: totalStudents,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalStudents / Number(limit)),
      },
      summary: {
        totalOutstanding,
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
      select: { id: true, name: true, admissionNo: true, phone: true, guardianName: true },
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

    // Fetch classes and their active student counts in parallel with aggregated totals
    const [classes, collByClassRows, duesByClassRows] = await Promise.all([
      prisma.class.findMany({
        where: { schoolId, isActive: true },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              enrollments: {
                where: {
                  status: 'ACTIVE',
                  ...(academicYearId && { academicYearId }),
                },
              },
            },
          },
        },
        orderBy: { order: 'asc' },
      }),
      prisma.$queryRaw`
        SELECT
          se.class_id,
          COALESCE(SUM(pa.allocated_amount), 0)::FLOAT AS "collection"
        FROM payment_allocations pa
        JOIN student_fee_charges sfc ON pa.charge_id = sfc.id
        JOIN student_enrollments se ON sfc.student_enrollment_id = se.id
        JOIN fee_payments fp ON pa.payment_id = fp.id
        WHERE fp.school_id = ${schoolId}::uuid
          AND fp.status = 'SUCCESS'
          ${academicYearId ? Prisma.sql`AND fp.academic_year_id = ${academicYearId}::uuid` : Prisma.empty}
        GROUP BY se.class_id
      `,
      prisma.$queryRaw`
        SELECT
          se.class_id,
          COALESCE(SUM(GREATEST(0, sfc.amount - sfc.paid_amount)), 0)::FLOAT AS "outstanding"
        FROM student_fee_charges sfc
        JOIN student_enrollments se ON sfc.student_enrollment_id = se.id
        WHERE sfc.school_id = ${schoolId}::uuid
          AND sfc.status IN ('UNPAID', 'PARTIAL')
          ${academicYearId ? Prisma.sql`AND sfc.academic_year_id = ${academicYearId}::uuid` : Prisma.empty}
        GROUP BY se.class_id
      `,
    ]);

    const collMap = new Map();
    for (const r of collByClassRows) {
      collMap.set(r.class_id, Number(r.collection || 0));
    }

    const duesMap = new Map();
    for (const r of duesByClassRows) {
      duesMap.set(r.class_id, Number(r.outstanding || 0));
    }

    let grandCollection = 0;
    let grandOutstanding = 0;

    const result = classes.map((cls) => {
      const studentCount = cls._count?.enrollments || 0;
      const collection = collMap.get(cls.id) || 0;
      const outstanding = duesMap.get(cls.id) || 0;

      grandCollection += collection;
      grandOutstanding += outstanding;

      return {
        classId: cls.id,
        className: cls.name,
        studentCount,
        collection,
        outstanding,
      };
    });

    return {
      data: result,
      summary: {
        totalCollection: grandCollection,
        totalOutstanding: grandOutstanding,
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
