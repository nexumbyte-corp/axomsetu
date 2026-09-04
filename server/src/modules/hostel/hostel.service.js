import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { isEffectiveForMonth } from '../fees/fee-generation.service.js';
import { ensureFeeCharge } from '../fees/fee-creation.service.js';

export const ensureHostelFeeType = async (schoolId, systemCode, tx = prisma) => {
  let feeType = await tx.feeType.findUnique({
    where: {
      schoolId_systemCode: {
        schoolId,
        systemCode,
      },
    },
  });

  if (!feeType) {
    const isAdmission = systemCode === 'HOSTEL_ADMISSION';
    const feeName = isAdmission ? 'Hostel Admission Fee' : 'Hostel Monthly Fee';

    feeType = await tx.feeType.findUnique({
      where: {
        schoolId_name: {
          schoolId,
          name: feeName,
        },
      },
    });

    if (!feeType) {
      feeType = await tx.feeType.create({
        data: {
          schoolId,
          name: feeName,
          code: isAdmission ? 'HOSTEL_ADM' : 'HOSTEL_MONTHLY',
          description: isAdmission ? 'Hostel Admission Fee Charge' : 'Monthly Hostel Accommodation Charge',
          category: 'HOSTEL',
          billingRule: isAdmission ? 'ONE_TIME_PER_ACADEMIC_YEAR' : 'MONTHLY',
          isActive: true,
          isSystem: true,
          systemCode,
        },
      });
    }
  }

  return feeType;
};

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
  if (query.hostelId) where.id = query.hostelId;
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

    const { rooms: _rooms, ...rest } = h;
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

