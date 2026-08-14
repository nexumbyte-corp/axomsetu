import { prisma } from '../../config/prisma.js';

export const academicReportsService = {
  /**
   * Class Strength Report
   */
  async getClassStrengthReport(schoolId, query = {}) {
    const { academicYearId } = query;

    const classes = await prisma.class.findMany({
      where: { schoolId, isActive: true },
      include: {
        enrollments: {
          where: {
            status: 'ACTIVE',
            ...(academicYearId && { academicYearId }),
          },
          select: {
            id: true,
            sectionId: true,
            mediumId: true,
            streamId: true,
          },
        },
      },
      orderBy: { order: 'asc' },
    });

    let totalStudents = 0;
    const report = classes.map((cls) => {
      const count = cls.enrollments.length;
      totalStudents += count;
      return {
        classId: cls.id,
        className: cls.name,
        code: cls.code || '-',
        hasStream: cls.hasStream,
        studentCount: count,
      };
    });

    return {
      data: report,
      summary: {
        totalClasses: classes.length,
        totalStudents,
      },
    };
  },

  /**
   * Academic Year Enrollment Summary
   */
  async getEnrollmentReport(schoolId, query = {}) {
    const { academicYearId } = query;

    const statuses = ['ACTIVE', 'PROMOTED', 'REPEATED', 'LEFT'];
    const summaryList = [];
    let totalCount = 0;

    for (const status of statuses) {
      const count = await prisma.studentEnrollment.count({
        where: {
          schoolId,
          status,
          ...(academicYearId && { academicYearId }),
        },
      });
      totalCount += count;
      summaryList.push({ status, count });
    }

    return {
      data: summaryList,
      summary: {
        totalEnrollments: totalCount,
      },
    };
  },
};
