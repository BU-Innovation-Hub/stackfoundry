import { ClientSession } from "mongoose";
import EventJob from "../models/event-job.model";
import { IEvent } from "../models/event.model";
export const enqueueEventJob = async (
  session: ClientSession, event: IEvent,
  kind: "calendar" | "cleanup",
  payload: Record<string, unknown>, recipient?: string,
) => {
  const revision = event.revision || 0;
  const key = `${event._id}:${revision}:${kind}:${recipient || "event"}`;
  await EventJob.updateOne({ key }, { $setOnInsert: {
    key, stream: `${event._id}:${recipient || kind}`, sequence: revision,
    event: event._id, kind, payload, status: "pending", attempts: 0, availableAt: new Date(),
  } }, { upsert: true, session });
};
