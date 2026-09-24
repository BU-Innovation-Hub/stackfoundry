import { Types } from "mongoose";
import Event from "../models/event.model";
import EventAttendance, { EventAttendanceStatus, IEventAttendance } from "../models/event-attendance.model";
import { ApiError } from "../middleware/errorHandler";
import { sendEventNotification } from "./email.service";
import User from "../models/user.model";

const activeStatuses: EventAttendanceStatus[] = ["pending", "approved"];

const notify = async (eventId: string, userId: string, kind: "joined" | "rejected" | "cancelled") => {
  try {
    const [event, user] = await Promise.all([Event.findById(eventId).lean(), User.findById(userId).lean()]);
    if (event && user) await sendEventNotification(user.email, user.name, kind, event.title, event.startDate || event.eventDate);
  } catch (error) { console.error("Event notification failed:", error); }
};

const assertIds = (eventId: string, userId: string) => {
  if (!Types.ObjectId.isValid(eventId) || !Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid event or user ID");
  }
};

const getEvent = async (eventId: string) => {
  const event = await Event.findOne({ _id: eventId, status: "published" });
  if (!event) throw new ApiError(404, "Event not found");
  return event;
};

export const getMyAttendance = async (eventId: string, userId: string) => {
  assertIds(eventId, userId);
  return EventAttendance.findOne({ event: eventId, user: userId }).lean();
};

export const joinEvent = async (eventId: string, userId: string): Promise<IEventAttendance> => {
  assertIds(eventId, userId);
  const event = await getEvent(eventId);
  const existing = await EventAttendance.findOne({ event: eventId, user: userId });
  if (existing && activeStatuses.includes(existing.status)) return existing;
  if (existing?.status === "rejected") throw new ApiError(409, "Your request to join this event was rejected");

  const reserved = await Event.findOneAndUpdate(
    {
      _id: eventId,
      status: "published",
      eventDate: { $gte: new Date() },
      $or: [{ capacity: null }, { capacity: { $exists: false } }, { $expr: { $lt: ["$attendeeCount", "$capacity"] } }],
    },
    { $inc: { attendeeCount: 1 } },
    { new: true }
  );
  if (!reserved) throw new ApiError(409, "Event Full or no longer available");

  try {
    const status = event.requireApproval ? "pending" : "approved";
    const attendance = await EventAttendance.findOneAndUpdate(
      { event: eventId, user: userId },
      { $set: { status, requestedAt: new Date(), decidedAt: status === "approved" ? new Date() : undefined } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ) as IEventAttendance;
    await notify(eventId, userId, "joined");
    return attendance;
  } catch (error) {
    await Event.updateOne({ _id: eventId, attendeeCount: { $gt: 0 } }, { $inc: { attendeeCount: -1 } });
    throw error;
  }
};

export const cancelAttendance = async (eventId: string, userId: string) => {
  assertIds(eventId, userId);
  const attendance = await EventAttendance.findOne({ event: eventId, user: userId });
  if (!attendance || !activeStatuses.includes(attendance.status)) {
    throw new ApiError(404, "Active attendance not found");
  }
  attendance.status = "cancelled";
  attendance.decidedAt = new Date();
  await attendance.save();
  await Event.updateOne({ _id: eventId, attendeeCount: { $gt: 0 } }, { $inc: { attendeeCount: -1 } });
  await notify(eventId, userId, "cancelled");
  return attendance;
};

export const listMyEvents = async (userId: string, status: "upcoming" | "going" | "past") => {
  if (!Types.ObjectId.isValid(userId)) throw new ApiError(400, "Invalid user ID");
  const now = new Date();
  if (status === "going") {
    const rows = await EventAttendance.find({ user: userId, status: "approved" }).select("event").lean();
    return Event.find({ _id: { $in: rows.map(row => row.event) }, status: "published" }).sort({ eventDate: 1 }).lean();
  }
  return Event.find({ status: "published", eventDate: status === "upcoming" ? { $gte: now } : { $lt: now } })
    .sort({ eventDate: status === "upcoming" ? 1 : -1 }).lean();
};

export const listAttendees = async (eventId: string) => {
  assertIds(eventId, new Types.ObjectId().toString());
  return EventAttendance.find({ event: eventId })
    .populate("user", "name surname email studentId")
    .sort({ requestedAt: 1 }).lean();
};

export const decideAttendance = async (eventId: string, attendanceId: string, decision: "approved" | "rejected") => {
  if (!Types.ObjectId.isValid(eventId) || !Types.ObjectId.isValid(attendanceId)) throw new ApiError(400, "Invalid attendance ID");
  if (decision !== "approved" && decision !== "rejected") throw new ApiError(400, "Invalid attendance decision");
  const attendance = await EventAttendance.findOne({ _id: attendanceId, event: eventId, status: "pending" });
  if (!attendance) throw new ApiError(404, "Pending attendance request not found");
  if (decision === "approved") {
    attendance.status = "approved";
    attendance.decidedAt = new Date();
    await attendance.save();
    return attendance;
  }
  attendance.status = "rejected";
  attendance.decidedAt = new Date();
  await attendance.save();
  await Event.updateOne({ _id: eventId, attendeeCount: { $gt: 0 } }, { $inc: { attendeeCount: -1 } });
  await notify(eventId, attendance.user.toString(), "rejected");
  return attendance;
};

export const notifyApprovedAttendee = async (eventId: string, userId: string) => {
  const [event, attendance] = await Promise.all([
    Event.findById(eventId).lean(),
    EventAttendance.findOne({ event: eventId, user: userId }).populate("user", "name email").lean(),
  ]);
  const user = attendance?.user as unknown as { name: string; email: string } | undefined;
  if (event && user && attendance?.status === "approved") {
    await sendEventNotification(user.email, user.name, "approved", event.title, event.startDate || event.eventDate);
  }
};

export const notifyEventAttendees = async (eventId: string, kind: "updated" | "cancelled") => {
  const event = await Event.findById(eventId).lean();
  if (!event) return;
  const rows = await EventAttendance.find({ event: eventId, status: { $in: activeStatuses } }).populate("user", "name email").lean();
  await Promise.all(rows.map(async row => {
    const user = row.user as unknown as { name: string; email: string };
    if (!user?.email) return;
    try { await sendEventNotification(user.email, user.name, kind, event.title, event.startDate || event.eventDate); }
    catch (error) { console.error("Event notification failed:", error); }
  }));
};
