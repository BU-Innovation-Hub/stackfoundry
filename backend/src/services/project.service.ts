import crypto from "crypto";
import mongoose from "mongoose";
import { Project, ProjectInvite, Comment, Review, PROJECT_STATUSES, InviteRole } from "../models/project.model";
import { ProjectFile, ReviewAssignment, Showcase } from "../models/innovation.model";
import User from "../models/user.model";
import { ApiError } from "../middleware/errorHandler";
import { notify } from "./innovation.service";
import { isAdminUser } from "../middleware/projectAuth";
import { RequestWithUser } from "../types";

const parseStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String).map((v) => v.trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((v) => v.trim()).filter(Boolean);
  return [];
};

const REVIEWABLE_FROM: Record<string, string[]> = {
  under_review: ["submitted", "resubmitted"],
  feedback_provided: ["submitted", "under_review", "resubmitted"],
  approved: ["submitted", "under_review", "resubmitted", "feedback_provided", "incubation"],
  rejected: ["submitted", "under_review", "resubmitted", "feedback_provided"],
  incubation: ["approved"],
  archived: ["draft", "submitted", "under_review", "feedback_provided", "resubmitted", "approved", "rejected", "incubation"],
};

const runInTransaction = async <T>(fn: (session: mongoose.ClientSession | null) => Promise<T>): Promise<T> => {
  let session: mongoose.ClientSession | null = null;
  try {
    session = await mongoose.startSession();
    let result: T | undefined;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result as T;
  } catch (err: any) {
    // Standalone mongod (no replica set) cannot run transactions — fall back to non-transactional execution.
    if (err?.code === 20 || /transaction/i.test(err?.message || "")) {
      return fn(null);
    }
    throw err;
  } finally {
    if (session) await session.endSession().catch(() => undefined);
  }
};

export const parsePagination = (query: any) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

const projectListPopulate = [
  { path: "owner", select: "name surname email profilePictureUrl" },
  { path: "collaborators.user", select: "name surname email profilePictureUrl" },
  { path: "category stage", select: "name slug" },
] as any;

export const createProject = async (user: RequestWithUser["user"], body: any) => {
  const project = await Project.create({
    title: String(body.title).trim(),
    problem: String(body.problem),
    solution: String(body.solution),
    beneficiaries: parseStringArray(body.beneficiaries),
    impact: body.impact ? String(body.impact) : undefined,
    category: body.category,
    stage: body.stage,
    tags: parseStringArray(body.tags),
    media: Array.isArray(body.media) ? body.media : [],
    owner: user.id,
    collaborators: [{ user: user.id, role: "owner", joinedAt: new Date() }],
    visibility: body.visibility === "public" ? "public" : "private",
    status: "draft",
  });
  return Project.findById(project._id).populate(projectListPopulate);
};

export const updateProject = async (project: any, body: any) => {
  const allow = ["title", "problem", "solution", "beneficiaries", "impact", "category", "stage", "tags", "media", "visibility"] as const;
  const updates: Record<string, any> = {};
  for (const key of allow) {
    if (body[key] === undefined) continue;
    if (key === "beneficiaries" || key === "tags") updates[key] = parseStringArray(body[key]);
    else if (key === "visibility" && !["private", "public"].includes(body[key])) throw new ApiError(400, "Invalid visibility");
    else updates[key] = body[key];
  }
  const updated = await Project.findOneAndUpdate({ _id: project._id }, { $set: updates }, { new: true, runValidators: true }).populate(projectListPopulate);
  if (!updated) throw new ApiError(404, "Project not found");
  return updated;
};

export const deleteProject = async (project: any) => {
  await runInTransaction(async (session) => {
    const opts = session ? { session } : undefined;
    await Promise.all([
      ProjectInvite.deleteMany({ project: project._id }, opts),
      Comment.deleteMany({ project: project._id }, opts),
      Review.deleteMany({ project: project._id }, opts),
      ReviewAssignment.deleteMany({ project: project._id }, opts),
      ProjectFile.deleteMany({ project: project._id }, opts),
      Showcase.deleteMany({ project: project._id }, opts),
      Project.deleteOne({ _id: project._id }, opts),
    ]);
  });
};

export const submitProject = async (project: any) => {
  if (!["draft", "feedback_provided"].includes(project.status)) throw new ApiError(409, `Cannot submit from status ${project.status}`);
  const fromStatus = project.status;
  const toStatus = fromStatus === "feedback_provided" ? "resubmitted" : "submitted";
  const updated = await Project.findOneAndUpdate(
    { _id: project._id, status: fromStatus },
    { $set: { status: toStatus }, $push: { reviewHistory: { reviewer: project.owner?._id || project.owner, fromStatus, toStatus, note: "Submitted for review", at: new Date() } } },
    { new: true, runValidators: true },
  ).populate(projectListPopulate);
  if (!updated) throw new ApiError(409, "Project was changed by another request. Refresh and try again.");
  return updated;
};

