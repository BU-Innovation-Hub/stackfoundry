/**
 * Material Controller
 * HTTP handlers for video/PDF material CRUD and download endpoints
 */

import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import * as MaterialService from "../services/material.service";
import { RequestWithUser } from "../types";
import { ApiError } from "../middleware/errorHandler";

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
 * POST /api/v1/materials/video
 * Create a video material from a YouTube URL (admin only)
 */
export const createVideoMaterial = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    handleValidationErrors(req);
    const { youtubeUrl, levelId, topicId, title } = req.body;

    const material = await MaterialService.createVideoMaterial({
      youtubeUrl,
      levelId,
      topicId,
      title,
    });

    res.status(201).json({ success: true, data: material });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/materials/pdf
 * Upload a PDF material (admin only, multipart form-data)
 */
export const uploadPdfMaterial = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    handleValidationErrors(req);
    const file = (req as any).file;
    const { levelId, topicId, title } = req.body;

    if (!file) {
      throw new ApiError(400, "PDF file is required");
    }

    const material = await MaterialService.createPdfMaterial({
      buffer: file.buffer,
      originalName: file.originalname,
      sizeBytes: file.size,
      levelId,
      topicId,
      title,
    });

    res.status(201).json({ success: true, data: material });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/materials?levelId=...
 * Get materials for a level (authenticated users)
 */
export const getMaterialsByLevel = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    handleValidationErrors(req);
    const { levelId } = req.query;

    const materials = await MaterialService.getMaterialsByLevel(levelId as string);
    res.json({ success: true, data: materials });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/materials/:id
 * Get material detail (authenticated users)
 */
export const getMaterialDetail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    handleValidationErrors(req);
    const material = await MaterialService.getMaterialById(req.params.id);

    // Strip cloudinaryPublicId from response for non-admin users
    const user = (req as RequestWithUser).user;
    const materialObj = material.toObject();
    if (user.role !== "admin") {
      delete (materialObj as any).cloudinaryPublicId;
    }

    res.json({ success: true, data: materialObj });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/materials/:id/download
 * Download a PDF material (authenticated + enrolled + level unlocked)
 */
export const downloadPdf = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    handleValidationErrors(req);
    const result = await MaterialService.getPdfDownloadUrl(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/materials/:id
 * Delete a material (admin only)
 */
export const deleteMaterial = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    handleValidationErrors(req);
    await MaterialService.deleteMaterial(req.params.id);
    res.json({ success: true, message: "Material deleted" });
  } catch (error) {
    next(error);
  }
};
