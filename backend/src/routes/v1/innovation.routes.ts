import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import cloudinary from "../../config/cloudinary";
import { requireAuth, requireHubAdmin, requireRole, optionalAuth } from "../../middleware/auth";
import { ApiError } from "../../middleware/errorHandler";
import { RequestWithUser } from "../../types";
import Student from "../../models/user.model";
import {
  InnovationCategory,
  DevelopmentStage,
  ProjectDiscussion,
  ProjectFile,
  MentorProfile,
  MentorRequest,
  MentorshipSession,
  Showcase,
  Notification,
  ReviewAssignment,
} from "../../models/innovation.model";
import { Project } from "../../models/project.model";
import { notify } from "../../services/innovation.service";
import { generateSignedDownloadUrl } from "../../services/cloudinary.service";

const router = Router();
const auth = requireAuth;
const actor = (req: Request) => (req as RequestWithUser).user;
const id = (req: Request) => req.params.id;
const asyncRoute = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => { fn(req, res).catch(next); };
const admin = [auth, requireHubAdmin];
const parse = (value: unknown, fallback: unknown[] = []) => Array.isArray(value) ? value : (typeof value === "string" ? value.split(",").map(v => v.trim()).filter(Boolean) : fallback);
const isAdmin = (user: RequestWithUser["user"]) => ["system_admin", "innovation_hub_admin"].includes(user.role);

const gone = (movedTo: string) => (_req: Request, res: Response) => {
  res.status(410).json({ error: "Gone: use the Project repository API instead.", movedTo });
};

