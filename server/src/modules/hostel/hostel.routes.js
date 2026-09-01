import { Router } from 'express';
import * as hostelController from './hostel.controller.js';
import { requirePermission } from '../../middleware/permission.middleware.js';

const router = Router();

// Dashboard
router.get('/dashboard', requirePermission('HOSTEL_VIEW'), hostelController.getDashboardData);

// Setup: Hostels
router.get('/hostels', requirePermission('HOSTEL_VIEW'), hostelController.listHostels);
router.get('/hostels/:id', requirePermission('HOSTEL_VIEW'), hostelController.getHostelById);
router.post('/hostels', requirePermission('HOSTEL_SETUP'), hostelController.createHostel);
router.put('/hostels/:id', requirePermission('HOSTEL_SETUP'), hostelController.updateHostel);
router.delete('/hostels/:id', requirePermission('HOSTEL_SETUP'), hostelController.deleteHostel);

// Setup: Rooms
router.get('/rooms', requirePermission('HOSTEL_VIEW'), hostelController.listRooms);
router.post('/rooms', requirePermission('HOSTEL_SETUP'), hostelController.createRoom);
router.post('/rooms/bulk', requirePermission('HOSTEL_SETUP'), hostelController.bulkCreateRooms);
router.put('/rooms/:id', requirePermission('HOSTEL_SETUP'), hostelController.updateRoom);
router.delete('/rooms/:id', requirePermission('HOSTEL_SETUP'), hostelController.deleteRoom);

// Setup: Beds
router.get('/beds', requirePermission('HOSTEL_VIEW'), hostelController.listBeds);
router.post('/beds', requirePermission('HOSTEL_SETUP'), hostelController.createBed);
router.post('/beds/bulk', requirePermission('HOSTEL_SETUP'), hostelController.bulkCreateBeds);
router.patch('/beds/:id/status', requirePermission('HOSTEL_SETUP'), hostelController.updateBedStatus);

// Fee Configuration & Generation
router.get('/fees/config', requirePermission('HOSTEL_VIEW'), hostelController.getFeeConfig);
router.post('/fees/config', requirePermission('HOSTEL_SETUP'), hostelController.saveFeeConfig);
router.get('/fees/eligible-students', requirePermission('HOSTEL_VIEW'), hostelController.getEligibleHostelStudentsForBilling);
router.post('/fees/generate', requirePermission('HOSTEL_SETUP'), hostelController.generateHostelMonthlyFees);

// Admission
router.post('/admissions', requirePermission('HOSTEL_ADMIT'), hostelController.admitStudent);

// Residents Directory
router.get('/residents', requirePermission('HOSTEL_VIEW'), hostelController.listResidents);
router.get('/residents/:id', requirePermission('HOSTEL_VIEW'), hostelController.getResidentDetails);

// Transfer & Exit
router.post('/transfers', requirePermission('HOSTEL_TRANSFER'), hostelController.transferStudent);
router.post('/exits', requirePermission('HOSTEL_EXIT'), hostelController.exitStudent);

// Reports
router.get('/reports/:type', requirePermission('HOSTEL_VIEW'), hostelController.getHostelReports);

export default router;
