import mongoose, { Document, Schema, Types } from "mongoose";

export type AuditEventType = "http" | "business";

export interface IAuditLog extends Document {
  eventType: AuditEventType;
  action: string;
  actorId?: Types.ObjectId;
  actorRoles?: string[];
  targetType?: string;
  targetId?: string;
  method?: string;
  route?: string;
  statusCode?: number;
  durationMs?: number;
  ipAddress?: string;
  userAgent?: string;
  requestId: string;
  success: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    eventType: { type: String, enum: ["http", "business"], required: true, index: true },
    action: { type: String, required: true, index: true, maxlength: 120 },
    actorId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    actorRoles: { type: [String], default: [] },
    targetType: { type: String, maxlength: 80 },
    targetId: { type: String, maxlength: 120, index: true },
    method: { type: String, maxlength: 10 },
    route: { type: String, maxlength: 300 },
    statusCode: Number,
    durationMs: Number,
    ipAddress: String,
    userAgent: { type: String, maxlength: 500 },
    requestId: { type: String, required: true, index: true },
    success: { type: Boolean, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { collection: "audit_logs", timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ eventType: 1, createdAt: -1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });

export default (mongoose.models.AuditLog as mongoose.Model<IAuditLog>) ||
  mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
