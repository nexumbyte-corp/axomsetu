import { asyncHandler } from '../../utils/asyncHandler.js';
import { adminUserService } from './user.service.js';

export const adminUserController = {
  listUsers: asyncHandler(async (req, res) => {
    const { page, limit, search, role, schoolId } = req.query;
    const result = await adminUserService.listUsers({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
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
    const user = await adminUserService.createSuperAdmin(req.body, actorUserId);
    res.status(201).json({
      success: true,
      message: 'Super Admin user created successfully',
      data: user,
    });
  }),

  updateUserProfile: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const actorUserId = req.user.id;
    const user = await adminUserService.updateUserProfile(id, req.body, actorUserId);
    res.status(200).json({
      success: true,
      message: 'User profile updated successfully',
      data: user,
    });
  }),

  changeUserRole: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
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
    const { newPassword } = req.body;
    const actorUserId = req.user.id;
    const result = await adminUserService.resetUserPassword(id, newPassword, actorUserId);
    res.status(200).json({
      success: true,
      message: result.message,
    });
  }),
};
