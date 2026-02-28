/**
 * Topic Controller
 * HTTP handlers for topic CRUD endpoints within levels
 */

import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { ApiError } from "../middleware/errorHandler";
import * as TopicService from "../services/topic.service";

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
 * POST /api/v1/levels/:levelId/topics
 * Create a topic in a level (admin only)
 */
export const createTopic = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    handleValidationErrors(req);
    const { levelId } = req.params;
    const { name, description } = req.body;

    const topic = await TopicService.createTopic({
      level: levelId,
      name,
      description,
    });

    res.status(201).json({ success: true, data: topic });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/levels/:levelId/topics
 * Get all topics for a level
 */
export const getTopicsByLevel = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    handleValidationErrors(req);
    const topics = await TopicService.getTopicsByLevel(req.params.levelId);
    res.json({ success: true, data: topics });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/topics/:id
 * Update a topic (admin only)
 */
export const updateTopic = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    handleValidationErrors(req);
    const { name, description } = req.body;
    const topic = await TopicService.updateTopic(req.params.id, {
      name,
      description,
    });
    res.json({ success: true, data: topic });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/topics/:id
 * Delete a topic (admin only)
 */
export const deleteTopic = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    handleValidationErrors(req);
    await TopicService.deleteTopic(req.params.id);
    res.json({ success: true, message: "Topic deleted" });
  } catch (error) {
    next(error);
  }
};
