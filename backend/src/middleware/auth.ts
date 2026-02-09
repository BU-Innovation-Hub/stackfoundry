/**
 * Authentication & Authorization Middleware
 *
 * Middleware functions:
 * - requireAuth: Verifies access token from cookie and attaches user to request
 * - requireRole: Checks if user has required role(s)
 * - optionalAuth: Attaches user if authenticated, continues if not
 */

import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { extractAccessToken } from "../utils/cookies";
import { getUserById } from "../services/auth.service";
import { RoleName, RequestWithUser } from "../types";
import { ApiError } from "./errorHandler";

// ============================================
// Authentication Middleware
// ============================================

/**
 * Require authentication
 * Verifies access token from cookie and attaches user to request
 *
 * Usage: router.get('/protected', requireAuth, handler)
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from cookie (or Authorization header as fallback)
    const token = extractAccessToken(req);

    if (!token) {
      throw new ApiError(401, "Authentication required");
    }

    // Verify the access token
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Access token expired") {
          throw new ApiError(401, "Access token expired. Please refresh.");
        }
      }
      throw new ApiError(401, "Invalid access token");
    }

    // Get full user from database
    const user = await getUserById(payload.sub);

    if (!user) {
      throw new ApiError(401, "User not found or inactive");
    }

    // Attach user to request
    (req as RequestWithUser).user = user;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication
 * Attaches user to request if token present, continues without error if not
 *
 * Usage: router.get('/public', optionalAuth, handler)
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractAccessToken(req);

    if (token) {
      try {
        const payload = verifyAccessToken(token);
        const user = await getUserById(payload.sub);
        if (user) {
          (req as RequestWithUser).user = user;
        }
      } catch {
        // Token invalid or expired - continue without user
        // Don't throw error for optional auth
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

// ============================================
// Authorization Middleware
// ============================================

/**
 * Require specific role(s)
 * Must be used AFTER requireAuth middleware
 *
 * Usage: router.get('/admin', requireAuth, requireRole(['admin']), handler)
 * Usage: router.get('/staff', requireAuth, requireRole(['admin', 'instructor']), handler)
 *
 * @param allowedRoles - Array of role names that can access the route
 */
export const requireRole = (allowedRoles: RoleName[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as RequestWithUser).user;

    if (!user) {
      // This shouldn't happen if requireAuth is used first
      next(new ApiError(401, "Authentication required"));
      return;
    }

    // Check if user's primary role is in allowed roles
    if (!allowedRoles.includes(user.role)) {
      next(
        new ApiError(
          403,
          `Access denied. Required role: ${allowedRoles.join(" or ")}`
        )
      );
      return;
    }

    next();
  };
};

/**
 * Require admin role (convenience middleware)
 */
export const requireAdmin = requireRole(["admin"]);

/**
 * Require instructor role (convenience middleware)
 */
export const requireInstructor = requireRole(["admin", "instructor"]);

/**
 * Require member or higher role (convenience middleware)
 */
export const requireMember = requireRole(["admin", "instructor", "member"]);
