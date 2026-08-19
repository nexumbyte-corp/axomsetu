import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { generateNextDocumentNumber } from '../../utils/documentSequence.js';
import { assertAcademicYearWritable, ensureCurrentAcademicYear } from '../academic-years/academicYear.service.js';
import { deleteCloudinaryImage } from '../../services/cloudinary.service.js';
import { ensureFeeCharge } from '../fees/fee-creation.service.js';

/**
 * Generic helper to determine if a student is operationally active.
 * Used across operational modules (Fee Generation, Attendance, Exam Registration, ID Card, etc.).
 *
 * @param {Object} student - Student record containing status
 * @returns {boolean} True if student.status === 'ACTIVE'
 */
export const isStudentOperationallyActive = (student) => {
  if (!student) return false;
  return student.status === 'ACTIVE';
};

/**
 * Safely parses a roll number string or integer into a database-compatible integer or null.
 * @param {string|number|null} rollNumber 
 * @returns {number|null}
 */
const parseRollNo = (rollNumber) => {
  if (rollNumber === null || rollNumber === undefined || rollNumber === '') {
    return null;
  }
  const parsed = parseInt(String(rollNumber).trim(), 10);
  return isNaN(parsed) ? null : parsed;
};

/**
 * Reusable helper validating tenant ownership, locked status of academic year,
 * active class/medium/section/stream, and Class.hasStream logic.
 */
const validateEnrollmentConfiguration = async ({
  schoolId,
  academicYearId,
  classId,
  sectionId = null,
  mediumId,
  streamId = null,
  requireWritableYear = true,
  tx = prisma,
}) => {
  // 1. Academic Year Validation
  const academicYear = await tx.academicYear.findUnique({
    where: { id: academicYearId },
  });

  if (!academicYear || academicYear.schoolId !== schoolId) {
    throw ApiError.notFound('Academic year not found for this school');
  }

  if (requireWritableYear && academicYear.isLocked) {
    throw ApiError.forbidden('This academic year is locked and historical data cannot be modified');
  }

  // 2. Class Validation
  const cls = await tx.class.findUnique({
    where: { id: classId },
  });

  if (!cls || cls.schoolId !== schoolId) {
    throw ApiError.notFound('Class not found for this school');
  }

  if (!cls.isActive) {
    throw ApiError.badRequest(`Class '${cls.name}' is inactive`);
  }

  // 3. Medium Validation
  const medium = await tx.medium.findUnique({
    where: { id: mediumId },
  });

  if (!medium || medium.schoolId !== schoolId) {
    throw ApiError.notFound('Medium not found for this school');
  }

  if (!medium.isActive) {
    throw ApiError.badRequest(`Medium '${medium.name}' is inactive`);
  }

  // 4. Section Validation (Optional)
  let section = null;
  if (sectionId) {
    section = await tx.section.findUnique({
      where: { id: sectionId },
    });

    if (!section || section.schoolId !== schoolId) {
      throw ApiError.notFound('Section not found for this school');
    }

    if (!section.isActive) {
      throw ApiError.badRequest(`Section '${section.name}' is inactive`);
    }
  }

  // 5. Stream Validation (Conditional based on Class.hasStream)
  let stream = null;
  if (cls.hasStream) {
    if (!streamId) {
      throw ApiError.badRequest(`Stream is required for class '${cls.name}'`);
    }
    stream = await tx.stream.findUnique({
      where: { id: streamId },
    });

    if (!stream || stream.schoolId !== schoolId) {
      throw ApiError.notFound('Stream not found for this school');
    }

    if (!stream.isActive) {
      throw ApiError.badRequest(`Stream '${stream.name}' is inactive`);
    }
  } else {
    if (streamId) {
      throw ApiError.badRequest(`Stream cannot be specified for class '${cls.name}' which does not have streams`);
    }
  }

  return { academicYear, class: cls, medium, section, stream };
};

/**
 * Creates a student and initial academic year enrollment inside an atomic Prisma transaction.
 */
