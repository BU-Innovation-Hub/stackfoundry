import mongoose, { Document, Schema, Types } from "mongoose";

export type EventAttendanceStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface IEventAttendance extends Document {
  revision: number;
  _id: Types.ObjectId;
  event: Types.ObjectId;
  user?: Types.ObjectId;
  guest?: Types.ObjectId;
  status: EventAttendanceStatus;
  requestedAt: Date;
  decidedAt?: Date;
  checkedInAt?: Date;
  checkInMethod?: "qr" | "manual";
  createdAt: Date;
  updatedAt: Date;
}

const EventAttendanceSchema = new Schema<IEventAttendance>(
  {
    revision: { type: Number, default: 0 },
    event: { type: Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: false },
    guest: { type: Schema.Types.ObjectId, ref: "EventGuest", required: false },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      required: true,
      default: "approved",
      index: true,
    },
    requestedAt: { type: Date, default: Date.now },
    decidedAt: { type: Date },
    checkedInAt: { type: Date },
    checkInMethod: { type: String, enum: ["qr", "manual"] },
  },
  { timestamps: true, collection: "event_attendance" }
);

EventAttendanceSchema.pre("validate", function validateAttendeeIdentity() {
  if (Boolean(this.user) === Boolean(this.guest)) {
    throw new Error("An event registration must belong to exactly one member or guest");
  }
});

EventAttendanceSchema.index({ event: 1, user: 1 }, { unique: true, partialFilterExpression: { user: { $type: "objectId" } } });
EventAttendanceSchema.index({ event: 1, guest: 1 }, { unique: true, partialFilterExpression: { guest: { $type: "objectId" } } });
EventAttendanceSchema.index({ event: 1, status: 1 });
EventAttendanceSchema.index({ user: 1, status: 1 });
EventAttendanceSchema.index({ event: 1, requestedAt: 1, _id: 1 });
EventAttendanceSchema.index({ event: 1, _id: 1, status: 1 });

const EventAttendance = mongoose.models.EventAttendance ||
  mongoose.model<IEventAttendance>("EventAttendance", EventAttendanceSchema);

export default EventAttendance;
