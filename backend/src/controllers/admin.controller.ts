/**
 * Admin Controller
 * HTTP handlers for admin-only user management endpoints
 *
 * Endpoints:
 * - POST   /api/v1/admin/users           - Create a new user with role
 * - PATCH  /api/v1/admin/users/:id/role   - Update a user's role
 * - PATCH  /api/v1/admin/users/:id/toggle-active - Toggle user active status
 * - DELETE /api/v1/admin/users/:id        - Delete a user
 */

import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import * as AdminService from "../services/admin.service";
import { AdminCreateUserBody, AdminUpdateRoleBody, AdminUpdateUserBody } from "../types";
import { ApiError } from "../middleware/errorHandler";
import { RequestWithUser } from "../types";

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

// ============================================
// Controllers
// ============================================

/**
 * Create a new user (admin-only)
 * POST /api/v1/admin/users
 */
export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    handleValidationErrors(req);

    const body: AdminCreateUserBody = req.body;
    const actor = (req as RequestWithUser).user;
    const user = await AdminService.createUser(body, actor);

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a user's profile (admin-only)
 * PATCH /api/v1/admin/users/:id/profile
 */
export const updateUserProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    handleValidationErrors(req);

    const body: AdminUpdateUserBody = req.body;
    const result = await AdminService.updateUserProfile(req.params.id, body, (req as RequestWithUser).user);

    res.status(200).json({
      success: true,
      message: "User profile updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a user's role (admin-only)
 * PATCH /api/v1/admin/users/:id/role
 */
export const updateUserRole = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    handleValidationErrors(req);

    const { role }: AdminUpdateRoleBody = req.body;
    const result = await AdminService.updateUserRole(req.params.id, role, (req as RequestWithUser).user);

    res.status(200).json({
      success: true,
      message: "User role updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle user active status (admin-only)
 * PATCH /api/v1/admin/users/:id/toggle-active
 */
export const toggleUserActive = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    handleValidationErrors(req);

    const result = await AdminService.toggleUserActive(req.params.id, (req as RequestWithUser).user);

    res.status(200).json({
      success: true,
      message: `User ${result.isActive ? "activated" : "deactivated"} successfully`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a user (admin-only)
 * DELETE /api/v1/admin/users/:id
 */
export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    handleValidationErrors(req);

    await AdminService.deleteUser(req.params.id, (req as RequestWithUser).user);

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
