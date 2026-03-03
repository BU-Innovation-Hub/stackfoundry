/**
 * Level Routes
 * Endpoints for level operations
 *
 * GET    /api/v1/levels/:id                (auth) -> get level with topics
 * PUT    /api/v1/levels/:id                (admin) -> update level
 * DELETE /api/v1/levels/:id                (admin) -> delete level
 * POST   /api/v1/levels/:levelId/topics    (admin) -> create topic
 * GET    /api/v1/levels/:levelId/topics    (auth)  -> get topics for level
 */

import { Router } from "express";
import { requireAuth, requireAdmin } from "../../middleware/auth";
import * as LevelController from "../../controllers/level.controller";
import * as TopicController from "../../controllers/topic.controller";
import * as EnrollmentController from "../../controllers/enrollment.controller";
import {
  levelIdValidation,
  updateLevelValidation,
  levelIdParamValidation,
  createTopicValidation,
} from "../../utils/courseValidation";

const router = Router();

// Level operations
router.get("/:id", requireAuth, levelIdValidation, LevelController.getLevelById);
router.put("/:id", requireAuth, requireAdmin, updateLevelValidation, LevelController.updateLevel);
router.delete("/:id", requireAuth, requireAdmin, levelIdValidation, LevelController.deleteLevel);

// Admin: toggle lock status (updates level + all enrollments)
router.patch("/:id/toggle-lock", requireAuth, requireAdmin, levelIdValidation, EnrollmentController.toggleLevelLock);

// Admin: unlock level for all enrolled students (without changing lockedByDefault)
router.patch("/:id/unlock-all", requireAuth, requireAdmin, levelIdValidation, EnrollmentController.unlockLevelForAll);

// Topics nested under level
router.post(
  "/:levelId/topics",
  requireAuth,
  requireAdmin,
  createTopicValidation,
  TopicController.createTopic
);
router.get("/:levelId/topics", requireAuth, levelIdParamValidation, TopicController.getTopicsByLevel);

export default router;
