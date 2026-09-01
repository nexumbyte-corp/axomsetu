import * as hostelService from './hostel.service.js';
import * as schemas from './hostel.validation.js';

const getSchoolId = (req) => {
  return req.schoolMembership?.schoolId || req.school?.id;
};

const getActorId = (req) => {
  return req.user?.id || req.schoolMembership?.userId;
};

export const getDashboardData = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const academicYearId = req.query.academicYearId;
    const data = await hostelService.getHostelDashboardData(schoolId, academicYearId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// Hostels CRUD
export const listHostels = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const data = await hostelService.listHostels(schoolId, req.query);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getHostelById = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const data = await hostelService.getHostelById(schoolId, req.params.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createHostel = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const payload = schemas.createHostelSchema.parse(req.body);
    const data = await hostelService.createHostel(schoolId, payload, getActorId(req));
    res.status(201).json({ success: true, message: 'Hostel created successfully', data });
  } catch (err) {
    next(err);
  }
};

export const updateHostel = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const payload = schemas.updateHostelSchema.parse(req.body);
    const data = await hostelService.updateHostel(schoolId, req.params.id, payload, getActorId(req));
    res.status(200).json({ success: true, message: 'Hostel updated successfully', data });
  } catch (err) {
    next(err);
  }
};

export const deleteHostel = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const data = await hostelService.deleteHostel(schoolId, req.params.id, getActorId(req));
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

// Rooms CRUD
export const listRooms = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const data = await hostelService.listRooms(schoolId, req.query);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createRoom = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const payload = schemas.createRoomSchema.parse(req.body);
    const data = await hostelService.createRoom(schoolId, payload, getActorId(req));
    res.status(201).json({ success: true, message: 'Room created successfully', data });
  } catch (err) {
    next(err);
  }
};

export const updateRoom = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const payload = schemas.updateRoomSchema.parse(req.body);
    const data = await hostelService.updateRoom(schoolId, req.params.id, payload, getActorId(req));
    res.status(200).json({ success: true, message: 'Room updated successfully', data });
  } catch (err) {
    next(err);
  }
};

export const deleteRoom = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const data = await hostelService.deleteRoom(schoolId, req.params.id, getActorId(req));
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

export const bulkCreateRooms = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const payload = schemas.bulkCreateRoomsSchema.parse(req.body);
    const data = await hostelService.bulkCreateRooms(schoolId, payload, getActorId(req));
    res.status(201).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

// Beds CRUD
export const listBeds = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const data = await hostelService.listBeds(schoolId, req.query);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createBed = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const payload = schemas.createBedSchema.parse(req.body);
    const data = await hostelService.createBed(schoolId, payload, getActorId(req));
    res.status(201).json({ success: true, message: 'Bed created successfully', data });
  } catch (err) {
    next(err);
  }
};

export const bulkCreateBeds = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const payload = schemas.bulkCreateBedsSchema.parse(req.body);
    const data = await hostelService.bulkCreateBeds(schoolId, payload, getActorId(req));
    res.status(201).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

export const updateBedStatus = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const payload = schemas.updateBedStatusSchema.parse(req.body);
    const data = await hostelService.updateBedStatus(schoolId, req.params.id, payload.status, getActorId(req));
    res.status(200).json({ success: true, message: 'Bed status updated successfully', data });
  } catch (err) {
    next(err);
  }
};

// Fee Configuration & Generation
export const getFeeConfig = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { academicYearId, hostelId } = req.query;
    const data = await hostelService.getHostelFeeConfig(schoolId, academicYearId, hostelId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const saveFeeConfig = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const payload = schemas.saveFeeConfigSchema.parse(req.body);
    const data = await hostelService.saveHostelFeeConfig(schoolId, payload, getActorId(req));
    res.status(200).json({ success: true, message: 'Hostel fee configuration saved', data });
  } catch (err) {
    next(err);
  }
};

export const getEligibleHostelStudentsForBilling = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const data = await hostelService.getEligibleHostelStudentsForBilling(schoolId, req.query);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const generateHostelMonthlyFees = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const payload = schemas.generateHostelFeesSchema.parse(req.body);
    const data = await hostelService.generateHostelMonthlyFees(schoolId, payload, getActorId(req));
    res.status(200).json({ success: true, message: 'Hostel monthly fee generation executed', data });
  } catch (err) {
    next(err);
  }
};

// Hostel Admission
export const admitStudent = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const payload = schemas.admitStudentSchema.parse(req.body);
    const data = await hostelService.admitStudent(schoolId, payload, getActorId(req));
    res.status(201).json({ success: true, message: 'Student admitted to hostel successfully', data });
  } catch (err) {
    next(err);
  }
};

// Residents Directory & Details
export const listResidents = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const data = await hostelService.listResidents(schoolId, req.query);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getResidentDetails = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const data = await hostelService.getResidentDetails(schoolId, req.params.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// Hostel Transfer & Exit
export const transferStudent = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const payload = schemas.transferStudentSchema.parse(req.body);
    const data = await hostelService.transferStudent(schoolId, payload, getActorId(req));
    res.status(200).json({ success: true, message: 'Hostel transfer completed successfully', data });
  } catch (err) {
    next(err);
  }
};

export const exitStudent = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const payload = schemas.exitStudentSchema.parse(req.body);
    const data = await hostelService.exitStudent(schoolId, payload, getActorId(req));
    res.status(200).json({ success: true, message: 'Hostel exit completed successfully', data });
  } catch (err) {
    next(err);
  }
};

// Hostel Reports
export const getHostelReports = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { type } = req.params;
    const data = await hostelService.getHostelReports(schoolId, type, req.query);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
