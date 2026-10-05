import { asyncHandler } from '../../utils/asyncHandler.js';
import * as authService from './auth.service.js';
import { setSessionCookie, clearSessionCookie, COOKIE_NAME } from '../../utils/session.js';
import { getClientIp } from '../../utils/ipHelper.js';

export const login = asyncHandler(async (req, res) => {
  const meta = {
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'] || null,
  };

  const result = await authService.loginUser(req.body, meta);

  // Requirement 3: Set HttpOnly, Secure, SameSite cookie
  if (result.sessionToken) {
    setSessionCookie(res, result.sessionToken);
  }

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: result,
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const result = await authService.refreshAccessToken(refreshToken);

  res.status(200).json({
    success: true,
    message: 'Token refreshed successfully',
    data: result,
  });
});

export const logout = asyncHandler(async (req, res) => {
  const rawToken = req.cookies?.[COOKIE_NAME] || req.token || null;
  const meta = {
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'] || null,
  };

  if (req.user?.id || rawToken) {
    await authService.logoutUser(req.user?.id, rawToken, meta);
  }

  // Clear authentication cookie
  clearSessionCookie(res);

  res.status(200).json({
    success: true,
    message: 'Logout successful',
    data: null,
  });
});

export const getMe = asyncHandler(async (req, res) => {
  const profile = await authService.getCurrentUserProfile(req.user.id);

  res.status(200).json({
    success: true,
    message: 'Current user profile retrieved',
    data: profile,
  });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const meta = {
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'] || null,
  };
  const result = await authService.updateUserProfile(req.user.id, req.body, meta);

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: result,
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  const meta = {
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'] || null,
  };
  const result = await authService.changeUserPassword(req.user.id, req.body, meta);

  // Clear cookie because password change revokes all active sessions
  clearSessionCookie(res);

  res.status(200).json({
    success: true,
    message: result.message || 'Password changed successfully',
    data: null,
  });
});
