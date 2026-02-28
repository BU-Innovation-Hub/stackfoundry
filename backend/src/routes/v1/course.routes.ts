/**
 * Course Routes
 * CRUD endpoints for courses
 *
 * POST   /api/v1/courses                  (admin) -> create course
 * GET    /api/v1/courses                  (public) -> list courses
 * GET    /api/v1/courses/:id              (public) -> get course with levels
 * PUT    /api/v1/courses/:id              (admin) -> update course
 * DELETE /api/v1/courses/:id              (admin) -> delete course
 * POST   /api/v1/courses/:courseId/levels (admin) -> create level
 * GET    /api/v1/courses/:courseId/levels (auth)  -> get levels for course
 */

import { Router } from "express";
import { requireAuth, requireAdmin } from "../../middleware/auth";
import * as CourseController from "../../controllers/course.controller";
import * as LevelController from "../../controllers/level.controller";
import {
  createCourseValidation,
  updateCourseValidation,
  courseIdValidation,
  courseIdParamValidation,
  createLevelValidation,
} from "../../utils/courseValidation";

const router = Router();

// Course CRUD
router.post("/", requireAuth, requireAdmin, createCourseValidation, CourseController.createCourse);
router.get("/", CourseController.getCourses);
router.get("/:id", courseIdValidation, CourseController.getCourseById);
router.put("/:id", requireAuth, requireAdmin, updateCourseValidation, CourseController.updateCourse);
router.delete("/:id", requireAuth, requireAdmin, courseIdValidation, CourseController.deleteCourse);

// Level nested under course
router.post(
  "/:courseId/levels",
  requireAuth,
  requireAdmin,
  courseIdParamValidation,
  createLevelValidation,
  LevelController.createLevel
);
router.get("/:courseId/levels", requireAuth, courseIdParamValidation, LevelController.getLevelsByCourse);

export default router;
