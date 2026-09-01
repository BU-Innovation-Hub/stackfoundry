/**
 * Topic Routes
 * Endpoints for standalone topic operations
 *
 * PUT    /api/v1/topics/:id   (admin) -> update topic
 * DELETE /api/v1/topics/:id   (admin) -> delete topic
 */

import { Router } from "express";
import { requireAuth, requireCourseManagement } from "../../middleware/auth";
import * as TopicController from "../../controllers/topic.controller";
import { updateTopicValidation, topicIdValidation } from "../../utils/courseValidation";

const router = Router();

router.put("/:id", requireAuth, requireCourseManagement, updateTopicValidation, TopicController.updateTopic);
router.delete("/:id", requireAuth, requireCourseManagement, topicIdValidation, TopicController.deleteTopic);

export default router;
