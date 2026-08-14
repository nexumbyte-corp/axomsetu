import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { adminSettingsService } from '../admin/adminSettings.service.js';

const router = Router();

/**
 * Public / Authenticated Platform Contact Endpoint
 * Used by Support button on school dashboard to fetch configured Super Admin support info.
 */
router.get('/contact', asyncHandler(async (req, res) => {
  const settings = await adminSettingsService.getSettings();
  res.status(200).json({
    success: true,
    data: {
      supportEmail: settings.supportEmail || null,
      supportPhone: settings.supportPhone || null,
      whatsappNumber: settings.whatsappNumber || null,
      platformName: settings.platformName || 'AxomSetu Platform',
    },
  });
}));

export default router;
