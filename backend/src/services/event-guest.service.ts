import crypto from "crypto";
import Event from "../models/event.model";
import EventGuest from "../models/event-guest.model";
import EventGuestCounter from "../models/event-guest-counter.model";
import EventAttendance from "../models/event-attendance.model";
import { ApiError } from "../middleware/errorHandler";
import { eventTransaction } from "./event-transaction.service";

const hash = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
const idPattern = /^[a-f\d]{24}$/i;

export const createGuestSession = async (eventId: string, name: string, email: string, currentToken?: string) => {
  if (!idPattern.test(eventId)) throw new ApiError(400, "Invalid event ID");
  const safeName = name.trim();
  const safeEmail = email.trim().toLowerCase();
  if (safeName.length < 2 || safeName.length > 100 || /[<>\u0000-\u001f]/.test(safeName)) throw new ApiError(400, "Enter a valid name");
  if (safeEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeEmail)) throw new ApiError(400, "Enter a valid email address");
  const event = await Event.findOne({ _id: eventId, status: "published", deletedAt: null }).select("startDate eventDate endDate registrationLink").lean();
  if (!event) throw new ApiError(404, "Event not found");
  const expiresAt = event.endDate ? new Date(event.endDate) : null;
  if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) throw new ApiError(409, "Guest registration requires an event with a future end time");
  if (new Date(event.startDate || event.eventDate) < new Date()) throw new ApiError(409, "Event registration has closed");
  if (currentToken) {
    const existing = await EventGuest.findOne({ event: eventId, tokenHash: hash(currentToken), expiresAt: { $gt: new Date() } }).select("+tokenHash");
    if (existing) return { guest: existing, token: currentToken, expiresAt, registrationLink: event.registrationLink };
  }
  const token = crypto.randomBytes(32).toString("base64url");
  const counter = await EventGuestCounter.findOneAndUpdate({ _id: "global" }, { $inc: { sequence: 1 } }, { upsert: true, new: true });
  const guestNumber = counter.sequence;
  const guest = await EventGuest.create({ event: eventId, guestNumber, guestId: `guest_${String(guestNumber).padStart(3, "0")}`, name: safeName, email: safeEmail, tokenHash: hash(token), expiresAt });
  return { guest, token, expiresAt, registrationLink: event.registrationLink };
};

export const getGuestSession = async (eventId: string, token?: string) => {
  if (!idPattern.test(eventId)) throw new ApiError(400, "Invalid event ID");
  if (!token) return null;
  const event = await Event.findOne({ _id: eventId, deletedAt: null }).select("endDate").lean();
  if (!event?.endDate || new Date(event.endDate) <= new Date()) return null;
  const guest = await EventGuest.findOne({ event: eventId, tokenHash: hash(token), expiresAt: { $gt: new Date() } });
  if (!guest) return null;
  const attendance = await EventAttendance.findOne({ event: eventId, guest: guest._id }).lean();
  return { guest: { guestId: guest.guestId, name: guest.name, email: guest.email, expiresAt: guest.expiresAt }, attendance };
};

export const joinAsGuest = async (eventId: string, token: string) => {
  if (!idPattern.test(eventId)) throw new ApiError(400, "Invalid event ID");
  const guest = await EventGuest.findOne({ event: eventId, tokenHash: hash(token), expiresAt: { $gt: new Date() } });
  if (!guest) throw new ApiError(401, "Guest session expired. Please join again.");
  return eventTransaction(async session => {
    const event = await Event.findOne({ _id: eventId, deletedAt: null, status: "published" }).session(session);
    if (!event) throw new ApiError(404, "Event not found");
    if (event.registrationLink) return { externalUrl: event.registrationLink };
    if (new Date(event.startDate || event.eventDate) < new Date() || !event.endDate || new Date(event.endDate) <= new Date()) throw new ApiError(409, "Event registration has closed");
    const existing = await EventAttendance.findOne({ event: eventId, guest: guest._id }).session(session);
    if (existing && ["pending", "approved"].includes(existing.status)) return existing;
    if (existing?.status === "rejected") throw new ApiError(409, "Your request to join this event was rejected");
    if (event.capacity != null && event.attendeeCount >= event.capacity) throw new ApiError(409, "Event Full");
    event.attendeeCount += 1; event.revision = (event.revision || 0) + 1; await event.save({ session });
    const status = event.requireApproval ? "pending" : "approved";
    const attendance = existing || new EventAttendance({ event: eventId, guest: guest._id });
    attendance.status = status; attendance.requestedAt = new Date(); attendance.decidedAt = status === "approved" ? new Date() : undefined;
    attendance.revision = (attendance.revision || 0) + 1; await attendance.save({ session }); return attendance;
  });
};

export const cancelGuestAttendance = async (eventId: string, token: string) => {
  if (!idPattern.test(eventId)) throw new ApiError(400, "Invalid event ID");
  const guest = await EventGuest.findOne({ event: eventId, tokenHash: hash(token), expiresAt: { $gt: new Date() } });
  if (!guest) throw new ApiError(401, "Guest session expired");
  return eventTransaction(async session => {
    const event = await Event.findOne({ _id: eventId, deletedAt: null }).session(session);
    const attendance = await EventAttendance.findOne({ event: eventId, guest: guest._id }).session(session);
    if (!event || !event.endDate || new Date(event.endDate) <= new Date()) throw new ApiError(401, "Guest session expired");
    if (!attendance || !["pending", "approved"].includes(attendance.status)) throw new ApiError(404, "Active attendance not found");
    attendance.status = "cancelled"; attendance.decidedAt = new Date(); attendance.revision = (attendance.revision || 0) + 1;
    event.attendeeCount = Math.max(0, event.attendeeCount - 1); event.revision = (event.revision || 0) + 1;
    await event.save({ session }); await attendance.save({ session }); return attendance;
  });
};