export const bulkCreateRooms = async (schoolId, data, actorUserId) => {
  const hostel = await getHostelById(schoolId, data.hostelId);

  const prefix = (data.prefix || '').trim();
  const startNum = data.startRoomNumber || 101;
  const count = data.count;
  const floor = data.floor ? data.floor.trim() : null;
  const capacity = data.capacity || 2;
  const roomType = data.roomType ? data.roomType.trim() : 'Non-AC';

  const existingRooms = await prisma.hostelRoom.findMany({
    where: { hostelId: data.hostelId },
    select: { roomNumber: true },
  });

  const existingSet = new Set(existingRooms.map((r) => r.roomNumber.toLowerCase()));

  const createdRooms = [];
  let totalBedsGenerated = 0;
  let currentNum = startNum;

  while (createdRooms.length < count) {
    const roomNumStr = prefix ? `${prefix}${currentNum}` : `${currentNum}`;
    currentNum++;

    if (existingSet.has(roomNumStr.toLowerCase())) {
      continue;
    }

    const room = await prisma.hostelRoom.create({
      data: {
        schoolId,
        hostelId: data.hostelId,
        roomNumber: roomNumStr,
        floor,
        capacity,
        roomType,
      },
    });

    existingSet.add(roomNumStr.toLowerCase());
    createdRooms.push(room);

    const bedPayloads = [];
    for (let i = 1; i <= capacity; i++) {
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

    totalBedsGenerated += bedPayloads.length;
  }

  if (actorUserId && createdRooms.length > 0) {
    await prisma.auditLog.create({
      data: {
        schoolId,
        userId: actorUserId,
        action: 'BULK_CREATE_ROOMS',
        entityType: 'HostelRoom',
        entityId: createdRooms[0].id,
        newValues: {
          hostelName: hostel.name,
          roomsCreatedCount: createdRooms.length,
          totalBedsGenerated,
          startRoomNumber: startNum,
          roomNumbers: createdRooms.map((r) => r.roomNumber),
        },
      },
    });
  }

  return {
    message: `Successfully created ${createdRooms.length} room(s) and ${totalBedsGenerated} bed(s) in '${hostel.name}'.`,
    roomsCount: createdRooms.length,
    bedsCount: totalBedsGenerated,
  };
};

// ==========================================
// BEDS CRUD & BOOKMYSHOW PREVIEW
// ==========================================

export const listBeds = async (schoolId, query = {}) => {
  const where = { schoolId };
  if (query.hostelId && query.hostelId.trim() !== '') where.hostelId = query.hostelId;
  if (query.roomId && query.roomId.trim() !== '') where.roomId = query.roomId;
  if (query.status && query.status.trim() !== '' && query.status !== 'ALL') where.status = query.status;
  if (query.isActive === 'true') where.isActive = true;

  const beds = await prisma.hostelBed.findMany({
    where,
    include: {
      hostel: { select: { id: true, name: true, type: true } },
      room: { select: { id: true, roomNumber: true, floor: true, roomType: true } },
      enrollments: {
        where: { status: 'ACTIVE' },
        include: {
          student: { select: { id: true, name: true, admissionNo: true, photoUrl: true, guardianName: true } },
        },
        take: 1,
      },
    },
    orderBy: [{ room: { roomNumber: 'asc' } }, { bedNumber: 'asc' }],
  });

  return beds.map((b) => {
    const activeEnrollment = b.enrollments[0] || null;
    const { enrollments: _enrollments, ...rest } = b;
    return {
      ...rest,
      activeResident: activeEnrollment
        ? {
          enrollmentId: activeEnrollment.id,
          studentId: activeEnrollment.student.id,
          studentName: activeEnrollment.student.name,
          admissionNo: activeEnrollment.student.admissionNo,
          photoUrl: activeEnrollment.student.photoUrl || null,
          guardianName: activeEnrollment.student.guardianName || null,
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

export const bulkCreateBeds = async (schoolId, data, _actorUserId) => {
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

  // Ensure default hostel fee types exist if not set
  const defaultAdmissionFeeType = await ensureHostelFeeType(schoolId, 'HOSTEL_ADMISSION');
  const defaultMonthlyFeeType = await ensureHostelFeeType(schoolId, 'HOSTEL');

  const isFeeSet = Boolean(
    config && (
      (config.monthlyFeeEnabled && Number(config.monthlyFeeAmount) > 0) ||
      (config.admissionFeeEnabled && Number(config.admissionFeeAmount) > 0)
    )
  );

  return {
    academicYearId,
    hostelId: hostelId || null,
    isFeeSet,
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

  const defaultAdmissionFeeType = await ensureHostelFeeType(schoolId, 'HOSTEL_ADMISSION');
  const defaultMonthlyFeeType = await ensureHostelFeeType(schoolId, 'HOSTEL');

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

    // 3b. Verify Hostel Fee Structure is configured for this hostel/academic year
    const feeConfig = await tx.hostelFeeConfig.findFirst({
      where: {
        schoolId,
        academicYearId,
        OR: [{ hostelId }, { hostelId: null }],
      },
      orderBy: { hostelId: 'desc' },
    });

    const isFeeSet = Boolean(
      feeConfig && (
        (feeConfig.monthlyFeeEnabled && Number(feeConfig.monthlyFeeAmount) > 0) ||
        (feeConfig.admissionFeeEnabled && Number(feeConfig.admissionFeeAmount) > 0)
      )
    );

    if (!isFeeSet) {
      throw ApiError.badRequest(
        `Hostel fee structure is not set for ${hostel.name} in this academic year. Please configure hostel fee rates before admitting students.`
      );
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

      // 7a. One-Time Admission Fee Charge (with Admin Override support)
      if (feeConfig.admissionFeeEnabled) {
        const defaultAdmissionFee = Number(feeConfig.admissionFeeAmount || 0);
        const appliedAdmissionFee = payload.admissionFeeOverride !== undefined && payload.admissionFeeOverride !== null
          ? Number(payload.admissionFeeOverride)
          : defaultAdmissionFee;

        if (appliedAdmissionFee > 0) {
          const admissionFeeType = feeConfig.admissionFeeTypeId
            ? await tx.feeType.findUnique({ where: { id: feeConfig.admissionFeeTypeId } })
            : await ensureHostelFeeType(schoolId, 'HOSTEL_ADMISSION', tx);

          if (admissionFeeType) {
            const res = await ensureFeeCharge(tx, {
              schoolId,
              academicYearId,
              studentId,
              studentEnrollmentId: activeClassEnrollment ? activeClassEnrollment.id : null,
              student,
              feeTypeId: admissionFeeType.id,
              month: feeMonth,
              title: `${admissionFeeType.name} - ${hostel.name}`,
              amount: appliedAdmissionFee,
              originalAmount: defaultAdmissionFee,
              isOverridden: appliedAdmissionFee !== defaultAdmissionFee,
              overrideReason: appliedAdmissionFee !== defaultAdmissionFee ? 'Admission fee override' : null,
              billingRule: 'ONE_TIME_PER_ACADEMIC_YEAR',
            });
            if (res.status === 'CREATED') {
              admissionFeeCharged = true;
            }
          }
        }
      }

      // 7b. Monthly Hostel Fee Charge for Admission Start Month (with Admin Override & £0 Waived support)
      if (feeConfig.monthlyFeeEnabled) {
        const defaultMonthlyFee = Number(feeConfig.monthlyFeeAmount || 0);
        const rawMonthlyApplied = payload.monthlyFeeApplied !== undefined
          ? payload.monthlyFeeApplied
          : payload.monthlyFeeOverride;

        const appliedMonthlyFee = rawMonthlyApplied !== undefined && rawMonthlyApplied !== null
          ? Number(rawMonthlyApplied)
          : defaultMonthlyFee;

        const monthlyFeeType = feeConfig.monthlyFeeTypeId
          ? await tx.feeType.findUnique({ where: { id: feeConfig.monthlyFeeTypeId } })
          : await ensureHostelFeeType(schoolId, 'HOSTEL', tx);

        if (monthlyFeeType) {
          const res = await ensureHostelMonthlyFee(tx, {
            schoolId,
            academicYearId,
            studentId,
            studentEnrollmentId: activeClassEnrollment ? activeClassEnrollment.id : null,
            student,
            feeTypeId: monthlyFeeType.id,
            month: feeMonth,
            title: `Hostel Monthly Fee - ${hostel.name}`,
            defaultFee: defaultMonthlyFee,
            appliedFee: appliedMonthlyFee,
            reason: appliedMonthlyFee === 0 ? 'Waived upon admission' : (appliedMonthlyFee !== defaultMonthlyFee ? 'Admission month fee override' : null),
          });
          if (res.status === 'CREATED') {
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
// AUTHORITATIVE HOSTEL MONTHLY FEE SERVICE
// ==========================================

const FEE_MONTH_INDEX_MAP = {
  JANUARY: 0, FEBRUARY: 1, MARCH: 2, APRIL: 3, MAY: 4, JUNE: 5,
  JULY: 6, AUGUST: 7, SEPTEMBER: 8, OCTOBER: 9, NOVEMBER: 10, DECEMBER: 11,
};

/**
 * Returns a map of studentId -> waivedReason for students who had ₹0 fee (WAIVED) in past generation batches for a month.
 */
export const getWaivedStudentIdsForMonth = async (txOrPrisma, { schoolId, academicYearId, month }) => {
  const tx = txOrPrisma || prisma;
  const batches = await tx.feeGenerationBatch.findMany({
    where: {
      schoolId,
      academicYearId,
      month,
    },
    select: {
      details: true,
    },
  });

  const waivedMap = new Map(); // studentId -> reason

  batches.forEach((b) => {
    if (b.details && typeof b.details === 'object' && Array.isArray(b.details.detailsList)) {
      b.details.detailsList.forEach((item) => {
        if (item.status === 'WAIVED' && item.studentId) {
          waivedMap.set(item.studentId, item.reason || 'Hostel Break / Waived');
        }
      });
    }
  });

  return waivedMap;
};

/**
 * Validates selected billing month against Academic Year and Backdate/Future protections.
 */
export const validateHostelBillingMonth = (academicYear, generationMonth, options = {}) => {
  const { isAdmissionException: _isAdmissionException = false } = options;

  const ayStart = new Date(academicYear.startDate);
  const ayEnd = new Date(academicYear.endDate);
  const startYear = ayStart.getUTCFullYear();
  const startMonthIdx = ayStart.getUTCMonth();
  const endYear = ayEnd.getUTCFullYear();

  const targetMonthIdx = FEE_MONTH_INDEX_MAP[generationMonth] ?? 0;
  const targetYear = targetMonthIdx >= startMonthIdx ? startYear : endYear;

  const targetKey = targetYear * 12 + targetMonthIdx;

  // Check Academic Year boundaries
  const ayStartKey = startYear * 12 + startMonthIdx;
  const ayEndKey = endYear * 12 + ayEnd.getUTCMonth();

  if (targetKey < ayStartKey || targetKey > ayEndKey) {
    throw ApiError.badRequest(`Selected month '${generationMonth}' does not belong to Academic Year ${academicYear.name}`);
  }

  // Return calculated academic month metadata
  return { targetYear, targetMonthIdx, targetKey };
};

/**
 * Authoritative single backend service for Hostel Monthly Fee creation.
 */
export const ensureHostelMonthlyFee = async (txOrPrisma, candidate) => {
  const tx = txOrPrisma || prisma;
  const {
    schoolId,
    academicYearId,
    studentId,
    studentEnrollmentId: rawEnrollmentId,
    feeTypeId,
    month,
    title,
    defaultFee: rawDefaultFee = 0,
    appliedFee: rawAppliedFee = 0,
    reason = null,
    isOverridden = false,
    overriddenById = null,
    generationBatchId = null,
  } = candidate;

  // 1. Verify Active Student Status
  let student = candidate.student;
  if (!student) {
    student = await tx.student.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, admissionNo: true, status: true },
    });
  }

  if (!student || student.status !== 'ACTIVE') {
    return {
      status: 'SKIPPED',
      reason: 'NOT_ACTIVE',
      detail: `Student ${student?.name || studentId} is not active`,
      charge: null,
    };
  }

  // 2. Verify Hosteller Status (Active or Exited during month)
  const hostelEnrollment = await tx.hostelEnrollment.findFirst({
    where: {
      schoolId,
      studentId,
      academicYearId,
      status: { in: ['ACTIVE', 'EXITED'] },
    },
    orderBy: { startDate: 'desc' },
    select: {
      id: true,
      hostelId: true,
      startDate: true,
      endDate: true,
      hostel: { select: { name: true } },
    },
  });

  if (!hostelEnrollment) {
    return {
      status: 'SKIPPED',
      reason: 'NOT_HOSTELLER',
      detail: `Student ${student.name} is not a hosteller`,
      charge: null,
    };
  }

  const academicYearObj = await tx.academicYear.findUnique({ where: { id: academicYearId } });
  if (academicYearObj) {
    const isEffective = isEffectiveForMonth({
      startDate: hostelEnrollment.startDate,
      endDate: hostelEnrollment.endDate,
      generationMonth: month,
      academicYear: academicYearObj,
    });

    if (!isEffective) {
      return {
        status: 'SKIPPED',
        reason: 'NOT_ENROLLED_IN_MONTH',
        detail: `Student ${student.name} was not enrolled in hostel during ${month}`,
        charge: null,
      };
    }
  }

  // 3. Resolve Student Enrollment ID if needed
  let studentEnrollmentId = rawEnrollmentId;
  if (!studentEnrollmentId) {
    const classEnr = await tx.studentEnrollment.findFirst({
      where: {
        schoolId,
        academicYearId,
        studentId,
        status: { in: ['ACTIVE', 'PROMOTED'] },
      },
      select: { id: true },
    });
    if (classEnr) studentEnrollmentId = classEnr.id;
  }

  const defaultFeeNum = Number(rawDefaultFee || 0);
  const appliedFeeNum = Number(rawAppliedFee !== undefined ? rawAppliedFee : defaultFeeNum);

  // 4. ZERO / VACATION / WAIVED RULE:
  // Applied Fee === 0 means WAIVED. DO NOT create a StudentFeeCharge record with amount 0.
  if (appliedFeeNum === 0) {
    return {
      status: 'WAIVED',
      reason: reason || 'Hostel Break / Vacation',
      detail: `Fee for ${student.name} (${month}) was set to ₹0 (WAIVED)`,
      charge: null,
    };
  }

  // 5. Duplicate Protection Check (Logical Identity & Past Waived Check)
  const existingCharge = await tx.studentFeeCharge.findFirst({
    where: {
      schoolId,
      academicYearId,
      studentId,
      feeTypeId,
      month,
    },
  });

  if (existingCharge) {
    return {
      status: 'ALREADY_EXISTS',
      reason: 'DUPLICATE',
      detail: `Fee charge '${existingCharge.title}' already exists for ${month}`,
      charge: existingCharge,
    };
  }

  const waivedStudentMap = await getWaivedStudentIdsForMonth(tx, { schoolId, academicYearId, month });
  if (waivedStudentMap.has(studentId)) {
    return {
      status: 'ALREADY_EXISTS',
      reason: 'WAIVED_PREVIOUSLY',
      detail: `Fee for this student was already waived for ${month}`,
      charge: null,
    };
  }

  // 6. Create StudentFeeCharge
  const finalIsOverridden = isOverridden || appliedFeeNum !== defaultFeeNum;
  const finalOverrideReason = finalIsOverridden ? (reason || 'Applied fee override') : null;
  const discountAmt = Math.max(0, defaultFeeNum - appliedFeeNum);

  const hostelName = hostelEnrollment?.hostel?.name;
  let finalTitle = title;
  if (!finalTitle || finalTitle === `Hostel Monthly Fee - ${month}` || finalTitle === 'Hostel Monthly Fee') {
    finalTitle = hostelName ? `Hostel Monthly Fee - ${hostelName}` : `Hostel Monthly Fee - ${month}`;
  }

  try {
    const charge = await tx.studentFeeCharge.create({
      data: {
        schoolId,
        academicYearId,
        studentId,
        studentEnrollmentId: studentEnrollmentId || null,
        feeTypeId,
        generationBatchId,
        month,
        title: finalTitle,
        amount: new Prisma.Decimal(appliedFeeNum),
        originalAmount: new Prisma.Decimal(defaultFeeNum),
        discountAmount: new Prisma.Decimal(discountAmt),
        isOverridden: finalIsOverridden,
        overrideReason: finalOverrideReason,
        overriddenById: overriddenById || null,
        overriddenAt: finalIsOverridden ? new Date() : null,
        paidAmount: new Prisma.Decimal(0),
        status: 'UNPAID',
      },
    });

    return {
      status: 'CREATED',
      reason: null,
      detail: null,
      charge,
    };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const concurrentCharge = await tx.studentFeeCharge.findFirst({
        where: {
          schoolId,
          academicYearId,
          studentId,
          feeTypeId,
          month,
        },
      });
      return {
        status: 'ALREADY_EXISTS',
        reason: 'CONCURRENT_DUPLICATE',
        detail: 'Charge was created concurrently',
        charge: concurrentCharge,
      };
    }
    throw err;
  }
};

// ==========================================
// ELIGIBLE HOSTEL STUDENTS LOADER FOR BILLING
// ==========================================

export const getEligibleHostelStudentsForBilling = async (schoolId, query) => {
  const { academicYearId, month, hostelId, classId, sectionId, streamId, mediumId, search } = query;

  if (!academicYearId || !month) {
    throw ApiError.badRequest('Academic Year ID and Billing Month are required');
  }

  const academicYear = await prisma.academicYear.findUnique({
    where: { id: academicYearId },
  });

  if (!academicYear || academicYear.schoolId !== schoolId) {
    throw ApiError.notFound('Academic Year not found');
  }

  // Enforce backdate & future month validations for normal generation
  validateHostelBillingMonth(academicYear, month, { isAdmissionException: false });

  const enrollmentWhere = {
    schoolId,
    academicYearId,
    status: { in: ['ACTIVE', 'EXITED'] },
    student: {
      status: 'ACTIVE',
    },
  };

  if (hostelId) {
    enrollmentWhere.hostelId = hostelId;
  }

  const hostelEnrollments = await prisma.hostelEnrollment.findMany({
    where: enrollmentWhere,
    include: {
      student: {
        select: {
          id: true,
          name: true,
          admissionNo: true,
          status: true,
          photoUrl: true,
          guardianName: true,
          enrollments: {
            where: { academicYearId, status: { in: ['ACTIVE', 'PROMOTED'] } },
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
      hostel: { select: { id: true, name: true } },
    },
    orderBy: { student: { name: 'asc' } },
  });

  const defaultMonthlyFeeType = await ensureHostelFeeType(schoolId, 'HOSTEL');

  const feeConfigs = await prisma.hostelFeeConfig.findMany({
    where: { schoolId, academicYearId },
  });

  const configMap = new Map();
  feeConfigs.forEach((cfg) => {
    configMap.set(cfg.hostelId || 'DEFAULT', cfg);
  });

  const studentIds = hostelEnrollments.map((h) => h.studentId);

  const [existingCharges, waivedStudentMap] = await Promise.all([
    prisma.studentFeeCharge.findMany({
      where: {
        schoolId,
        academicYearId,
        studentId: { in: studentIds },
        feeTypeId: defaultMonthlyFeeType.id,
        month,
      },
    }),
    getWaivedStudentIdsForMonth(prisma, { schoolId, academicYearId, month }),
  ]);

  const existingChargeMap = new Map();
  existingCharges.forEach((c) => {
    existingChargeMap.set(c.studentId, c);
  });

  const studentList = [];

  for (const he of hostelEnrollments) {
    const classEnr = he.student.enrollments[0] || null;

    if (classId && classEnr?.class?.id !== classId) continue;
    if (sectionId && classEnr?.section?.id !== sectionId) continue;
    if (streamId && classEnr?.stream?.id !== streamId) continue;
    if (mediumId && classEnr?.medium?.id !== mediumId) continue;

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      const matchName = he.student.name.toLowerCase().includes(q);
      const matchAdm = he.student.admissionNo.toLowerCase().includes(q);
      const matchGuardian = (he.student.guardianName || '').toLowerCase().includes(q);
      if (!matchName && !matchAdm && !matchGuardian) continue;
    }

    const effective = isEffectiveForMonth({
      startDate: he.startDate,
      endDate: he.endDate,
      generationMonth: month,
      academicYear,
    });

    if (!effective) continue;

    const cfg = configMap.get(he.hostelId) || configMap.get('DEFAULT');
    const defaultFee = cfg && cfg.monthlyFeeEnabled ? Number(cfg.monthlyFeeAmount) : 3000;
    const existing = existingChargeMap.get(he.studentId);
    const waivedReason = waivedStudentMap.get(he.studentId);

    const isAlreadyGenerated = Boolean(existing);
    const isAlreadyWaived = !isAlreadyGenerated && Boolean(waivedReason);

    let appliedFee = defaultFee;
    let status = 'NEW';
    let reason = '';
    let isSelectable = true;

    if (isAlreadyGenerated) {
      status = 'ALREADY_GENERATED';
      appliedFee = Number(existing.amount);
      reason = 'Already Generated';
      isSelectable = false;
    } else if (isAlreadyWaived) {
      status = 'ALREADY_GENERATED';
      appliedFee = 0;
      reason = waivedReason || 'Waived / Hostel Break';
      isSelectable = false;
    }

    studentList.push({
      studentId: he.studentId,
      studentEnrollmentId: classEnr?.id || null,
      studentName: he.student.name,
      admissionNo: he.student.admissionNo,
      photoUrl: he.student.photoUrl || null,
      guardianName: he.student.guardianName || null,
      className: classEnr?.class?.name || 'N/A',
      sectionName: classEnr?.section?.name || 'N/A',
      streamName: classEnr?.stream?.name || null,
      mediumName: classEnr?.medium?.name || null,
      hostelId: he.hostelId,
      hostelName: he.hostel.name,
      hostelEnrollmentStatus: he.status,
      startDate: he.startDate,
      endDate: he.endDate,
      defaultFee,
      appliedFee,
      status,
      reason,
      isSelectable,
      isSelected: isSelectable,
      existingChargeId: existing?.id || null,
    });
  }

  return {
    academicYearId,
    month,
    totalHostellers: studentList.length,
    students: studentList,
  };
};

// ==========================================
// HOSTEL MONTHLY FEE GENERATION EXECUTION
// ==========================================

export const generateHostelMonthlyFees = async (schoolId, payload, actorUserId) => {
  const { academicYearId, month, hostelId: _hostelId, students = [] } = payload;

  const academicYear = await prisma.academicYear.findUnique({
    where: { id: academicYearId },
  });

  if (!academicYear || academicYear.schoolId !== schoolId) {
    throw ApiError.notFound('Academic year not found');
  }

  if (academicYear.isLocked) {
    throw ApiError.forbidden('Academic year is locked.');
  }

  // Validate date protections
  validateHostelBillingMonth(academicYear, month, { isAdmissionException: false });

  if (students.length === 0) {
    throw ApiError.badRequest('No students provided for fee generation');
  }

  const defaultMonthlyFeeType = await ensureHostelFeeType(schoolId, 'HOSTEL');

  return await prisma.$transaction(async (tx) => {
    let createdCount = 0;
    let alreadyExistsCount = 0;
    let waivedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    let totalAmount = 0;

    const detailsList = [];

    const batch = await tx.feeGenerationBatch.create({
      data: {
        schoolId,
        academicYearId,
        month,
        mode: 'BY_STUDENT',
        totalStudents: students.length,
        generatedCount: 0,
        skippedCount: 0,
        totalAmount: new Prisma.Decimal(0),
        createdById: actorUserId || null,
      },
    });

    for (const item of students) {
      const { studentId, studentEnrollmentId, appliedFee, defaultFee, reason, isWaived } = item;

      const chargeTitle = `Hostel Monthly Fee`;

      const res = await ensureHostelMonthlyFee(tx, {
        schoolId,
        academicYearId,
        studentId,
        studentEnrollmentId,
        feeTypeId: defaultMonthlyFeeType.id,
        month,
        title: chargeTitle,
        defaultFee: defaultFee !== undefined ? Number(defaultFee) : 3000,
        appliedFee: (isWaived || Number(appliedFee) === 0) ? 0 : Number(appliedFee),
        reason: reason || (isWaived ? 'Hostel Break / Vacation' : null),
        generationBatchId: batch.id,
        overriddenById: actorUserId || null,
      });

      if (res.status === 'CREATED') {
        createdCount++;
        totalAmount += Number(appliedFee);
        detailsList.push({ studentId, status: 'CREATED', amount: appliedFee });
      } else if (res.status === 'ALREADY_EXISTS') {
        alreadyExistsCount++;
        detailsList.push({ studentId, status: 'ALREADY_EXISTS' });
      } else if (res.status === 'WAIVED') {
        waivedCount++;
        detailsList.push({ studentId, status: 'WAIVED', reason: res.reason });
      } else if (res.status === 'SKIPPED') {
        skippedCount++;
        detailsList.push({ studentId, status: 'SKIPPED', reason: res.reason });
      } else {
        failedCount++;
        detailsList.push({ studentId, status: 'FAILED' });
      }
    }

    await tx.feeGenerationBatch.update({
      where: { id: batch.id },
      data: {
        generatedCount: createdCount,
        skippedCount: skippedCount + waivedCount + alreadyExistsCount,
        totalAmount: new Prisma.Decimal(totalAmount),
        details: {
          createdCount,
          alreadyExistsCount,
          waivedCount,
          skippedCount,
          failedCount,
          detailsList,
        },
      },
    });

    if (actorUserId) {
      await tx.auditLog.create({
        data: {
          schoolId,
          userId: actorUserId,
          action: 'GENERATE_HOSTEL_FEES',
          entityType: 'HostelEnrollment',
          newValues: {
            month,
            createdCount,
            alreadyExistsCount,
            waivedCount,
            skippedCount,
            failedCount,
            totalAmount,
          },
        },
      });
    }

    return {
      month,
      createdCount,
      alreadyExistsCount,
      waivedCount,
      skippedCount,
      failedCount,
      totalAmount,
      details: detailsList,
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

  if (query.search && query.search.trim()) {
    const s = query.search.trim();
    where.student = {
      OR: [
        { name: { contains: s, mode: 'insensitive' } },
        { admissionNo: { contains: s, mode: 'insensitive' } },
        { guardianName: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s, mode: 'insensitive' } },
      ],
    };
  }

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

    // Validate exitDate against start date
    const startD = new Date(enrollment.startDate);
    startD.setHours(0, 0, 0, 0);

    const exitD = exitDate ? new Date(exitDate) : new Date();
    if (isNaN(exitD.getTime())) {
      throw ApiError.badRequest('Invalid hostel exit date provided');
    }
    exitD.setHours(0, 0, 0, 0);

    if (exitD < startD) {
      const formattedStart = startD.toISOString().split('T')[0];
      throw ApiError.badRequest(`Exit date cannot be before hostel start date (${formattedStart})`);
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
  const { academicYearId, hostelId, roomId, status, startDate, endDate, search, availabilityStatus } = query;

  switch (reportType) {
    case 'residents':
      return await listResidents(schoolId, query);

    case 'occupancy': {
      const hostels = await listHostels(schoolId, { hostelId, isActive: 'true' });
      return hostels.map((h) => ({
        hostelId: h.id,
        hostelName: h.name,
        code: h.code,
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
      let result = rooms.map((r) => ({
        roomId: r.id,
        hostelId: r.hostelId,
        hostelName: r.hostel?.name || '',
        hostelType: r.hostel?.type || 'COMBINED',
        roomNumber: r.roomNumber,
        floor: r.floor || 'G',
        capacity: r.capacity,
        totalBedsCount: r.totalBedsCount,
        availableBedsCount: r.availableBedsCount,
        occupiedBedsCount: r.occupiedBedsCount,
        availableBedNumbers: r.beds.filter((b) => b.status === 'AVAILABLE' && b.isActive).map((b) => b.bedNumber),
        occupiedBedNumbers: r.beds.filter((b) => b.status === 'OCCUPIED' && b.isActive).map((b) => b.bedNumber),
      }));

      if (availabilityStatus === 'AVAILABLE') {
        result = result.filter((r) => r.availableBedsCount > 0);
      } else if (availabilityStatus === 'FULL') {
        result = result.filter((r) => r.availableBedsCount === 0);
      }

      if (search && search.trim()) {
        const s = search.trim().toLowerCase();
        result = result.filter(
          (r) =>
            r.roomNumber.toLowerCase().includes(s) ||
            r.hostelName.toLowerCase().includes(s) ||
            r.availableBedNumbers.some((b) => b.toLowerCase().includes(s))
        );
      }

      return result;
    }

    case 'admissions': {
      const where = { schoolId };
      if (academicYearId) where.academicYearId = academicYearId;
      if (hostelId) where.hostelId = hostelId;
      if (roomId) where.roomId = roomId;
      if (startDate || endDate) {
        where.startDate = {};
        if (startDate) where.startDate.gte = new Date(startDate);
        if (endDate) where.startDate.lte = new Date(endDate);
      }
      if (search && search.trim()) {
        const s = search.trim();
        where.student = {
          OR: [
            { name: { contains: s, mode: 'insensitive' } },
            { admissionNo: { contains: s, mode: 'insensitive' } },
            { guardianName: { contains: s, mode: 'insensitive' } },
            { phone: { contains: s, mode: 'insensitive' } },
          ],
        };
      }

      const admissions = await prisma.hostelEnrollment.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              admissionNo: true,
              guardianName: true,
              phone: true,
              photoUrl: true,
              enrollments: {
                where: academicYearId ? { academicYearId } : undefined,
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
        },
        orderBy: { startDate: 'desc' },
      });

      return admissions.map((a) => {
        const sc = a.student?.enrollments?.[0];
        return {
          id: a.id,
          startDate: a.startDate,
          endDate: a.endDate,
          status: a.status,
          student: a.student,
          studentName: a.student?.name,
          admissionNo: a.student?.admissionNo,
          guardianName: a.student?.guardianName,
          phone: a.student?.phone,
          photoUrl: a.student?.photoUrl,
          className: sc?.class?.name || null,
          sectionName: sc?.section?.name || null,
          streamName: sc?.stream?.name || null,
          mediumName: sc?.medium?.name || null,
          hostel: a.hostel,
          hostelName: a.hostel?.name,
          room: a.room,
          roomNumber: a.room?.roomNumber,
          bed: a.bed,
          bedNumber: a.bed?.bedNumber,
        };
      });
    }

    case 'transfers': {
      const where = { schoolId };
      if (academicYearId) {
        where.enrollment = { academicYearId };
      }
      if (hostelId) {
        where.OR = [{ fromHostelId: hostelId }, { toHostelId: hostelId }];
      }
      if (startDate || endDate) {
        where.transferDate = {};
        if (startDate) where.transferDate.gte = new Date(startDate);
        if (endDate) where.transferDate.lte = new Date(endDate);
      }
      if (search && search.trim()) {
        const s = search.trim();
        where.enrollment = {
          ...(where.enrollment || {}),
          student: {
            OR: [
              { name: { contains: s, mode: 'insensitive' } },
              { admissionNo: { contains: s, mode: 'insensitive' } },
              { guardianName: { contains: s, mode: 'insensitive' } },
            ],
          },
        };
      }

      const transfers = await prisma.hostelTransferHistory.findMany({
        where,
        include: {
          enrollment: {
            include: {
              student: {
                select: {
                  id: true,
                  name: true,
                  admissionNo: true,
                  photoUrl: true,
                  guardianName: true,
                  phone: true,
                  enrollments: {
                    where: academicYearId ? { academicYearId } : undefined,
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
            },
          },
          fromHostel: { select: { id: true, name: true } },
          fromRoom: { select: { id: true, roomNumber: true } },
          fromBed: { select: { id: true, bedNumber: true } },
          toHostel: { select: { id: true, name: true } },
          toRoom: { select: { id: true, roomNumber: true } },
          toBed: { select: { id: true, bedNumber: true } },
        },
        orderBy: { transferDate: 'desc' },
      });

      return transfers.map((t) => {
        const st = t.enrollment?.student;
        const sc = st?.enrollments?.[0];
        return {
          id: t.id,
          transferDate: t.transferDate,
          reason: t.reason,
          student: st,
          studentName: st?.name,
          admissionNo: st?.admissionNo,
          guardianName: st?.guardianName,
          phone: st?.phone,
          photoUrl: st?.photoUrl,
          className: sc?.class?.name || null,
          sectionName: sc?.section?.name || null,
          streamName: sc?.stream?.name || null,
          fromHostel: t.fromHostel,
          fromHostelName: t.fromHostel?.name,
          fromRoom: t.fromRoom,
          fromRoomNumber: t.fromRoom?.roomNumber,
          fromBed: t.fromBed,
          fromBedNumber: t.fromBed?.bedNumber,
          toHostel: t.toHostel,
          toHostelName: t.toHostel?.name,
          toRoom: t.toRoom,
          toRoomNumber: t.toRoom?.roomNumber,
          toBed: t.toBed,
          toBedNumber: t.toBed?.bedNumber,
        };
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
      if (search && search.trim()) {
        const s = search.trim();
        where.student = {
          OR: [
            { name: { contains: s, mode: 'insensitive' } },
            { admissionNo: { contains: s, mode: 'insensitive' } },
            { guardianName: { contains: s, mode: 'insensitive' } },
            { phone: { contains: s, mode: 'insensitive' } },
          ],
        };
      }

      const exits = await prisma.hostelEnrollment.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              admissionNo: true,
              admissionDate: true,
              photoUrl: true,
              guardianName: true,
              phone: true,
              enrollments: {
                where: academicYearId ? { academicYearId } : undefined,
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
        },
        orderBy: { endDate: 'desc' },
      });

      return exits.map((x) => {
        const sc = x.student?.enrollments?.[0];
        return {
          id: x.id,
          admissionDate: x.student?.admissionDate,
          effectiveDate: x.startDate,
          startDate: x.startDate,
          endDate: x.endDate,
          exitReason: x.exitReason,
          student: x.student,
          studentName: x.student?.name,
          admissionNo: x.student?.admissionNo,
          guardianName: x.student?.guardianName,
          phone: x.student?.phone,
          photoUrl: x.student?.photoUrl,
          className: sc?.class?.name || null,
          sectionName: sc?.section?.name || null,
          streamName: sc?.stream?.name || null,
          hostel: x.hostel,
          hostelName: x.hostel?.name,
          room: x.room,
          roomNumber: x.room?.roomNumber,
          bed: x.bed,
          bedNumber: x.bed?.bedNumber,
        };
      });
    }

    case 'fees': {
      const where = {
        schoolId,
        OR: [
          { feeType: { category: 'HOSTEL' } },
          { feeType: { systemCode: 'HOSTEL' } },
          { title: { contains: 'Hostel', mode: 'insensitive' } },
        ],
      };
      if (academicYearId) where.academicYearId = academicYearId;
      if (status && status !== 'ALL') where.status = status;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }
      if (hostelId) {
        where.student = {
          activeHostelEnrollments: {
            some: {
              hostelId,
              ...(academicYearId ? { academicYearId } : {}),
            },
          },
        };
      }
      if (search && search.trim()) {
        const s = search.trim();
        where.student = {
          ...(where.student || {}),
          OR: [
            { name: { contains: s, mode: 'insensitive' } },
            { admissionNo: { contains: s, mode: 'insensitive' } },
            { guardianName: { contains: s, mode: 'insensitive' } },
          ],
        };
      }

      const charges = await prisma.studentFeeCharge.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              admissionNo: true,
              photoUrl: true,
              guardianName: true,
              phone: true,
              enrollments: {
                where: academicYearId ? { academicYearId } : undefined,
                take: 1,
                include: {
                  class: { select: { id: true, name: true } },
                  section: { select: { id: true, name: true } },
                  stream: { select: { id: true, name: true } },
                  medium: { select: { id: true, name: true } },
                },
              },
              activeHostelEnrollments: {
                where: { status: 'ACTIVE' },
                take: 1,
                include: {
                  hostel: { select: { name: true } },
                  room: { select: { roomNumber: true } },
                  bed: { select: { bedNumber: true } },
                },
              },
            },
          },
          feeType: { select: { id: true, name: true, category: true } },
        },
        orderBy: [{ month: 'desc' }, { createdAt: 'desc' }],
      });

      let totalAmount = 0;
      let totalPaid = 0;
      let totalUnpaid = 0;

      const mappedCharges = charges.map((c) => {
        const amt = Number(c.amount);
        const paid = Number(c.paidAmount);
        const due = Math.max(0, amt - paid);
        totalAmount += amt;
        totalPaid += paid;
        totalUnpaid += due;

        const sc = c.student?.enrollments?.[0];
        const he = c.student?.activeHostelEnrollments?.[0];

        return {
          id: c.id,
          month: c.month,
          title: c.title,
          amount: amt,
          paidAmount: paid,
          dueAmount: due,
          status: c.status,
          dueDate: c.dueDate,
          createdAt: c.createdAt,
          student: c.student,
          studentName: c.student?.name,
          admissionNo: c.student?.admissionNo,
          guardianName: c.student?.guardianName,
          phone: c.student?.phone,
          photoUrl: c.student?.photoUrl,
          className: sc?.class?.name || null,
          sectionName: sc?.section?.name || null,
          streamName: sc?.stream?.name || null,
          hostelName: he?.hostel?.name || null,
          roomNumber: he?.room?.roomNumber || null,
          bedNumber: he?.bed?.bedNumber || null,
          feeTypeName: c.feeType?.name,
        };
      });

      return {
        summary: {
          totalCharges: mappedCharges.length,
          totalAmount,
          totalPaid,
          totalUnpaid,
        },
        charges: mappedCharges,
      };
    }

    default:
      throw ApiError.badRequest(`Unknown report type '${reportType}'`);
  }
};
