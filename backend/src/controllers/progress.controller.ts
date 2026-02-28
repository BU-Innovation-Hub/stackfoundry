/**
 * Progress Controller
 * HTTP handlers for progress tracking endpoints
 */

import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { RequestWithUser } from "../types";
import { ApiError } from "../middleware/errorHandler";
import * as ProgressService from "../services/progress.service";

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
 * POST /api/v1/progress
 * Update progress on a material
 * Body: { materialId, watchedSeconds, maxWatchedSeconds? }
 */
export const updateProgress = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    handleValidationErrors(req);
    const user = (req as RequestWithUser).user;
    const { materialId, watchedSeconds, maxWatchedSeconds } = req.body;

     const parsedWatchedSeconds = Number(watchedSeconds);
    const parsedMaxWatched = maxWatchedSeconds !== undefined ? Number(maxWatchedSeconds) : undefined;
   
   if (Number.isNaN(parsedWatchedSeconds) || (parsedMaxWatched !== undefined && Number.isNaN(parsedMaxWatched))) {
     throw new ApiError(400, "Invalid numeric values for watchedSeconds or maxWatchedSeconds");
   }

    const result = await ProgressService.updateProgress(
      user.id,
      materialId,
      parsedWatchedSeconds,
      parsedMaxWatched);

    res.json({
      success: true,
      data: {
        progress: result.progress,
        newLevelUnlocked: result.newLevelUnlocked,
        unlockedLevel: result.unlockedLevel || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/progress?courseId=...
 * Get progress for the current user in a course
 * Admin can also pass ?user=userId
 */
export const getProgress = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    handleValidationErrors(req);
    const currentUser = (req as RequestWithUser).user;
    const { courseId } = req.query;

     if (!courseId || typeof courseId !== "string") {
      throw new ApiError(400, "courseId query parameter is required");
    }

    let userId = currentUser.id;

    // Admin can query other users' progress
    if (req.query.user && typeof req.query.user === "string") {
      if (currentUser.role !== "admin" && currentUser.id !== req.query.user) {
        res.status(403).json({ success: false, error: "Access denied" });
        return;
      }
      userId = req.query.user;
    }

    const progress = await ProgressService.getUserCourseProgress(
      userId,
      courseId 
    );
    res.json({ success: true, data: progress });
  } catch (error) {
    next(error);
  }
};
