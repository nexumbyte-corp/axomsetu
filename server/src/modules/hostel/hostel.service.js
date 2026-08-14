import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { getSystemFeeType } from '../fees/fee-type.service.js';
import { isEffectiveForMonth } from '../fees/fee-generation.service.js';

// ==========================================
// DASHBOARD & OVERVIEW
// ==========================================

export const getHostelDashboardData = async (schoolId, academicYearId) => {
  const [totalHostels, totalRooms, bedsBreakdown, activeResidentsCount, feeConfig] = await Promise.all([
    prisma.hostel.count({ where: { schoolId, isActive: true } }),
    prisma.hostelRoom.count({ where: { schoolId, isActive: true } }),
    prisma.hostelBed.groupBy({
      by: ['status'],
      where: { schoolId, isActive: true },
      _count: { id: true },
    }),
    prisma.hostelEnrollment.count({
      where: { schoolId, status: 'ACTIVE', ...(academicYearId ? { academicYearId } : {}) },
    }),
    academicYearId
      ? prisma.hostelFeeConfig.findMany({ where: { schoolId, academicYearId } })
      : [],
  ]);

  const bedCounts = {
    total: 0,
    AVAILABLE: 0,
    OCCUPIED: 0,
    MAINTENANCE: 0,
    BLOCKED: 0,
  };

  bedsBreakdown.forEach((group) => {
    bedCounts[group.status] = group._count.id;
    bedCounts.total += group._count.id;
  });

  const occupancyRate = bedCounts.total > 0
    ? Math.round((bedCounts.OCCUPIED / bedCounts.total) * 100)
    : 0;

  return {
    totalHostels,
    totalRooms,
    totalBeds: bedCounts.total,
    availableBeds: bedCounts.AVAILABLE,
    occupiedBeds: bedCounts.OCCUPIED,
    maintenanceBeds: bedCounts.MAINTENANCE,
    blockedBeds: bedCounts.BLOCKED,
    activeResidents: activeResidentsCount,
    occupancyRate,
    feeConfigured: feeConfig.length > 0,
  };
};

// ==========================================
// HOSTELS SETUP CRUD
// ==========================================

