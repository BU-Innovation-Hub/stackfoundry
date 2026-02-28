/**
 * Level Controller
 * HTTP handlers for level CRUD endpoints within courses
 */

import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { ApiError } from "../middleware/errorHandler";
import * as LevelService from "../services/level.service";

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
 * POST /api/v1/courses/:courseId/levels
 * Create a level in a course (admin only)
 */
export const createLevel = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    handleValidationErrors(req);
    const { courseId } = req.params;
    const { levelNumber, name, lockedByDefault } = req.body;

    const level = await LevelService.createLevel({
      course: courseId,
      levelNumber: Number(levelNumber),
      name,
      lockedByDefault: lockedByDefault !== false, // default true
    });

    res.status(201).json({ success: true, data: level });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/courses/:courseId/levels
 * Get all levels for a course
 */
export const getLevelsByCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    handleValidationErrors(req);
    const levels = await LevelService.getLevelsByCourse(req.params.courseId);
    res.json({ success: true, data: levels });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/levels/:id
 * Get a single level with its topics
 */
export const getLevelById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    handleValidationErrors(req);
    const result = await LevelService.getLevelWithTopics(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/levels/:id
 * Update a level (admin only)
 */
export const updateLevel = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    handleValidationErrors(req);
    const { name, levelNumber, lockedByDefault } = req.body;
    const level = await LevelService.updateLevel(req.params.id, {
      name,
      levelNumber,
      lockedByDefault,
    });
    res.json({ success: true, data: level });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/levels/:id
 * Delete a level (admin only)
 */
export const deleteLevel = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    handleValidationErrors(req);
    await LevelService.deleteLevel(req.params.id);
    res.json({ success: true, message: "Level deleted" });
  } catch (error) {
    next(error);
  }
};
