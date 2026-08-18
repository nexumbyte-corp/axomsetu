import { asyncHandler } from '../../utils/asyncHandler.js';
import { schoolUserService } from './school-user.service.js';
import { PERMISSION_GROUPS } from '../../config/permissions.js';
import {
  createSchoolUserSchema,
  updateSchoolUserSchema,
  updateUserStatusSchema,
  updateUserPermissionsSchema,
  schoolUserParamSchema,
} from './school-user.validation.js';

export const schoolUserController = {
  listUsers: asyncHandler(async (req, res) => {
    const data = await schoolUserService.listUsers(req.schoolId, req.query);
    res.status(200).json({
      success: true,
      message: 'School users retrieved successfully',
      data: data.users,
      pagination: data.pagination,
    });
  }),

  getUser: asyncHandler(async (req, res) => {
    const { id } = schoolUserParamSchema.parse(req.params);
    const data = await schoolUserService.getUser(req.schoolId, id);
    res.status(200).json({
      success: true,
      message: 'User details retrieved successfully',
      data,
    });
  }),

  createUser: asyncHandler(async (req, res) => {
    const body = createSchoolUserSchema.parse(req.body);
    const data = await schoolUserService.createUser(
      req.schoolId,
      body,
      req.schoolMembership?.id,
      req.user.id
    );
    res.status(201).json({
      success: true,
      message: 'User created and added to school successfully',
      data,
    });
  }),

  updateUser: asyncHandler(async (req, res) => {
    const { id } = schoolUserParamSchema.parse(req.params);
    const body = updateSchoolUserSchema.parse(req.body);
    const data = await schoolUserService.updateUser(req.schoolId, id, body, req.user.id);
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data,
    });
  }),

  updateUserStatus: asyncHandler(async (req, res) => {
    const { id } = schoolUserParamSchema.parse(req.params);
    const body = updateUserStatusSchema.parse(req.body);
    const data = await schoolUserService.updateUserStatus(
      req.schoolId,
      id,
      body,
      req.schoolMembership,
      req.user.id
    );
    res.status(200).json({
      success: true,
      message: data.message,
      data,
    });
  }),

  getUserPermissions: asyncHandler(async (req, res) => {
    const { id } = schoolUserParamSchema.parse(req.params);
    const data = await schoolUserService.getUserPermissions(req.schoolId, id);
    res.status(200).json({
      success: true,
      message: 'User permissions retrieved successfully',
      data,
    });
  }),

  setUserPermissions: asyncHandler(async (req, res) => {
    const { id } = schoolUserParamSchema.parse(req.params);
    const body = updateUserPermissionsSchema.parse(req.body);
    const data = await schoolUserService.setUserPermissions(
      req.schoolId,
      id,
      body.permissions,
      req.schoolMembership,
      req.user.id
    );
    res.status(200).json({
      success: true,
      message: data.message,
      data,
    });
  }),

  getPermissionGroups: asyncHandler(async (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Permission groups retrieved successfully',
      data: PERMISSION_GROUPS,
    });
  }),
};