// Classifications are public to support configurable forms; mutation is admin-only.
router.get("/categories-and-stages", asyncRoute(async (_req, res) => res.json({ success: true, data: { categories: await InnovationCategory.find({ active: true }).sort({ order: 1, name: 1 }), stages: await DevelopmentStage.find({ active: true }).sort({ order: 1, name: 1 }) } })));
router.post("/categories-and-stages/:type", ...admin, asyncRoute(async (req, res) => { const Model = req.params.type === "categories" ? InnovationCategory : req.params.type === "stages" ? DevelopmentStage : null; if (!Model) throw new ApiError(404, "Unknown category or stage"); const name = String(req.body.name || "").trim(); if (!name) throw new ApiError(400, "Name is required"); res.status(201).json({ success: true, data: await Model.create({ name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-") }) }); }));
router.patch("/categories-and-stages/:type/:id", ...admin, asyncRoute(async (req, res) => { const Model = req.params.type === "categories" ? InnovationCategory : req.params.type === "stages" ? DevelopmentStage : null; if (!Model) throw new ApiError(404, "Unknown category or stage"); const result = await Model.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true }); if (!result) throw new ApiError(404, "Category or stage not found"); res.json({ success: true, data: result }); }));

// Deprecated Idea surface — 410 with pointer to the canonical Project repository API.
router.get("/ideas", gone("/api/v1/projects"));
router.post("/ideas", gone("/api/v1/projects"));
router.get("/ideas/:id", gone("/api/v1/projects/:id"));
router.patch("/ideas/:id", gone("/api/v1/projects/:id"));
router.post("/ideas/:id/submit", gone("/api/v1/projects/:id/submit"));
router.post("/ideas/:id/review", gone("/api/v1/projects/:id/reviews"));
router.get("/ideas/:id/feedback", gone("/api/v1/projects/:id/comments"));
router.post("/ideas/:id/feedback", gone("/api/v1/projects/:id/comments"));
router.post("/ideas/:id/invitations", gone("/api/v1/projects/:id/invites"));
router.post("/ideas/:id/invitations/respond", gone("/api/v1/invites/:id/respond"));
router.post("/ideas/:id/review-assignments", gone("/api/v1/projects/:id/reviews"));

// Deprecated embedded-collaborator project surface — replaced by /api/v1/projects + /api/v1/invites.
router.get("/projects", gone("/api/v1/projects"));
router.post("/projects", gone("/api/v1/projects"));
router.get("/projects/:id", gone("/api/v1/projects/:id"));
router.post("/projects/:id/invitations", gone("/api/v1/projects/:id/invites"));
router.get("/invitations", gone("/api/v1/invites/mine"));
router.post("/projects/:id/invitations/respond", gone("/api/v1/invites/:id/respond"));
router.patch("/projects/:id/members/:userId", gone("/api/v1/projects/:id/collaborators/:userId"));
router.get("/projects/:id/discussions", gone("/api/v1/projects/:id/comments"));
router.post("/projects/:id/discussions", gone("/api/v1/projects/:id/comments"));

router.get("/review-assignments", auth, asyncRoute(async (req, res) => { const u = actor(req); const filter = isAdmin(u) && req.query.all === "true" ? {} : { mentor: u.id }; const assignments = await ReviewAssignment.find(filter).populate("project mentor requestedBy", "title name email").sort({ createdAt: -1 }).limit(100); res.json({ success: true, data: assignments }); }));
router.post("/projects/:id/review-assignments", ...admin, asyncRoute(async (req, res) => { const project = await Project.findById(id(req)); if (!project) throw new ApiError(404, "Project not found"); const mentor = await MentorProfile.findOne({ _id: req.body.mentorId, approved: true }); if (!mentor) throw new ApiError(404, "Approved mentor not found"); const assignment = await ReviewAssignment.findOneAndUpdate({ project: project._id, mentor: mentor.user }, { project: project._id, mentor: mentor.user, requestedBy: actor(req).id, note: req.body.note, status: "pending" }, { upsert: true, new: true, setDefaultsOnInsert: true }); await notify(String(mentor.user), "Project review requested", `You have been asked to review ${project.title}.`, `/innovation/projects/${project._id}`); res.status(201).json({ success: true, data: assignment }); }));
router.patch("/review-assignments/:id", auth, asyncRoute(async (req, res) => { const assignment: any = await ReviewAssignment.findById(id(req)); if (!assignment) throw new ApiError(404, "Review assignment not found"); const u = actor(req); if (!isAdmin(u) && String(assignment.mentor) !== u.id) throw new ApiError(403, "Assignment access denied"); const status = String(req.body.status); if (!["accepted", "declined", "cancelled"].includes(status)) throw new ApiError(400, "Invalid assignment status"); assignment.status = status; assignment.respondedAt = new Date(); await assignment.save(); if (assignment.project) { const p = await Project.findById(assignment.project).select("owner"); if (p) await notify(String(p.owner), "Review assignment update", `A mentor has ${status} your review request.`); } res.json({ success: true, data: assignment }); }));

const projectAccess = async (req: Request) => {
  const p = await Project.findById(id(req));
  if (!p) throw new ApiError(404, "Project not found");
  const u = actor(req);
  const member = (p.collaborators || []).some((m: any) => String(m.user) === u.id);
  const assigned = await ReviewAssignment.exists({ project: p._id, mentor: u.id, status: { $in: ["pending", "accepted", "completed"] } });
  if (!isAdmin(u) && p.visibility !== "public" && !member && String(p.owner) !== u.id && !assigned) throw new ApiError(403, "Project access denied");
  return p;
};

router.get("/collaborators", auth, asyncRoute(async (req, res) => { const q: Record<string, unknown> = { collaborationOptIn: true, isActive: true }; for (const field of ["skills", "interests", "faculty", "department"]) if (req.query[field]) q[field] = field === "skills" || field === "interests" ? { $in: parse(req.query[field]) } : req.query[field]; const users = await Student.find(q).select("name surname email faculty department skills interests profilePictureUrl").limit(100); res.json({ success: true, data: users }); }));

router.get("/mentors", optionalAuth, asyncRoute(async (req, res) => { const u = (req as Partial<RequestWithUser>).user; const filter: any = { approved: true, ...(req.query.expertise ? { expertise: { $in: parse(req.query.expertise) } } : {}) }; if (u && ["system_admin", "innovation_hub_admin"].includes(u.role) && req.query.includePending === "true") delete filter.approved; res.json({ success: true, data: await MentorProfile.find(filter).populate("user", "name surname email faculty department") }); }));
router.post("/mentors/profile", auth, requireRole(["mentor"]), asyncRoute(async (req, res) => { const profile = await MentorProfile.findOneAndUpdate({ user: actor(req).id }, { ...req.body, user: actor(req).id, approved: false, expertise: parse(req.body.expertise) }, { upsert: true, new: true }); res.status(201).json({ success: true, data: profile }); }));
router.patch("/mentors/:id/approval", ...admin, asyncRoute(async (req, res) => { const p = await MentorProfile.findByIdAndUpdate(id(req), { approved: Boolean(req.body.approved), approvedBy: actor(req).id, approvedAt: new Date() }, { new: true }); if (!p) throw new ApiError(404, "Mentor profile not found"); res.json({ success: true, data: p }); }));
router.post("/mentors/:id/requests", auth, asyncRoute(async (req, res) => { const mentor = await MentorProfile.findOne({ _id: id(req), approved: true }); if (!mentor) throw new ApiError(404, "Mentor not found"); const request = await MentorRequest.create({ mentor: mentor.user, requester: actor(req).id, message: req.body.message, history: [{ status: "pending", by: actor(req).id }] }); await notify(String(mentor.user), "Mentorship request", "You have a new mentorship request."); res.status(201).json({ success: true, data: request }); }));
router.patch("/mentor-requests/:id", auth, asyncRoute(async (req, res) => { const r: any = await MentorRequest.findById(id(req)); if (!r || (![String(r.mentor), String(r.requester)].includes(actor(req).id))) throw new ApiError(404, "Request not found"); r.status = req.body.status; r.history.push({ status: r.status, by: actor(req).id, note: req.body.note }); await r.save(); if (r.status === "accepted") await MentorshipSession.create({ mentor: r.mentor, mentee: r.requester, request: r._id }); res.json({ success: true, data: r }); }));
router.post("/mentor-requests/:id/replies", auth, asyncRoute(async (req, res) => { const r: any = await MentorRequest.findByIdAndUpdate(id(req), { $push: { replies: { author: actor(req).id, message: req.body.message } } }, { new: true }); if (!r) throw new ApiError(404, "Request not found"); res.json({ success: true, data: r }); }));
router.get("/mentorship-sessions", auth, asyncRoute(async (req, res) => res.json({ success: true, data: await MentorshipSession.find({ $or: [{ mentor: actor(req).id }, { mentee: actor(req).id }] }).populate("mentor mentee", "name surname") })));
router.post("/mentorship-sessions/:id/messages", auth, asyncRoute(async (req, res) => { const s: any = await MentorshipSession.findById(id(req)); if (!s || ![String(s.mentor), String(s.mentee)].includes(actor(req).id)) throw new ApiError(404, "Session not found"); s.messages.push({ author: actor(req).id, message: req.body.message }); await s.save(); res.json({ success: true, data: s }); }));

router.post("/showcase", auth, asyncRoute(async (req, res) => { const project = await Project.findById(req.body.project); if (!project || (String(project.owner) !== actor(req).id && !isAdmin(actor(req))) || !["approved", "incubation"].includes(project.status)) throw new ApiError(403, "Only approved project owners can request showcase publication"); const showcase = await Showcase.findOneAndUpdate({ project: req.body.project }, { project: req.body.project, title: req.body.title || project.title, summary: req.body.summary, approved: false, published: false }, { upsert: true, new: true, setDefaultsOnInsert: true }); res.status(201).json({ success: true, data: showcase }); }));
router.patch("/showcase/:id", ...admin, asyncRoute(async (req, res) => { const s = await Showcase.findByIdAndUpdate(id(req), { approved: Boolean(req.body.approved), published: Boolean(req.body.published), approvedBy: actor(req).id, publishedAt: req.body.published ? new Date() : undefined }, { new: true }); if (!s) throw new ApiError(404, "Showcase item not found"); res.json({ success: true, data: s }); }));
router.get("/showcase/admin", ...admin, asyncRoute(async (_req, res) => res.json({ success: true, data: await Showcase.find().populate("project") })));
router.get("/showcase", asyncRoute(async (_req, res) => res.json({ success: true, data: await Showcase.find({ approved: true, published: true }).populate("project") })));
router.get("/search", auth, asyncRoute(async (req, res) => { const q = String(req.query.q || "").trim(); if (!q) throw new ApiError(400, "q is required"); const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"); const [projects, students, mentors, events] = await Promise.all([Project.find({ $or: [{ title: rx }, { problem: rx }, { solution: rx }] }).limit(10), Student.find({ $or: [{ name: rx }, { surname: rx }, { faculty: rx }, { department: rx }, { skills: rx }, { interests: rx }], collaborationOptIn: true }).select("name surname faculty department skills interests").limit(10), MentorProfile.find({ approved: true, expertise: rx }).populate("user", "name surname").limit(10), (await import("../../models/event.model")).default.find({ status: "published", $or: [{ title: rx }, { description: rx }] }).limit(10)]); res.json({ success: true, data: { projects, students, researchers: students, mentors, events } }); }));
router.get("/notifications", auth, asyncRoute(async (req, res) => res.json({ success: true, data: await Notification.find({ recipient: actor(req).id }).sort({ createdAt: -1 }).limit(100) })));
router.patch("/notifications/:id/read", auth, asyncRoute(async (req, res) => { const n = await Notification.findOneAndUpdate({ _id: id(req), recipient: actor(req).id }, { readAt: new Date() }, { new: true }); if (!n) throw new ApiError(404, "Notification not found"); res.json({ success: true, data: n }); }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (_req, file, cb) => cb(null, /^(image\/|audio\/|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument)/.test(file.mimetype)) });
router.post("/upload", auth, upload.single("file"), asyncRoute(async (req, res) => { const file = (req as any).file; if (!file) throw new ApiError(400, "Supported image, PDF, office, or audio file required"); const resourceType = file.mimetype.startsWith("image/") ? "image" : "raw"; const result: any = await new Promise((resolve, reject) => { const stream = cloudinary.uploader.upload_stream({ folder: "innovation-hub/uploads", resource_type: resourceType }, (error, value) => error ? reject(error) : resolve(value)); stream.end(file.buffer); }); res.status(201).json({ success: true, data: { url: result.secure_url, publicId: result.public_id, resourceType, name: file.originalname, mimeType: file.mimetype, bytes: file.size } }); }));
router.post("/projects/:id/files", auth, upload.single("file"), asyncRoute(async (req, res) => { const p = await projectAccess(req); const file = (req as any).file; if (!file) throw new ApiError(400, "File required"); const result: any = await new Promise((resolve, reject) => { const stream = cloudinary.uploader.upload_stream({ folder: `innovation-hub/projects/${p._id}`, resource_type: file.mimetype.startsWith("image/") ? "image" : "raw" }, (error, value) => error ? reject(error) : resolve(value)); stream.end(file.buffer); }); const saved = await ProjectFile.create({ project: p._id, uploadedBy: actor(req).id, name: file.originalname, mimeType: file.mimetype, bytes: file.size, publicId: result.public_id, resourceType: file.mimetype.startsWith("image/") ? "image" : "raw" }); res.status(201).json({ success: true, data: saved }); }));
router.get("/projects/:id/files/:fileId", auth, asyncRoute(async (req, res) => { await projectAccess(req); const f = await ProjectFile.findOne({ _id: req.params.fileId, project: id(req) }); if (!f) throw new ApiError(404, "File not found"); res.json({ success: true, data: { ...f.toJSON(), signedUrl: f.resourceType === "raw" ? generateSignedDownloadUrl(f.publicId, 300) : cloudinary.url(f.publicId, { secure: true, sign_url: true }) } }); }));
router.get("/projects/:id/files", auth, asyncRoute(async (req, res) => { await projectAccess(req); res.json({ success: true, data: await ProjectFile.find({ project: id(req) }).sort({ createdAt: -1 }).select("name mimeType bytes uploadedBy createdAt") }); }));
router.get("/projects/:id/legacy-discussions", auth, asyncRoute(async (req, res) => { await projectAccess(req); res.json({ success: true, data: await ProjectDiscussion.find({ project: id(req) }).sort({ createdAt: 1 }).populate("author", "name surname") }); }));

export default router;
