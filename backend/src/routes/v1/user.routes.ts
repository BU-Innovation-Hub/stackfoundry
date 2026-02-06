import { Router } from "express";
import * as UserController from "../../controllers/user.controller";
import { requireAuth } from "../../middleware/auth";

const router = Router();

router.get("/me", requireAuth, UserController.getMe);

export default router;
