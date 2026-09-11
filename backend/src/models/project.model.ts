import mongoose, { Schema, Types, Model } from "mongoose";

const ref = { type: Schema.Types.ObjectId, ref: "User", required: true };
const stringArray = { type: [String], default: [] as string[] };

export const PROJECT_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "feedback_provided",
  "resubmitted",
  "approved",
  "rejected",
  "incubation",
  "archived",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_VISIBILITIES = ["private", "public"] as const;
export type ProjectVisibility = (typeof PROJECT_VISIBILITIES)[number];

export const COLLABORATOR_ROLES = ["owner", "maintainer", "contributor"] as const;
export type CollaboratorRole = (typeof COLLABORATOR_ROLES)[number];

export interface ICollaborator {
  user: Types.ObjectId;
  role: CollaboratorRole;
  joinedAt: Date;
}

export interface IProject {
  title: string;
  problem: string;
  solution: string;
  beneficiaries: string[];
  impact?: string;
  category: Types.ObjectId;
  stage: Types.ObjectId;
  tags: string[];
  media: Array<{ url?: string; publicId?: string; type?: string; name?: string }>;
  owner: Types.ObjectId;
  collaborators: ICollaborator[];
  visibility: ProjectVisibility;
  status: ProjectStatus;
  reviewHistory: Array<{ reviewer: Types.ObjectId; fromStatus: string; toStatus: string; note?: string; at: Date }>;
  migratedFrom?: { ideaId?: Types.ObjectId; legacyProjectId?: Types.ObjectId };
  createdAt: Date;
  updatedAt: Date;
}

// NOTE: Schemas are intentionally untyped (matching innovation.model.ts).
// Parameterising `new Schema<T>()` makes the checker instantiate mongoose's
// deep schema-definition mapped types per model and exhausts the heap
// (ts-node/tsc OOM). Documents are typed as `any` at the boundary; the
// interfaces above remain the source of truth for payload shapes.
const CollaboratorSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: [...COLLABORATOR_ROLES], required: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ProjectSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    problem: { type: String, required: true },
    solution: { type: String, required: true },
    beneficiaries: stringArray,
    impact: { type: String },
    category: { type: Schema.Types.ObjectId, ref: "InnovationCategory", required: true },
    stage: { type: Schema.Types.ObjectId, ref: "DevelopmentStage", required: true },
    tags: stringArray,
    media: [{ url: String, publicId: String, type: String, name: String }],
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    collaborators: { type: [CollaboratorSchema], default: [] },
    visibility: { type: String, enum: [...PROJECT_VISIBILITIES], default: "private", index: true },
    status: { type: String, enum: [...PROJECT_STATUSES], default: "draft", index: true },
    reviewHistory: [
      {
        reviewer: ref,
        fromStatus: String,
        toStatus: String,
        note: String,
        at: { type: Date, default: Date.now },
      },
    ],
    migratedFrom: {
      ideaId: { type: Schema.Types.ObjectId },
      legacyProjectId: { type: Schema.Types.ObjectId },
    },
  },
  { timestamps: true }
);

ProjectSchema.index({ owner: 1, status: 1 });
ProjectSchema.index({ "collaborators.user": 1 });
ProjectSchema.index({ visibility: 1, status: 1, createdAt: -1 });
ProjectSchema.index({ title: "text", problem: "text", solution: "text" });

export const INVITE_ROLES = ["maintainer", "contributor"] as const;
export type InviteRole = (typeof INVITE_ROLES)[number];
export const INVITE_STATUSES = ["pending", "accepted", "declined", "revoked", "expired"] as const;
export type InviteStatus = (typeof INVITE_STATUSES)[number];

export interface IProjectInvite {
  project: Types.ObjectId;
  email: string;
  user?: Types.ObjectId;
  role: InviteRole;
  status: InviteStatus;
  tokenHash: string;
  invitedBy: Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectInviteSchema = new Schema<IProjectInvite>(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    role: { type: String, enum: [...INVITE_ROLES], required: true },
    status: { type: String, enum: [...INVITE_STATUSES], default: "pending", index: true },
    tokenHash: { type: String, required: true, unique: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);
ProjectInviteSchema.index({ project: 1, status: 1 });
ProjectInviteSchema.index({ project: 1, email: 1, status: 1 });
ProjectInviteSchema.index({ project: 1, email: 1 }, { unique: true, partialFilterExpression: { status: "pending" } });

export interface IComment {
  project: Types.ObjectId;
  author: Types.ObjectId;
  parent: Types.ObjectId | null;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    parent: { type: Schema.Types.ObjectId, ref: "Comment", default: null },
    body: { type: String, required: true, trim: true, maxlength: 5000 },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);
CommentSchema.index({ project: 1, createdAt: 1 });

export const REVIEW_DECISIONS = ["approve", "request_changes", "reject", "comment"] as const;
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

export interface IReview {
  project: Types.ObjectId;
  reviewer: Types.ObjectId;
  fromStatus: string;
  toStatus: ProjectStatus;
  decision: ReviewDecision;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    reviewer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    fromStatus: { type: String, required: true },
    toStatus: { type: String, enum: [...PROJECT_STATUSES], required: true },
    decision: { type: String, enum: [...REVIEW_DECISIONS], required: true },
    note: { type: String, maxlength: 5000 },
  },
  { timestamps: true }
);
ReviewSchema.index({ project: 1, createdAt: -1 });
ReviewSchema.index({ reviewer: 1, createdAt: -1 });

const model = <T>(name: string, schema: Schema): Model<T> =>
  (mongoose.models[name] as Model<T>) || mongoose.model<T>(name, schema);

export const Project = model<IProject>("Project", ProjectSchema);
export const ProjectInvite = model<IProjectInvite>("ProjectInvite", ProjectInviteSchema);
export const Comment = model<IComment>("Comment", CommentSchema);
export const Review = model<IReview>("Review", ReviewSchema);

export type ProjectDocument = HydratedDocument<IProject>;
export type { Types };
