import { Router } from 'express';
import * as hostelController from './hostel.controller.js';
import { requirePermission } from '../../middleware/permission.middleware.js';
import { PERMISSIONS } from '../../config/permissions.js';

const router = Router();

// Dashboard
router.get('/dashboard', requirePermission(PERMISSIONS.HOSTEL_VIEW), hostelController.getDashboardData);

// Setup: Hostels
router.get('/hostels', requirePermission(PERMISSIONS.HOSTEL_VIEW), hostelController.listHostels);
router.get('/hostels/:id', requirePermission(PERMISSIONS.HOSTEL_VIEW), hostelController.getHostelById);
router.post('/hostels', requirePermission(PERMISSIONS.HOSTEL_SETUP), hostelController.createHostel);
router.put('/hostels/:id', requirePermission(PERMISSIONS.HOSTEL_SETUP), hostelController.updateHostel);
router.delete('/hostels/:id', requirePermission(PERMISSIONS.HOSTEL_SETUP), hostelController.deleteHostel);

// Setup: Rooms
router.get('/rooms', requirePermission(PERMISSIONS.HOSTEL_VIEW), hostelController.listRooms);
router.post('/rooms', requirePermission(PERMISSIONS.HOSTEL_SETUP), hostelController.createRoom);
router.post('/rooms/bulk', requirePermission(PERMISSIONS.HOSTEL_SETUP), hostelController.bulkCreateRooms);
router.put('/rooms/:id', requirePermission(PERMISSIONS.HOSTEL_SETUP), hostelController.updateRoom);
router.delete('/rooms/:id', requirePermission(PERMISSIONS.HOSTEL_SETUP), hostelController.deleteRoom);

// Setup: Beds
router.get('/beds', requirePermission(PERMISSIONS.HOSTEL_VIEW), hostelController.listBeds);
router.post('/beds', requirePermission(PERMISSIONS.HOSTEL_SETUP), hostelController.createBed);
router.post('/beds/bulk', requirePermission(PERMISSIONS.HOSTEL_SETUP), hostelController.bulkCreateBeds);
router.patch('/beds/:id/status', requirePermission(PERMISSIONS.HOSTEL_SETUP), hostelController.updateBedStatus);

// Fee Configuration & Generation
router.get('/fees/config', requirePermission(PERMISSIONS.HOSTEL_VIEW), hostelController.getFeeConfig);
router.post('/fees/config', requirePermission(PERMISSIONS.HOSTEL_SETUP), hostelController.saveFeeConfig);
router.get('/fees/eligible-students', requirePermission(PERMISSIONS.HOSTEL_VIEW), hostelController.getEligibleHostelStudentsForBilling);
router.post('/fees/generate', requirePermission(PERMISSIONS.HOSTEL_SETUP), hostelController.generateHostelMonthlyFees);

// Admission
router.post('/admissions', requirePermission(PERMISSIONS.HOSTEL_ADMIT), hostelController.admitStudent);
router.patch('/admissions/:id/date', requirePermission(PERMISSIONS.HOSTEL_ADMIT), hostelController.updateHostelAdmissionDate);
router.patch('/enrollments/:id/admission-date', requirePermission(PERMISSIONS.HOSTEL_ADMIT), hostelController.updateHostelAdmissionDate);

// Residents Directory
router.get('/residents', requirePermission(PERMISSIONS.HOSTEL_VIEW), hostelController.listResidents);
router.get('/residents/:id', requirePermission(PERMISSIONS.HOSTEL_VIEW), hostelController.getResidentDetails);

// Transfer & Exit
router.post('/transfers', requirePermission(PERMISSIONS.HOSTEL_TRANSFER), hostelController.transferStudent);
router.post('/exits', requirePermission(PERMISSIONS.HOSTEL_EXIT), hostelController.exitStudent);

// Reports
router.get('/reports/:type', requirePermission(PERMISSIONS.HOSTEL_VIEW), hostelController.getHostelReports);

export default router;
