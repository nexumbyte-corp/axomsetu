import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveSchool } from '../../middleware/school.middleware.js';
import { requirePermission, requireOwnerOrSchoolAdmin } from '../../middleware/permission.middleware.js';
import { PERMISSIONS } from '../../config/permissions.js';

import * as feeTypeController from './fee-type.controller.js';
import * as feeStructureController from './fee-structure.controller.js';
import * as feeOverrideController from './fee-override.controller.js';
import * as feeGenerationController from './fee-generation.controller.js';
import { deleteUnpaidFeeCharge } from './payment.controller.js';

export const feesRouter = Router();

// Apply global middlewares to fee router
feesRouter.use(authenticate, resolveSchool);

// ------------------------------------------
// Fee Charges Management Routes
// ------------------------------------------
feesRouter.delete('/charges/:chargeId', requireOwnerOrSchoolAdmin('Only School Admin or Owner can delete unpaid fee charges'), deleteUnpaidFeeCharge);

// ------------------------------------------
// Fee Types Routes
// ------------------------------------------
feesRouter.get('/types', requirePermission(PERMISSIONS.FEES_VIEW), feeTypeController.getFeeTypes);
feesRouter.post('/types', requirePermission(PERMISSIONS.FEES_MANAGE_STRUCTURE), feeTypeController.createFeeType);
feesRouter.get('/types/:id', requirePermission(PERMISSIONS.FEES_VIEW), feeTypeController.getFeeType);
feesRouter.put('/types/:id', requirePermission(PERMISSIONS.FEES_MANAGE_STRUCTURE), feeTypeController.updateFeeType);
feesRouter.patch('/types/:id/toggle-status', requirePermission(PERMISSIONS.FEES_MANAGE_STRUCTURE), feeTypeController.toggleFeeTypeStatus);
feesRouter.delete('/types/:id', requireOwnerOrSchoolAdmin(), feeTypeController.deleteFeeType);

// ------------------------------------------
// Fee Structures Routes
// ------------------------------------------
feesRouter.get('/structures', requirePermission(PERMISSIONS.FEES_VIEW), feeStructureController.getFeeStructures);
feesRouter.post('/structures', requirePermission(PERMISSIONS.FEES_MANAGE_STRUCTURE), feeStructureController.createFeeStructure);
feesRouter.post('/structures/bulk', requirePermission(PERMISSIONS.FEES_MANAGE_STRUCTURE), feeStructureController.bulkCreateFeeStructures);
feesRouter.get('/structures/:id', requirePermission(PERMISSIONS.FEES_VIEW), feeStructureController.getFeeStructure);
feesRouter.put('/structures/:id', requirePermission(PERMISSIONS.FEES_MANAGE_STRUCTURE), feeStructureController.updateFeeStructure);
feesRouter.patch('/structures/:id/toggle-status', requirePermission(PERMISSIONS.FEES_MANAGE_STRUCTURE), feeStructureController.toggleFeeStructureStatus);
feesRouter.delete('/structures/:id', requireOwnerOrSchoolAdmin(), feeStructureController.deleteFeeStructure);

// ------------------------------------------
// Student Fee Overrides Routes (Discounts)
// ------------------------------------------
feesRouter.get('/students/:studentId/overrides', requirePermission(PERMISSIONS.FEES_VIEW), feeOverrideController.getStudentFeeOverrides);
feesRouter.post('/students/:studentId/overrides', requirePermission(PERMISSIONS.FEES_APPLY_DISCOUNT), feeOverrideController.upsertFeeOverride);
feesRouter.delete('/students/:studentId/overrides/:overrideId', requirePermission(PERMISSIONS.FEES_APPLY_DISCOUNT), feeOverrideController.deleteFeeOverride);

// ------------------------------------------
// Fee Generation & History Routes
// ------------------------------------------
feesRouter.post('/generation/preview', requirePermission(PERMISSIONS.FEES_GENERATE), feeGenerationController.previewFeeGeneration);
feesRouter.post('/generation/execute', requirePermission(PERMISSIONS.FEES_GENERATE), feeGenerationController.executeFeeGeneration);
feesRouter.get('/generation/history', requirePermission(PERMISSIONS.FEES_VIEW), feeGenerationController.getGenerationHistory);
feesRouter.get('/generation/history/:batchId', requirePermission(PERMISSIONS.FEES_VIEW), feeGenerationController.getGenerationBatch);
