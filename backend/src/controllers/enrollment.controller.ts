/**
 * Enrollment Controller
 * HTTP handlers for enrollment endpoints
 */

import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { RequestWithUser } from "../types";
import { ApiError } from "../middleware/errorHandler";
import * as EnrollmentService from "../services/enrollment.service";
import * as LevelService from "../services/level.service";
import * as CourseService from "../services/course.service";

// ============================================
// Helpers
// ============================================

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
 * POST /api/v1/enroll
 * Enroll the authenticated user in a course
 */
export const enrollInCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    handleValidationErrors(req);
    const user = (req as RequestWithUser).user;
    const { courseId } = req.body;

    const enrollment = await EnrollmentService.enrollInCourse(
      user.id,
      courseId
    );

    res.status(201).json({ success: true, data: enrollment });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/enrollments/:userId/courses
 * Get all course enrollments for a user
 * Users can view their own; admins can view anyone's
 */
export const getUserEnrollments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    handleValidationErrors(req);
    const currentUser = (req as RequestWithUser).user;
    const { userId } = req.params;

    // Only allow users to see their own enrollments, or admin can see any
    // if (currentUser.id !== userId && currentUser.role !== "admin") {
    //   res.status(403).json({ success: false, error: "Access denied" });
    //   return;
      if (String(currentUser.id) !== userId && !["system_admin", "innovation_hub_admin"].includes(currentUser.role)) {
      throw new ApiError(403, "Access denied");
    }

    const enrollments = await EnrollmentService.getUserEnrollments(userId);
    res.json({ success: true, data: enrollments });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/enrollments/me
 * Get all course enrollments for the authenticated user
 */
export const getMyEnrollments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as RequestWithUser).user;
    const enrollments = await EnrollmentService.getUserEnrollments(user.id);
    res.json({ success: true, data: enrollments });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/levels/:id/toggle-lock
 * Admin: Toggle lock status for a level and update all enrolled students
 */
export const toggleLevelLock = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = (req as RequestWithUser).user;
    await CourseService.assertCanManageLevel(user, id);

    // Get current level
    const currentLevel = await LevelService.getLevelById(id);
    const newLocked = !currentLevel.lockedByDefault;

    // Update the level's lockedByDefault flag
    const updatedLevel = await LevelService.updateLevel(id, {
      lockedByDefault: newLocked,
    });

    // If unlocking: add this level to all enrolled students' levelsUnlocked
    // If locking: remove this level from all enrolled students' levelsUnlocked
    let modifiedCount = 0;
    if (!newLocked) {
      const result = await EnrollmentService.unlockLevelForAllStudents(id);
      modifiedCount = result.modifiedCount;
    } else {
      const result = await EnrollmentService.lockLevelForAllStudents(id);
      modifiedCount = result.modifiedCount;
    }

    res.json({
      success: true,
      data: {
        level: updatedLevel,
        modifiedEnrollments: modifiedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/levels/:id/unlock-all
 * Admin: Unlock a level for all enrolled students (without changing lockedByDefault)
 */
export const unlockLevelForAll = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as RequestWithUser).user;
    await CourseService.assertCanManageLevel(user, req.params.id);

    const result = await EnrollmentService.unlockLevelForAllStudents(
      req.params.id
    );
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
