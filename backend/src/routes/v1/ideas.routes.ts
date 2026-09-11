import { Router, Request, Response } from "express";

const router = Router();

const gone = (movedTo: string) => (_req: Request, res: Response) => {
  res.status(410).json({
    error: "Gone: the Idea API has been replaced by the Project repository API.",
    movedTo,
    docs: "Use /api/v1/projects instead. See migration guide.",
  });
};

router.all("/", gone("/api/v1/projects"));
router.all("/mine", gone("/api/v1/projects/mine"));
router.all("/explore", gone("/api/v1/projects/explore"));
router.all("/:id", gone("/api/v1/projects/:id"));
router.all("/:id/submit", gone("/api/v1/projects/:id/submit"));
router.all("/:id/review", gone("/api/v1/projects/:id/reviews"));
router.all("/:id/feedback", gone("/api/v1/projects/:id/comments"));
router.all("/:id/invitations", gone("/api/v1/projects/:id/invites"));
router.all("/:id/invitations/respond", gone("/api/v1/invites/:id/respond"));
router.all("/:id/review-assignments", gone("/api/v1/projects/:id/reviews"));

export default router;
