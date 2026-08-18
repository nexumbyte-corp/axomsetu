import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { isStaffOperationallyActive } from '../../utils/staffHelpers.js';

export const salarySetupService = {
  /**
   * Get Salary Setup for a given Academic Year.
   * Compares against previous academic year setup if available.
   */
  async getSalarySetup(schoolId, academicYearId) {
    const academicYear = await prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId },
    });

    if (!academicYear) {
      throw ApiError.notFound('Academic year not found.');
    }

    // Find previous academic year (by startDate or name order)
    const allYears = await prisma.academicYear.findMany({
      where: { schoolId },
      orderBy: { startDate: 'asc' },
    });

    const currIdx = allYears.findIndex((y) => y.id === academicYearId);
    const prevYear = currIdx > 0 ? allYears[currIdx - 1] : null;

    // Fetch active staff for the school
    const staffList = await prisma.staff.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
    });

    // Filter operationally active staff
    const activeStaff = staffList.filter(isStaffOperationallyActive);

    // Fetch current target year setups
    const currentSetups = await prisma.staffSalarySetup.findMany({
      where: { schoolId, academicYearId },
    });
    const currentSetupMap = new Map(currentSetups.map((s) => [s.staffId, s]));

    // Fetch previous year setups if available
    let prevSetupMap = new Map();
    if (prevYear) {
      const prevSetups = await prisma.staffSalarySetup.findMany({
        where: { schoolId, academicYearId: prevYear.id },
      });
      prevSetupMap = new Map(prevSetups.map((s) => [s.staffId, s]));
    }

    // Map each staff member to their salary setup view
    const rows = activeStaff.map((st) => {
      const currentSetup = currentSetupMap.get(st.id);
      const prevSetup = prevSetupMap.get(st.id);

      const previousSalary = prevSetup
        ? Number(prevSetup.baseSalary)
        : Number(st.baseSalary || 0);

      const newSalary = currentSetup
        ? Number(currentSetup.baseSalary)
        : previousSalary;

      const diff = newSalary - previousSalary;
      const status = diff === 0 ? 'Same' : 'Changed';

      // Effective from date default: April 1st of the academic year
      const defaultEffectiveFrom = academicYear.startDate
        ? new Date(academicYear.startDate)
        : new Date();

      return {
        staffId: st.id,
        employeeId: st.employeeId,
        name: st.name,
        department: st.department,
        designation: st.designation,
        previousSalary,
        newSalary,
        change: diff,
        status,
        effectiveFrom: currentSetup?.effectiveFrom || defaultEffectiveFrom,
        components: currentSetup?.components || null,
        isConfigured: !!currentSetup,
      };
    });

    return {
      academicYear: {
        id: academicYear.id,
        name: academicYear.name,
        isCurrent: academicYear.isCurrent,
        isLocked: academicYear.isLocked,
      },
      previousYear: prevYear
        ? { id: prevYear.id, name: prevYear.name }
        : null,
      rows,
    };
  },

  /**
   * Copy Previous Year's Salary Setup into Target Academic Year.
   * Does NOT overwrite previous year records.
   */
  async copyPreviousYearSalary(schoolId, academicYearId, _userId) {
    const academicYear = await prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId },
    });

    if (!academicYear) {
      throw ApiError.notFound('Target academic year not found.');
    }

    // Find previous academic year
    const allYears = await prisma.academicYear.findMany({
      where: { schoolId },
      orderBy: { startDate: 'asc' },
    });

    const currIdx = allYears.findIndex((y) => y.id === academicYearId);
    if (currIdx <= 0) {
      throw ApiError.badRequest('No previous academic year found to copy salary setup from.');
    }

    const prevYear = allYears[currIdx - 1];

    // Fetch active staff
    const staffList = await prisma.staff.findMany({
      where: { schoolId },
    });
    const activeStaff = staffList.filter(isStaffOperationallyActive);

    // Fetch previous year's salary setups
    const prevSetups = await prisma.staffSalarySetup.findMany({
      where: { schoolId, academicYearId: prevYear.id },
    });
    const prevSetupMap = new Map(prevSetups.map((s) => [s.staffId, s]));

    const defaultEffectiveFrom = new Date(academicYear.startDate || new Date());

    return await prisma.$transaction(async (tx) => {
      let createdCount = 0;
      let updatedCount = 0;

      for (const st of activeStaff) {
        const prevSetup = prevSetupMap.get(st.id);
        const salaryToCopy = prevSetup ? Number(prevSetup.baseSalary) : Number(st.baseSalary || 0);
        const componentsToCopy = prevSetup?.components || null;

        const existingCurrent = await tx.staffSalarySetup.findUnique({
          where: {
            schoolId_staffId_academicYearId: {
              schoolId,
              staffId: st.id,
              academicYearId,
            },
          },
        });

        if (existingCurrent) {
          await tx.staffSalarySetup.update({
            where: { id: existingCurrent.id },
            data: {
              baseSalary: salaryToCopy,
              components: componentsToCopy,
              effectiveFrom: defaultEffectiveFrom,
            },
          });
          updatedCount++;
        } else {
          await tx.staffSalarySetup.create({
            data: {
              schoolId,
              staffId: st.id,
              academicYearId,
              baseSalary: salaryToCopy,
              components: componentsToCopy,
              effectiveFrom: defaultEffectiveFrom,
            },
          });
          createdCount++;
        }

        // If target year is current, update staff's active baseSalary
        if (academicYear.isCurrent) {
          await tx.staff.update({
            where: { id: st.id },
            data: { baseSalary: salaryToCopy },
          });
        }
      }

      return {
        message: `Successfully copied salary setup from ${prevYear.name} to ${academicYear.name}.`,
        totalProcessed: activeStaff.length,
        createdCount,
        updatedCount,
      };
    });
  },

  /**
   * Save / Revise Salary Setup for Academic Year
   */
  async saveSalarySetup(schoolId, academicYearId, payload, _userId) {
    const { rows, effectiveFrom } = payload;

    if (!Array.isArray(rows) || rows.length === 0) {
      throw ApiError.badRequest('Salary setup rows array is required.');
    }

    const academicYear = await prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId },
    });

    if (!academicYear) {
      throw ApiError.notFound('Academic year not found.');
    }

    const effDate = effectiveFrom ? new Date(effectiveFrom) : new Date(academicYear.startDate || new Date());

    return await prisma.$transaction(async (tx) => {
      let savedCount = 0;

      for (const row of rows) {
        const staffId = row.staffId;
        const newSalary = Number(row.newSalary);

        if (isNaN(newSalary) || newSalary < 0) {
          continue;
        }

        const existing = await tx.staffSalarySetup.findUnique({
          where: {
            schoolId_staffId_academicYearId: {
              schoolId,
              staffId,
              academicYearId,
            },
          },
        });

        if (existing) {
          await tx.staffSalarySetup.update({
            where: { id: existing.id },
            data: {
              baseSalary: newSalary,
              effectiveFrom: effDate,
              components: row.components !== undefined ? row.components : existing.components,
            },
          });
        } else {
          await tx.staffSalarySetup.create({
            data: {
              schoolId,
              staffId,
              academicYearId,
              baseSalary: newSalary,
              effectiveFrom: effDate,
              components: row.components || null,
            },
          });
        }

        // If active current year, keep baseSalary synced on Staff model
        if (academicYear.isCurrent) {
          await tx.staff.update({
            where: { id: staffId },
            data: { baseSalary: newSalary },
          });
        }

        savedCount++;
      }

      return {
        message: 'Salary setup saved successfully.',
        savedCount,
      };
    });
  },
};
