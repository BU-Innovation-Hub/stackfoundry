import mongoose, { Document, Schema, Types } from "mongoose";

export type EventAttendanceStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface IEventAttendance extends Document {
  _id: Types.ObjectId;
  event: Types.ObjectId;
  user: Types.ObjectId;
  status: EventAttendanceStatus;
  requestedAt: Date;
  decidedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EventAttendanceSchema = new Schema<IEventAttendance>(
  {
    event: { type: Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      required: true,
      default: "approved",
      index: true,
    },
    requestedAt: { type: Date, default: Date.now },
    decidedAt: { type: Date },
  },
  { timestamps: true, collection: "event_attendance" }
);

EventAttendanceSchema.index({ event: 1, user: 1 }, { unique: true });
EventAttendanceSchema.index({ event: 1, status: 1 });
EventAttendanceSchema.index({ user: 1, status: 1 });

const EventAttendance = mongoose.models.EventAttendance ||
  mongoose.model<IEventAttendance>("EventAttendance", EventAttendanceSchema);

export default EventAttendance;
