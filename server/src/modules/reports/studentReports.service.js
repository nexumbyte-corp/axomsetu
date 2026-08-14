import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';

export const studentReportsService = {
  /**
   * Student Directory Report with filters and pagination.
   */
  async getStudentDirectory(schoolId, query = {}, userId) {
    const {
      academicYearId,
      classId,
      sectionId,
      mediumId,
      streamId,
      status,
      search,
      page = 1,
      limit = 20,
    } = query;

    const skip = (Number(page) - 1) * Number(limit);

    const enrollmentWhere = {
      schoolId,
      ...(academicYearId && { academicYearId }),
      ...(classId && { classId }),
      ...(sectionId && { sectionId }),
      ...(mediumId && { mediumId }),
      ...(streamId && { streamId }),
      ...(status && { status }),
      ...(search && {
        student: {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { admissionNo: { contains: search, mode: 'insensitive' } },
            { guardianName: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ],
        },
      }),
    };

    const [total, enrollments] = await Promise.all([
      prisma.studentEnrollment.count({ where: enrollmentWhere }),
      prisma.studentEnrollment.findMany({
        where: enrollmentWhere,
        include: {
          student: {
            select: { id: true, admissionNo: true, name: true, guardianName: true, phone: true, status: true },
          },
          class: { select: { id: true, name: true } },
          section: { select: { id: true, name: true } },
          medium: { select: { id: true, name: true } },
          stream: { select: { id: true, name: true } },
        },
        orderBy: [
          { class: { order: 'asc' } },
          { rollNo: 'asc' },
          { student: { name: 'asc' } },
        ],
        skip,
        take: Number(limit),
      }),
    ]);

    const data = enrollments.map((e) => ({
      id: e.id,
      studentId: e.studentId,
      admissionNo: e.student.admissionNo,
      studentName: e.student.name,
      guardianName: e.student.guardianName,
      phone: e.student.phone || '-',
      className: e.class?.name || '-',
      sectionName: e.section?.name || '-',
      mediumName: e.medium?.name || '-',
      streamName: e.stream?.name || '-',
      status: e.status || e.student.status,
    }));

    if (userId) {
      await prisma.auditLog.create({
        data: {
          schoolId,
          userId,
          action: 'VIEW_REPORT',
          entityType: 'StudentDirectoryReport',
          newValues: { count: data.length, total },
        },
      });
    }

    return {
      data,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
      summary: {
        totalStudents: total,
      },
    };
  },

  /**
   * Class-wise Student List Report
   */
  async getClassWiseStudents(schoolId, query = {}, userId) {
    const { academicYearId, classId, mediumId, streamId } = query;

    const classes = await prisma.class.findMany({
      where: {
        schoolId,
        isActive: true,
        ...(classId && { id: classId }),
      },
      orderBy: { order: 'asc' },
    });

    const reportData = [];
    let totalStudentsCount = 0;

    for (const cls of classes) {
      const enrollments = await prisma.studentEnrollment.findMany({
        where: {
          schoolId,
          classId: cls.id,
          status: 'ACTIVE',
          ...(academicYearId && { academicYearId }),
          ...(mediumId && { mediumId }),
          ...(streamId && { streamId }),
        },
        include: {
          student: {
            select: { id: true, admissionNo: true, name: true, guardianName: true, phone: true },
          },
          section: { select: { name: true } },
          medium: { select: { name: true } },
          stream: { select: { name: true } },
        },
        orderBy: [{ rollNo: 'asc' }, { student: { name: 'asc' } }],
      });

      totalStudentsCount += enrollments.length;

      reportData.push({
        classId: cls.id,
        className: cls.name,
        studentCount: enrollments.length,
        students: enrollments.map((e, idx) => ({
          sNo: idx + 1,
          admissionNo: e.student.admissionNo,
          studentName: e.student.name,
          guardianName: e.student.guardianName,
          phone: e.student.phone || '-',
          sectionName: e.section?.name || '-',
          mediumName: e.medium?.name || '-',
          streamName: e.stream?.name || '-',
        })),
      });
    }

    return {
      data: reportData,
      summary: {
        totalClasses: classes.length,
        totalStudents: totalStudentsCount,
      },
    };
  },

  /**
   * Section-wise Student Report
   */
  async getSectionWiseStudents(schoolId, query = {}, userId) {
    const { academicYearId, classId, sectionId } = query;

    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        schoolId,
        status: 'ACTIVE',
        ...(academicYearId && { academicYearId }),
        ...(classId && { classId }),
        ...(sectionId && { sectionId }),
      },
      include: {
        student: { select: { admissionNo: true, name: true, guardianName: true, phone: true } },
        class: { select: { name: true } },
        section: { select: { name: true } },
      },
      orderBy: [{ class: { order: 'asc' } }, { section: { name: 'asc' } }, { student: { name: 'asc' } }],
    });

    const sectionMap = new Map();

    for (const e of enrollments) {
      const key = `${e.class?.name || 'Unassigned'} - Section ${e.section?.name || 'Unassigned'}`;
      if (!sectionMap.has(key)) {
        sectionMap.set(key, []);
      }
      sectionMap.get(key).push({
        admissionNo: e.student.admissionNo,
        studentName: e.student.name,
        guardianName: e.student.guardianName,
        phone: e.student.phone || '-',
        className: e.class?.name || '-',
        sectionName: e.section?.name || '-',
      });
    }

    const groupedData = Array.from(sectionMap.entries()).map(([sectionGroup, students]) => ({
      sectionGroup,
      studentCount: students.length,
      students,
    }));

    return {
      data: groupedData,
      summary: {
        totalGroups: groupedData.length,
        totalStudents: enrollments.length,
      },
    };
  },

  /**
   * Medium-wise Student Report
   */
  async getMediumWiseStudents(schoolId, query = {}, userId) {
    const { academicYearId, mediumId } = query;

    const mediums = await prisma.medium.findMany({
      where: { schoolId, isActive: true, ...(mediumId && { id: mediumId }) },
      orderBy: { name: 'asc' },
    });

    const result = [];
    let grandTotal = 0;

    for (const med of mediums) {
      const count = await prisma.studentEnrollment.count({
        where: {
          schoolId,
          mediumId: med.id,
          status: 'ACTIVE',
          ...(academicYearId && { academicYearId }),
        },
      });

      grandTotal += count;
      result.push({
        mediumId: med.id,
        mediumName: med.name,
        studentCount: count,
      });
    }

    return {
      data: result,
      summary: {
        totalMediums: mediums.length,
        totalStudents: grandTotal,
      },
    };
  },

  /**
   * Stream-wise Student Report (Only applicable to High School / Senior Secondary)
   */
  async getStreamWiseStudents(schoolId, query = {}, userId) {
    const { academicYearId, streamId } = query;

    const streams = await prisma.stream.findMany({
      where: { schoolId, isActive: true, ...(streamId && { id: streamId }) },
      orderBy: { name: 'asc' },
    });

    const result = [];
    let grandTotal = 0;

    for (const str of streams) {
      const count = await prisma.studentEnrollment.count({
        where: {
          schoolId,
          streamId: str.id,
          status: 'ACTIVE',
          ...(academicYearId && { academicYearId }),
        },
      });

      grandTotal += count;
      result.push({
        streamId: str.id,
        streamName: str.name,
        studentCount: count,
      });
    }

    return {
      data: result,
      summary: {
        totalStreams: streams.length,
        totalStudents: grandTotal,
      },
    };
  },

  /**
   * Student Status Breakdown Report
   */
  async getStudentStatusReport(schoolId, query = {}, userId) {
    const statuses = ['ACTIVE', 'LEFT', 'GRADUATED', 'ARCHIVED'];
    const breakdown = [];
    let totalAll = 0;

    for (const st of statuses) {
      const count = await prisma.student.count({
        where: { schoolId, status: st },
      });
      totalAll += count;
      breakdown.push({
        status: st,
        count,
      });
    }

    return {
      data: breakdown,
      summary: {
        totalStudents: totalAll,
      },
    };
  },
};