export const createStudent = async (schoolId, data, actorUserId, actorRole) => {
  const rollNoVal = parseRollNo(data.rollNumber ?? data.rollNo);

  const rawOverrides = Array.isArray(data.feeOverrides) ? data.feeOverrides : [];
  if (rawOverrides.length > 0) {
    if (actorRole && actorRole !== 'SCHOOL_ADMIN') {
      throw ApiError.forbidden('You do not have permission to override fee amounts');
    }
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Validate configuration
    await validateEnrollmentConfiguration({
      schoolId,
      academicYearId: data.academicYearId,
      classId: data.classId,
      sectionId: data.sectionId || null,
      mediumId: data.mediumId,
      streamId: data.streamId || null,
      requireWritableYear: true,
      tx,
    });

    // 2. Admission Number Handling
    let admNo;
    if (data.admissionNo && String(data.admissionNo).trim().length > 0) {
      admNo = String(data.admissionNo).trim();
      const existing = await tx.student.findUnique({
        where: {
          schoolId_admissionNo: {
            schoolId,
            admissionNo: admNo,
          },
        },
      });
      if (existing) {
        throw ApiError.conflict(`Admission number '${admNo}' already exists in this school`);
      }
    } else {
      admNo = await generateNextDocumentNumber(tx, {
        schoolId,
        academicYearId: data.academicYearId,
        documentType: 'STUDENT_ADMISSION',
        prefix: 'ADM',
      });
    }

    // 3. Create Student Master Record
    const student = await tx.student.create({
      data: {
        schoolId,
        admissionNo: admNo,
        name: data.name.trim(),
        guardianName: data.guardianName.trim(),
        phone: data.phone?.trim() || null,
        gender: data.gender?.trim() || null,
        caste: data.caste?.trim() || null,
        address: data.address?.trim() || null,
        photoUrl: data.photoUrl?.trim() || null,
        status: 'ACTIVE',
      },
    });

    // 4. Create Initial Student Enrollment
    const enrollment = await tx.studentEnrollment.create({
      data: {
        schoolId,
        studentId: student.id,
        academicYearId: data.academicYearId,
        classId: data.classId,
        sectionId: data.sectionId || null,
        mediumId: data.mediumId,
        streamId: data.streamId || null,
        rollNo: rollNoVal,
        status: 'ACTIVE',
      },
      include: {
        academicYear: { select: { id: true, name: true, isCurrent: true, isLocked: true } },
        class: { select: { id: true, name: true, hasStream: true } },
        section: { select: { id: true, name: true } },
        medium: { select: { id: true, name: true } },
        stream: { select: { id: true, name: true } },
      },
    });

    // 5. Mandatory Initial Fee Charges Generation
    let initialChargesCount = 0;
    let initialTotalAmount = 0;

    const MONTH_NAMES = [
      'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
      'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
    ];
    const getCurrentFeeMonth = (dateObj = new Date()) => {
      const d = new Date(dateObj);
      const monthIdx = isNaN(d.getTime()) ? new Date().getMonth() : d.getMonth();
      return MONTH_NAMES[monthIdx] || 'JANUARY';
    };

    const currentMonth = getCurrentFeeMonth(new Date());

    const fs = await tx.feeStructure.findFirst({
      where: {
        schoolId,
        academicYearId: data.academicYearId,
        classId: data.classId,
        mediumId: data.mediumId,
        streamId: data.streamId || null,
        isActive: true,
      },
      include: {
        heads: {
          where: { isActive: true },
          include: {
            feeType: true,
          },
        },
      },
    });

    const overrideMap = new Map();
    rawOverrides.forEach((ov) => {
      if (ov.feeTypeId) {
        overrideMap.set(`id_${ov.feeTypeId}`, ov);
      }
      if (ov.title) {
        overrideMap.set(`title_${ov.title.trim().toLowerCase()}`, ov);
      }
    });

    const auditOverrideEvents = [];

    if (fs && fs.heads?.length > 0) {
      for (const h of fs.heads) {
        const attemptedOverride = overrideMap.get(`id_${h.feeTypeId}`) || overrideMap.get(`title_${h.feeType.name.trim().toLowerCase()}`);
        const targetMonth = currentMonth;
        const templateAmount = Number(h.amount);

        let finalAmount = templateAmount;
        let discountAmount = 0;
        let isOverridden = false;
        let overrideReason = null;

        if (attemptedOverride && attemptedOverride.finalAmount !== undefined && attemptedOverride.finalAmount !== null) {
          const parsedFinal = Number(attemptedOverride.finalAmount);
          if (isNaN(parsedFinal) || parsedFinal < 0) {
            throw ApiError.badRequest(`Override amount for '${h.feeType.name}' cannot be negative`);
          }
          if (parsedFinal > templateAmount) {
            throw ApiError.badRequest('Override amount cannot be greater than the original fee.');
          }

          finalAmount = parsedFinal;
          discountAmount = templateAmount - finalAmount;
          isOverridden = true;
          overrideReason = attemptedOverride.reason ? attemptedOverride.reason.trim() : null;
        }

        const result = await ensureFeeCharge(tx, {
          schoolId,
          academicYearId: data.academicYearId,
          studentId: student.id,
          studentEnrollmentId: enrollment.id,
          student,
          feeTypeId: h.feeTypeId,
          feeStructureId: fs.id,
          month: targetMonth,
          title: h.feeType.name,
          amount: finalAmount,
          originalAmount: templateAmount,
          discountAmount,
          isOverridden,
          overrideReason,
          overriddenById: isOverridden ? (actorUserId || null) : null,
          overriddenAt: isOverridden ? new Date() : null,
          billingRule: h.feeType.billingRule || 'MONTHLY',
        });

        if (result.status === 'CREATED') {
          initialChargesCount += 1;
          initialTotalAmount += finalAmount;
        }

        if (isOverridden) {
          auditOverrideEvents.push({
            schoolId,
            userId: actorUserId,
            action: 'STUDENT_FEE_OVERRIDE_APPLIED',
            entityType: 'StudentFeeCharge',
            entityId: student.id,
            newValues: {
              studentId: student.id,
              feeTypeId: h.feeTypeId,
              feeTitle: h.feeType.name,
              originalAmount: templateAmount,
              overrideAmount: finalAmount,
              discountAmount,
              finalAmount,
              reason: overrideReason,
            },
          });
        }
      }
    }

    for (const auditItem of auditOverrideEvents) {
      await tx.auditLog.create({ data: auditItem });
    }

    // 7. Audit Log
    await tx.auditLog.create({
      data: {
        schoolId,
        userId: actorUserId,
        action: 'CREATE_STUDENT',
        entityType: 'Student',
        entityId: student.id,
        newValues: {
          admissionNo: student.admissionNo,
          name: student.name,
          guardianName: student.guardianName,
          classId: data.classId,
          academicYearId: data.academicYearId,
          initialChargesCount,
          initialTotalAmount,
        },
      },
    });

    return {
      ...student,
      enrollment: {
        id: enrollment.id,
        academicYear: enrollment.academicYear,
        class: enrollment.class,
        section: enrollment.section,
        medium: enrollment.medium,
        stream: enrollment.stream,
        rollNumber: enrollment.rollNo,
        status: enrollment.status,
      },
      initialFees: {
        generatedCount: initialChargesCount,
        totalAmount: initialTotalAmount,
      },
    };
  });
};

/**
 * List students filtered by Academic Year, with search, pagination, and config filters.
 */
