/**
 * Authentication Controller
 * HTTP handlers for authentication endpoints
 *
 * Endpoints:
 * - POST /api/auth/register - Register new student
 * - POST /api/auth/login - Login student
 * - POST /api/auth/refresh - Refresh access token
 * - POST /api/auth/logout - Logout (current device)
 * - POST /api/auth/logout-all - Logout (all devices)
 */

import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import * as AuthService from "../services/auth.service";
import {
  setAuthCookies,
  clearAuthCookies,
  extractRefreshToken,
} from "../utils/cookies";
import { ApiError } from "../middleware/errorHandler";
import { RegisterBody, LoginBody, RequestWithUser, ChangePasswordBody } from "../types";

// ============================================
// Helpers
// ============================================

/**
 * Handle validation errors from express-validator
 */
const handleValidationErrors = (req: Request): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((err) => {
      if ("msg" in err) return err.msg;
      return "Validation error";
    });
    throw new ApiError(400, "Validation failed", messages);
  }
};

/**
 * Get client metadata for token tracking
 */
const getClientMeta = (
  req: Request
): { userAgent?: string; ipAddress?: string } => {
  return {
    userAgent: req.headers["user-agent"],
    ipAddress:
      (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
      req.socket.remoteAddress,
  };
};

// ============================================
// Controllers
// ============================================

/**
 * Register a new student
 * POST /api/auth/register
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    handleValidationErrors(req);

    const body: RegisterBody = req.body;
    const meta = getClientMeta(req);

    const result = await AuthService.registerStudent(body, meta);

    // Set auth cookies
    setAuthCookies(res, result.accessToken, result.refreshToken);

    res.status(201).json({
      success: true,
      message: "Registration successful",
      user: {
        id: result.user.id,
        studentId: result.user.studentId,
        email: result.user.email,
        name: result.user.name,
        surname: result.user.surname,
        role: result.user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login existing student
 * POST /api/auth/login
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    handleValidationErrors(req);

    const { email, password }: LoginBody = req.body;
    const meta = getClientMeta(req);

    const result = await AuthService.loginStudent(email, password, meta);

    // Set auth cookies
    setAuthCookies(res, result.accessToken, result.refreshToken);

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: result.user.id,
        studentId: result.user.studentId,
        email: result.user.email,
        name: result.user.name,
        surname: result.user.surname,
        role: result.user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token using refresh token
 * POST /api/auth/refresh
 *
 * Token rotation: Issues new access AND refresh token
 * Old refresh token is invalidated
 */
export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const refreshToken = extractRefreshToken(req);

    if (!refreshToken) {
      throw new ApiError(401, "Refresh token not found");
    }

    const meta = getClientMeta(req);
    const result = await AuthService.refreshTokens(refreshToken, meta);

    // Set new auth cookies (token rotation)
    setAuthCookies(res, result.accessToken, result.refreshToken);

    res.status(200).json({
      success: true,
      message: "Tokens refreshed successfully",
      user: {
        id: result.user.id,
        studentId: result.user.studentId,
        email: result.user.email,
        name: result.user.name,
        surname: result.user.surname,
        role: result.user.role,
      },
    });
  } catch (error) {
    // Clear cookies on refresh failure
    clearAuthCookies(res);
    next(error);
  }
};

/**
 * Logout from current device
 * POST /api/auth/logout
 */
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const refreshToken = extractRefreshToken(req);
    const userId = (req as RequestWithUser).user?.id;

    if (userId && refreshToken) {
      await AuthService.logoutStudent(userId, refreshToken);
    }

    // Always clear cookies, even if user not authenticated
    clearAuthCookies(res);

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    // Still clear cookies even on error
    clearAuthCookies(res);
    next(error);
  }
};

/**
 * Logout from all devices
 * POST /api/auth/logout-all
 * Requires authentication
 */
export const logoutAll = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as RequestWithUser).user?.id;

    if (!userId) {
      throw new ApiError(401, "Authentication required");
    }

    await AuthService.logoutAllDevices(userId);

    // Clear cookies
    clearAuthCookies(res);

    res.status(200).json({
      success: true,
      message: "Logged out from all devices",
    });
  } catch (error) {
    clearAuthCookies(res);
    next(error);
  }
};

/**
 * Get current authenticated user
 * GET /api/auth/me
 */
export const me = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as RequestWithUser).user;

    if (!user) {
      throw new ApiError(401, "Not authenticated");
    }

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        studentId: user.studentId,
        email: user.email,
        name: user.name,
        surname: user.surname,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change password for authenticated user
 * POST /api/auth/change-password
 * Requires authentication
 */
export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    handleValidationErrors(req);

    const userId = (req as RequestWithUser).user?.id;
    if (!userId) {
      throw new ApiError(401, "Authentication required");
    }

    const { currentPassword, newPassword }: ChangePasswordBody = req.body;

    await AuthService.changePassword(userId, currentPassword, newPassword);

    // Clear cookies to force re-login with new password
    clearAuthCookies(res);

    res.status(200).json({
      success: true,
      message: "Password updated successfully. Please log in again.",
    });
  } catch (error) {
    next(error);
  }
};
