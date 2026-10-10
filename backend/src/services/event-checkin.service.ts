import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import Event, { IEvent } from "../models/event.model";
import EventAttendance from "../models/event-attendance.model";
import { EventCheckInAttempt, EventCheckInSession } from "../models/event-checkin.model";
import { ApiError } from "../middleware/errorHandler";
import { assertEventId, assertEventManager } from "../utils/event-contract";
import { getEnv } from "../config/env";
import { eventTransaction } from "./event-transaction.service";

const ROTATION_MS = 60000;
const GRACE_MS = 15000;
const MAX_MANUAL_ATTEMPTS = 5;
// Isolate attendance time from MongoDB driver timers in boundary/race tests.
export const checkInClock = { now: () => Date.now() };
type Actor = { id: string; role: string; roleNames?: string[] };
type EventSchedule = Pick<IEvent, "startDate" | "eventDate" | "endDate" | "status" | "locationType" | "registrationLink">;
export type CheckInProof = { token: string; code?: never } | { code: string; token?: never };

export const checkInWindow = (event: EventSchedule, now = checkInClock.now()) => {
  const start = new Date(event.startDate || event.eventDate).getTime();
  const end = event.endDate ? new Date(event.endDate).getTime() : NaN;
  const opensAt = start - 15 * 60000;
  let reason: string | null = null;
  if (event.locationType !== "physical" || event.registrationLink) reason = "Check-in is only available for physical events with internal registration.";
  else if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) reason = "Set an event end time later than its start to enable check-in.";
  else if (event.status !== "published") reason = "Check-in requires a published event.";
  else if (now < opensAt) reason = "Check-in opens 15 minutes before the event starts.";
  else if (now >= end) reason = "The check-in window has ended.";
  return { available: reason === null, reason, opensAt: Number.isFinite(opensAt) ? new Date(opensAt).toISOString() : null, closesAt: Number.isFinite(end) ? new Date(end).toISOString() : null };
};

const assertManager = (event: IEvent, actor: Actor) => {
  assertEventManager(event.author, actor);
};
const assertWindow = (event: EventSchedule) => {
  const window = checkInWindow(event);
  if (!window.available) throw new ApiError(409, window.reason!);
};
const digest = (secret: string, event: IEvent, bucket: number, purpose: string) =>
  createHmac("sha256", Buffer.from(secret, "hex"))
    .update(JSON.stringify([purpose, event._id.toString(), new Date(event.startDate || event.eventDate).getTime(), new Date(event.endDate!).getTime(), bucket]))
    .digest();
const tokenFor = (secret: string, event: IEvent, bucket: number) => `${bucket}.${digest(secret, event, bucket, "qr").toString("hex")}`;
const codeFor = (secret: string, event: IEvent, bucket: number) => String(digest(secret, event, bucket, "manual").readUInt32BE(0) % 1000).padStart(3, "0");
const equal = (left: string, right: string) => left.length === right.length && timingSafeEqual(Buffer.from(left), Buffer.from(right));
const nextSecret = (secret: string, event: IEvent) => {
  const bucket = Math.floor(checkInClock.now() / ROTATION_MS);
  // Do not accidentally keep a used three-digit code valid through a collision,
  // including either side of the scheduled rotation's typing grace period.
  const previousCodes = new Set([bucket - 1, bucket].map(value => codeFor(secret, event, value)));
  let next: string;
  do { next = randomBytes(32).toString("hex"); }
  while ([bucket - 1, bucket].some(value => previousCodes.has(codeFor(next, event, value))));
  return next;
};
const assertProof = (secret: string, event: IEvent, proof: CheckInProof) => {
  const now = checkInClock.now();
  const bucket = Math.floor(now / ROTATION_MS);
  const buckets = now % ROTATION_MS < GRACE_MS ? [bucket, bucket - 1] : [bucket];
  const valid = buckets.some(value => proof.token !== undefined
    ? equal(proof.token, tokenFor(secret, event, value))
    : equal(proof.code!, codeFor(secret, event, value)));
  if (!valid) throw new ApiError(400, "This QR code or manual code is invalid or expired. Use the current code on the organizer's screen.");
};

export const parseCheckInProof = (body: unknown): CheckInProof => {
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length !== 1) throw new ApiError(400, "Provide either a QR token or a three-digit code");
  const { token, code } = body as Record<string, unknown>;
  if (typeof token === "string" && /^\d{1,12}\.[a-f0-9]{64}$/.test(token)) return { token };
  if (typeof code === "string" && /^\d{3}$/.test(code)) return { code };
  throw new ApiError(400, "Provide a valid QR token or exactly three digits");
};

export const getCheckInSession = async (eventId: string, actor: Actor) => {
  assertEventId(eventId);
  const event = await Event.findOne({ _id: eventId, deletedAt: null });
  if (!event) throw new ApiError(404, "Event not found");
  assertManager(event, actor);
  const session = await EventCheckInSession.findOne({ event: eventId }).select("+secret");
  const now = checkInClock.now();
  const window = checkInWindow(event, now);
  const base = { ...window, enabled: Boolean(session?.enabled), serverTime: new Date(now).toISOString(), revision: `${event.revision || 0}:${session?.revision || 0}` };
  if (!window.available || !session?.enabled) return { ...base, qrUrl: null, code: null, refreshAt: null, expiresAt: null };
  const bucket = Math.floor(now / ROTATION_MS);
  const refreshAt = Math.min((bucket + 1) * ROTATION_MS, new Date(event.endDate!).getTime());
  const url = new URL(`/events/${encodeURIComponent(event.slug)}/check-in`, getEnv().CLIENT_URL);
  url.hash = `token=${tokenFor(session.secret, event, bucket)}`;
  return { ...base, qrUrl: url.toString(), code: codeFor(session.secret, event, bucket),
    refreshAt: new Date(refreshAt).toISOString(), expiresAt: new Date(Math.min((bucket + 1) * ROTATION_MS + GRACE_MS, new Date(event.endDate!).getTime())).toISOString() };
};