export const listStudents = async (schoolId, query) => {
  let academicYearId = query.academicYearId;

  if (!academicYearId) {
    const currentYear = await ensureCurrentAcademicYear(schoolId);
    academicYearId = currentYear.id;
  }

  // Validate Academic Year ownership
  const academicYear = await prisma.academicYear.findUnique({
    where: { id: academicYearId },
  });

  if (!academicYear || academicYear.schoolId !== schoolId) {
    throw ApiError.notFound('Academic year not found for this school');
  }

  const page = Math.max(1, parseInt(query.page || 1, 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || 20, 10)));
  const skip = (page - 1) * limit;

  const whereClause = {
    schoolId,
    academicYearId,
  };

  if (query.classId) {
    whereClause.classId = query.classId;
  }

  if (query.sectionId === 'null' || query.sectionId === 'none') {
    whereClause.sectionId = null;
  } else if (query.sectionId) {
    whereClause.sectionId = query.sectionId;
  }

  if (query.mediumId) {
    whereClause.mediumId = query.mediumId;
  }

  if (query.streamId) {
    whereClause.streamId = query.streamId;
  }

  const studentWhere = {};
  if (query.status) {
    studentWhere.status = query.status;
  }

  if (query.search && query.search.trim().length > 0) {
    const searchStr = query.search.trim();
    studentWhere.OR = [
      { name: { contains: searchStr, mode: 'insensitive' } },
      { admissionNo: { contains: searchStr, mode: 'insensitive' } },
      { fatherName: { contains: searchStr, mode: 'insensitive' } },
      { guardianName: { contains: searchStr, mode: 'insensitive' } },
      { phone: { contains: searchStr, mode: 'insensitive' } },
    ];
  }

  if (Object.keys(studentWhere).length > 0) {
    whereClause.student = studentWhere;
  }

  const [total, enrollments] = await Promise.all([
    prisma.studentEnrollment.count({ where: whereClause }),
    prisma.studentEnrollment.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: [
        { class: { order: 'asc' } },
        { rollNo: 'asc' },
        { createdAt: 'asc' },
      ],
      include: {
        student: {
          include: {
            activeHostelEnrollments: {
              where: { status: 'ACTIVE' },
              take: 1,
              include: {
                hostel: { select: { id: true, name: true } },
                room: { select: { id: true, roomNumber: true } },
                bed: { select: { id: true, bedNumber: true } },
              },
            },
          },
        },
        academicYear: { select: { id: true, name: true, isCurrent: true, isLocked: true } },
        class: { select: { id: true, name: true, code: true, hasStream: true } },
        section: { select: { id: true, name: true } },
        medium: { select: { id: true, name: true } },
        stream: { select: { id: true, name: true } },
      },
    }),
  ]);

  const studentIds = Array.from(new Set(enrollments.map((e) => e.student.id)));

  let pendingFeeMap = new Map();
  if (studentIds.length > 0) {
    const feeAggregates = await prisma.studentFeeCharge.groupBy({
      by: ['studentId'],
      where: {
        schoolId,
        academicYearId,
        studentId: { in: studentIds },
        status: { in: ['UNPAID', 'PARTIAL'] },
      },
      _sum: {
        amount: true,
        paidAmount: true,
      },
    });

    feeAggregates.forEach((agg) => {
      const totalAmount = Number(agg._sum.amount || 0);
      const paidAmount = Number(agg._sum.paidAmount || 0);
      const pendingAmount = Math.max(0, totalAmount - paidAmount);
      pendingFeeMap.set(agg.studentId, pendingAmount);
    });
  }

  const mappedData = enrollments.map((e) => {
    const activeHostel = e.student.activeHostelEnrollments?.[0] || null;
    const pendingFee = pendingFeeMap.get(e.student.id) || 0;
    return {
      id: e.student.id,
      admissionNo: e.student.admissionNo,
      name: e.student.name,
      fatherName: e.student.fatherName || e.student.guardianName,
      guardianName: e.student.guardianName,
      phone: e.student.phone,
      gender: e.student.gender,
      caste: e.student.caste,
      address: e.student.address,
      photoUrl: e.student.photoUrl,
      status: e.student.status,
      pendingFee,
      createdAt: e.student.createdAt,
      hostel: activeHostel
        ? {
            enrolled: true,
            hostelName: activeHostel.hostel.name,
            roomNumber: activeHostel.room.roomNumber,
            bedNumber: activeHostel.bed.bedNumber,
          }
        : { enrolled: false },
      enrollment: {
        id: e.id,
        academicYear: e.academicYear,
        class: e.class,
        section: e.section,
        medium: e.medium,
        stream: e.stream,
        rollNumber: e.rollNo,
        status: e.status,
      },
    };
  });

  return {
    data: mappedData,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
/**
 * Get detailed student master info, academic enrollment, applicable fee structure, and fee summary.
 */
export const getStudentById = async (schoolId, studentId, targetAcademicYearId = null) => {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      activeHostelEnrollments: {
        where: { status: 'ACTIVE' },
        take: 1,
        include: {
          hostel: { select: { id: true, name: true, type: true } },
          room: { select: { id: true, roomNumber: true, floor: true } },
          bed: { select: { id: true, bedNumber: true } },
        },
      },
      enrollments: {
        orderBy: { academicYear: { startDate: 'desc' } },
        include: {
          academicYear: { select: { id: true, name: true, isCurrent: true, isLocked: true, startDate: true, endDate: true } },
          class: { select: { id: true, name: true, code: true, hasStream: true } },
          section: { select: { id: true, name: true } },
          medium: { select: { id: true, name: true } },
          stream: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!student || student.schoolId !== schoolId) {
    throw ApiError.notFound('Student not found');
  }

  // 1. Resolve selected enrollment based on targetAcademicYearId or current/latest enrollment
  let selectedEnrollment = null;
  if (targetAcademicYearId) {
    selectedEnrollment = student.enrollments.find(
      (e) => e.academicYearId === targetAcademicYearId || e.academicYear?.id === targetAcademicYearId
    );
  }
  if (!selectedEnrollment) {
    selectedEnrollment = student.enrollments.find((e) => e.academicYear?.isCurrent) || student.enrollments[0] || null;
  }

  const selectedYearId = selectedEnrollment?.academicYearId || targetAcademicYearId;

  // 2. Resolve Applicable Fee Structure
  let currentFeeStructure = {
    isConfigured: false,
    hasAcademicStructure: false,
    academicFees: [],
  };

  if (selectedEnrollment && selectedYearId) {
    // Fetch matching fee structure for student's class + medium + stream
    const feeStructure = await prisma.feeStructure.findFirst({
      where: {
        schoolId,
        academicYearId: selectedYearId,
        classId: selectedEnrollment.classId,
        mediumId: selectedEnrollment.mediumId,
        streamId: selectedEnrollment.streamId || null,
        isActive: true,
      },
      include: {
        heads: {
          where: { isActive: true },
          include: {
            feeType: { select: { id: true, name: true, code: true, category: true, billingRule: true } },
          },
          orderBy: { feeType: { order: 'asc' } },
        },
      },
    });

    // Fetch Student Fee Overrides
    const overrides = await prisma.studentFeeOverride.findMany({
      where: {
        schoolId,
        studentId,
        academicYearId: selectedYearId,
        isActive: true,
      },
    });
    const overrideMap = new Map();
    overrides.forEach((o) => overrideMap.set(o.feeTypeId, Number(o.amount)));

    if (feeStructure && feeStructure.heads?.length > 0) {
      const academicFees = [];

      feeStructure.heads.forEach((h) => {
        const category = h.feeType?.category || 'ACADEMIC';
        const overrideAmt = overrideMap.get(h.feeTypeId);
        const amount = overrideAmt !== undefined ? overrideAmt : Number(h.amount);
        const isOverridden = overrideAmt !== undefined;
        const templateAmount = Number(h.amount);
        const discountAmount = isOverridden ? Math.max(0, templateAmount - amount) : 0;

        academicFees.push({
          feeTypeId: h.feeTypeId,
          title: h.feeType.name,
          category,
          billingRule: h.feeType.billingRule || 'MONTHLY',
          amount,
          originalAmount: templateAmount,
          discountAmount,
          isOverridden,
        });
      });

      currentFeeStructure = {
        isConfigured: true,
        hasAcademicStructure: academicFees.length > 0,
        academicFees,
      };
    } else {
      // Fee structure not configured for this class/medium/stream
      currentFeeStructure = {
        isConfigured: false,
        hasAcademicStructure: false,
        academicFees: [],
      };
    }
  }

  // 4. Calculate Dues Summary from actual generated charges and payments
  const chargesAggregate = await prisma.studentFeeCharge.aggregate({
    where: { schoolId, studentId },
    _sum: { amount: true, paidAmount: true, originalAmount: true, discountAmount: true },
  });

  const totalGenerated = Number(chargesAggregate._sum.amount || 0);
  const totalPaid = Number(chargesAggregate._sum.paidAmount || 0);
  const totalOriginal = Number(chargesAggregate._sum.originalAmount || 0) || totalGenerated;
  const totalDiscount = Number(chargesAggregate._sum.discountAmount || 0);
  const totalPending = Math.max(0, totalGenerated - totalPaid);

  const mappedEnrollments = student.enrollments.map((e) => ({
    id: e.id,
    academicYear: e.academicYear,
    class: e.class,
    section: e.section,
    medium: e.medium,
    stream: e.stream,
    rollNumber: e.rollNo,
    status: e.status,
    createdAt: e.createdAt,
  }));

  const activeHostel = student.activeHostelEnrollments?.[0] || null;

  return {
    id: student.id,
    admissionNo: student.admissionNo,
    name: student.name,
    guardianName: student.guardianName,
    phone: student.phone,
    gender: student.gender,
    caste: student.caste,
    address: student.address,
    photoUrl: student.photoUrl,
    status: student.status,
    hostel: activeHostel
      ? {
          enrolled: true,
          hostelName: activeHostel.hostel.name,
          hostelType: activeHostel.hostel.type,
          roomNumber: activeHostel.room.roomNumber,
          bedNumber: activeHostel.bed.bedNumber,
          startDate: activeHostel.startDate,
        }
      : { enrolled: false },
    createdAt: student.createdAt,
    updatedAt: student.updatedAt,

    academic: selectedEnrollment
      ? {
          id: selectedEnrollment.id,
          academicYear: selectedEnrollment.academicYear,
          class: selectedEnrollment.class,
          section: selectedEnrollment.section,
          medium: selectedEnrollment.medium,
          stream: selectedEnrollment.stream,
          rollNumber: selectedEnrollment.rollNo,
          status: selectedEnrollment.status,
        }
      : null,

    currentFeeStructure,

    feeSummary: {
      original: totalOriginal,
      discount: totalDiscount,
      generated: totalGenerated,
      paid: totalPaid,
      pending: totalPending,
    },

    enrollments: mappedEnrollments,
  };
};


/**
 * Update student master profile information (does NOT update academic enrollment details).
 */
export const updateStudentProfile = async (schoolId, studentId, data, actorUserId) => {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });

  if (!student || student.schoolId !== schoolId) {
    throw ApiError.notFound('Student not found');
  }

  const updateData = {};

  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.guardianName !== undefined) updateData.guardianName = data.guardianName.trim();
  if (data.phone !== undefined) updateData.phone = data.phone ? data.phone.trim() : null;
  if (data.gender !== undefined) updateData.gender = data.gender ? data.gender.trim() : null;
  if (data.caste !== undefined) updateData.caste = data.caste ? data.caste.trim() : null;
  if (data.address !== undefined) updateData.address = data.address ? data.address.trim() : null;
  if (data.photoUrl !== undefined) {
    const newPhotoUrl = data.photoUrl ? data.photoUrl.trim() : null;
    if (student.photoUrl && student.photoUrl !== newPhotoUrl) {
      deleteCloudinaryImage(student.photoUrl).catch((err) => {
        console.warn(`[Cloudinary Warning] Failed to delete previous student photo (${student.photoUrl}):`, err.message);
      });
    }
    updateData.photoUrl = newPhotoUrl;
  }

  if (data.admissionNo !== undefined && data.admissionNo !== null) {
    const trimmedAdm = String(data.admissionNo).trim();
    if (trimmedAdm !== student.admissionNo) {
      const existing = await prisma.student.findUnique({
        where: {
          schoolId_admissionNo: {
            schoolId,
            admissionNo: trimmedAdm,
          },
        },
      });
      if (existing) {
        throw ApiError.conflict(`Admission number '${trimmedAdm}' is already in use`);
      }
      updateData.admissionNo = trimmedAdm;
    }
  }

  const updatedStudent = await prisma.student.update({
    where: { id: studentId },
    data: updateData,
  });

  await prisma.auditLog.create({
    data: {
      schoolId,
      userId: actorUserId,
      action: 'UPDATE_STUDENT',
      entityType: 'Student',
      entityId: studentId,
      oldValues: { name: student.name, guardianName: student.guardianName, phone: student.phone },
      newValues: { name: updatedStudent.name, guardianName: updatedStudent.guardianName, phone: updatedStudent.phone },
    },
  });

  return updatedStudent;
};

