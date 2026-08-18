import { prisma } from '../../config/prisma.js';

export const staffReportsService = {
  /**
   * Staff Directory Report
   */
  async getStaffDirectory(schoolId, query = {}) {
    const { department, designation, role, status } = query;

    const staffMembers = await prisma.staff.findMany({
      where: {
        schoolId,
        ...(department && { department }),
        ...(designation && { designation }),
        ...(role && { role }),
        ...(status && { status }),
      },
      orderBy: { name: 'asc' },
    });

    const data = staffMembers.map((s) => ({
      id: s.id,
      employeeId: s.employeeId,
      name: s.name,
      email: s.email || '-',
      phone: s.phone || '-',
      role: s.role,
      department: s.department || 'General',
      designation: s.designation || 'Staff',
      joiningDate: s.joiningDate || '-',
      status: s.status,
      baseSalary: Number(s.baseSalary || 0),
    }));

    return {
      data,
      summary: {
        totalStaff: data.length,
      },
    };
  },

  /**
   * Department-wise Staff Report
   */
  async getDepartmentWiseStaff(schoolId, query = {}) {
    const { status } = query;

    const staffMembers = await prisma.staff.findMany({
      where: {
        schoolId,
        ...(status && { status }),
      },
      orderBy: { department: 'asc' },
    });

    const deptMap = new Map();

    for (const s of staffMembers) {
      const dept = s.department || 'General';
      if (!deptMap.has(dept)) {
        deptMap.set(dept, []);
      }
      deptMap.get(dept).push({
        id: s.id,
        employeeId: s.employeeId,
        name: s.name,
        designation: s.designation || 'Staff',
        joiningDate: s.joiningDate || '-',
        status: s.status,
      });
    }

    const data = Array.from(deptMap.entries()).map(([department, staff]) => ({
      department,
      count: staff.length,
      staff,
    }));

    return {
      data,
      summary: {
        totalDepartments: data.length,
        totalStaff: staffMembers.length,
      },
    };
  },

  /**
   * Designation-wise Staff Report
   */
  async getDesignationWiseStaff(schoolId, query = {}) {
    const { status } = query;

    const staffMembers = await prisma.staff.findMany({
      where: {
        schoolId,
        ...(status && { status }),
      },
      orderBy: { designation: 'asc' },
    });

    const desigMap = new Map();

    for (const s of staffMembers) {
      const desig = s.designation || 'Staff';
      if (!desigMap.has(desig)) {
        desigMap.set(desig, []);
      }
      desigMap.get(desig).push({
        id: s.id,
        employeeId: s.employeeId,
        name: s.name,
        department: s.department || 'General',
        status: s.status,
      });
    }

    const data = Array.from(desigMap.entries()).map(([designation, staff]) => ({
      designation,
      count: staff.length,
      staff,
    }));

    return {
      data,
      summary: {
        totalDesignations: data.length,
        totalStaff: staffMembers.length,
      },
    };
  },

  /**
   * Staff Status Report
   */
  async getStaffStatusReport(schoolId, _query = {}) {
    const statuses = ['ACTIVE', 'INACTIVE', 'RESIGNED', 'ON_LEAVE'];
    const summary = [];
    let totalAll = 0;

    for (const st of statuses) {
      const count = await prisma.staff.count({
        where: { schoolId, status: st },
      });
      totalAll += count;
      summary.push({ status: st, count });
    }

    return {
      data: summary,
      summary: {
        totalStaff: totalAll,
      },
    };
  },
};
