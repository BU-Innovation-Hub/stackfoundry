/**
 * Enrollment Routes
 * Endpoints for course enrollment
 *
 * POST   /api/v1/enroll                         (auth) -> enroll in course
 * GET    /api/v1/enrollments/me                  (auth) -> my enrollments
 * GET    /api/v1/enrollments/:userId/courses     (auth/admin) -> user enrollments
 */

import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import * as EnrollmentController from "../../controllers/enrollment.controller";
import { enrollValidation, userEnrollmentsValidation } from "../../utils/courseValidation";

const router = Router();

// Enroll in a course
router.post("/enroll", requireAuth, enrollValidation, EnrollmentController.enrollInCourse);

// My enrollments
router.get(
  "/enrollments/me",
  requireAuth,
  EnrollmentController.getMyEnrollments
);

// User enrollments (self or admin)
router.get(
  "/enrollments/:userId/courses",
  requireAuth,
  userEnrollmentsValidation,
  EnrollmentController.getUserEnrollments
);

export default router;
