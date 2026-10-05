import { asyncHandler } from '../../utils/asyncHandler.js';
import { adminUserService } from './user.service.js';
import {
  createSuperAdminSchema,
  updateAdminUserProfileSchema,
  resetUserPasswordSchema,
  changeUserRoleSchema,
} from './admin.validation.js';

export const adminUserController = {
  listUsers: asyncHandler(async (req, res) => {
    const { page, limit, search, role, schoolId } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const result = await adminUserService.listUsers({
      page: pageNum,
      limit: limitNum,
      search,
      role,
      schoolId,
    });
    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: result.items,
      pagination: result.pagination,
    });
  }),

  createSuperAdmin: asyncHandler(async (req, res) => {
    const actorUserId = req.user.id;
    const validatedBody = createSuperAdminSchema.parse(req.body);
    const user = await adminUserService.createSuperAdmin(validatedBody, actorUserId);
    res.status(201).json({
      success: true,
      message: 'Super Admin user created successfully',
      data: user,
    });
  }),

  updateUserProfile: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const actorUserId = req.user.id;
    const validatedBody = updateAdminUserProfileSchema.parse(req.body);
    const user = await adminUserService.updateUserProfile(id, validatedBody, actorUserId);
    res.status(200).json({
      success: true,
      message: 'User profile updated successfully',
      data: user,
    });
  }),

  changeUserRole: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role } = changeUserRoleSchema.parse(req.body);
    const actorUserId = req.user.id;
    const user = await adminUserService.changeUserRole(id, role, actorUserId);
    res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      data: user,
    });
  }),

  resetUserPassword: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { newPassword } = resetUserPasswordSchema.parse(req.body);
    const actorUserId = req.user.id;
    const result = await adminUserService.resetUserPassword(id, newPassword, actorUserId);
    res.status(200).json({
      success: true,
      message: result.message,
    });
  }),
};
