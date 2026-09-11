import { Router } from "express";
import { body } from "express-validator";
import { requireAuth } from "../../middleware/auth";
import { inviteIdParam } from "../../middleware/projectValidation";
import * as C from "../../controllers/project.controller";

const router = Router();
router.use(requireAuth);

router.get("/mine", C.myInvites);
router.post("/:id/respond", inviteIdParam, body("accepted").optional().isBoolean().withMessage("accepted must be boolean"), C.respondInvite);
router.post("/:id", inviteIdParam, body("accepted").optional().isBoolean().withMessage("accepted must be boolean"), C.respondInvite);

export default router;
