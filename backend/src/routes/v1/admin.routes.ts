/**
 * Admin Routes
 * Endpoints for admin users only
 *
 * GET    /api/admin/dashboard            - Get admin dashboard data
 * GET    /api/admin/users                - List all users (paginated)
 * GET    /api/admin/users/:id            - Get single user details
 * POST   /api/admin/users                - Create a new user with role
 * PATCH  /api/admin/users/:id/role       - Update a user's role
 * PATCH  /api/admin/users/:id/toggle-active - Toggle user active status
 * DELETE /api/admin/users/:id            - Delete a user
 */

import { Router, Request, Response, NextFunction } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { RequestWithUser } from "../../types";
import Student from "../../models/user.model";
import Role from "../../models/role.model";
import * as AdminController from "../../controllers/admin.controller";
import {
  adminCreateUserValidation,
  updateUserRoleValidation,
  objectIdParam,
} from "../../utils/validation";

const router = Router();

// ============================================
// All routes require authentication + admin role
// ============================================

router.use(requireAuth);
router.use(requireRole(["admin"]));

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard statistics
 * @access  Private (admin only)
 */
router.get(
  "/dashboard",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as RequestWithUser).user;

      // Get statistics
      const totalUsers = await Student.countDocuments();
      const activeUsers = await Student.countDocuments({ isActive: true });
      const totalRoles = await Role.countDocuments();

      // Get user counts by role
      const usersByRole = await Student.aggregate([
        { $match: { isActive: true } },
        {
          $lookup: {
            from: "roles",
            localField: "roles",
            foreignField: "_id",
            as: "roleInfo",
          },
        },
        { $unwind: "$roleInfo" },
        { $group: { _id: "$roleInfo.name", count: { $sum: 1 } } },
      ]);

      res.status(200).json({
        success: true,
        data: {
          admin: {
            name: user.name,
            email: user.email,
          },
          stats: {
            totalUsers,
            activeUsers,
            inactiveUsers: totalUsers - activeUsers,
            totalRoles,
            usersByRole: usersByRole.reduce(
              (acc, curr) => {
                acc[curr._id] = curr.count;
                return acc;
              },
              {} as Record<string, number>
            ),
          },
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/admin/users
 * @desc    List all users (paginated)
 * @access  Private (admin only)
 */
router.get(
  "/users",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        Student.find()
          .select("-passwordHash -refreshTokens")
          .populate("roles", "name description")
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .lean(),
        Student.countDocuments(),
      ]);

      res.status(200).json({
        success: true,
        data: {
          users,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get single user details
 * @access  Private (admin only)
 */
router.get(
  "/users/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await Student.findById(req.params.id)
        .select("-passwordHash -refreshTokens")
        .populate("roles", "name description")
        .lean();

      if (!user) {
        res.status(404).json({
          success: false,
          error: "User not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PATCH /api/admin/users/:id/toggle-active
 * @desc    Toggle user active status (with session revocation on deactivation)
 * @access  Private (admin only)
 */
router.patch(
  "/users/:id/toggle-active",
  objectIdParam("id"),
  AdminController.toggleUserActive
);

/**
 * @route   POST /api/admin/users
 * @desc    Create a new user with a specified role
 * @access  Private (admin only)
 */
router.post(
  "/users",
  adminCreateUserValidation,
  AdminController.createUser
);

/**
 * @route   PATCH /api/admin/users/:id/role
 * @desc    Update a user's role
 * @access  Private (admin only)
 */
router.patch(
  "/users/:id/role",
  objectIdParam("id"),
  updateUserRoleValidation,
  AdminController.updateUserRole
);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete a user
 * @access  Private (admin only)
 */
router.delete(
  "/users/:id",
  objectIdParam("id"),
  AdminController.deleteUser
);

export default router;
