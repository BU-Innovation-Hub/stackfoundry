import { randomUUID } from "crypto";
import EventJob from "../models/event-job.model";
import Event from "../models/event.model";
import { syncEventToGoogle, deleteEventFromGoogle } from "./google-calendar.service";
const OPEN = ["pending", "processing"];
const LEASE_MS = 120000;
export const MAX_JOB_ATTEMPTS = 8;
type Job = NonNullable<Awaited<ReturnType<typeof claimEventJob>>>;

export const claimEventJob = async () => {
  const now = new Date();
  // A predecessor remains open throughout processing, so parallel workers
  // cannot overtake calendar work for the same event.
  const candidates = await EventJob.find({ $or: [
    { status: "pending", availableAt: { $lte: now } },
    { status: "processing", leaseUntil: { $lte: now } },
  ] }).sort({ availableAt: 1, _id: 1 }).limit(100).lean();
  for (const candidate of candidates) {
    const blocked = await EventJob.exists({ status: { $in: OPEN }, sequence: { $lt: candidate.sequence }, $or: [
      { stream: candidate.stream },
    ] });
    if (blocked) {
      await EventJob.updateOne({ _id: candidate._id, status: "pending" }, { $set: { availableAt: new Date(Date.now() + 1000) } });
      continue;
    }
    const job = await EventJob.findOneAndUpdate({ _id: candidate._id, $or: [
      { status: "pending", availableAt: { $lte: now } }, { status: "processing", leaseUntil: { $lte: now } },
    ] }, { $set: { status: "processing", leaseToken: randomUUID(), leaseUntil: new Date(Date.now() + LEASE_MS),
      }, $inc: { attempts: 1 } }, { returnDocument: "after" });
    if (job) return job;
  }
  return null;
};

export const handleEventJob = async (job: Job): Promise<"accepted" | "completed" | "skipped" | "pending"> => {
  // Event email and fan-out delivery were intentionally removed. Legacy jobs
  // are marked skipped so an upgrade cannot accidentally send old messages.
  if (job.kind !== "calendar") return "skipped";
  let event = await Event.findById(job.event);
  if (job.kind === "calendar") {
    if (!event) return "skipped";
    // Always reconcile the latest desired state, rather than replay stale edits.
    // Attendance changes serialize capacity but must not invalidate calendar work.
    const calendarRevision = event.calendarRevision || 0;
    if (event.deletedAt || event.status !== "published") {
      await deleteEventFromGoogle(event);
      const updated = await Event.updateOne({ _id: event._id, calendarRevision }, { $set: { googleMeetLink: null, calendarSyncStatus: "disabled" } });
      if (!updated.matchedCount) return "pending";
    } else {
      const result = await syncEventToGoogle(event);
      const updated = await Event.updateOne({ _id: event._id, calendarRevision, deletedAt: null }, { $set: { ...result, calendarSyncStatus: "synced" } });
      if (!updated.matchedCount) return "pending";
    }
    return "completed";
  }
  return "skipped";
};

export const runEventJob = async (job: Job) => {
  const fence = { _id: job._id, leaseToken: job.leaseToken, status: "processing" };
  if (!await EventJob.exists({ ...fence, leaseUntil: { $gt: new Date() } })) return;
  const heartbeat = setInterval(() => {
    EventJob.updateOne(fence, { $set: { leaseUntil: new Date(Date.now() + LEASE_MS) } }).catch(error => console.error("[event-worker] lease renewal failed", error.message));
  }, 30000);
  try {
    const status = await handleEventJob(job);
    await EventJob.updateOne(fence, { $set: { status, availableAt: new Date(),
      ...(status === "accepted" ? { acceptedAt: new Date() } : {}),
      ...(status === "pending" ? { attempts: 0 } : {}),
    }, $unset: { leaseToken: 1, leaseUntil: 1, lastError: 1 } });
  } catch (error) {
    const err = error as { message?: string; responseCode?: number; code?: string | number };
    const code = Number(err.responseCode || err.code);
    const permanent = code >= 500 && code < 600;
    const failed = permanent || job.attempts >= MAX_JOB_ATTEMPTS;
    await EventJob.updateOne(fence, { $set: {
      status: failed ? "failed" : "pending", lastError: String(err.code || err.responseCode || err.message || "Job failed").slice(0, 300),
      availableAt: new Date(Date.now() + Math.min(3600000, 1000 * 2 ** job.attempts) + Math.random() * 1000),
    }, $unset: { leaseToken: 1, leaseUntil: 1 } });
    if (failed && job.kind === "calendar") await Event.updateOne({ _id: job.event, calendarRevision: job.sequence }, { $set: { calendarSyncStatus: "failed" } });
    console.error("[event-worker] job failed", { key: job.key, kind: job.kind, attempt: job.attempts, permanent: failed });
  } finally { clearInterval(heartbeat); }
};

export const eventWorkerMetrics = async () => {
  const [counts, oldest] = await Promise.all([
    EventJob.aggregate([{ $match: { createdAt: { $gte: new Date(Date.now() - 86400000) } } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    EventJob.findOne({ status: { $in: ["pending", "processing"] } }).sort({ createdAt: 1 }).select("createdAt").lean(),
  ]);
  return { countsLast24Hours: counts, oldestPendingMs: oldest ? Date.now() - oldest.createdAt.getTime() : 0 };
};
