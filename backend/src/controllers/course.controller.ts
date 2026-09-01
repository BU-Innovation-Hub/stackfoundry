/**
 * Course Controller
 * HTTP handlers for course CRUD endpoints
 */

import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { RequestWithUser } from "../types";
import { ApiError } from "../middleware/errorHandler";
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
 * POST /api/v1/courses
 * Create a new course (admin only)
 */
export const createCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    handleValidationErrors(req);
    const user = (req as RequestWithUser).user;
       if (!user) {
    throw new ApiError(401, "Authentication required");
  }
    const { title, description, coverImage } = req.body;

    const course = await CourseService.createCourse({
      title,
      description,
      coverImage,
      createdBy: user.id,
    });

    res.status(201).json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/courses
 * List all courses
 */
export const getCourses = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const courses = await CourseService.getCourses();
    res.json({ success: true, data: courses });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/courses/:id
 * Get a single course with its levels
 */
export const getCourseById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    handleValidationErrors(req);
    const result = await CourseService.getCourseWithLevels(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/courses/:id
 * Update a course (admin only)
 */
export const updateCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    handleValidationErrors(req);
    const user = (req as RequestWithUser).user;

    await CourseService.assertCanManageCourse(user, req.params.id);

    const { title, description, coverImage } = req.body;
    
    const updates: { title?: string; description?: string; coverImage?: string } = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (coverImage !== undefined) updates.coverImage = coverImage;
    const course = await CourseService.updateCourse(req.params.id, updates);
    res.json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/courses/:id
 * Delete a course (admin only)
 */
export const deleteCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    handleValidationErrors(req);
    const user = (req as RequestWithUser).user;

    await CourseService.assertCanManageCourse(user, req.params.id);

    await CourseService.deleteCourse(req.params.id);
    res.json({ success: true, message: "Course deleted" });
  } catch (error) {
    next(error);
  }
};
