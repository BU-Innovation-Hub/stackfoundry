import mongoose, { Document, Schema, Types } from "mongoose";

export interface IEventGuest extends Document {
  event: Types.ObjectId;
  guestNumber: number;
  guestId: string;
  name: string;
  email: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

const EventGuestSchema = new Schema<IEventGuest>({
  event: { type: Schema.Types.ObjectId, ref: "Event", required: true, index: true },
  guestNumber: { type: Number, required: true, unique: true },
  guestId: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  tokenHash: { type: String, required: true, select: false },
  expiresAt: { type: Date, required: true, index: true },
}, { timestamps: { createdAt: true, updatedAt: false }, collection: "event_guests" });

EventGuestSchema.index({ event: 1, expiresAt: 1 });
export default mongoose.models.EventGuest || mongoose.model<IEventGuest>("EventGuest", EventGuestSchema);