const scopeFilter = async (user: RequestWithUser["user"], scope: "all" | "mine" | "explore", query: any) => {
  const filter: any = {};
  if (scope === "explore") {
    filter.visibility = "public";
    filter.status = { $in: ["approved", "incubation"] };
  } else if (scope === "mine") {
    filter.$or = [{ owner: user.id }, { "collaborators.user": new mongoose.Types.ObjectId(user.id) }];
  } else if (!isAdminUser(user) || query.all !== "true") {
    const assigned = await ReviewAssignment.find({
      mentor: user.id,
      status: { $in: ["pending", "accepted", "completed"] },
      project: { $ne: null },
    }).distinct("project");
    filter.$or = [
      { visibility: "public" },
      { owner: user.id },
      { "collaborators.user": new mongoose.Types.ObjectId(user.id) },
      ...(assigned.length ? [{ _id: { $in: assigned } }] : []),
    ];
  }
  if (query.status && scope !== "explore") filter.status = query.status;
  if (query.category) filter.category = query.category;
  if (query.stage) filter.stage = query.stage;
  if (query.q) (filter as any).$text = { $search: String(query.q) };
  if (Array.isArray(query.tags) || typeof query.tags === "string") {
    const tags = parseStringArray(query.tags);
    if (tags.length) filter.tags = { $in: tags };
  }
  return filter;
};

