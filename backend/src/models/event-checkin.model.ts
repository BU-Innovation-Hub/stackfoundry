import { Schema, model, Types } from "mongoose";

interface CheckInSession {
  event: Types.ObjectId;
  enabled: boolean;
  secret: string;
  revision: number;
}
const sessionSchema = new Schema<CheckInSession>({
  event: { type: Schema.Types.ObjectId, ref: "Event", required: true, unique: true },
  enabled: { type: Boolean, default: false },
  secret: { type: String, required: true, select: false },
  revision: { type: Number, default: 0 },
}, { timestamps: true, collection: "event_checkin_sessions" });

const attemptSchema = new Schema({
  event: { type: Schema.Types.ObjectId, required: true },
  user: { type: Schema.Types.ObjectId, required: true },
  attempts: { type: Number, required: true, default: 0 },
}, { timestamps: true, collection: "event_checkin_attempts" });
attemptSchema.index({ event: 1, user: 1 }, { unique: true });

export const EventCheckInSession = model("EventCheckInSession", sessionSchema);
export const EventCheckInAttempt = model("EventCheckInAttempt", attemptSchema);
