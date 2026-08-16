import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { generateNextDocumentNumber } from '../../utils/documentSequence.js';
import { isStaffEligibleForMonth, isStaffOperationallyActive } from '../../utils/staffHelpers.js';
import { financialLedgerService } from '../finance/financialLedger.service.js';

export const payrollService = {
  /**
   * List prepared monthly payroll records for a school/month/year
   */
  async getMonthlyPayroll(schoolId, query = {}) {
    const { academicYearId, month, year } = query;

    if (!month || !year) {
      throw ApiError.badRequest('Month and Year query parameters are required.');
    }

    const yr = parseInt(year, 10);
    const where = {
      schoolId,
      month: month.toUpperCase(),
      year: yr,
    };

    if (academicYearId) {
      where.academicYearId = academicYearId;
    }

    const payrolls = await prisma.monthlyPayroll.findMany({
      where,
      include: {
        staff: {
          select: {
            id: true,
            employeeId: true,
            name: true,
            role: true,
            department: true,
            designation: true,
            status: true,
            advanceBalance: true,
          },
        },
      },
      orderBy: { staff: { name: 'asc' } },
    });

    const summary = payrolls.reduce(
      (acc, p) => {
        acc.totalBaseSalary += Number(p.baseSalary);
        acc.totalNetSalary += Number(p.netSalary);
        acc.totalPaidAmount += Number(p.paidAmount);
        if (p.status === 'PAID') acc.paidCount++;
        else if (p.status === 'PARTIAL') acc.partialCount++;
        else acc.unpaidCount++;
        return acc;
      },
      { totalBaseSalary: 0, totalNetSalary: 0, totalPaidAmount: 0, paidCount: 0, partialCount: 0, unpaidCount: 0 }
    );

    return {
      month,
      year: yr,
      totalCount: payrolls.length,
      summary,
      payrolls,
    };
  },

  /**
   * Helper: Calculate available advance for future payroll allocation
   * Available = Staff.advanceBalance - (Sum of advanceDeduction on UNPAID/PARTIAL payrolls except excludePayrollId)
   */
  async getStaffAdvanceAvailability(tx, schoolId, staffId, excludePayrollId = null) {
    const staff = await tx.staff.findFirst({
      where: { id: staffId, schoolId },
      select: { id: true, advanceBalance: true },
    });

    if (!staff) {
      return { advanceBalance: 0, pendingAllocation: 0, availableAdvance: 0 };
    }

    const currentAdvBalance = Number(staff.advanceBalance || 0);

    const pendingPayrollWhere = {
      schoolId,
      staffId,
      status: { in: ['UNPAID', 'PARTIAL'] },
      ...(excludePayrollId && { id: { not: excludePayrollId } }),
    };

    const pendingPayrolls = await tx.monthlyPayroll.findMany({
      where: pendingPayrollWhere,
      select: { advanceDeduction: true },
    });

    const pendingAllocation = pendingPayrolls.reduce(
      (sum, p) => sum + Number(p.advanceDeduction || 0),
      0
    );

    const availableAdvance = Math.max(0, currentAdvBalance - pendingAllocation);

    return {
      advanceBalance: currentAdvBalance,
      pendingAllocation,
      availableAdvance,
    };
  },

  /**
   * Helper: Allocate/reserve advance deduction across open advances in FIFO order
   */
  async allocateAdvanceToPayroll(tx, schoolId, staffId, monthlyPayrollId, advanceDeduction) {
    // Clear existing ALLOCATED records for this monthlyPayrollId
    await tx.staffAdvanceAllocation.deleteMany({
      where: { monthlyPayrollId, status: 'ALLOCATED' },
    });

    if (advanceDeduction <= 0) return;

    // Fetch open advances ordered by advanceDate ASC (FIFO)
    const openAdvances = await tx.staffAdvance.findMany({
      where: { schoolId, staffId },
      orderBy: { advanceDate: 'asc' },
      include: {
        allocations: {
          where: {
            status: { in: ['ALLOCATED', 'RECOVERED'] },
            ...(monthlyPayrollId && { monthlyPayrollId: { not: monthlyPayrollId } }),
          },
        },
      },
    });

    let remainingToAllocate = advanceDeduction;

    for (const adv of openAdvances) {
      if (remainingToAllocate <= 0) break;
      const totalAdv = Number(adv.amount);
      const allocatedOrRecovered = adv.allocations.reduce(
        (sum, a) => sum + Number(a.amount),
        0
      );
      const unallocatedCapacity = Math.max(0, totalAdv - allocatedOrRecovered);

      if (unallocatedCapacity > 0) {
        const allocateThis = Math.min(unallocatedCapacity, remainingToAllocate);

        await tx.staffAdvanceAllocation.create({
          data: {
            schoolId,
            staffId,
            staffAdvanceId: adv.id,
            monthlyPayrollId,
            amount: allocateThis,
            status: 'ALLOCATED',
          },
        });

        remainingToAllocate -= allocateThis;
      }
    }
  },

  /**
   * Get pre-payroll review list for all eligible staff before bulk preparation
   */
  async getSalaryPrepReviewList(schoolId, query = {}) {
    const { academicYearId, month, year, workingDays = 26 } = query;

    if (!academicYearId || !month || !year) {
      throw ApiError.badRequest('Academic Year, Month, and Year are required.');
    }

    const yr = parseInt(year, 10);
    const numWorkingDays = Math.max(1, parseInt(workingDays, 10));

    // Fetch all staff for school
    const allStaff = await prisma.staff.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
    });

    // Filter eligible staff for this month (operationally active + joining/leaving dates)
    const eligibleStaff = allStaff.filter((st) => isStaffEligibleForMonth(st, month, yr));

    // Fetch salary setups for target academic year
    const salarySetups = await prisma.staffSalarySetup.findMany({
      where: { schoolId, academicYearId },
    });
    const setupMap = new Map(salarySetups.map((s) => [s.staffId, s]));

    // Fetch existing payroll records for target month/year
    const existingPayrolls = await prisma.monthlyPayroll.findMany({
      where: {
        schoolId,
        academicYearId,
        month: month.toUpperCase(),
        year: yr,
      },
    });
    const existingMap = new Map(existingPayrolls.map((p) => [p.staffId, p]));

    const reviewItems = await Promise.all(
      eligibleStaff.map(async (st) => {
        const existing = existingMap.get(st.id);
        const setup = setupMap.get(st.id);
        const baseSalary = setup ? Number(setup.baseSalary) : Number(st.baseSalary || 0);

        // Fetch advance availability metrics
        const advInfo = await this.getStaffAdvanceAvailability(
          prisma,
          schoolId,
          st.id,
          existing?.id || null
        );

        if (existing) {
          return {
            staffId: st.id,
            employeeId: st.employeeId,
            name: st.name,
            role: st.role,
            department: st.department,
            designation: st.designation,
            advanceBalance: advInfo.advanceBalance,
            pendingAdvanceAllocation: advInfo.pendingAllocation,
            availableAdvance: advInfo.availableAdvance,
            workingDays: existing.workingDays,
            workedDays: existing.workedDays,
            paidLeave: existing.paidLeave,
            unpaidLeave: existing.unpaidLeave,
            baseSalary: Number(existing.baseSalary),
            attendanceDeduction: Number(existing.attendanceDeduction),
            bonus: Number(existing.bonus),
            advanceDeduction: Number(existing.advanceDeduction),
            otherDeduction: Number(existing.otherDeduction),
            netSalary: Number(existing.netSalary),
            status: existing.status,
            isAlreadyPrepared: true,
            payrollId: existing.id,
          };
        }

        const autoAdvDeduction = Math.min(advInfo.availableAdvance, baseSalary);
        const defaultNetSalary = Math.max(0, baseSalary - autoAdvDeduction);

        return {
          staffId: st.id,
          employeeId: st.employeeId,
          name: st.name,
          role: st.role,
          department: st.department,
          designation: st.designation,
          advanceBalance: advInfo.advanceBalance,
          pendingAdvanceAllocation: advInfo.pendingAllocation,
          availableAdvance: advInfo.availableAdvance,
          workingDays: numWorkingDays,
          workedDays: numWorkingDays,
          paidLeave: 0,
          unpaidLeave: 0,
          baseSalary,
          attendanceDeduction: 0,
          bonus: 0,
          advanceDeduction: autoAdvDeduction,
          otherDeduction: 0,
          netSalary: defaultNetSalary,
          status: 'UNPAID',
          isAlreadyPrepared: false,
          payrollId: null,
        };
      })
    );

    const isMonthAlreadyPrepared = existingPayrolls.length > 0;

    return {
      month: month.toUpperCase(),
      year: yr,
      workingDays: numWorkingDays,
      totalEligible: eligibleStaff.length,
      isMonthAlreadyPrepared,
      reviewItems,
    };
  },

  /**
   * Prepare Monthly Payroll for all eligible active staff for selected month/year
   * Supports bulk verification items (staffItems array)
   */
  async prepareMonthlyPayroll(schoolId, data, userId) {
    const { academicYearId, month, year, workingDays = 26, staffItems } = data;

    if (!academicYearId || !month || !year) {
      throw ApiError.badRequest('Academic Year, Month, and Year are required.');
    }

    const yr = parseInt(year, 10);
    const numWorkingDays = Math.max(1, parseInt(workingDays, 10));

    // Verify Academic Year
    const academicYear = await prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId },
    });

    if (!academicYear) {
      throw ApiError.notFound('Academic Year not found.');
    }

    // Fetch all staff for school
    const allStaff = await prisma.staff.findMany({
      where: { schoolId },
    });

    // Filter eligible staff for this month (operationally active + joining/leaving dates)
    const eligibleStaff = allStaff.filter((st) => isStaffEligibleForMonth(st, month, yr));

    if (eligibleStaff.length === 0) {
      throw ApiError.badRequest('No operationally active staff members eligible for the selected month.');
    }

    const eligibleMap = new Map(eligibleStaff.map((st) => [st.id, st]));

    // Fetch salary setups for target academic year
    const salarySetups = await prisma.staffSalarySetup.findMany({
      where: { schoolId, academicYearId },
    });
    const setupMap = new Map(salarySetups.map((s) => [s.staffId, s]));

    // Fetch existing payroll records for target month/year
    const existingPayrolls = await prisma.monthlyPayroll.findMany({
      where: {
        schoolId,
        academicYearId,
        month: month.toUpperCase(),
        year: yr,
      },
    });
    const existingMap = new Map(existingPayrolls.map((p) => [p.staffId, p]));

    // Map custom staffItems by staffId if provided
    const itemsMap = new Map();
    if (Array.isArray(staffItems)) {
      staffItems.forEach((item) => {
        if (item && item.staffId) {
          itemsMap.set(item.staffId, item);
        }
      });
    }

    return await prisma.$transaction(async (tx) => {
      let createdCount = 0;
      let updatedCount = 0;
      const results = [];

      for (const st of eligibleStaff) {
        const customItem = itemsMap.get(st.id);
        const setup = setupMap.get(st.id);
        const baseSalary = setup ? Number(setup.baseSalary) : Number(st.baseSalary || 0);

        const paidLeave = customItem !== undefined ? Math.max(0, parseInt(customItem.paidLeave ?? 0, 10)) : 0;
        const unpaidLeave = customItem !== undefined ? Math.max(0, parseInt(customItem.unpaidLeave ?? 0, 10)) : 0;
        const workedDays = Math.max(0, numWorkingDays - (paidLeave + unpaidLeave));
        const bonus = customItem !== undefined ? Math.max(0, Number(customItem.bonus || 0)) : 0;
        const advanceDeduction = customItem !== undefined ? Math.max(0, Number(customItem.advanceDeduction || 0)) : 0;
        const otherDeduction = customItem !== undefined ? Math.max(0, Number(customItem.otherDeduction || 0)) : 0;
        const remarks = customItem?.remarks || null;

        // Attendance Deduction calculation
        const unpaidDays = Math.max(0, numWorkingDays - (workedDays + paidLeave));
        const dailyRate = numWorkingDays > 0 ? baseSalary / numWorkingDays : 0;
        const attendanceDeduction = Math.round(dailyRate * unpaidDays * 100) / 100;

        const netSalary = Math.max(0, baseSalary - attendanceDeduction + bonus - advanceDeduction - otherDeduction);

        const existing = existingMap.get(st.id);

        if (existing) {
          // If existing and not yet paid, update attendance/salary with review details
          if (existing.status !== 'PAID') {
            if (advanceDeduction > 0) {
              const advInfo = await this.getStaffAdvanceAvailability(tx, schoolId, st.id, existing.id);
              if (advanceDeduction > advInfo.availableAdvance + 0.01) {
                throw ApiError.badRequest(
                  `Only ₹${advInfo.availableAdvance.toLocaleString('en-IN')} of ${st.name}'s staff advance is available for deduction. ₹${advInfo.pendingAllocation.toLocaleString('en-IN')} has already been allocated to another payroll.`
                );
              }
            }

            const updated = await tx.monthlyPayroll.update({
              where: { id: existing.id },
              data: {
                workingDays: numWorkingDays,
                workedDays,
                paidLeave,
                unpaidLeave,
                baseSalary,
                attendanceDeduction,
                bonus,
                advanceDeduction,
                otherDeduction,
                netSalary,
                remarks,
              },
              include: {
                staff: {
                  select: {
                    id: true,
                    employeeId: true,
                    name: true,
                    role: true,
                    department: true,
                    designation: true,
                    status: true,
                    advanceBalance: true,
                  },
                },
              },
            });

            await this.allocateAdvanceToPayroll(tx, schoolId, st.id, existing.id, advanceDeduction);

            updatedCount++;
            results.push(updated);
          } else {
            results.push(existing);
          }
        } else {
          if (advanceDeduction > 0) {
            const advInfo = await this.getStaffAdvanceAvailability(tx, schoolId, st.id, null);
            if (advanceDeduction > advInfo.availableAdvance + 0.01) {
              throw ApiError.badRequest(
                `Only ₹${advInfo.availableAdvance.toLocaleString('en-IN')} of ${st.name}'s staff advance is available for deduction. ₹${advInfo.pendingAllocation.toLocaleString('en-IN')} has already been allocated to another payroll.`
              );
            }
          }

          const payroll = await tx.monthlyPayroll.create({
            data: {
              schoolId,
              staffId: st.id,
              academicYearId,
              month: month.toUpperCase(),
              year: yr,
              workingDays: numWorkingDays,
              workedDays,
              paidLeave,
              unpaidLeave,
              baseSalary,
              attendanceDeduction,
              bonus,
              advanceDeduction,
              otherDeduction,
              netSalary,
              paidAmount: 0,
              status: 'UNPAID',
              remarks,
              preparedById: userId || null,
            },
            include: {
              staff: {
                select: {
                  id: true,
                  employeeId: true,
                  name: true,
                  role: true,
                  department: true,
                  designation: true,
                  status: true,
                  advanceBalance: true,
                },
              },
            },
          });

          await this.allocateAdvanceToPayroll(tx, schoolId, st.id, payroll.id, advanceDeduction);

          createdCount++;
          results.push(payroll);
        }
      }

      return {
        message: createdCount > 0
          ? `Successfully prepared salary for ${createdCount} staff member(s).`
          : `Successfully updated salary review for ${updatedCount} staff member(s).`,
        month,
        year: yr,
        createdCount,
        updatedCount,
        totalEligible: eligibleStaff.length,
        payrolls: results,
      };
    });
  },

  /**
   * Update individual staff monthly payroll attendance/bonus/deductions
   */
  async updateStaffMonthlyPayroll(schoolId, payrollId, data, userId) {
    return await prisma.$transaction(async (tx) => {
      const payroll = await tx.monthlyPayroll.findFirst({
        where: { id: payrollId, schoolId },
        include: { staff: true },
      });

      if (!payroll) {
        throw ApiError.notFound('Monthly payroll record not found.');
      }

      if (payroll.status === 'PAID') {
        throw ApiError.badRequest('Fully paid salary records cannot be modified.');
      }

      const workingDays = payroll.workingDays;
      const workedDays = parseInt(data.workedDays ?? payroll.workedDays, 10);
      const paidLeave = parseInt(data.paidLeave ?? payroll.paidLeave, 10);
      const unpaidLeave = parseInt(data.unpaidLeave ?? payroll.unpaidLeave, 10);

      // Validation: worked + paid + unpaid == workingDays
      if (workedDays + paidLeave + unpaidLeave !== workingDays) {
        throw ApiError.badRequest(
          `Worked Days (${workedDays}) + Paid Leave (${paidLeave}) + Unpaid Leave (${unpaidLeave}) must equal Total Working Days (${workingDays}).`
        );
      }

      const baseSalary = Number(payroll.baseSalary);
      const bonus = Math.max(0, Number(data.bonus ?? payroll.bonus));
      const advanceDeduction = Math.max(0, Number(data.advanceDeduction ?? payroll.advanceDeduction));
      const otherDeduction = Math.max(0, Number(data.otherDeduction ?? payroll.otherDeduction));

      // Validate advance deduction against available advance allocation
      const advInfo = await this.getStaffAdvanceAvailability(tx, schoolId, payroll.staffId, payrollId);
      if (advanceDeduction > advInfo.availableAdvance + 0.01) {
        throw ApiError.badRequest(
          `Only ₹${advInfo.availableAdvance.toLocaleString('en-IN')} of this staff advance is available for deduction. ₹${advInfo.pendingAllocation.toLocaleString('en-IN')} has already been allocated to another payroll.`
        );
      }

      // Attendance Deduction calculation:
      const unpaidDays = Math.max(0, workingDays - (workedDays + paidLeave));
      const dailyRate = workingDays > 0 ? baseSalary / workingDays : 0;
      const attendanceDeduction = Math.round(dailyRate * unpaidDays * 100) / 100;

      // Net Salary calculation
      const netSalary = Math.max(0, baseSalary - attendanceDeduction + bonus - advanceDeduction - otherDeduction);

      const updated = await tx.monthlyPayroll.update({
        where: { id: payrollId },
        data: {
          workedDays,
          paidLeave,
          unpaidLeave,
          attendanceDeduction,
          bonus,
          advanceDeduction,
          otherDeduction,
          netSalary,
          remarks: data.remarks !== undefined ? data.remarks : payroll.remarks,
        },
        include: {
          staff: true,
          academicYear: true,
        },
      });

      await this.allocateAdvanceToPayroll(tx, schoolId, payroll.staffId, payrollId, advanceDeduction);

      return updated;
    });
  },

  /**
   * Delete/Cancel an unpaid or partial monthly payroll record and release reserved advance
   */
  async deleteMonthlyPayroll(schoolId, payrollId, userId) {
    return await prisma.$transaction(async (tx) => {
      const payroll = await tx.monthlyPayroll.findFirst({
        where: { id: payrollId, schoolId },
      });

      if (!payroll) {
        throw ApiError.notFound('Monthly payroll record not found.');
      }

      if (payroll.status === 'PAID') {
        throw ApiError.badRequest('Fully paid salary records cannot be deleted or cancelled.');
      }

      // Remove advance allocations linked to this payroll
      await tx.staffAdvanceAllocation.deleteMany({
        where: { monthlyPayrollId: payrollId },
      });

      // Delete the monthly payroll record
      await tx.monthlyPayroll.delete({
        where: { id: payrollId },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          schoolId,
          userId: userId || null,
          action: 'CANCEL_MONTHLY_PAYROLL',
          entityType: 'MonthlyPayroll',
          entityId: payrollId,
          oldValues: {
            month: payroll.month,
            year: payroll.year,
            staffId: payroll.staffId,
            advanceDeduction: Number(payroll.advanceDeduction),
          },
        },
      });

      return { message: 'Monthly payroll cancelled successfully and reserved advance released.' };
    });
  },

  /**
   * Get list of unpaid or partially paid monthly payrolls for a staff member
   */
  async getPendingPayrollsForStaff(schoolId, staffId) {
    const staff = await prisma.staff.findFirst({
      where: { id: staffId, schoolId },
    });

    if (!staff) {
      throw ApiError.notFound('Staff member not found.');
    }

    const pendingPayrolls = await prisma.monthlyPayroll.findMany({
      where: {
        schoolId,
        staffId,
        status: { in: ['UNPAID', 'PARTIAL'] },
      },
      include: {
        academicYear: true,
      },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    });

    const formattedPending = pendingPayrolls.map((p) => {
      const netSalary = Number(p.netSalary);
      const paidAmount = Number(p.paidAmount);
      const balance = Math.max(0, netSalary - paidAmount);

      return {
        id: p.id,
        month: p.month,
        year: p.year,
        academicYearName: p.academicYear?.name,
        workingDays: p.workingDays,
        workedDays: p.workedDays,
        netSalary,
        paidAmount,
        balance,
        status: p.status,
        advanceDeduction: Number(p.advanceDeduction),
      };
    });

    return {
      staff: {
        id: staff.id,
        employeeId: staff.employeeId,
        name: staff.name,
        department: staff.department,
        designation: staff.designation,
        bankName: staff.bankName,
        bankAccountNo: staff.bankAccountNo,
        advanceBalance: Number(staff.advanceBalance),
      },
      pendingCount: formattedPending.length,
      totalBalance: formattedPending.reduce((sum, item) => sum + item.balance, 0),
      pendingPayrolls: formattedPending,
    };
  },

  /**
   * Record multi-month / partial salary payment
   */
  async recordMultiMonthSalaryPayment(schoolId, data, userId) {
    const {
      staffId,
      academicYearId,
      payments, // Array of { monthlyPayrollId, payNowAmount }
      paymentMode = 'CASH',
      referenceNo,
      remarks,
      paymentDate,
    } = data;

    if (!staffId) {
      throw ApiError.badRequest('Staff ID is required.');
    }

    if (!Array.isArray(payments) || payments.length === 0) {
      throw ApiError.badRequest('At least one month payment selection is required.');
    }

    const staff = await prisma.staff.findFirst({
      where: { id: staffId, schoolId },
    });

    if (!staff) {
      throw ApiError.notFound('Staff member not found.');
    }

    const payrollIds = payments.map((p) => p.monthlyPayrollId);

    return await prisma.$transaction(async (tx) => {
      // Re-fetch target payroll records inside transaction for atomic state
      const targetPayrolls = await tx.monthlyPayroll.findMany({
        where: {
          id: { in: payrollIds },
          schoolId,
          staffId,
        },
      });

      if (targetPayrolls.length !== payments.length) {
        throw ApiError.badRequest('One or more selected payroll records were not found.');
      }

      const payrollMap = new Map(targetPayrolls.map((p) => [p.id, p]));

      let totalPaymentAmount = 0;
      let totalAdvanceRecovery = 0;
      const validatedAllocations = [];
      const monthsPaid = [];

      for (const item of payments) {
        const p = payrollMap.get(item.monthlyPayrollId);
        const payNow = Number(item.payNowAmount);

        if (isNaN(payNow) || payNow <= 0) {
          throw ApiError.badRequest(`Payment amount for ${p.month} ${p.year} must be greater than zero.`);
        }

        const netSalary = Number(p.netSalary);
        const alreadyPaid = Number(p.paidAmount);
        const balance = Math.max(0, netSalary - alreadyPaid);

        if (balance <= 0.01) {
          throw ApiError.badRequest(`Salary for ${p.month} ${p.year} has already been fully paid.`);
        }

        if (payNow > balance + 0.01) {
          throw ApiError.badRequest(
            `Payment amount (₹${payNow.toLocaleString('en-IN')}) for ${p.month} ${p.year} cannot exceed the remaining salary of ₹${balance.toLocaleString('en-IN')}.`
          );
        }

        totalPaymentAmount += payNow;
        const isFullyPaid = alreadyPaid + payNow >= netSalary - 0.01;
        const advDeductionNum = Number(p.advanceDeduction || 0);

        if (isFullyPaid && advDeductionNum > 0) {
          totalAdvanceRecovery += advDeductionNum;
        }

        monthsPaid.push(p.month);

        validatedAllocations.push({
          monthlyPayroll: p,
          payNowAmount: payNow,
          newPaidTotal: alreadyPaid + payNow,
          isFullyPaid,
        });
      }

      // 1. Generate Payment Voucher Number (SDV prefix for Salary Disbursement Voucher)
      const paymentNumber = await generateNextDocumentNumber(tx, {
        schoolId,
        academicYearId: academicYearId || null,
        documentType: 'PAYROLL_VOUCHER',
        prefix: 'SDV',
      });

      const firstPayroll = targetPayrolls[0];

      // 2. Create SalaryPayment Record
      const salaryPayment = await tx.salaryPayment.create({
        data: {
          schoolId,
          staffId,
          academicYearId: academicYearId || firstPayroll.academicYearId || null,
          paymentNumber,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          months: monthsPaid,
          year: firstPayroll.year,
          baseSalary: targetPayrolls.reduce((sum, p) => sum + Number(p.baseSalary), 0),
          allowances: targetPayrolls.reduce((sum, p) => sum + Number(p.bonus), 0),
          deductions: targetPayrolls.reduce((sum, p) => sum + Number(p.attendanceDeduction + p.otherDeduction), 0),
          advanceDeducted: totalAdvanceRecovery,
          netSalary: totalPaymentAmount,
          paymentMode,
          referenceNo: referenceNo || null,
          remarks: remarks || null,
          createdById: userId || null,
        },
      });

      // 3. Create Allocations and Update MonthlyPayroll status
      for (const alloc of validatedAllocations) {
        await tx.salaryPaymentAllocation.create({
          data: {
            salaryPaymentId: salaryPayment.id,
            monthlyPayrollId: alloc.monthlyPayroll.id,
            allocatedAmount: alloc.payNowAmount,
          },
        });

        await tx.monthlyPayroll.update({
          where: { id: alloc.monthlyPayroll.id },
          data: {
            paidAmount: alloc.newPaidTotal,
            status: alloc.isFullyPaid ? 'PAID' : 'PARTIAL',
          },
        });

        // Handle advance balance deduction if advance was specified on payroll and is now fully settled
        const advDeducted = Number(alloc.monthlyPayroll.advanceDeduction);
        if (advDeducted > 0 && alloc.isFullyPaid) {
          // Decrement staff advance balance
          await tx.staff.update({
            where: { id: staffId },
            data: {
              advanceBalance: {
                decrement: Math.min(advDeducted, Number(staff.advanceBalance)),
              },
            },
          });

          // Check for existing ALLOCATED records for this monthlyPayroll
          const existingAllocations = await tx.staffAdvanceAllocation.findMany({
            where: {
              monthlyPayrollId: alloc.monthlyPayroll.id,
              status: 'ALLOCATED',
            },
          });

          if (existingAllocations.length > 0) {
            for (const advAlloc of existingAllocations) {
              await tx.staffAdvanceAllocation.update({
                where: { id: advAlloc.id },
                data: {
                  status: 'RECOVERED',
                  salaryPaymentId: salaryPayment.id,
                },
              });

              await tx.staffAdvance.update({
                where: { id: advAlloc.staffAdvanceId },
                data: {
                  recovered: {
                    increment: Number(advAlloc.amount),
                  },
                },
              });
            }
          } else {
            // Legacy fallback allocation against open advances
            let remainingToRecover = advDeducted;
            const openAdvances = await tx.staffAdvance.findMany({
              where: { schoolId, staffId },
              orderBy: { advanceDate: 'asc' },
            });

            for (const adv of openAdvances) {
              if (remainingToRecover <= 0) break;
              const unrecovered = Number(adv.amount) - Number(adv.recovered);
              if (unrecovered > 0) {
                const recoverThis = Math.min(unrecovered, remainingToRecover);

                await tx.staffAdvanceAllocation.create({
                  data: {
                    schoolId,
                    staffId,
                    staffAdvanceId: adv.id,
                    monthlyPayrollId: alloc.monthlyPayroll.id,
                    salaryPaymentId: salaryPayment.id,
                    amount: recoverThis,
                    status: 'RECOVERED',
                  },
                });

                await tx.staffAdvance.update({
                  where: { id: adv.id },
                  data: {
                    recovered: { increment: recoverThis },
                  },
                });
                remainingToRecover -= recoverThis;
              }
            }
          }
        }
      }

      // Record Financial Ledger DEBIT for Salary Payment
      const grossSalary = totalPaymentAmount + totalAdvanceRecovery;
      await financialLedgerService.createTransaction(tx, {
        schoolId,
        academicYearId: academicYearId || firstPayroll.academicYearId || null,
        transactionDate: paymentDate ? new Date(paymentDate) : new Date(),
        type: 'DEBIT',
        sourceType: 'SALARY_PAYMENT',
        sourceId: salaryPayment.id,
        amount: grossSalary,
        paymentMode,
        referenceNumber: referenceNo || salaryPayment.paymentNumber,
        description: `Salary Payment for ${staff.name} (${monthsPaid.join(', ')} ${firstPayroll.year})`,
        createdById: userId || null,
      });

      if (totalAdvanceRecovery > 0) {
        // Record Financial Ledger CREDIT for Staff Advance Recovery
        await financialLedgerService.createTransaction(tx, {
          schoolId,
          academicYearId: academicYearId || firstPayroll.academicYearId || null,
          transactionDate: paymentDate ? new Date(paymentDate) : new Date(),
          type: 'CREDIT',
          sourceType: 'ADVANCE_RECOVERY',
          sourceId: salaryPayment.id,
          amount: totalAdvanceRecovery,
          paymentMode,
          referenceNumber: referenceNo || salaryPayment.paymentNumber,
          description: `Staff Advance Recovery via Payroll for ${staff.name}`,
          createdById: userId || null,
        });
      }

      // Audit Log
      await tx.auditLog.create({
        data: {
          schoolId,
          userId: userId || null,
          action: 'CREATE_SALARY_DISBURSEMENT',
          entityType: 'SalaryPayment',
          entityId: salaryPayment.id,
          newValues: {
            paymentNumber: salaryPayment.paymentNumber,
            staffName: staff.name,
            amountPaid: totalPaymentAmount,
            paymentMode,
          },
        },
      });

      return {
        salaryPayment,
        paymentNumber: salaryPayment.paymentNumber,
        staffName: staff.name,
        amountPaid: totalPaymentAmount,
        monthsPaid,
      };
    });
  },

  /**
   * Get full printable receipt payload for Salary Payment Voucher
   */
  async getSalaryPaymentReceiptData(schoolId, paymentId) {
    const payment = await prisma.salaryPayment.findFirst({
      where: { id: paymentId, schoolId },
      include: {
        staff: true,
        school: true,
        academicYear: true,
        createdBy: { select: { id: true, name: true, email: true } },
        allocations: {
          include: {
            monthlyPayroll: true,
          },
        },
      },
    });

    if (!payment) {
      throw ApiError.notFound('Salary payment record not found.');
    }

    // Enrich allocations with historical settlement figures
    const enrichedAllocations = await Promise.all(
      payment.allocations.map(async (alloc) => {
        const mp = alloc.monthlyPayroll;
        const salaryDue = Number(mp.netSalary || 0);
        const currentDisbursement = Number(alloc.allocatedAmount || 0);

        // Find prior allocations to this monthlyPayroll created BEFORE this payment
        const priorAllocations = await prisma.salaryPaymentAllocation.findMany({
          where: {
            monthlyPayrollId: mp.id,
            salaryPaymentId: { not: payment.id },
            salaryPayment: {
              createdAt: { lte: payment.createdAt },
            },
          },
          select: { allocatedAmount: true },
        });

        const previouslyPaid = priorAllocations.reduce(
          (sum, a) => sum + Number(a.allocatedAmount || 0),
          0
        );
        const totalPaid = previouslyPaid + currentDisbursement;
        const remainingUnpaid = Math.max(0, salaryDue - totalPaid);

        let status = 'UNPAID';
        if (remainingUnpaid <= 0.01) {
          status = 'PAID';
        } else if (totalPaid > 0) {
          status = 'PARTIALLY PAID';
        }

        return {
          ...alloc,
          settlement: {
            salaryDue,
            previouslyPaid,
            currentDisbursement,
            totalPaid,
            remainingUnpaid,
            status,
          },
        };
      })
    );

    return {
      ...payment,
      allocations: enrichedAllocations,
    };
  },

  /**
   * Get Staff Salary Summary position (Base, Pending Outstanding, Total Outstanding)
   */
  async getStaffSalarySummary(schoolId, staffId) {
    const staff = await prisma.staff.findFirst({
      where: { id: staffId, schoolId },
    });

    if (!staff) {
      throw ApiError.notFound('Staff member not found.');
    }

    const payrolls = await prisma.monthlyPayroll.findMany({
      where: { schoolId, staffId },
    });

    let totalDue = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;

    for (const p of payrolls) {
      const due = Number(p.netSalary);
      const paid = Number(p.paidAmount);
      const bal = Math.max(0, due - paid);
      totalDue += due;
      totalPaid += paid;
      totalOutstanding += bal;
    }

    return {
      staffId: staff.id,
      staffName: staff.name,
      employeeId: staff.employeeId,
      department: staff.department,
      designation: staff.designation,
      baseSalary: Number(staff.baseSalary || 0),
      totalSalaryDue: totalDue,
      totalPaid,
      totalOutstanding,
      advanceBalance: Number(staff.advanceBalance || 0),
    };
  },

  /**
   * Get overall Salary Payment History list across all staff or specific staff
   */
  async getSalaryPaymentHistory(schoolId, query = {}) {
    const { staffId, academicYearId, search, page = 1, limit = 20 } = query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const where = { schoolId };
    if (staffId) where.staffId = staffId;
    if (academicYearId) where.academicYearId = academicYearId;
    if (search) {
      where.OR = [
        { paymentNumber: { contains: search, mode: 'insensitive' } },
        { staff: { name: { contains: search, mode: 'insensitive' } } },
        { staff: { employeeId: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, payments] = await Promise.all([
      prisma.salaryPayment.count({ where }),
      prisma.salaryPayment.findMany({
        where,
        include: {
          staff: {
            select: {
              id: true,
              employeeId: true,
              name: true,
              department: true,
              designation: true,
            },
          },
          academicYear: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          allocations: {
            include: {
              monthlyPayroll: true,
            },
          },
        },
        orderBy: { paymentDate: 'desc' },
        skip,
        take: limitNum,
      }),
    ]);

    return {
      payments,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  },

  /**
   * Get salary slip PDF payload for selected month, last 3/6 months, or custom month range
   */
  async getEmployeeSalarySlipPayload(schoolId, data = {}) {
    const {
      staffId,
      rangeType = 'SINGLE_MONTH', // 'SINGLE_MONTH' | 'LAST_3_MONTHS' | 'LAST_6_MONTHS' | 'CUSTOM_RANGE'
      month,
      year,
      startMonth,
      startYear,
      endMonth,
      endYear,
    } = data;

    if (!staffId) {
      throw ApiError.badRequest('Staff ID is required.');
    }

    const [staff, school] = await Promise.all([
      prisma.staff.findFirst({ where: { id: staffId, schoolId } }),
      prisma.school.findUnique({ where: { id: schoolId } }),
    ]);

    if (!staff) {
      throw ApiError.notFound('Staff member not found.');
    }

    // Fetch all prepared payroll records for staff
    const allPayrolls = await prisma.monthlyPayroll.findMany({
      where: { schoolId, staffId },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    });

    if (allPayrolls.length === 0) {
      throw ApiError.badRequest(`No prepared monthly salary records found for ${staff.name}.`);
    }

    const monthOrderMap = {
      JANUARY: 1, FEBRUARY: 2, MARCH: 3, APRIL: 4, MAY: 5, JUNE: 6,
      JULY: 7, AUGUST: 8, SEPTEMBER: 9, OCTOBER: 10, NOVEMBER: 11, DECEMBER: 12,
    };

    const getMonthVal = (p) => (p.year || 2026) * 100 + (monthOrderMap[p.month?.toUpperCase()] || 0);

    let selectedPayrolls = [];
    let title = '';

    if (rangeType === 'SINGLE_MONTH') {
      const targetMonth = (month || 'AUGUST').toUpperCase();
      const targetYear = parseInt(year || new Date().getFullYear(), 10);
      selectedPayrolls = allPayrolls.filter(
        (p) => p.month?.toUpperCase() === targetMonth && p.year === targetYear
      );
      title = `SALARY SLIP FOR ${targetMonth} ${targetYear}`;
    } else if (rangeType === 'LAST_3_MONTHS') {
      const sorted = [...allPayrolls].sort((a, b) => getMonthVal(b) - getMonthVal(a));
      selectedPayrolls = sorted.slice(0, 3).reverse();
      const first = selectedPayrolls[0];
      const last = selectedPayrolls[selectedPayrolls.length - 1];
      title = `CONSOLIDATED SALARY STATEMENT (${first?.month} ${first?.year} - ${last?.month} ${last?.year})`;
    } else if (rangeType === 'LAST_6_MONTHS') {
      const sorted = [...allPayrolls].sort((a, b) => getMonthVal(b) - getMonthVal(a));
      selectedPayrolls = sorted.slice(0, 6).reverse();
      const first = selectedPayrolls[0];
      const last = selectedPayrolls[selectedPayrolls.length - 1];
      title = `CONSOLIDATED SALARY STATEMENT (${first?.month} ${first?.year} - ${last?.month} ${last?.year})`;
    } else if (rangeType === 'CUSTOM_RANGE') {
      const startVal = parseInt(startYear || 2026, 10) * 100 + (monthOrderMap[startMonth?.toUpperCase()] || 1);
      const endVal = parseInt(endYear || 2026, 10) * 100 + (monthOrderMap[endMonth?.toUpperCase()] || 12);

      selectedPayrolls = allPayrolls.filter((p) => {
        const val = getMonthVal(p);
        return val >= startVal && val <= endVal;
      });
      title = `SALARY STATEMENT (${startMonth} ${startYear} - ${endMonth} ${endYear})`;
    }

    if (selectedPayrolls.length === 0) {
      if (rangeType === 'SINGLE_MONTH') {
        const targetMonth = (month || 'AUGUST').toUpperCase();
        const targetYear = parseInt(year || new Date().getFullYear(), 10);
        throw ApiError.notFound(
          `No prepared salary slip found for ${staff.name} for ${targetMonth} ${targetYear}. Please prepare salary first under Monthly Salary.`
        );
      } else {
        throw ApiError.notFound(
          `No prepared salary slips found for ${staff.name} in the selected period. Please prepare monthly salary first.`
        );
      }
    }

    return {
      title,
      school,
      staff,
      payrolls: selectedPayrolls,
    };
  },
};