/**
 * Updates student master status (ACTIVE, LEFT, GRADUATED, ARCHIVED).
 */
export const updateStudentStatus = async (schoolId, studentId, status, actorUserId) => {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });

  if (!student || student.schoolId !== schoolId) {
    throw ApiError.notFound('Student not found');
  }

  const updated = await prisma.student.update({
    where: { id: studentId },
    data: { status },
  });

  await prisma.auditLog.create({
    data: {
      schoolId,
      userId: actorUserId,
      action: 'CHANGE_STUDENT_STATUS',
      entityType: 'Student',
      entityId: studentId,
      oldValues: { status: student.status },
      newValues: { status },
    },
  });

  return updated;
};

/**
 * Updates an enrollment record for an unlocked academic year.
 */
export const updateEnrollment = async (schoolId, studentId, enrollmentId, data, actorUserId) => {
  const enrollment = await prisma.studentEnrollment.findUnique({
    where: { id: enrollmentId },
  });

  if (!enrollment || enrollment.schoolId !== schoolId || enrollment.studentId !== studentId) {
    throw ApiError.notFound('Student enrollment not found');
  }

  // Validate the configuration against the enrollment's academic year
  await validateEnrollmentConfiguration({
    schoolId,
    academicYearId: enrollment.academicYearId,
    classId: data.classId,
    sectionId: data.sectionId || null,
    mediumId: data.mediumId,
    streamId: data.streamId || null,
    requireWritableYear: true,
  });

  const rollNoVal = parseRollNo(data.rollNumber ?? data.rollNo);

  const updated = await prisma.studentEnrollment.update({
    where: { id: enrollmentId },
    data: {
      classId: data.classId,
      sectionId: data.sectionId || null,
      mediumId: data.mediumId,
      streamId: data.streamId || null,
      rollNo: rollNoVal,
    },
    include: {
      academicYear: { select: { id: true, name: true, isCurrent: true, isLocked: true } },
      class: { select: { id: true, name: true, hasStream: true } },
      section: { select: { id: true, name: true } },
      medium: { select: { id: true, name: true } },
      stream: { select: { id: true, name: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      schoolId,
      userId: actorUserId,
      action: 'UPDATE_STUDENT_ENROLLMENT',
      entityType: 'StudentEnrollment',
      entityId: enrollmentId,
      oldValues: { classId: enrollment.classId, sectionId: enrollment.sectionId },
      newValues: { classId: updated.classId, sectionId: updated.sectionId },
    },
  });

  return {
    id: updated.id,
    academicYear: updated.academicYear,
    class: updated.class,
    section: updated.section,
    medium: updated.medium,
    stream: updated.stream,
    rollNumber: updated.rollNo,
    status: updated.status,
  };
};

/**
 * Helper to check if a class is Class X (Class 10)
 */
const isClassX = (cls) => {
  if (!cls) return false;
  const name = String(cls.name || '').trim().toUpperCase();
  const code = String(cls.code || '').trim().toUpperCase();
  return name === 'X' || name === '10' || code === 'X' || code === '10';
};

/**
 * Executes an Academic Transition for an individual student (PROMOTE, REPEAT, GRADUATE, LEFT) in an atomic transaction.
 */
export const promoteStudent = async (schoolId, studentId, data, actorUserId) => {
  const action = data.action || (data.resultStatus === 'REPEATED' ? 'REPEAT' : 'PROMOTE');

  return await prisma.$transaction(async (tx) => {
    // 1. Verify student and active status
    const student = await tx.student.findUnique({
      where: { id: studentId },
    });

    if (!student || student.schoolId !== schoolId) {
      throw ApiError.notFound('Student not found for this school');
    }

    if (action === 'PROMOTE' && student.status !== 'ACTIVE') {
      throw ApiError.badRequest(`Student '${student.name}' is not active and cannot be promoted`);
    }

    // 2. Verify source enrollment
    let sourceEnrollment = null;
    if (data.sourceEnrollmentId) {
      sourceEnrollment = await tx.studentEnrollment.findUnique({
        where: { id: data.sourceEnrollmentId },
        include: {
          academicYear: true,
          class: true,
          medium: true,
          section: true,
          stream: true,
        },
      });
    }

    if (!sourceEnrollment || sourceEnrollment.schoolId !== schoolId || sourceEnrollment.studentId !== studentId) {
      // Fallback: try finding active/latest enrollment for this student
      sourceEnrollment = await tx.studentEnrollment.findFirst({
        where: { schoolId, studentId },
        orderBy: { createdAt: 'desc' },
        include: {
          academicYear: true,
          class: true,
          medium: true,
          section: true,
          stream: true,
        },
      });
    }

    if (!sourceEnrollment) {
      throw ApiError.notFound('Source enrollment record not found for this student');
    }

    const sourceClass = sourceEnrollment.class;

    // 3. Determine if a next active class exists based on Class.order
    const nextClass = await tx.class.findFirst({
      where: {
        schoolId,
        isActive: true,
        order: { gt: sourceClass.order },
      },
      orderBy: { order: 'asc' },
    });

    const hasNextClass = Boolean(nextClass);

    // 4. Handle Actions according to Business Rules

    // --- Action: PROMOTE ---
    if (action === 'PROMOTE') {
      const targetClassId = data.targetClassId || data.classId;
      const targetMediumId = data.targetMediumId || data.mediumId || sourceEnrollment.mediumId;
      const targetSectionId = data.targetSectionId !== undefined ? data.targetSectionId : (data.sectionId !== undefined ? data.sectionId : sourceEnrollment.sectionId);
      const targetStreamId = data.targetStreamId !== undefined ? data.targetStreamId : (data.streamId !== undefined ? data.streamId : null);
      const rollNoVal = parseRollNo(data.rollNumber ?? data.rollNo);

      if (!targetClassId) {
        throw ApiError.badRequest('Target class is required for individual promotion');
      }

      // Check target class configuration
      const targetClass = await tx.class.findUnique({ where: { id: targetClassId } });
      if (!targetClass || targetClass.schoolId !== schoolId || !targetClass.isActive) {
        throw ApiError.notFound('Target class not found or inactive');
      }

      // Validate Stream requirement for Class X -> XI or any stream-enabled target class
      let finalStreamId = null;
      if (targetClass.hasStream) {
        if (!targetStreamId) {
          throw ApiError.badRequest(`Target stream is required for class '${targetClass.name}'`);
        }
        const stream = await tx.stream.findUnique({ where: { id: targetStreamId } });
        if (!stream || stream.schoolId !== schoolId || !stream.isActive) {
          throw ApiError.notFound('Target stream not found or inactive');
        }
        finalStreamId = targetStreamId;
      }

      // Validate target configuration
      await validateEnrollmentConfiguration({
        schoolId,
        academicYearId: data.targetAcademicYearId,
        classId: targetClassId,
        sectionId: targetSectionId || null,
        mediumId: targetMediumId,
        streamId: finalStreamId,
        requireWritableYear: true,
        tx,
      });

      if (sourceEnrollment.academicYearId === data.targetAcademicYearId) {
        throw ApiError.badRequest('Target academic year must be different from source academic year');
      }

      // Check duplicate enrollment in target year
      const existingTargetEnrollment = await tx.studentEnrollment.findUnique({
        where: {
          schoolId_academicYearId_studentId: {
            schoolId,
            academicYearId: data.targetAcademicYearId,
            studentId,
          },
        },
      });

      if (existingTargetEnrollment) {
        throw ApiError.conflict('This student already has an enrollment for the target academic year.');
      }

      // Create target enrollment
      const targetEnrollment = await tx.studentEnrollment.create({
        data: {
          schoolId,
          studentId,
          academicYearId: data.targetAcademicYearId,
          classId: targetClassId,
          sectionId: targetSectionId || null,
          mediumId: targetMediumId,
          streamId: finalStreamId,
          rollNo: rollNoVal,
          status: 'ACTIVE',
        },
        include: {
          academicYear: { select: { id: true, name: true } },
          class: { select: { id: true, name: true } },
          section: { select: { id: true, name: true } },
          medium: { select: { id: true, name: true } },
          stream: { select: { id: true, name: true } },
        },
      });

      // Update source enrollment status to PROMOTED
      await tx.studentEnrollment.update({
        where: { id: sourceEnrollment.id },
        data: { status: 'PROMOTED' },
      });

      // Ensure student master status remains ACTIVE
      if (student.status !== 'ACTIVE') {
        await tx.student.update({
          where: { id: studentId },
          data: { status: 'ACTIVE' },
        });
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          schoolId,
          userId: actorUserId,
          action: 'PROMOTION_INDIVIDUAL',
          entityType: 'StudentEnrollment',
          entityId: targetEnrollment.id,
          newValues: {
            studentId,
            studentName: student.name,
            sourceAcademicYearId: sourceEnrollment.academicYearId,
            targetAcademicYearId: data.targetAcademicYearId,
            sourceClassId: sourceEnrollment.classId,
            targetClassId,
            targetMediumId,
            targetSectionId,
            targetStreamId: finalStreamId,
            action: 'PROMOTE',
            resultStatus: 'PROMOTED',
          },
        },
      });

      return {
        success: true,
        message: 'Student promoted successfully',
        targetEnrollment: {
          id: targetEnrollment.id,
          academicYear: targetEnrollment.academicYear,
          class: targetEnrollment.class,
          section: targetEnrollment.section,
          medium: targetEnrollment.medium,
          stream: targetEnrollment.stream,
          rollNumber: targetEnrollment.rollNo,
          status: targetEnrollment.status,
        },
      };
    }

    // --- Action: REPEAT ---
    if (action === 'REPEAT') {
      const targetClassId = data.targetClassId || data.classId || sourceEnrollment.classId;
      const targetMediumId = data.targetMediumId || data.mediumId || sourceEnrollment.mediumId;
      const targetSectionId = data.targetSectionId !== undefined ? data.targetSectionId : (data.sectionId !== undefined ? data.sectionId : sourceEnrollment.sectionId);
      const targetStreamId = data.targetStreamId !== undefined ? data.targetStreamId : (data.streamId !== undefined ? data.streamId : sourceEnrollment.streamId);
      const rollNoVal = parseRollNo(data.rollNumber ?? data.rollNo);

      const targetClass = await tx.class.findUnique({ where: { id: targetClassId } });
      let finalStreamId = null;
      if (targetClass?.hasStream) {
        finalStreamId = targetStreamId || null;
      }

      // Validate target configuration
      await validateEnrollmentConfiguration({
        schoolId,
        academicYearId: data.targetAcademicYearId,
        classId: targetClassId,
        sectionId: targetSectionId || null,
        mediumId: targetMediumId,
        streamId: finalStreamId,
        requireWritableYear: true,
        tx,
      });

      if (sourceEnrollment.academicYearId === data.targetAcademicYearId) {
        throw ApiError.badRequest('Target academic year must be different from source academic year');
      }

      // Check duplicate enrollment in target year
      const existingTargetEnrollment = await tx.studentEnrollment.findUnique({
        where: {
          schoolId_academicYearId_studentId: {
            schoolId,
            academicYearId: data.targetAcademicYearId,
            studentId,
          },
        },
      });

      if (existingTargetEnrollment) {
        throw ApiError.conflict('This student already has an enrollment for the target academic year.');
      }

      // Create target enrollment
      const targetEnrollment = await tx.studentEnrollment.create({
        data: {
          schoolId,
          studentId,
          academicYearId: data.targetAcademicYearId,
          classId: targetClassId,
          sectionId: targetSectionId || null,
          mediumId: targetMediumId,
          streamId: finalStreamId,
          rollNo: rollNoVal,
          status: 'ACTIVE',
        },
        include: {
          academicYear: { select: { id: true, name: true } },
          class: { select: { id: true, name: true } },
          section: { select: { id: true, name: true } },
          medium: { select: { id: true, name: true } },
          stream: { select: { id: true, name: true } },
        },
      });

      // Update source enrollment status to REPEATED
      await tx.studentEnrollment.update({
        where: { id: sourceEnrollment.id },
        data: { status: 'REPEATED' },
      });

      // Ensure student master status is ACTIVE
      if (student.status !== 'ACTIVE') {
        await tx.student.update({
          where: { id: studentId },
          data: { status: 'ACTIVE' },
        });
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          schoolId,
          userId: actorUserId,
          action: 'PROMOTION_INDIVIDUAL',
          entityType: 'StudentEnrollment',
          entityId: targetEnrollment.id,
          newValues: {
            studentId,
            studentName: student.name,
            sourceAcademicYearId: sourceEnrollment.academicYearId,
            targetAcademicYearId: data.targetAcademicYearId,
            action: 'REPEAT',
            resultStatus: 'REPEATED',
          },
        },
      });

      return {
        success: true,
        message: 'Student repeating class record created successfully',
        targetEnrollment: {
          id: targetEnrollment.id,
          academicYear: targetEnrollment.academicYear,
          class: targetEnrollment.class,
          section: targetEnrollment.section,
          medium: targetEnrollment.medium,
          stream: targetEnrollment.stream,
          rollNumber: targetEnrollment.rollNo,
          status: targetEnrollment.status,
        },
      };
    }

    // --- Action: GRADUATE ---
    if (action === 'GRADUATE') {
      if (hasNextClass) {
        throw ApiError.badRequest('Graduation is not allowed because a higher class exists');
      }

      // Update student status to GRADUATED
      const updatedStudent = await tx.student.update({
        where: { id: studentId },
        data: { status: 'GRADUATED' },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          schoolId,
          userId: actorUserId,
          action: 'PROMOTION_INDIVIDUAL',
          entityType: 'Student',
          entityId: studentId,
          oldValues: { status: student.status },
          newValues: { status: 'GRADUATED', action: 'GRADUATE' },
        },
      });

      return {
        success: true,
        message: 'Student marked as GRADUATED successfully',
        student: updatedStudent,
      };
    }

    // --- Action: LEFT ---
    if (action === 'LEFT') {
      // Update student status to LEFT
      const updatedStudent = await tx.student.update({
        where: { id: studentId },
        data: { status: 'LEFT' },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          schoolId,
          userId: actorUserId,
          action: 'PROMOTION_INDIVIDUAL',
          entityType: 'Student',
          entityId: studentId,
          oldValues: { status: student.status },
          newValues: { status: 'LEFT', action: 'LEFT' },
        },
      });

      return {
        success: true,
        message: 'Student marked as LEFT successfully',
        student: updatedStudent,
      };
    }

    throw ApiError.badRequest(`Unsupported transition action '${action}'`);
  });
};

