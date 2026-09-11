import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { RequestWithUser } from "../types";
import { ApiError } from "../middleware/errorHandler";
import { ProjectRequest } from "../middleware/projectAuth";
import * as Service from "../services/project.service";

const failOnValidation = (req: Request): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new ApiError(400, "Validation failed", errors.array().map((e: any) => e.msg || "Validation error"));
};

const userOf = (req: Request) => {
  const u = (req as RequestWithUser).user;
  if (!u) throw new ApiError(401, "Authentication required");
  return u;
};

export const list = (scope: "all" | "mine" | "explore") => async (req: Request, res: Response, next: NextFunction) => {
  try {
    failOnValidation(req);
    res.json({ success: true, ...(await Service.listProjects(userOf(req), scope, req.query)) });
  } catch (e) {
    next(e);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    failOnValidation(req);
    res.status(201).json({ success: true, data: await Service.createProject(userOf(req), req.body) });
  } catch (e) {
    next(e);
  }
};

export const getOne = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = (req as ProjectRequest).project;
    const collabCount = (p.collaborators || []).length;
    res.json({ success: true, data: { ...p.toJSON(), collaboratorCount: collabCount } });
  } catch (e) {
    next(e);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    failOnValidation(req);
    res.json({ success: true, data: await Service.updateProject((req as ProjectRequest).project, req.body) });
  } catch (e) {
    next(e);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = (req as ProjectRequest).project;
    await Service.deleteProject(project);
    res.json({ success: true, data: { id: String(project._id) } });
  } catch (e) {
    next(e);
  }
};

export const submit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await Service.submitProject((req as ProjectRequest).project) });
  } catch (e) {
    next(e);
  }
};

export const createInvite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    failOnValidation(req);
    const { invite } = await Service.inviteCollaborator((req as ProjectRequest).project, userOf(req), req.body.email, req.body.role);
    res.status(201).json({ success: true, data: invite });
  } catch (e) {
    next(e);
  }
};

export const getInvites = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await Service.listInvites(req.params.id, req.query.status as string | undefined) });
  } catch (e) {
    next(e);
  }
};

export const myInvites = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await Service.myInvites(userOf(req)) });
  } catch (e) {
    next(e);
  }
};

export const respondInvite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    failOnValidation(req);
    res.json({ success: true, data: await Service.respondToInvite(req.params.id, userOf(req), req.body.accepted !== false) });
  } catch (e) {
    next(e);
  }
};

export const removeCollaborator = async (req: Request, res: Response, next: NextFunction) => {
  try {
    failOnValidation(req);
    res.json({ success: true, data: await Service.removeCollaborator((req as ProjectRequest).project, req.params.userId) });
  } catch (e) {
    next(e);
  }
};

export const changeRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    failOnValidation(req);
    res.json({ success: true, data: await Service.changeCollaboratorRole((req as ProjectRequest).project, req.params.userId, req.body.role) });
  } catch (e) {
    next(e);
  }
};

export const getComments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    res.json({ success: true, ...(await Service.listComments(req.params.id, page, limit)) });
  } catch (e) {
    next(e);
  }
};

export const postComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    failOnValidation(req);
    res.status(201).json({ success: true, data: await Service.addComment(req.params.id, userOf(req), req.body.body, req.body.parent) });
  } catch (e) {
    next(e);
  }
};

export const getReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await Service.listReviews(req.params.id) });
  } catch (e) {
    next(e);
  }
};

export const postReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    failOnValidation(req);
    res.json({
      success: true,
      data: await Service.addReview((req as ProjectRequest).project, userOf(req), req.body.toStatus, req.body.decision, req.body.note),
    });
  } catch (e) {
    next(e);
  }
};

export const requestShowcase = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json({ success: true, data: await Service.requestShowcase((req as ProjectRequest).project, userOf(req), req.body) });
  } catch (e) {
    next(e);
  }
};
