import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { adminSettingsService } from '../admin/adminSettings.service.js';

const router = Router();

/**
 * Public / Authenticated Platform Contact Endpoint
 * Used by Support button on school dashboard & Contact page to fetch configured Super Admin support info.
 */
router.get('/contact', asyncHandler(async (req, res) => {
  const settings = await adminSettingsService.getSettings();
  const primaryContact = settings.contactPersons?.find((cp) => cp.isPrimary) || settings.contactPersons?.[0];

  res.status(200).json({
    success: true,
    data: {
      platformName: settings.platformName || 'AxomSetu Platform',
      contactPersonName: primaryContact?.name || settings.contactPersonName || null,
      contactRole: primaryContact?.role || settings.contactRole || null,
      supportEmail: settings.supportEmail || primaryContact?.email || null,
      supportPhone: settings.supportPhone || primaryContact?.phone || null,
      whatsappNumber: settings.whatsappNumber || primaryContact?.whatsapp || null,
      address: settings.address || null,
      contactPersons: settings.contactPersons || [],
    },
  });
}));

export default router;
