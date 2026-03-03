/**
 * LMS Authorization Middleware
 * Additional middleware for enrollment and level-unlock checks
 * Must be used AFTER requireAuth
 */

import { Request, Response, NextFunction } from "express";
import { RequestWithUser } from "../types";
import { ApiError } from "./errorHandler";
import Enrollment from "../models/enrollment.model";
import Level from "../models/level.model";
import Material from "../models/material.model";

/**
 * Require that the authenticated user is enrolled in the course that contains
 * the material or level referenced in the request.
 *
 * Looks for courseId in: req.params.courseId, req.body.courseId, or derives it
 * from a levelId/materialId parameter.
 *
 * Admins bypass this check.
 */
export const requireEnrolled = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as RequestWithUser).user;
    if (!user) {
      throw new ApiError(401, "Authentication required");
    }

    // Admins bypass enrollment check
    if (user.role === "admin") {
      return next();
    }

    let courseId: string | undefined =
      req.params.courseId || req.body.courseId || (req.query.courseId as string);

    // If not directly available, derive from materialId
    if (!courseId && req.params.id) {
      const material = await Material.findById(req.params.id);
      if (material) {
        const level = await Level.findById(material.level);
        if (level) {
          courseId = level.course.toString();
        }
      }
    }

    // Derive from levelId param
    if (!courseId && req.params.levelId) {
      const level = await Level.findById(req.params.levelId);
      if (level) {
        courseId = level.course.toString();
      }
    }

    // Derive from levelId in query
    if (!courseId && req.query.levelId) {
      const level = await Level.findById(req.query.levelId as string);
      if (level) {
        courseId = level.course.toString();
      }
    }

    if (!courseId) {
      throw new ApiError(400, "Could not determine course for enrollment check");
    }

    const enrollment = await Enrollment.findOne({
      user: user.id,
      course: courseId,
    });

    if (!enrollment) {
      throw new ApiError(403, "You must be enrolled in this course");
    }

    // Attach enrollment to request for downstream use
    (req as any).enrollment = enrollment;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Require that the level referenced in the request is unlocked for the user.
 * Looks for levelId in: req.params.levelId, or derives it from material.
 *
 * Admins bypass this check.
 * Must be used AFTER requireAuth (and ideally after requireEnrolled).
 */
export const requireLevelUnlocked = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as RequestWithUser).user;
    if (!user) {
      throw new ApiError(401, "Authentication required");
    }

    // Admins bypass
    if (user.role === "admin") {
      return next();
    }

    let levelId: string | undefined = req.params.levelId;
       
    // Check query string
    if (!levelId && req.query.levelId) {
      levelId = req.query.levelId as string;
    }
    // If not directly available, derive from materialId
    if (!levelId && req.params.id) {
      const material = await Material.findById(req.params.id);
      if (material) {
        levelId = material.level.toString();
      }
    }

    if (!levelId) {
      throw new ApiError(400, "Could not determine level for unlock check");
    }

    const level = await Level.findById(levelId);
    if (!level) {
      throw new ApiError(404, "Level not found");
    }

    // Level 1 (non-locked) is always accessible if enrolled
    if (!level.lockedByDefault) {
      return next();
    }

    const enrollment = (req as any).enrollment || await Enrollment.findOne({
      user: user.id,
      course: level.course,
    });

    if (!enrollment) {
      throw new ApiError(403, "You must be enrolled in this course");
    }

    const isUnlocked = enrollment.levelsUnlocked.some(
      (id: any) => id.toString() === levelId!.toString()
    );

    if (!isUnlocked) {
      throw new ApiError(
        403,
        "This level is locked. Complete the previous level to unlock it."
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};