export const listHostels = async (schoolId, query = {}) => {
  const where = { schoolId };
  if (query.isActive === 'true') where.isActive = true;
  if (query.type) where.type = query.type;
  if (query.search && query.search.trim()) {
    const searchStr = query.search.trim();
    where.OR = [
      { name: { contains: searchStr, mode: 'insensitive' } },
      { code: { contains: searchStr, mode: 'insensitive' } },
    ];
  }

  const hostels = await prisma.hostel.findMany({
    where,
    include: {
      rooms: {
        where: { isActive: true },
        select: {
          id: true,
          capacity: true,
          beds: {
            where: { isActive: true },
            select: { id: true, status: true },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return hostels.map((h) => {
    let totalBeds = 0;
    let availableBeds = 0;
    let occupiedBeds = 0;

    h.rooms.forEach((r) => {
      r.beds.forEach((b) => {
        totalBeds++;
        if (b.status === 'AVAILABLE') availableBeds++;
        if (b.status === 'OCCUPIED') occupiedBeds++;
      });
    });

    const { rooms, ...rest } = h;
    return {
      ...rest,
      totalRooms: h.rooms.length,
      totalBeds,
      availableBeds,
      occupiedBeds,
    };
  });
};

export const getHostelById = async (schoolId, hostelId) => {
  const hostel = await prisma.hostel.findUnique({
    where: { id: hostelId },
    include: {
      rooms: {
        orderBy: { roomNumber: 'asc' },
        include: {
          beds: {
            orderBy: { bedNumber: 'asc' },
          },
        },
      },
    },
  });

  if (!hostel || hostel.schoolId !== schoolId) {
    throw ApiError.notFound('Hostel not found');
  }

  return hostel;
};

export const createHostel = async (schoolId, data, actorUserId) => {
  const existing = await prisma.hostel.findUnique({
    where: {
      schoolId_name: {
        schoolId,
        name: data.name.trim(),
      },
    },
  });

  if (existing) {
    throw ApiError.conflict(`Hostel with name '${data.name.trim()}' already exists.`);
  }

  const hostel = await prisma.hostel.create({
    data: {
      schoolId,
      name: data.name.trim(),
      code: data.code ? data.code.trim() : null,
      type: data.type || 'COMBINED',
      description: data.description ? data.description.trim() : null,
      address: data.address ? data.address.trim() : null,
    },
  });

  if (actorUserId) {
    await prisma.auditLog.create({
      data: {
        schoolId,
        userId: actorUserId,
        action: 'CREATE_HOSTEL',
        entityType: 'Hostel',
        entityId: hostel.id,
        newValues: { name: hostel.name, type: hostel.type },
      },
    });
  }

  return hostel;
};

export const updateHostel = async (schoolId, hostelId, data, actorUserId) => {
  const hostel = await getHostelById(schoolId, hostelId);

  const updateData = {};
  if (data.name && data.name.trim() !== hostel.name) {
    const dup = await prisma.hostel.findUnique({
      where: { schoolId_name: { schoolId, name: data.name.trim() } },
    });
    if (dup && dup.id !== hostelId) {
      throw ApiError.conflict(`Hostel with name '${data.name.trim()}' already exists.`);
    }
    updateData.name = data.name.trim();
  }

  if (data.code !== undefined) updateData.code = data.code ? data.code.trim() : null;
  if (data.type) updateData.type = data.type;
  if (data.description !== undefined) updateData.description = data.description ? data.description.trim() : null;
  if (data.address !== undefined) updateData.address = data.address ? data.address.trim() : null;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const updated = await prisma.hostel.update({
    where: { id: hostelId },
    data: updateData,
  });

  if (actorUserId) {
    await prisma.auditLog.create({
      data: {
        schoolId,
        userId: actorUserId,
        action: 'UPDATE_HOSTEL',
        entityType: 'Hostel',
        entityId: hostelId,
        oldValues: { name: hostel.name, isActive: hostel.isActive },
        newValues: { name: updated.name, isActive: updated.isActive },
      },
    });
  }

  return updated;
};

export const deleteHostel = async (schoolId, hostelId, actorUserId) => {
  const hostel = await getHostelById(schoolId, hostelId);

  // Check active residents
  const activeResidentsCount = await prisma.hostelEnrollment.count({
    where: { hostelId, status: 'ACTIVE' },
  });

  if (activeResidentsCount > 0) {
    throw ApiError.badRequest(`Cannot delete hostel '${hostel.name}' because it currently has ${activeResidentsCount} active resident(s).`);
  }

  await prisma.hostel.delete({ where: { id: hostelId } });

  if (actorUserId) {
    await prisma.auditLog.create({
      data: {
        schoolId,
        userId: actorUserId,
        action: 'DELETE_HOSTEL',
        entityType: 'Hostel',
        entityId: hostelId,
        oldValues: { name: hostel.name },
      },
    });
  }

  return { message: 'Hostel deleted successfully' };
};

// ==========================================
// ROOMS CRUD
// ==========================================

export const listRooms = async (schoolId, query = {}) => {
  const where = { schoolId };
  if (query.hostelId) where.hostelId = query.hostelId;
  if (query.isActive === 'true') where.isActive = true;

  const rooms = await prisma.hostelRoom.findMany({
    where,
    include: {
      hostel: { select: { id: true, name: true, type: true } },
      beds: {
        select: { id: true, bedNumber: true, status: true, isActive: true },
        orderBy: { bedNumber: 'asc' },
      },
    },
    orderBy: [{ hostel: { name: 'asc' } }, { roomNumber: 'asc' }],
  });

  return rooms.map((r) => {
    const availableBeds = r.beds.filter((b) => b.status === 'AVAILABLE' && b.isActive).length;
    const occupiedBeds = r.beds.filter((b) => b.status === 'OCCUPIED' && b.isActive).length;
    return {
      ...r,
      totalBedsCount: r.beds.length,
      availableBedsCount: availableBeds,
      occupiedBedsCount: occupiedBeds,
    };
  });
};

export const createRoom = async (schoolId, data, actorUserId) => {
  const hostel = await getHostelById(schoolId, data.hostelId);

  const roomNumTrimmed = data.roomNumber.trim();
  const existing = await prisma.hostelRoom.findUnique({
    where: {
      hostelId_roomNumber: {
        hostelId: data.hostelId,
        roomNumber: roomNumTrimmed,
      },
    },
  });

  if (existing) {
    throw ApiError.conflict(`Room number '${roomNumTrimmed}' already exists in hostel '${hostel.name}'.`);
  }

  const room = await prisma.hostelRoom.create({
    data: {
      schoolId,
      hostelId: data.hostelId,
      roomNumber: roomNumTrimmed,
      floor: data.floor ? data.floor.trim() : null,
      capacity: data.capacity || 1,
      roomType: data.roomType ? data.roomType.trim() : null,
    },
  });

  // Auto-generate beds matching capacity
  const bedPayloads = [];
  for (let i = 1; i <= room.capacity; i++) {
    const padNum = String(i).padStart(2, '0');
    bedPayloads.push({
      schoolId,
      hostelId: data.hostelId,
      roomId: room.id,
      bedNumber: `Bed ${padNum}`,
      status: 'AVAILABLE',
    });
  }

  await prisma.hostelBed.createMany({
    data: bedPayloads,
    skipDuplicates: true,
  });

  if (actorUserId) {
    await prisma.auditLog.create({
      data: {
        schoolId,
        userId: actorUserId,
        action: 'CREATE_ROOM',
        entityType: 'HostelRoom',
        entityId: room.id,
        newValues: { roomNumber: room.roomNumber, capacity: room.capacity },
      },
    });
  }

  return room;
};

export const updateRoom = async (schoolId, roomId, data, actorUserId) => {
  const room = await prisma.hostelRoom.findUnique({
    where: { id: roomId },
    include: { hostel: true },
  });

  if (!room || room.schoolId !== schoolId) {
    throw ApiError.notFound('Room not found');
  }

  const updateData = {};
  if (data.roomNumber && data.roomNumber.trim() !== room.roomNumber) {
    const roomNumTrimmed = data.roomNumber.trim();
    const dup = await prisma.hostelRoom.findUnique({
      where: { hostelId_roomNumber: { hostelId: room.hostelId, roomNumber: roomNumTrimmed } },
    });
    if (dup && dup.id !== roomId) {
      throw ApiError.conflict(`Room number '${roomNumTrimmed}' already exists in hostel '${room.hostel.name}'.`);
    }
    updateData.roomNumber = roomNumTrimmed;
  }

  if (data.floor !== undefined) updateData.floor = data.floor ? data.floor.trim() : null;
  if (data.capacity !== undefined) updateData.capacity = data.capacity;
  if (data.roomType !== undefined) updateData.roomType = data.roomType ? data.roomType.trim() : null;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const updated = await prisma.hostelRoom.update({
    where: { id: roomId },
    data: updateData,
  });

  if (actorUserId) {
    await prisma.auditLog.create({
      data: {
        schoolId,
        userId: actorUserId,
        action: 'UPDATE_ROOM',
        entityType: 'HostelRoom',
        entityId: roomId,
        oldValues: { roomNumber: room.roomNumber, capacity: room.capacity },
        newValues: { roomNumber: updated.roomNumber, capacity: updated.capacity },
      },
    });
  }

  return updated;
};

export const deleteRoom = async (schoolId, roomId, actorUserId) => {
  const room = await prisma.hostelRoom.findUnique({ where: { id: roomId } });
  if (!room || room.schoolId !== schoolId) {
    throw ApiError.notFound('Room not found');
  }

  const activeResidentsCount = await prisma.hostelEnrollment.count({
    where: { roomId, status: 'ACTIVE' },
  });

  if (activeResidentsCount > 0) {
    throw ApiError.badRequest(`Cannot delete Room ${room.roomNumber} because it currently has ${activeResidentsCount} active resident(s).`);
  }

  await prisma.hostelRoom.delete({ where: { id: roomId } });

  if (actorUserId) {
    await prisma.auditLog.create({
      data: {
        schoolId,
        userId: actorUserId,
        action: 'DELETE_ROOM',
        entityType: 'HostelRoom',
        entityId: roomId,
        oldValues: { roomNumber: room.roomNumber },
      },
    });
  }

  return { message: 'Room deleted successfully' };
};

// ==========================================
// BEDS CRUD & BOOKMYSHOW PREVIEW
// ==========================================

export const listBeds = async (schoolId, query = {}) => {
  const where = { schoolId };
  if (query.hostelId) where.hostelId = query.hostelId;
  if (query.roomId) where.roomId = query.roomId;
  if (query.status) where.status = query.status;
  if (query.isActive === 'true') where.isActive = true;

  const beds = await prisma.hostelBed.findMany({
    where,
    include: {
      hostel: { select: { id: true, name: true, type: true } },
      room: { select: { id: true, roomNumber: true, floor: true, roomType: true } },
      enrollments: {
        where: { status: 'ACTIVE' },
        include: {
          student: { select: { id: true, name: true, admissionNo: true } },
        },
        take: 1,
      },
    },
    orderBy: [{ room: { roomNumber: 'asc' } }, { bedNumber: 'asc' }],
  });

  return beds.map((b) => {
    const activeEnrollment = b.enrollments[0] || null;
    const { enrollments, ...rest } = b;
    return {
      ...rest,
      activeResident: activeEnrollment
        ? {
            enrollmentId: activeEnrollment.id,
            studentId: activeEnrollment.student.id,
            studentName: activeEnrollment.student.name,
            admissionNo: activeEnrollment.student.admissionNo,
            startDate: activeEnrollment.startDate,
          }
        : null,
    };
  });
};

export const createBed = async (schoolId, data, actorUserId) => {
  const room = await prisma.hostelRoom.findUnique({
    where: { id: data.roomId },
  });
  if (!room || room.schoolId !== schoolId || room.hostelId !== data.hostelId) {
    throw ApiError.badRequest('Selected room does not belong to the selected hostel.');
  }

  const bedNumTrimmed = data.bedNumber.trim();
  const dup = await prisma.hostelBed.findUnique({
    where: {
      roomId_bedNumber: {
        roomId: data.roomId,
        bedNumber: bedNumTrimmed,
      },
    },
  });

  if (dup) {
    throw ApiError.conflict(`Bed '${bedNumTrimmed}' already exists in Room ${room.roomNumber}.`);
  }

  const bed = await prisma.hostelBed.create({
    data: {
      schoolId,
      hostelId: data.hostelId,
      roomId: data.roomId,
      bedNumber: bedNumTrimmed,
      status: data.status || 'AVAILABLE',
    },
  });

  if (actorUserId) {
    await prisma.auditLog.create({
      data: {
        schoolId,
        userId: actorUserId,
        action: 'CREATE_BED',
        entityType: 'HostelBed',
        entityId: bed.id,
        newValues: { bedNumber: bed.bedNumber, status: bed.status },
      },
    });
  }

  return bed;
};

export const bulkCreateBeds = async (schoolId, data, actorUserId) => {
  const room = await prisma.hostelRoom.findUnique({ where: { id: data.roomId } });
  if (!room || room.schoolId !== schoolId || room.hostelId !== data.hostelId) {
    throw ApiError.badRequest('Selected room does not belong to the selected hostel.');
  }

  const prefix = (data.prefix || 'Bed').trim();
  const existingBeds = await prisma.hostelBed.findMany({
    where: { roomId: data.roomId },
    select: { bedNumber: true },
  });

  const existingSet = new Set(existingBeds.map((b) => b.bedNumber));
  const bedPayloads = [];

  let idx = 1;
  while (bedPayloads.length < data.count) {
    const candidateName = `${prefix} ${String(idx).padStart(2, '0')}`;
    if (!existingSet.has(candidateName)) {
      bedPayloads.push({
        schoolId,
        hostelId: data.hostelId,
        roomId: data.roomId,
        bedNumber: candidateName,
        status: 'AVAILABLE',
      });
    }
    idx++;
  }

  await prisma.hostelBed.createMany({
    data: bedPayloads,
    skipDuplicates: true,
  });

  return { message: `Successfully added ${bedPayloads.length} beds to Room ${room.roomNumber}` };
};

export const updateBedStatus = async (schoolId, bedId, status, actorUserId) => {
  const bed = await prisma.hostelBed.findUnique({
    where: { id: bedId },
  });
  if (!bed || bed.schoolId !== schoolId) {
    throw ApiError.notFound('Bed not found');
  }

  if (bed.status === 'OCCUPIED' && status !== 'OCCUPIED') {
    const activeEnrollment = await prisma.hostelEnrollment.findFirst({
      where: { bedId, status: 'ACTIVE' },
    });
    if (activeEnrollment) {
      throw ApiError.badRequest('Cannot change status of an occupied bed. Perform a Hostel Transfer or Exit first.');
    }
  }

  const updated = await prisma.hostelBed.update({
    where: { id: bedId },
    data: { status },
  });

  if (actorUserId) {
    await prisma.auditLog.create({
      data: {
        schoolId,
        userId: actorUserId,
        action: 'UPDATE_BED_STATUS',
        entityType: 'HostelBed',
        entityId: bedId,
        oldValues: { status: bed.status },
        newValues: { status: updated.status },
      },
    });
  }

  return updated;
};

// ==========================================
// HOSTEL FEE CONFIGURATION
// ==========================================

export const getHostelFeeConfig = async (schoolId, academicYearId, hostelId = null) => {
  let config = await prisma.hostelFeeConfig.findFirst({
    where: {
      schoolId,
      academicYearId,
      hostelId: hostelId || null,
    },
    include: {
      admissionFeeType: { select: { id: true, name: true, category: true, billingRule: true } },
      monthlyFeeType: { select: { id: true, name: true, category: true, billingRule: true } },
    },
  });

  if (!config && hostelId) {
    // Fallback to default school-wide hostel fee config for academic year
    config = await prisma.hostelFeeConfig.findFirst({
      where: {
        schoolId,
        academicYearId,
        hostelId: null,
      },
      include: {
        admissionFeeType: { select: { id: true, name: true, category: true, billingRule: true } },
        monthlyFeeType: { select: { id: true, name: true, category: true, billingRule: true } },
      },
    });
  }

  // Ensure default system fee types exist if not set
  const defaultAdmissionFeeType = await getSystemFeeType(schoolId, 'HOSTEL_ADMISSION');
  const defaultMonthlyFeeType = await getSystemFeeType(schoolId, 'HOSTEL');

  return {
    academicYearId,
    hostelId: hostelId || null,
    admissionFeeEnabled: config ? config.admissionFeeEnabled : false,
    admissionFeeAmount: config ? Number(config.admissionFeeAmount) : 0,
    admissionFeeTypeId: config && config.admissionFeeTypeId ? config.admissionFeeTypeId : defaultAdmissionFeeType.id,
    admissionFeeType: config && config.admissionFeeType ? config.admissionFeeType : defaultAdmissionFeeType,

    monthlyFeeEnabled: config ? config.monthlyFeeEnabled : false,
    monthlyFeeAmount: config ? Number(config.monthlyFeeAmount) : 0,
    monthlyFeeTypeId: config && config.monthlyFeeTypeId ? config.monthlyFeeTypeId : defaultMonthlyFeeType.id,
    monthlyFeeType: config && config.monthlyFeeType ? config.monthlyFeeType : defaultMonthlyFeeType,
  };
};

export const saveHostelFeeConfig = async (schoolId, data, actorUserId) => {
  const { academicYearId, hostelId, admissionFeeEnabled, admissionFeeAmount, monthlyFeeEnabled, monthlyFeeAmount } = data;

  const academicYear = await prisma.academicYear.findUnique({ where: { id: academicYearId } });
  if (!academicYear || academicYear.schoolId !== schoolId) {
    throw ApiError.notFound('Academic year not found');
  }

  if (hostelId) {
    const hostel = await prisma.hostel.findUnique({ where: { id: hostelId } });
    if (!hostel || hostel.schoolId !== schoolId) {
      throw ApiError.notFound('Hostel not found');
    }
  }

  const defaultAdmissionFeeType = await getSystemFeeType(schoolId, 'HOSTEL_ADMISSION');
  const defaultMonthlyFeeType = await getSystemFeeType(schoolId, 'HOSTEL');

  const config = await prisma.hostelFeeConfig.upsert({
    where: {
      schoolId_academicYearId_hostelId: {
        schoolId,
        academicYearId,
        hostelId: hostelId || null,
      },
    },
    update: {
      admissionFeeEnabled,
      admissionFeeAmount: new Prisma.Decimal(admissionFeeAmount || 0),
      monthlyFeeEnabled,
      monthlyFeeAmount: new Prisma.Decimal(monthlyFeeAmount || 0),
      admissionFeeTypeId: defaultAdmissionFeeType.id,
      monthlyFeeTypeId: defaultMonthlyFeeType.id,
    },
    create: {
      schoolId,
      academicYearId,
      hostelId: hostelId || null,
      admissionFeeEnabled,
      admissionFeeAmount: new Prisma.Decimal(admissionFeeAmount || 0),
      monthlyFeeEnabled,
      monthlyFeeAmount: new Prisma.Decimal(monthlyFeeAmount || 0),
      admissionFeeTypeId: defaultAdmissionFeeType.id,
      monthlyFeeTypeId: defaultMonthlyFeeType.id,
    },
  });

  if (actorUserId) {
    await prisma.auditLog.create({
      data: {
        schoolId,
        userId: actorUserId,
        action: 'UPDATE_HOSTEL_FEE_CONFIG',
        entityType: 'HostelFeeConfig',
        entityId: config.id,
        newValues: { admissionFeeEnabled, admissionFeeAmount, monthlyFeeEnabled, monthlyFeeAmount },
      },
    });
  }

  return config;
};

// ==========================================
// HOSTEL ADMISSION (CONCURRENCY-SAFE)
// ==========================================

export const admitStudent = async (schoolId, payload, actorUserId) => {
  const { academicYearId, studentId, hostelId, roomId, bedId, startDate } = payload;

  return await prisma.$transaction(async (tx) => {
    // 1. Validate Student active status
    const student = await tx.student.findUnique({
      where: { id: studentId },
    });
    if (!student || student.schoolId !== schoolId) {
      throw ApiError.notFound('Student not found for this school');
    }
    if (student.status !== 'ACTIVE') {
      throw ApiError.badRequest('Student is not active.');
    }

    // 2. Check if student already has active hostel enrollment in school
    const existingEnrollment = await tx.hostelEnrollment.findFirst({
      where: {
        schoolId,
        studentId,
        status: 'ACTIVE',
      },
    });
    if (existingEnrollment) {
      throw ApiError.badRequest('Student already has an active hostel enrollment.');
    }

    // 3. Verify Hostel & Room hierarchy
    const hostel = await tx.hostel.findUnique({ where: { id: hostelId } });
    if (!hostel || hostel.schoolId !== schoolId) {
      throw ApiError.notFound('Selected hostel does not belong to the selected school.');
    }
    if (!hostel.isActive) {
      throw ApiError.badRequest('Selected hostel is currently inactive.');
    }

    const room = await tx.hostelRoom.findUnique({ where: { id: roomId } });
    if (!room || room.schoolId !== schoolId || room.hostelId !== hostelId) {
      throw ApiError.badRequest('Selected room does not belong to the selected hostel.');
    }
    if (!room.isActive) {
      throw ApiError.badRequest('Selected room is currently inactive.');
    }

    // 4. ATOMIC CONCURRENCY CHECK on target bed
    const bed = await tx.hostelBed.findFirst({
      where: {
        id: bedId,
        roomId,
        hostelId,
        schoolId,
        status: 'AVAILABLE',
        isActive: true,
      },
    });

    if (!bed) {
      throw ApiError.badRequest('This bed is no longer available. Please select another bed.');
    }

    // 5. Update bed status to OCCUPIED atomically
    await tx.hostelBed.update({
      where: { id: bed.id },
      data: { status: 'OCCUPIED' },
    });

    // 6. Create HostelEnrollment
    const enrollment = await tx.hostelEnrollment.create({
      data: {
        schoolId,
        academicYearId,
        studentId,
        hostelId,
        roomId,
        bedId: bed.id,
        startDate: new Date(startDate),
        status: 'ACTIVE',
      },
      include: {
        student: { select: { id: true, name: true, admissionNo: true } },
        hostel: { select: { id: true, name: true } },
        room: { select: { id: true, roomNumber: true } },
        bed: { select: { id: true, bedNumber: true } },
      },
    });

    // 7. Hostel Fee Charges Generation upon Admission (Admission Fee + Monthly Fee for Start Month)
    const feeConfig = await tx.hostelFeeConfig.findFirst({
      where: {
        schoolId,
        academicYearId,
        OR: [{ hostelId }, { hostelId: null }],
      },
      orderBy: { hostelId: 'desc' },
    });

    let admissionFeeCharged = false;
    let monthlyFeeCharged = false;

    if (feeConfig) {
      const activeClassEnrollment = await tx.studentEnrollment.findFirst({
        where: {
          schoolId,
          studentId,
          academicYearId,
          status: { in: ['ACTIVE', 'PROMOTED'] },
        },
      });

      const startD = new Date(startDate);
      const monthNames = [
        'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
        'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
      ];
      const monthIdx = isNaN(startD.getTime()) ? new Date().getUTCMonth() : startD.getUTCMonth();
      const feeMonth = monthNames[monthIdx] || 'JANUARY';

      // 7a. One-Time Admission Fee Charge
      if (feeConfig.admissionFeeEnabled && Number(feeConfig.admissionFeeAmount) > 0) {
        const admissionFeeType = feeConfig.admissionFeeTypeId
          ? await tx.feeType.findUnique({ where: { id: feeConfig.admissionFeeTypeId } })
          : await getSystemFeeType(schoolId, 'HOSTEL_ADMISSION', tx);

        if (admissionFeeType) {
          const existingAdmissionCharge = await tx.studentFeeCharge.findFirst({
            where: {
              schoolId,
              academicYearId,
              studentId,
              feeTypeId: admissionFeeType.id,
            },
          });

          if (!existingAdmissionCharge) {
            await tx.studentFeeCharge.create({
              data: {
                schoolId,
                academicYearId,
                studentId,
                studentEnrollmentId: activeClassEnrollment ? activeClassEnrollment.id : null,
                feeTypeId: admissionFeeType.id,
                month: feeMonth,
                title: `${admissionFeeType.name} - ${hostel.name}`,
                amount: feeConfig.admissionFeeAmount,
                paidAmount: new Prisma.Decimal(0),
                status: 'UNPAID',
              },
            });
            admissionFeeCharged = true;
          }
        }
      }

      // 7b. Monthly Hostel Fee Charge for Admission Month
      if (feeConfig.monthlyFeeEnabled && Number(feeConfig.monthlyFeeAmount) > 0) {
        const monthlyFeeType = feeConfig.monthlyFeeTypeId
          ? await tx.feeType.findUnique({ where: { id: feeConfig.monthlyFeeTypeId } })
          : await getSystemFeeType(schoolId, 'HOSTEL', tx);

        if (monthlyFeeType) {
          const existingMonthlyCharge = await tx.studentFeeCharge.findFirst({
            where: {
              schoolId,
              academicYearId,
              studentId,
              feeTypeId: monthlyFeeType.id,
              month: feeMonth,
            },
          });

          if (!existingMonthlyCharge) {
            await tx.studentFeeCharge.create({
              data: {
                schoolId,
                academicYearId,
                studentId,
                studentEnrollmentId: activeClassEnrollment ? activeClassEnrollment.id : null,
                feeTypeId: monthlyFeeType.id,
                month: feeMonth,
                title: `${monthlyFeeType.name} - ${hostel.name} (${feeMonth})`,
                amount: feeConfig.monthlyFeeAmount,
                paidAmount: new Prisma.Decimal(0),
                status: 'UNPAID',
              },
            });
            monthlyFeeCharged = true;
          }
        }
      }
    }

    if (actorUserId) {
      await tx.auditLog.create({
        data: {
          schoolId,
          userId: actorUserId,
          action: 'ADMIT_STUDENT_HOSTEL',
          entityType: 'HostelEnrollment',
          entityId: enrollment.id,
          newValues: {
            studentName: student.name,
            hostelName: hostel.name,
            roomNumber: room.roomNumber,
            bedNumber: bed.bedNumber,
            startDate,
            admissionFeeCharged,
            monthlyFeeCharged,
          },
        },
      });
    }

    return {
      ...enrollment,
      admissionFeeCharged,
      monthlyFeeCharged,
    };
  });
};

// ==========================================
// SEPARATE HOSTEL MONTHLY FEE GENERATION
// ==========================================

export const generateHostelMonthlyFees = async (schoolId, payload, actorUserId) => {
  const { academicYearId, month, hostelId } = payload;

  const academicYear = await prisma.academicYear.findUnique({
    where: { id: academicYearId },
  });

  if (!academicYear || academicYear.schoolId !== schoolId) {
    throw ApiError.notFound('Academic year not found');
  }

  if (academicYear.isLocked) {
    throw ApiError.forbidden('Academic year is locked.');
  }

  // Fetch active hostel residents (including those enrolled in prior academic years who remain active)
  const enrollmentWhere = {
    schoolId,
    status: 'ACTIVE',
  };
  if (hostelId) {
    enrollmentWhere.hostelId = hostelId;
  }

  const enrollments = await prisma.hostelEnrollment.findMany({
    where: enrollmentWhere,
    include: {
      student: { select: { id: true, name: true, admissionNo: true, status: true } },
      hostel: { select: { id: true, name: true } },
    },
  });

  if (enrollments.length === 0) {
    throw ApiError.badRequest('No active hostel residents found for the selected parameters');
  }

  // Fetch Hostel Fee Configs
  const feeConfigs = await prisma.hostelFeeConfig.findMany({
    where: {
      schoolId,
      academicYearId,
    },
  });

  const configMap = new Map();
  feeConfigs.forEach((cfg) => {
    configMap.set(cfg.hostelId || 'DEFAULT', cfg);
  });

  const defaultMonthlyFeeType = await getSystemFeeType(schoolId, 'HOSTEL');

  let generatedCount = 0;
  let skippedCount = 0;
  let totalAmount = 0;
  const skippedDetails = [];

  return await prisma.$transaction(async (tx) => {
    for (const enr of enrollments) {
      if (enr.student.status !== 'ACTIVE') {
        skippedCount++;
        skippedDetails.push({ studentName: enr.student.name, reason: 'Student is not active' });
        continue;
      }

      // Check date eligibility using isEffectiveForMonth helper (STRICT NO BACKDATED FEES)
      const effective = isEffectiveForMonth({
        startDate: enr.startDate,
        endDate: enr.endDate,
        generationMonth: month,
        academicYear,
      });

      if (!effective) {
        skippedCount++;
        skippedDetails.push({
          studentName: enr.student.name,
          reason: `Hostel start date (${new Date(enr.startDate).toLocaleDateString()}) is after target month`,
        });
        continue;
      }

      // Resolve fee config
      const cfg = configMap.get(enr.hostelId) || configMap.get('DEFAULT');
      if (!cfg || !cfg.monthlyFeeEnabled || Number(cfg.monthlyFeeAmount) <= 0) {
        skippedCount++;
        skippedDetails.push({ studentName: enr.student.name, reason: 'Hostel Monthly Fee is not configured' });
        continue;
      }

      const feeTypeId = cfg.monthlyFeeTypeId || defaultMonthlyFeeType.id;
      const chargeTitle = `Hostel Monthly Fee - ${enr.hostel.name}`;

      // Duplicate protection check
      const existingCharge = await tx.studentFeeCharge.findFirst({
        where: {
          schoolId,
          academicYearId,
          studentId: enr.studentId,
          feeTypeId,
          month,
          title: chargeTitle,
        },
      });

      if (existingCharge) {
        skippedCount++;
        skippedDetails.push({ studentName: enr.student.name, reason: 'Fee charge already generated for this month' });
        continue;
      }

      const chargeAmt = Number(cfg.monthlyFeeAmount);
      await tx.studentFeeCharge.create({
        data: {
          schoolId,
          academicYearId,
          studentId: enr.studentId,
          feeTypeId,
          month,
          title: chargeTitle,
          amount: new Prisma.Decimal(chargeAmt),
          paidAmount: new Prisma.Decimal(0),
          status: 'UNPAID',
        },
      });

      generatedCount++;
      totalAmount += chargeAmt;
    }

    if (actorUserId) {
      await tx.auditLog.create({
        data: {
          schoolId,
          userId: actorUserId,
          action: 'GENERATE_HOSTEL_FEES',
          entityType: 'HostelEnrollment',
          newValues: { month, generatedCount, skippedCount, totalAmount },
        },
      });
    }

    return {
      month,
      totalResidents: enrollments.length,
      generatedCount,
      skippedCount,
      totalAmount,
      skippedDetails,
    };
  });
};

// ==========================================
// RESIDENTS DIRECTORY & DETAILS
// ==========================================

export const listResidents = async (schoolId, query = {}) => {
  const where = { schoolId };
  if (query.academicYearId) where.academicYearId = query.academicYearId;
  if (query.hostelId) where.hostelId = query.hostelId;
  if (query.roomId) where.roomId = query.roomId;
  if (query.status) where.status = query.status;
  else where.status = 'ACTIVE';

  const enrollments = await prisma.hostelEnrollment.findMany({
    where,
    include: {
      student: {
        select: {
          id: true,
          name: true,
          admissionNo: true,
          phone: true,
          guardianName: true,
          status: true,
          photoUrl: true,
          enrollments: {
            where: query.academicYearId ? { academicYearId: query.academicYearId } : undefined,
            take: 1,
            include: {
              class: { select: { id: true, name: true } },
              section: { select: { id: true, name: true } },
              stream: { select: { id: true, name: true } },
              medium: { select: { id: true, name: true } },
            },
          },
        },
      },
      hostel: { select: { id: true, name: true, type: true } },
      room: { select: { id: true, roomNumber: true, floor: true } },
      bed: { select: { id: true, bedNumber: true } },
      transfers: {
        orderBy: { transferDate: 'desc' },
        include: {
          fromHostel: { select: { name: true } },
          fromRoom: { select: { roomNumber: true } },
          fromBed: { select: { bedNumber: true } },
          toHostel: { select: { name: true } },
          toRoom: { select: { roomNumber: true } },
          toBed: { select: { bedNumber: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return enrollments.map((e) => {
    const studentClass = e.student.enrollments[0] || null;
    return {
      id: e.id,
      studentId: e.student.id,
      studentName: e.student.name,
      admissionNo: e.student.admissionNo,
      guardianName: e.student.guardianName,
      phone: e.student.phone,
      photoUrl: e.student.photoUrl,
      studentStatus: e.student.status,
      className: studentClass?.class?.name || null,
      sectionName: studentClass?.section?.name || null,
      streamName: studentClass?.stream?.name || null,
      mediumName: studentClass?.medium?.name || null,
      hostelId: e.hostelId,
      hostelName: e.hostel.name,
      hostelType: e.hostel.type,
      roomId: e.roomId,
      roomNumber: e.room.roomNumber,
      bedId: e.bedId,
      bedNumber: e.bed.bedNumber,
      startDate: e.startDate,
      endDate: e.endDate,
      exitReason: e.exitReason,
      status: e.status,
      transferCount: e.transfers.length,
      transferHistory: e.transfers,
    };
  });
};

export const getResidentDetails = async (schoolId, enrollmentId) => {
  const enrollment = await prisma.hostelEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      student: {
        include: {
          enrollments: {
            include: {
              class: true,
              section: true,
              medium: true,
              stream: true,
            },
          },
          feeCharges: {
            where: { feeType: { category: 'HOSTEL' } },
            orderBy: { createdAt: 'desc' },
            include: { feeType: { select: { name: true } } },
          },
        },
      },
      hostel: true,
      room: true,
      bed: true,
      transfers: {
        orderBy: { transferDate: 'desc' },
        include: {
          fromHostel: { select: { name: true } },
          fromRoom: { select: { roomNumber: true } },
          fromBed: { select: { bedNumber: true } },
          toHostel: { select: { name: true } },
          toRoom: { select: { roomNumber: true } },
          toBed: { select: { bedNumber: true } },
        },
      },
    },
  });

  if (!enrollment || enrollment.schoolId !== schoolId) {
    throw ApiError.notFound('Hostel resident details not found');
  }

  return enrollment;
};

// ==========================================
// HOSTEL TRANSFER (CONCURRENCY-SAFE)
// ==========================================

export const transferStudent = async (schoolId, payload, actorUserId) => {
  const { enrollmentId, toHostelId, toRoomId, toBedId, transferDate, reason } = payload;

  return await prisma.$transaction(async (tx) => {
    const enrollment = await tx.hostelEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: true,
        hostel: true,
        room: true,
        bed: true,
      },
    });

    if (!enrollment || enrollment.schoolId !== schoolId) {
      throw ApiError.notFound('Hostel enrollment not found');
    }

    if (enrollment.status !== 'ACTIVE') {
      throw ApiError.badRequest('Only active hostel enrollments can be transferred');
    }

    // Verify target bed is AVAILABLE
    const targetBed = await tx.hostelBed.findFirst({
      where: {
        id: toBedId,
        roomId: toRoomId,
        hostelId: toHostelId,
        schoolId,
        status: 'AVAILABLE',
        isActive: true,
      },
    });

    if (!targetBed) {
      throw ApiError.badRequest('This bed is no longer available. Please select another bed.');
    }

    // 1. Release previous bed to AVAILABLE
    await tx.hostelBed.update({
      where: { id: enrollment.bedId },
      data: { status: 'AVAILABLE' },
    });

    // 2. Mark new bed as OCCUPIED
    await tx.hostelBed.update({
      where: { id: targetBed.id },
      data: { status: 'OCCUPIED' },
    });

    // 3. Record HostelTransferHistory
    await tx.hostelTransferHistory.create({
      data: {
        schoolId,
        enrollmentId: enrollment.id,
        fromHostelId: enrollment.hostelId,
        fromRoomId: enrollment.roomId,
        fromBedId: enrollment.bedId,
        toHostelId,
        toRoomId,
        toBedId: targetBed.id,
        transferDate: transferDate ? new Date(transferDate) : new Date(),
        reason: reason || 'Hostel Transfer',
      },
    });

    // 4. Update enrollment
    const updated = await tx.hostelEnrollment.update({
      where: { id: enrollment.id },
      data: {
        hostelId: toHostelId,
        roomId: toRoomId,
        bedId: targetBed.id,
      },
      include: {
        student: { select: { id: true, name: true, admissionNo: true } },
        hostel: { select: { id: true, name: true } },
        room: { select: { id: true, roomNumber: true } },
        bed: { select: { id: true, bedNumber: true } },
      },
    });

    if (actorUserId) {
      await tx.auditLog.create({
        data: {
          schoolId,
          userId: actorUserId,
          action: 'TRANSFER_STUDENT_HOSTEL',
          entityType: 'HostelEnrollment',
          entityId: enrollment.id,
          newValues: {
            fromBed: enrollment.bed.bedNumber,
            toBed: targetBed.bedNumber,
            reason,
          },
        },
      });
    }

    return updated;
  });
};

// ==========================================
// HOSTEL EXIT (CONCURRENCY-SAFE)
// ==========================================

export const exitStudent = async (schoolId, payload, actorUserId) => {
  const { enrollmentId, exitDate, reason } = payload;

  return await prisma.$transaction(async (tx) => {
    const enrollment = await tx.hostelEnrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment || enrollment.schoolId !== schoolId) {
      throw ApiError.notFound('Hostel enrollment not found');
    }

    if (enrollment.status !== 'ACTIVE') {
      throw ApiError.badRequest('Student is not in an active hostel enrollment');
    }

    // 1. Release bed to AVAILABLE
    await tx.hostelBed.update({
      where: { id: enrollment.bedId },
      data: { status: 'AVAILABLE' },
    });

    // 2. End enrollment
    const updated = await tx.hostelEnrollment.update({
      where: { id: enrollment.id },
      data: {
        status: 'EXITED',
        endDate: new Date(exitDate),
        exitReason: reason || 'Hostel Exit',
      },
      include: {
        student: { select: { id: true, name: true, admissionNo: true } },
        hostel: { select: { id: true, name: true } },
        room: { select: { id: true, roomNumber: true } },
        bed: { select: { id: true, bedNumber: true } },
      },
    });

    if (actorUserId) {
      await tx.auditLog.create({
        data: {
          schoolId,
          userId: actorUserId,
          action: 'EXIT_STUDENT_HOSTEL',
          entityType: 'HostelEnrollment',
          entityId: enrollment.id,
          newValues: { exitDate, reason },
        },
      });
    }

    return updated;
  });
};

// ==========================================
// HOSTEL REPORTS
// ==========================================

export const getHostelReports = async (schoolId, reportType, query = {}) => {
  const { academicYearId, hostelId, roomId, status, startDate, endDate } = query;

  switch (reportType) {
    case 'residents':
      return await listResidents(schoolId, query);

    case 'occupancy': {
      const hostels = await listHostels(schoolId, { hostelId });
      return hostels.map((h) => ({
        hostelId: h.id,
        hostelName: h.name,
        type: h.type,
        totalRooms: h.totalRooms,
        totalBeds: h.totalBeds,
        occupiedBeds: h.occupiedBeds,
        availableBeds: h.availableBeds,
        occupancyRate: h.totalBeds > 0 ? Math.round((h.occupiedBeds / h.totalBeds) * 100) : 0,
      }));
    }

    case 'availability': {
      const rooms = await listRooms(schoolId, { hostelId, isActive: 'true' });
      return rooms.map((r) => ({
        roomId: r.id,
        hostelName: r.hostel.name,
        roomNumber: r.roomNumber,
        floor: r.floor,
        capacity: r.capacity,
        availableBedsCount: r.availableBedsCount,
        occupiedBedsCount: r.occupiedBedsCount,
        availableBedNumbers: r.beds.filter((b) => b.status === 'AVAILABLE').map((b) => b.bedNumber),
      }));
    }

    case 'admissions': {
      const where = { schoolId };
      if (academicYearId) where.academicYearId = academicYearId;
      if (hostelId) where.hostelId = hostelId;
      if (startDate || endDate) {
        where.startDate = {};
        if (startDate) where.startDate.gte = new Date(startDate);
        if (endDate) where.startDate.lte = new Date(endDate);
      }

      return await prisma.hostelEnrollment.findMany({
        where,
        include: {
          student: { select: { id: true, name: true, admissionNo: true, guardianName: true, phone: true } },
          hostel: { select: { name: true } },
          room: { select: { roomNumber: true } },
          bed: { select: { bedNumber: true } },
        },
        orderBy: { startDate: 'desc' },
      });
    }

    case 'transfers': {
      const where = { schoolId };
      if (startDate || endDate) {
        where.transferDate = {};
        if (startDate) where.transferDate.gte = new Date(startDate);
        if (endDate) where.transferDate.lte = new Date(endDate);
      }

      return await prisma.hostelTransferHistory.findMany({
        where,
        include: {
          enrollment: {
            include: {
              student: { select: { id: true, name: true, admissionNo: true } },
            },
          },
          fromHostel: { select: { name: true } },
          fromRoom: { select: { roomNumber: true } },
          fromBed: { select: { bedNumber: true } },
          toHostel: { select: { name: true } },
          toRoom: { select: { roomNumber: true } },
          toBed: { select: { bedNumber: true } },
        },
        orderBy: { transferDate: 'desc' },
      });
    }

    case 'exits': {
      const where = { schoolId, status: 'EXITED' };
      if (academicYearId) where.academicYearId = academicYearId;
      if (hostelId) where.hostelId = hostelId;
      if (startDate || endDate) {
        where.endDate = {};
        if (startDate) where.endDate.gte = new Date(startDate);
        if (endDate) where.endDate.lte = new Date(endDate);
      }

      return await prisma.hostelEnrollment.findMany({
        where,
        include: {
          student: { select: { id: true, name: true, admissionNo: true } },
          hostel: { select: { name: true } },
          room: { select: { roomNumber: true } },
          bed: { select: { bedNumber: true } },
        },
        orderBy: { endDate: 'desc' },
      });
    }

    case 'fees': {
      const where = {
        schoolId,
        feeType: { category: 'HOSTEL' },
      };
      if (academicYearId) where.academicYearId = academicYearId;
      if (status) where.status = status;

      const charges = await prisma.studentFeeCharge.findMany({
        where,
        include: {
          student: { select: { id: true, name: true, admissionNo: true } },
          feeType: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      let totalAmount = 0;
      let totalPaid = 0;
      let totalUnpaid = 0;

      charges.forEach((c) => {
        const amt = Number(c.amount);
        const paid = Number(c.paidAmount);
        totalAmount += amt;
        totalPaid += paid;
        totalUnpaid += amt - paid;
      });

      return {
        summary: { totalCharges: charges.length, totalAmount, totalPaid, totalUnpaid },
        charges,
      };
    }

    default:
      throw ApiError.badRequest(`Unknown report type '${reportType}'`);
  }
};
