/**
 * Progress Routes
 * Endpoints for tracking student learning progress
 *
 * POST  /api/v1/progress              (auth) -> update progress
 * GET   /api/v1/progress?courseId=...  (auth) -> get progress for course
 */

import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../../middleware/auth";
import * as ProgressController from "../../controllers/progress.controller";
import { updateProgressValidation, getProgressValidation } from "../../utils/courseValidation";

const router = Router();

// Rate limiter for progress updates (students may send frequent heartbeats)
const progressLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 updates per minute
  message: {
    success: false,
    error: "Too many progress updates, please slow down",
  },
});

// Update progress
router.post("/", requireAuth, progressLimiter, updateProgressValidation, ProgressController.updateProgress);

// Get progress
router.get("/", requireAuth, getProgressValidation, ProgressController.getProgress);

export default router;