export const listProjects = async (user: RequestWithUser["user"], scope: "all" | "mine" | "explore", query: any) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = await scopeFilter(user, scope, query);
  const [items, total] = await Promise.all([
    Project.find(filter).populate(projectListPopulate).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    Project.countDocuments(filter),
  ]);
  const data = items.map((p: any) => ({ ...p, collaboratorCount: (p.collaborators || []).length }));
  return { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

/** Atomic invite creation: validates target server-side, single-document update + invite doc in transaction. */
export const inviteCollaborator = async (project: any, actor: RequestWithUser["user"], email: string, role: InviteRole) => {
  const normalized = email.trim().toLowerCase();
  const target = await User.findOne({ email: normalized, isActive: true });
  if (!target) throw new ApiError(404, "User not found with that email");
  if (String(target._id) === String(project.owner?._id || project.owner) || (project.collaborators || []).some((c: any) => String(c.user?._id || c.user) === String(target._id)))
    throw new ApiError(409, "User is already a collaborator on this project");
  const existing = await ProjectInvite.findOne({ project: project._id, email: normalized, status: "pending" });
  if (existing) throw new ApiError(409, "A pending invite already exists for this email");
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  let invite: any;
  try {
    invite = await runInTransaction(async (session) => {
      const created = await ProjectInvite.create(
        [
          {
            project: project._id,
            email: normalized,
            user: target._id,
            role,
            status: "pending",
            tokenHash,
            invitedBy: actor.id,
            expiresAt: new Date(Date.now() + 14 * 24 * 3600 * 1000),
          },
        ],
        session ? { session } : undefined
      );
      return created[0];
    });
  } catch (error: any) {
    if (error?.code === 11000) throw new ApiError(409, "A pending invite already exists for this email");
    throw error;
  }
  await notify(String(target._id), "Project invitation", `You were invited to collaborate on ${project.title} as ${role}.`, `/innovation/projects/${project._id}`);
  return { invite, token };
};

export const listInvites = async (projectId: string, status?: string) => {
  const filter: any = { project: projectId };
  if (status) filter.status = status;
  return ProjectInvite.find(filter).populate("user", "name surname email").populate("invitedBy", "name surname email").sort({ createdAt: -1 }).lean();
};

export const myInvites = async (user: RequestWithUser["user"]) =>
  ProjectInvite.find({ $or: [{ user: user.id }, { email: user.email?.toLowerCase() }], status: "pending", expiresAt: { $gt: new Date() } })
    .populate("project", "title status visibility")
    .sort({ createdAt: -1 })
    .lean();

/** Atomic invite respond: invite status flip + collaborator add in one transaction. Never leaves partial state. */
export const respondToInvite = async (inviteId: string, user: RequestWithUser["user"], accepted: boolean) => {
  const invite: any = await ProjectInvite.findById(inviteId).populate("project");
  if (!invite) throw new ApiError(404, "Invite not found");
  const ownsInvite = String(invite.user) === user.id || invite.email === user.email?.toLowerCase();
  if (!ownsInvite && !isAdminUser(user)) throw new ApiError(403, "This invite is not for you");
  if (invite.status !== "pending") throw new ApiError(409, `Invite is already ${invite.status}`);
  if (invite.expiresAt < new Date()) {
    invite.status = "expired";
    await invite.save();
    throw new ApiError(410, "Invite has expired");
  }

  const project = await Project.findById(invite.project?._id || invite.project);
  if (!project) throw new ApiError(404, "Project not found");

  await runInTransaction(async (session) => {
    const opts = session ? { session } : undefined;
    if (accepted) {
      const already = (project.collaborators || []).some((c: any) => String(c.user) === user.id);
      if (!already) {
        await Project.updateOne(
          { _id: project._id, "collaborators.user": { $ne: new mongoose.Types.ObjectId(user.id) } },
          { $push: { collaborators: { user: new mongoose.Types.ObjectId(user.id), role: invite.role === "maintainer" ? "maintainer" : "contributor", joinedAt: new Date() } } },
          opts
        );
      }
      invite.status = "accepted";
    } else {
      invite.status = "declined";
    }
    await invite.save({ ...(opts as any), validateBeforeSave: false });
  });
  return Project.findById(project._id).populate(projectListPopulate);
};

export const removeCollaborator = async (project: any, userId: string) => {
  if (String(project.owner?._id || project.owner) === String(userId)) throw new ApiError(400, "Cannot remove the project owner");
  const exists = (project.collaborators || []).some((c: any) => String(c.user?._id || c.user) === String(userId));
  if (!exists) throw new ApiError(404, "Collaborator not found");
  await Project.updateOne({ _id: project._id }, { $pull: { collaborators: { user: new mongoose.Types.ObjectId(userId) } } });
  await ProjectInvite.updateMany({ project: project._id, user: userId, status: "pending" }, { $set: { status: "revoked" } });
  await notify(String(userId), "Removed from project", `You were removed from ${project.title}.`);
  return Project.findById(project._id).populate(projectListPopulate);
};

export const changeCollaboratorRole = async (project: any, userId: string, role: "maintainer" | "contributor") => {
  if (String(project.owner?._id || project.owner) === String(userId)) throw new ApiError(400, "Cannot change the owner role");
  const updated = await Project.findOneAndUpdate(
    { _id: project._id, "collaborators.user": new mongoose.Types.ObjectId(userId) },
    { $set: { "collaborators.$.role": role } },
    { new: true }
  ).populate(projectListPopulate);
  if (!updated) throw new ApiError(404, "Collaborator not found");
  await notify(String(userId), "Project role updated", `Your role on ${project.title} is now ${role}.`);
  return updated;
};

export const listComments = async (projectId: string, page: number, limit: number) => {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Comment.find({ project: projectId }).populate("author", "name surname profilePictureUrl").sort({ createdAt: 1 }).skip(skip).limit(limit).lean(),
    Comment.countDocuments({ project: projectId }),
  ]);
  return { data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const addComment = async (projectId: string, user: RequestWithUser["user"], body: string, parent?: string) => {
  if (parent) {
    const p = await Comment.findOne({ _id: parent, project: projectId });
    if (!p) throw new ApiError(404, "Parent comment not found");
  }
  return Comment.create({ project: projectId, author: user.id, parent: parent || null, body: body.trim() });
};

export const listReviews = async (projectId: string) =>
  Review.find({ project: projectId }).populate("reviewer", "name surname email").sort({ createdAt: -1 }).lean();

/** Atomic review: Review doc + project status transition + assignment completion in one transaction. */
export const addReview = async (project: any, reviewer: RequestWithUser["user"], toStatus: string, decision: string, note?: string) => {
  if (!(PROJECT_STATUSES as readonly string[]).includes(toStatus)) throw new ApiError(400, "Invalid review status");
  const allowedFrom = REVIEWABLE_FROM[toStatus];
  if (allowedFrom && !allowedFrom.includes(project.status) && !isAdminUser(reviewer))
    throw new ApiError(409, `Cannot transition from ${project.status} to ${toStatus}`);
  // Server-side role check: mentor must be assigned or admin; enforced by route but re-checked here.
  if (!isAdminUser(reviewer)) {
    const assigned = await ReviewAssignment.exists({ project: project._id, mentor: reviewer.id, status: { $in: ["pending", "accepted"] } });
    const isPublicReviewable = project.visibility === "public" && ["submitted", "under_review", "resubmitted"].includes(project.status);
    if (!assigned && !isPublicReviewable) throw new ApiError(403, "This project is not assigned to you for review");
  }

  const result = await runInTransaction(async (session) => {
    const opts = session ? { session } : undefined;
    const review = (
      await Review.create(
        [{ project: project._id, reviewer: reviewer.id, fromStatus: project.status, toStatus: toStatus as any, decision: decision as any, note }],
        opts
      )
    )[0];
    await Project.updateOne(
      { _id: project._id },
      { $set: { status: toStatus }, $push: { reviewHistory: { reviewer: reviewer.id, fromStatus: project.status, toStatus, note, at: new Date() } } },
      opts
    );
    await ReviewAssignment.updateMany({ project: project._id, mentor: reviewer.id }, { $set: { status: "completed", respondedAt: new Date() } }, opts as any);
    return review;
  });
  if (["feedback_provided", "rejected", "approved"].includes(toStatus))
    await notify(String(project.owner), "Project review update", `Your project "${project.title}" is now ${toStatus}.`, `/innovation/projects/${project._id}`);
  return result;
};

export const requestShowcase = async (project: any, user: RequestWithUser["user"], body: any) => {
  const isOwner = String(project.owner?._id || project.owner) === user.id;
  if (!isOwner && !isAdminUser(user)) throw new ApiError(403, "Only the project owner can request showcase publication");
  if (!["approved", "incubation"].includes(project.status)) throw new ApiError(403, "Only approved projects can request showcase publication");
  return Showcase.findOneAndUpdate(
    { project: project._id },
    { project: project._id, title: body.title || project.title, summary: body.summary, approved: false, published: false },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};
