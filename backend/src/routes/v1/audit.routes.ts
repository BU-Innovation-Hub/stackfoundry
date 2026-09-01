import { Router } from "express";
import { requireAuth, requireSystemAdmin } from "../../middleware/auth";
import * as AuditController from "../../controllers/audit.controller";

const router = Router();
router.get("/", requireAuth, requireSystemAdmin, AuditController.list);
export default router;
