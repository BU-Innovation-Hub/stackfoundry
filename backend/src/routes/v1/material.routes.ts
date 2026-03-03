/**
 * Material Routes
 * Endpoints for materials (video + PDF)
 *
 * POST   /api/v1/materials/video         (admin) -> create video material
 * POST   /api/v1/materials/pdf           (admin) -> upload PDF material
 * GET    /api/v1/materials?levelId=...   (auth) -> get materials by level
 * GET    /api/v1/materials/:id           (auth) -> material detail
 * GET    /api/v1/materials/:id/download  (auth + enrolled + unlocked) -> download PDF
 * DELETE /api/v1/materials/:id           (admin) -> delete material
 */

import { Router } from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { requireAuth, requireAdmin } from "../../middleware/auth";
import { requireEnrolled, requireLevelUnlocked } from "../../middleware/lms";
import * as MaterialController from "../../controllers/material.controller";
import {
  createVideoMaterialValidation,
  uploadPdfMaterialValidation,
  materialIdValidation,
  getMaterialsValidation,
} from "../../utils/courseValidation";

const router = Router();

// Multer for PDF uploads — 25MB limit, only PDF
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

// Rate limiter for uploads
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, error: "Too many uploads, please try again later" },
});

// Rate limiter for downloads
const downloadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { success: false, error: "Too many download requests" },
});

// Admin: create video material
router.post(
  "/video",
  requireAuth,
  requireAdmin,
  uploadLimiter,
  createVideoMaterialValidation,
  MaterialController.createVideoMaterial
);

// Admin: upload PDF material
router.post(
  "/pdf",
  requireAuth,
  requireAdmin,
  uploadLimiter,
  pdfUpload.single("file"),
  uploadPdfMaterialValidation,
  MaterialController.uploadPdfMaterial
);

// Auth: get materials by level
router.get("/", requireAuth, getMaterialsValidation, MaterialController.getMaterialsByLevel);

// Auth: get material detail
router.get("/:id", requireAuth, materialIdValidation, MaterialController.getMaterialDetail);

// Auth + enrolled + level unlocked: download PDF
router.get(
  "/:id/download",
  requireAuth,
  materialIdValidation,
  requireEnrolled,
  requireLevelUnlocked,
  downloadLimiter,
  MaterialController.downloadPdf
);

// Admin: delete material
router.delete(
  "/:id",
  requireAuth,
  requireAdmin,
  materialIdValidation,
  MaterialController.deleteMaterial
);

export default router;