/**
 * Bulk promotes multiple students in an atomic transaction.
 */
export const bulkPromoteStudents = async (schoolId, data, actorUserId) => {
  const { sourceAcademicYearId, targetAcademicYearId, sourceClassId, studentIds, students } = data;

  if (!sourceAcademicYearId || !targetAcademicYearId) {
    throw ApiError.badRequest('Source and target academic year IDs are required');
  }

  if (sourceAcademicYearId === targetAcademicYearId) {
    throw ApiError.badRequest('Target academic year must be different from source academic year');
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Validate target academic year is writable and exists in school
    await assertAcademicYearWritable({ schoolId, academicYearId: targetAcademicYearId });

    // 2. Resolve Source Class if provided
    let sourceClass = null;
    if (sourceClassId) {
      sourceClass = await tx.class.findUnique({
        where: { id: sourceClassId },
      });

      if (!sourceClass || sourceClass.schoolId !== schoolId) {
        throw ApiError.notFound('Source class not found for this school');
      }

      // STRICT RULE 11 & 29: Class X must NOT support bulk promotion
      if (isClassX(sourceClass)) {
        throw ApiError.badRequest('Bulk promotion is not available for Class X. Students must be promoted individually with the target class, medium, stream and section.');
      }
    }

    // 3. Resolve Target Next Class automatically based on Class.order sequence
    let nextClass = null;
    if (sourceClass) {
      nextClass = await tx.class.findFirst({
        where: {
          schoolId,
          isActive: true,
          order: { gt: sourceClass.order },
        },
        orderBy: { order: 'asc' },
      });

      // STRICT RULE 30: Terminal class check
      if (!nextClass) {
        throw ApiError.badRequest('This is the terminal class. Students cannot be promoted to another class.');
      }

      // Re-verify if next class happens to be Class X or if next class is invalid
      if (isClassX(sourceClass)) {
        throw ApiError.badRequest('Bulk promotion is not available for Class X. Students must be promoted individually with the target class, medium, stream and section.');
      }
    }

    // 4. Build list of promotion items to process
    let itemsToProcess = [];

    if (Array.isArray(students) && students.length > 0) {
      itemsToProcess = students;
    } else if (Array.isArray(studentIds) && studentIds.length > 0 && sourceClassId) {
      // Find source enrollments for these student IDs in sourceAcademicYear & sourceClass
      const enrollments = await tx.studentEnrollment.findMany({
        where: {
          schoolId,
          academicYearId: sourceAcademicYearId,
          classId: sourceClassId,
          studentId: { in: studentIds },
        },
        include: {
          student: true,
          class: true,
          medium: true,
          section: true,
          stream: true,
        },
      });

      itemsToProcess = enrollments.map((e) => ({
        studentId: e.studentId,
        sourceEnrollmentId: e.id,
        classId: nextClass ? nextClass.id : null,
        mediumId: e.mediumId,
        sectionId: e.sectionId,
        streamId: nextClass?.hasStream ? e.streamId : null,
        rollNo: e.rollNo,
        action: 'PROMOTE',
      }));
    }

    if (itemsToProcess.length === 0) {
      throw ApiError.badRequest('At least one eligible student must be selected for bulk promotion');
    }

    const results = [];

    for (const item of itemsToProcess) {
      // A. Verify student and ACTIVE status
      const student = await tx.student.findUnique({
        where: { id: item.studentId },
      });

      if (!student || student.schoolId !== schoolId) {
        throw ApiError.badRequest(`Student '${item.studentId}' not found for this school`);
      }

      // REQUIREMENT 6 & 28: Only ACTIVE status eligible for promotion
      if (student.status !== 'ACTIVE') {
        throw ApiError.badRequest(`Student '${student.name}' (${student.admissionNo}) is not active and cannot be promoted`);
      }

      // B. Verify source enrollment
      let sourceEnrollment = null;
      if (item.sourceEnrollmentId) {
        sourceEnrollment = await tx.studentEnrollment.findUnique({
          where: { id: item.sourceEnrollmentId },
          include: { class: true },
        });
      } else {
        sourceEnrollment = await tx.studentEnrollment.findFirst({
          where: {
            schoolId,
            studentId: item.studentId,
            academicYearId: sourceAcademicYearId,
          },
          include: { class: true },
        });
      }

      if (
        !sourceEnrollment ||
        sourceEnrollment.schoolId !== schoolId ||
        sourceEnrollment.studentId !== item.studentId ||
        sourceEnrollment.academicYearId !== sourceAcademicYearId
      ) {
        throw ApiError.badRequest(`Source enrollment not valid for student '${student.name}' (${student.admissionNo})`);
      }

      // Check if source enrollment's class is Class X
      if (isClassX(sourceEnrollment.class)) {
        throw ApiError.badRequest('Bulk promotion is not available for Class X. Students must be promoted individually with the target class, medium, stream and section.');
      }

      // C. Resolve Target Class, Medium, Section, Stream
      let targetClassForStudent = nextClass;
      if (item.classId) {
        targetClassForStudent = await tx.class.findUnique({ where: { id: item.classId } });
      }

      if (!targetClassForStudent || targetClassForStudent.schoolId !== schoolId) {
        throw ApiError.badRequest(`Target class not valid for student '${student.name}'`);
      }

      // Preserve Medium by default (Requirement 8)
      const targetMediumId = item.mediumId || sourceEnrollment.mediumId;
      // Preserve Section by default (Requirement 9)
      const targetSectionId = item.sectionId !== undefined ? item.sectionId : sourceEnrollment.sectionId;
      // Preserve Stream if target class supports stream (Requirement 10)
      let targetStreamId = null;
      if (targetClassForStudent.hasStream) {
        targetStreamId = item.streamId !== undefined ? item.streamId : sourceEnrollment.streamId;
      }

      const rollNoVal = parseRollNo(item.rollNumber ?? item.rollNo);
      const action = item.action || (item.result === 'REPEATED' ? 'REPEAT' : 'PROMOTE');
      const resultStatus = action === 'REPEAT' ? 'REPEATED' : 'PROMOTED';

      // D. Validate configuration
      await validateEnrollmentConfiguration({
        schoolId,
        academicYearId: targetAcademicYearId,
        classId: targetClassForStudent.id,
        sectionId: targetSectionId || null,
        mediumId: targetMediumId,
        streamId: targetStreamId || null,
        requireWritableYear: false,
        tx,
      });

      // E. Check duplicate target enrollment (Requirement 20)
      const existingTargetEnrollment = await tx.studentEnrollment.findUnique({
        where: {
          schoolId_academicYearId_studentId: {
            schoolId,
            academicYearId: targetAcademicYearId,
            studentId: item.studentId,
          },
        },
      });

      if (existingTargetEnrollment) {
        throw ApiError.conflict(`This student already has an enrollment for the target academic year.`);
      }

      // F. Create target enrollment
      const targetEnrollment = await tx.studentEnrollment.create({
        data: {
          schoolId,
          studentId: item.studentId,
          academicYearId: targetAcademicYearId,
          classId: targetClassForStudent.id,
          sectionId: targetSectionId || null,
          mediumId: targetMediumId,
          streamId: targetStreamId || null,
          rollNo: rollNoVal,
          status: 'ACTIVE',
        },
      });

      // G. Update source enrollment status
      await tx.studentEnrollment.update({
        where: { id: sourceEnrollment.id },
        data: { status: resultStatus },
      });

      results.push({
        studentId: item.studentId,
        studentName: student.name,
        admissionNo: student.admissionNo,
        enrollmentId: targetEnrollment.id,
        resultStatus,
        action,
      });
    }

    // 5. Audit log (Requirement 23)
    await tx.auditLog.create({
      data: {
        schoolId,
        userId: actorUserId,
        action: 'PROMOTION_BULK',
        entityType: 'StudentEnrollment',
        newValues: {
          sourceAcademicYearId,
          targetAcademicYearId,
          sourceClassId: sourceClassId || null,
          promotedCount: results.length,
          studentIds: results.map((r) => r.studentId),
        },
      },
    });

    return {
      promotedCount: results.length,
      details: results,
    };
  });
};
