import { Router } from "express";
import * as UserController from "../../controllers/user.controller";
import { requireAuth } from "../../middleware/auth";
import * as ProfileController from "../../controllers/profile.controller";

const router = Router();

router.get("/me", requireAuth, UserController.getMe);
router.get("/profile", requireAuth, ProfileController.me);
router.patch("/profile", requireAuth, ProfileController.update);

export default router;