// A bounded long poll keeps organizer screens current across API processes.
// The browser holds one request instead of spending its rate limit polling.
export const waitForCheckInSession = async (eventId: string, actor: Actor, afterRevision: string, signal: AbortSignal) => {
  let result = await getCheckInSession(eventId, actor);
  const initialQr = result.qrUrl;
  const initialAvailable = result.available;
  const deadline = Date.now() + 25000;
  while (!signal.aborted && result.revision === afterRevision && result.qrUrl === initialQr && result.available === initialAvailable && Date.now() < deadline) {
    const boundary = Math.min(...[result.refreshAt, result.opensAt, result.closesAt]
      .filter((value): value is string => Boolean(value)).map(value => new Date(value).getTime()).filter(value => value > checkInClock.now()));
    const delay = Math.max(1, Math.min(1000, deadline - Date.now(), boundary - checkInClock.now()));
    await new Promise<void>(resolve => {
      const finish = () => { clearTimeout(timer); signal.removeEventListener('abort', finish); resolve(); };
      const timer = setTimeout(finish, delay);
      signal.addEventListener('abort', finish, { once: true });
      if (signal.aborted) finish();
    });
    if (signal.aborted) return null;
    result = await getCheckInSession(eventId, actor);
  }
  return signal.aborted ? null : result;
};

export const setCheckInSession = async (eventId: string, actor: Actor, enabled: boolean) => {
  assertEventId(eventId);
  await eventTransaction(async transaction => {
    const event = await Event.findOne({ _id: eventId, deletedAt: null }).session(transaction);
    if (!event) throw new ApiError(404, "Event not found");
    assertManager(event, actor);
    if (enabled) assertWindow(event);
    // Serialize with schedule edits/deletion and in-flight check-ins.
    await Event.updateOne({ _id: eventId }, { $inc: { revision: 1 } }, { session: transaction });
    await EventCheckInSession.findOneAndUpdate({ event: eventId }, {
      $set: { enabled, secret: randomBytes(32).toString("hex") }, $inc: { revision: 1 },
    }, { upsert: true, session: transaction });
  });
  return getCheckInSession(eventId, actor);
};

const reserveManualAttempt = async (eventId: string, userId: string) => {
  // Initialize independently of reservation, tolerating concurrent first attempts.
  // The conditional increment is atomic across all API processes.
  try {
    await EventCheckInAttempt.updateOne({ event: eventId, user: userId },
      { $setOnInsert: { attempts: 0 } }, { upsert: true });
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
  }
  const reserved = await EventCheckInAttempt.findOneAndUpdate({ event: eventId, user: userId, attempts: { $lt: MAX_MANUAL_ATTEMPTS } },
    { $inc: { attempts: 1 } }, { returnDocument: 'after' });
  if (!reserved) throw new ApiError(429, "Manual entry limit reached for this event. Please scan the live QR code with the organizer's help.");
};

export const checkIn = async (eventId: string, actor: Actor, input: unknown) => {
  assertEventId(eventId); assertEventId(actor.id);
  // Only the student identity is eligible, even when other roles can join events.
  if (actor.role !== "student") throw new ApiError(403, "Only students can check in");
  const proof = parseCheckInProof(input);
  let manualReserved = false;
  return eventTransaction(async transaction => {
    const event = await Event.findOne({ _id: eventId, deletedAt: null }).session(transaction);
    if (!event) throw new ApiError(404, "Event not found");
    const attendance = await EventAttendance.findOne({ event: eventId, user: actor.id }).session(transaction);
    if (!attendance || attendance.status !== "approved") throw new ApiError(403, "An approved event registration is required to check in");
    // Retries return the original proof of presence without rewriting history.
    if (attendance.checkedInAt) return { checkedInAt: attendance.checkedInAt, checkInMethod: attendance.checkInMethod, alreadyCheckedIn: true };
    assertWindow(event);
    const session = await EventCheckInSession.findOne({ event: eventId, enabled: true }).select("+secret").session(transaction);
    if (!session) throw new ApiError(409, "The organizer has not opened check-in, or has closed it.");
    if (proof.code !== undefined && !manualReserved) {
      // Deliberately outside the attendance transaction: rejected proofs must
      // consume attempts, but transaction retries must not consume extra attempts.
      await reserveManualAttempt(eventId, actor.id);
      manualReserved = true;
    }
    assertProof(session.secret, event, proof);
    await Event.updateOne({ _id: eventId }, { $inc: { revision: 1 } }, { session: transaction });
    // Lock the session before rechecking time, then rotate in the same transaction
    // as attendance. Competing students must obtain the newly displayed proof.
    await EventCheckInSession.updateOne({ _id: session._id }, { $inc: { revision: 1 } }, { session: transaction });
    assertWindow(event);
    assertProof(session.secret, event, proof);
    attendance.checkedInAt = new Date(checkInClock.now());
    attendance.checkInMethod = proof.token !== undefined ? "qr" : "manual";
    attendance.revision = (attendance.revision || 0) + 1;
    await attendance.save({ session: transaction });
    await EventCheckInSession.updateOne({ _id: session._id }, { $set: { secret: nextSecret(session.secret, event) } }, { session: transaction });
    return { checkedInAt: attendance.checkedInAt, checkInMethod: attendance.checkInMethod, alreadyCheckedIn: false };
  });
};
