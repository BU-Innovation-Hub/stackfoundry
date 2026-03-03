/**
 * Enrollment Controller
 * HTTP handlers for enrollment endpoints
 */

import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { RequestWithUser } from "../types";
import { ApiError } from "../middleware/errorHandler";
import * as EnrollmentService from "../services/enrollment.service";

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
      if (String(currentUser.id) !== userId && currentUser.role !== "admin") {
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
