import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Project } from "../models/project.model";
import { ReviewAssignment } from "../models/innovation.model";
import { ApiError } from "./errorHandler";
import { RequestWithUser } from "../types";

export type ProjectRole = "owner" | "maintainer" | "contributor" | "mentor" | "admin" | "none";

export interface ProjectRequest extends Request {
  project?: any;
  projectRole?: ProjectRole;
  isProjectAdmin?: boolean;
}

export const isAdminUser = (user: RequestWithUser["user"]): boolean =>
  ["system_admin", "innovation_hub_admin"].includes(user.role) ||
  (user.roleNames || []).some((r) => ["system_admin", "innovation_hub_admin"].includes(r));

const collaboratorRoleFor = (project: any, userId: string): "owner" | "maintainer" | "contributor" | null => {
  const idOf = (value: any) => String(value?._id || value);
  if (idOf(project.owner) === String(userId)) return "owner";
  const entry = (project.collaborators || []).find((c: any) => idOf(c.user) === String(userId));
  return entry ? (entry.role as any) : null;
};

export const resolveProjectRole = async (project: any, user: RequestWithUser["user"]): Promise<ProjectRole> => {
  if (isAdminUser(user)) return "admin";
  const collab = collaboratorRoleFor(project, user.id);
  if (collab) return collab;
  const assigned = await ReviewAssignment.exists({
    project: project._id,
    mentor: user.id,
    status: { $in: ["pending", "accepted", "completed"] },
  });
  if (assigned) return "mentor";
  return "none";
};

export const canReadProject = async (project: any, user: RequestWithUser["user"]): Promise<boolean> => {
  if (isAdminUser(user)) return true;
  if (project.visibility === "public") return true;
  const idOf = (value: any) => String(value?._id || value);
  if (idOf(project.owner) === user.id) return true;
  if ((project.collaborators || []).some((c: any) => idOf(c.user) === user.id)) return true;
  return Boolean(
    await ReviewAssignment.exists({
      project: project._id,
      mentor: user.id,
      status: { $in: ["pending", "accepted", "completed"] },
    })
  );
};

/** Load project by :id, enforce read access, attach project + resolved role. Single shared entry point. */
export const loadProject = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(rawId)) throw new ApiError(404, "Project not found");
    const project = await Project.findById(rawId)
      .populate("owner", "name surname email profilePictureUrl")
      .populate("collaborators.user", "name surname email profilePictureUrl")
      .populate("category stage", "name slug");
    if (!project) throw new ApiError(404, "Project not found");
    const user = (req as RequestWithUser).user;
    if (!user) throw new ApiError(401, "Authentication required");
    if (!(await canReadProject(project, user))) throw new ApiError(403, "Project access denied");
    const role = await resolveProjectRole(project, user);
    (req as ProjectRequest).project = project;
    (req as ProjectRequest).projectRole = role;
    (req as ProjectRequest).isProjectAdmin = role === "admin" || role === "owner";
    next();
  } catch (err) {
    next(err);
  }
};

/** Require one of the resolved project roles. Must run after requireAuth + loadProject. */
export const requireProjectRole = (allowed: ProjectRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const r = (req as ProjectRequest).projectRole;
    if (!r || !allowed.includes(r)) {
      next(new ApiError(403, "Permission denied for this project"));
      return;
    }
    next();
  };
};

export const requireProjectOwnerOrAdmin = requireProjectRole(["owner", "admin"]);
export const requireProjectMaintainer = requireProjectRole(["owner", "maintainer", "admin"]);
export const requireProjectMember = requireProjectRole(["owner", "maintainer", "contributor"]);
export const requireProjectCollaborator = requireProjectRole(["owner", "maintainer", "contributor"]);
export const requireProjectCommenter = requireProjectRole(["owner", "maintainer", "contributor", "mentor", "admin"]);
export const requireProjectReviewer = requireProjectRole(["mentor", "admin"]);
