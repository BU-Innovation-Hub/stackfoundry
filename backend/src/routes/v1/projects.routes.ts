import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  loadProject,
  requireProjectOwnerOrAdmin,
  requireProjectMaintainer,
  requireProjectCollaborator,
  requireProjectCommenter,
  requireProjectReviewer,
} from "../../middleware/projectAuth";
import {
  createProjectValidation,
  updateProjectValidation,
  inviteValidation,
  inviteIdParam,
  commentValidation,
  reviewValidation,
  collaboratorRoleValidation,
  collaboratorIdValidation,
  listValidation,
  objectIdParam,
} from "../../middleware/projectValidation";
import { body } from "express-validator";
import * as C from "../../controllers/project.controller";

const router = Router();
router.use(requireAuth);

// Collection endpoints (order matters: specific paths before :id)
router.get("/mine", listValidation, C.list("mine"));
router.get("/explore", listValidation, C.list("explore"));
router.get("/", listValidation, C.list("all"));
router.post("/", requireRole(["student", "member"]), createProjectValidation, C.create);

// Invites addressed directly: /api/v1/invites/:id + legacy alias /api/v1/projects/invites/:id
router.get("/invites/mine", C.myInvites);
router.post("/invites/:id/respond", inviteIdParam, body("accepted").optional().isBoolean().withMessage("accepted must be boolean"), C.respondInvite);

// Project-scoped endpoints
router.get("/:id", objectIdParam("id"), loadProject, C.getOne);
router.patch("/:id", updateProjectValidation, loadProject, requireProjectCollaborator, C.update);
router.delete("/:id", objectIdParam("id"), loadProject, requireProjectCollaborator, C.remove);
router.post("/:id/submit", objectIdParam("id"), loadProject, requireProjectCollaborator, C.submit);

router.get("/:id/invites", objectIdParam("id"), loadProject, requireProjectOwnerOrAdmin, C.getInvites);
router.post("/:id/invites", inviteValidation, loadProject, requireProjectCollaborator, C.createInvite);

router.delete("/:id/collaborators/:userId", collaboratorIdValidation, loadProject, requireProjectCollaborator, C.removeCollaborator);
router.patch("/:id/collaborators/:userId", collaboratorRoleValidation, loadProject, requireProjectCollaborator, C.changeRole);

router.get("/:id/comments", objectIdParam("id"), loadProject, requireProjectCommenter, C.getComments);
router.post("/:id/comments", commentValidation, loadProject, requireProjectCommenter, C.postComment);

// Reviews visible per role: members see all, mentors see all on assigned; enforced via loadProject read gate.
router.get("/:id/reviews", objectIdParam("id"), loadProject, C.getReviews);
router.post(
  "/:id/reviews",
  reviewValidation,
  loadProject,
  requireRole(["mentor", "system_admin", "innovation_hub_admin"]),
  requireProjectReviewer,
  C.postReview
);

router.post("/:id/showcase", objectIdParam("id"), loadProject, requireProjectMaintainer, C.requestShowcase);

export default router;
