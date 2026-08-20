import { asyncHandler } from '../../utils/asyncHandler.js';
import { adminSettingsService } from './adminSettings.service.js';

export const adminSettingsController = {
  getSettings: asyncHandler(async (req, res) => {
    const settings = await adminSettingsService.getSettings();
    res.status(200).json({
      success: true,
      message: 'Platform settings retrieved successfully',
      data: settings,
    });
  }),

  updateSettings: asyncHandler(async (req, res) => {
    const actorUserId = req.user.id;
    const settings = await adminSettingsService.updateSettings(req.body, actorUserId);
    res.status(200).json({
      success: true,
      message: 'Platform settings updated successfully',
      data: settings,
    });
  }),

  deleteContactPerson: asyncHandler(async (req, res) => {
    const actorUserId = req.user.id;
    const { id } = req.params;
    const remaining = await adminSettingsService.deleteContactPerson(id, actorUserId);
    res.status(200).json({
      success: true,
      message: 'Contact person deleted successfully',
      data: remaining,
    });
  }),
};
