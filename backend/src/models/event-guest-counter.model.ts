import mongoose, { Schema } from "mongoose";

const EventGuestCounterSchema = new Schema({
  _id: { type: String, required: true },
  sequence: { type: Number, default: 0 },
}, { collection: "event_guest_counters" });

export default mongoose.models.EventGuestCounter || mongoose.model("EventGuestCounter", EventGuestCounterSchema);
