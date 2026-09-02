import mongoose, { Schema, Types, Model } from "mongoose";

const ref = { type: Schema.Types.ObjectId, ref: "User", required: true };
const stringArray = { type: [String], default: [] };

const InnovationClassificationSchema = new Schema({
  name: { type: String, required: true, trim: true }, slug: { type: String, required: true, unique: true },
  description: String, active: { type: Boolean, default: true }, order: { type: Number, default: 0 },
}, { timestamps: true });
InnovationClassificationSchema.index({ active: 1, order: 1 });

const FeedbackSchema = new Schema({
  idea: { type: Schema.Types.ObjectId, ref: "Idea", required: true, index: true },
  author: ref, parent: { type: Schema.Types.ObjectId, ref: "Feedback", default: null },
  strengths: stringArray, opportunities: stringArray, developmentAreas: stringArray,
  questions: stringArray, recommendations: stringArray, supportRequired: stringArray,
  voiceNoteUrl: String, message: { type: String, trim: true }, createdAt: { type: Date, default: Date.now },
});

const IdeaSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 }, problem: { type: String, required: true },
  solution: { type: String, required: true }, beneficiaries: stringArray, impact: String,
  category: { type: Schema.Types.ObjectId, ref: "InnovationCategory", required: true },
  stage: { type: Schema.Types.ObjectId, ref: "DevelopmentStage", required: true },
  media: [{ url: String, publicId: String, type: String, name: String }], teamMembers: [{ user: ref, role: String, accepted: { type: Boolean, default: true } }],
  visibility: { type: String, enum: ["public", "private"], default: "public", index: true },
  owner: ref, status: { type: String, enum: ["draft", "submitted", "under_review", "feedback_provided", "resubmitted", "approved", "rejected", "incubation", "archived"], default: "draft", index: true },
  feedback: [{ type: Schema.Types.ObjectId, ref: "Feedback" }],
  reviewHistory: [{ reviewer: ref, fromStatus: String, toStatus: String, note: String, at: { type: Date, default: Date.now } }],
}, { timestamps: true });
IdeaSchema.index({ title: "text", problem: "text", solution: "text" });

const ProjectSchema = new Schema({
  name: { type: String, required: true, trim: true }, description: String, owner: ref,
  visibility: { type: String, enum: ["public", "private"], default: "private", index: true },
  status: { type: String, enum: ["active", "archived"], default: "active" },
  team: [{ user: ref, role: { type: String, enum: ["owner", "co_owner", "researcher", "developer", "designer", "business", "advisor", "viewer"] }, accepted: { type: Boolean, default: false }, invitedAt: { type: Date, default: Date.now } }],
  collaborationRequired: { type: Boolean, default: true }, tags: stringArray,
}, { timestamps: true });
ProjectSchema.index({ name: "text", description: "text", tags: "text" });

const DiscussionSchema = new Schema({ project: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true }, author: ref, parent: { type: Schema.Types.ObjectId, ref: "ProjectDiscussion", default: null }, message: { type: String, required: true }, createdAt: { type: Date, default: Date.now } });
const FileSchema = new Schema({ project: { type: Schema.Types.ObjectId, ref: "Project", required: true }, uploadedBy: ref, name: String, mimeType: String, bytes: Number, publicId: { type: String, required: true }, resourceType: String, access: { type: String, enum: ["team", "owner"], default: "team" } }, { timestamps: true });

const MentorProfileSchema = new Schema({ user: { ...ref, unique: true }, bio: String, expertise: stringArray, availability: String, approved: { type: Boolean, default: false, index: true }, approvedBy: { type: Schema.Types.ObjectId, ref: "User" }, approvedAt: Date }, { timestamps: true });
const MentorRequestSchema = new Schema({ mentor: ref, requester: ref, message: String, status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" }, replies: [{ author: ref, message: String, at: { type: Date, default: Date.now } }], feedback: [FeedbackSchema], history: [{ status: String, by: ref, at: { type: Date, default: Date.now }, note: String }] }, { timestamps: true });
const SessionSchema = new Schema({ mentor: ref, mentee: ref, request: { type: Schema.Types.ObjectId, ref: "MentorRequest" }, messages: [{ author: ref, message: String, at: { type: Date, default: Date.now } }], scheduledFor: Date, status: { type: String, enum: ["unscheduled", "scheduled", "complete", "cancelled"], default: "unscheduled" } }, { timestamps: true });
const ShowcaseSchema = new Schema({ idea: { type: Schema.Types.ObjectId, ref: "Idea", required: true, unique: true }, title: String, summary: String, approved: { type: Boolean, default: false }, published: { type: Boolean, default: false }, approvedBy: { type: Schema.Types.ObjectId, ref: "User" }, publishedAt: Date }, { timestamps: true });
const NotificationSchema = new Schema({ recipient: ref, type: String, title: String, message: String, link: String, readAt: Date, emailSentAt: Date, dueAt: Date }, { timestamps: true });
NotificationSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });

const ReviewAssignmentSchema = new Schema({
  idea: { type: Schema.Types.ObjectId, ref: "Idea" },
  project: { type: Schema.Types.ObjectId, ref: "Project" },
  mentor: ref,
  requestedBy: ref,
  status: { type: String, enum: ["pending", "accepted", "declined", "completed", "cancelled"], default: "pending", index: true },
  note: String,
  respondedAt: Date,
}, { timestamps: true });
ReviewAssignmentSchema.index({ idea: 1, mentor: 1 }, { unique: true, sparse: true });
ReviewAssignmentSchema.index({ project: 1, mentor: 1 }, { unique: true, sparse: true });
ReviewAssignmentSchema.index({ mentor: 1, status: 1 });

// The domain documents are intentionally schema-first; route DTOs are validated at the boundary.
const model = (name: string, schema: Schema): Model<any> => mongoose.models[name] || mongoose.model(name, schema);
export const InnovationCategory = model("InnovationCategory", InnovationClassificationSchema);
export const DevelopmentStage = model("DevelopmentStage", InnovationClassificationSchema);
export const Idea = model("Idea", IdeaSchema);
export const Feedback = model("Feedback", FeedbackSchema);
export const Project = model("Project", ProjectSchema);
export const ProjectDiscussion = model("ProjectDiscussion", DiscussionSchema);
export const ProjectFile = model("ProjectFile", FileSchema);
export const MentorProfile = model("MentorProfile", MentorProfileSchema);
export const MentorRequest = model("MentorRequest", MentorRequestSchema);
export const MentorshipSession = model("MentorshipSession", SessionSchema);
export const Showcase = model("Showcase", ShowcaseSchema);
export const Notification = model("Notification", NotificationSchema);
export const ReviewAssignment = model("ReviewAssignment", ReviewAssignmentSchema);
export { Types };
