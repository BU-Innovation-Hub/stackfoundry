import mongoose, { Schema } from "mongoose";

export interface EventJob {
  key: string;
  stream: string;
  sequence: number;
  kind: "calendar" | "cleanup";
  event: mongoose.Types.ObjectId;
  payload: Record<string, any>;
  status: "pending" | "processing" | "accepted" | "completed" | "skipped" | "failed";
  attempts: number;
  availableAt: Date;
  leaseUntil?: Date;
  leaseToken?: string;
  lastError?: string;
  uncertain?: boolean;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
const schema = new Schema<EventJob>({
  key: { type: String, required: true, unique: true },
  stream: { type: String, required: true },
  sequence: { type: Number, required: true },
  kind: { type: String, required: true, enum: ["calendar", "cleanup"] },
  event: { type: Schema.Types.ObjectId, required: true },
  payload: { type: Schema.Types.Mixed, required: true },
  status: { type: String, default: "pending", enum: ["pending", "processing", "accepted", "completed", "skipped", "failed"] },
  attempts: { type: Number, default: 0 },
  availableAt: { type: Date, default: Date.now },
  leaseUntil: Date, leaseToken: String, lastError: String, uncertain: Boolean, acceptedAt: Date,
}, { timestamps: true, collection: "event_jobs" });
schema.index({ status: 1, availableAt: 1, leaseUntil: 1 });
schema.index({ stream: 1, sequence: 1, status: 1 });
schema.index({ event: 1, kind: 1, sequence: 1, status: 1 });
schema.index({ status: 1, createdAt: 1 });
schema.index({ createdAt: 1 });
export default mongoose.model<EventJob>("EventJob", schema);
