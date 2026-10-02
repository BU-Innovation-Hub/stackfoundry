import { Types } from "mongoose";
import Event from "../models/event.model";
import EventAttendance from "../models/event-attendance.model";
import { ApiError } from "../middleware/errorHandler";
import { eventTransaction } from "./event-transaction.service";
import { assertEventId, pagination } from "../utils/event-contract";

const activeStatuses = ["pending", "approved"];

export const getMyAttendance = async (eventId: string, userId: string) => {
  assertEventId(eventId); assertEventId(userId);
  const event = await Event.findOne({ _id: eventId, deletedAt: null }).select("status").lean();
  if (!event || !["published", "archived"].includes(event.status)) throw new ApiError(404, "Event not found");
  return EventAttendance.findOne({ event: eventId, user: userId }).lean();
};

export const joinEvent = async (eventId: string, userId: string) => {
  assertEventId(eventId); assertEventId(userId);
  return eventTransaction(async session => {
    const event = await Event.findOne({ _id: eventId, deletedAt: null, status: "published" }).session(session);
    if (!event) throw new ApiError(404, "Event not found");
    const existing = await EventAttendance.findOne({ event: eventId, user: userId }).session(session);
    if (existing && activeStatuses.includes(existing.status)) return existing;
    if (existing?.status === "rejected") throw new ApiError(409, "Your request to join this event was rejected");
    if (new Date(event.startDate || event.eventDate) < new Date()) throw new ApiError(409, "Event is no longer available");
    if (event.capacity != null && event.attendeeCount >= event.capacity) throw new ApiError(409, "Event Full");
    event.attendeeCount += 1;
    event.revision = (event.revision || 0) + 1;
    await event.save({ session });
    const status = event.requireApproval ? "pending" : "approved";
    const attendance = existing || new EventAttendance({ event: eventId, user: userId });
    attendance.status = status;
    attendance.requestedAt = new Date();
    attendance.decidedAt = status === "approved" ? new Date() : undefined;
    attendance.revision = (attendance.revision || 0) + 1;
    await attendance.save({ session });
    return attendance;
  });
};

export const cancelAttendance = async (eventId: string, userId: string) => {
  assertEventId(eventId); assertEventId(userId);
  return eventTransaction(async session => {
    const event = await Event.findOne({ _id: eventId, deletedAt: null }).session(session);
    if (!event) throw new ApiError(404, "Event not found");
    const attendance = await EventAttendance.findOne({ event: eventId, user: userId }).session(session);
    if (attendance?.status === "cancelled") return attendance;
    if (!attendance || !activeStatuses.includes(attendance.status)) throw new ApiError(404, "Active attendance not found");
    attendance.status = "cancelled";
    attendance.decidedAt = new Date();
    attendance.revision = (attendance.revision || 0) + 1;
    event.attendeeCount = Math.max(0, event.attendeeCount - 1);
    event.revision = (event.revision || 0) + 1;
    await event.save({ session });
    await attendance.save({ session });
    return attendance;
  });
};

export const decideAttendance = async (eventId: string, attendanceId: string, decision: "approved" | "rejected", manager?: { id: string; role: string }) => {
  assertEventId(eventId); assertEventId(attendanceId);
  if (!["approved", "rejected"].includes(decision)) throw new ApiError(400, "Invalid attendance decision");
  return eventTransaction(async session => {
    const event = await Event.findOne({ _id: eventId, deletedAt: null }).session(session);
    if (!event) throw new ApiError(404, "Event not found");
    if (manager?.role === "mentor" && event.author.toString() !== manager.id) throw new ApiError(403, "Mentors can only manage their own events");
    if (!event.requireApproval) throw new ApiError(400, "Approval is not required for this event");
    const attendance = await EventAttendance.findOne({ _id: attendanceId, event: eventId }).session(session);
    if (attendance?.status === decision) return attendance;
    if (!attendance || attendance.status !== "pending") throw new ApiError(409, "Attendance is no longer pending");
    attendance.status = decision;
    attendance.decidedAt = new Date();
    attendance.revision = (attendance.revision || 0) + 1;
    if (decision === "rejected") event.attendeeCount = Math.max(0, event.attendeeCount - 1);
    event.revision = (event.revision || 0) + 1;
    await event.save({ session });
    await attendance.save({ session });
    return attendance;
  });
};

export const listMyEvents = async (userId: string, status: "upcoming" | "going" | "past", page = 1, limit = 20, filters: { search?: string; type?: string } = {}) => {
  assertEventId(userId);
  const match: Record<string, any> = { deletedAt: null, status: { $in: ["published", "archived"] } };
  if (filters.search) {
    if (status === "going") {
      const escaped = filters.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      match.$or = [{ title: { $regex: escaped, $options: "i" } }, { description: { $regex: escaped, $options: "i" } }];
    } else match.$text = { $search: filters.search };
  }
  if (filters.type) match.type = filters.type;
  if (status !== "going") {
    match.eventDate = status === "upcoming" ? { $gte: new Date() } : { $lt: new Date() };
    if (status === "upcoming") match.status = "published";
  }
  // Start with this user's indexed attendance, not a lookup over every event.
  const pipeline: any[] = status === "going" ? [
    { $match: { user: new Types.ObjectId(userId), status: "approved" } },
    { $lookup: { from: "events", localField: "event", foreignField: "_id", as: "eventData" } },
    { $unwind: "$eventData" }, { $replaceRoot: { newRoot: "$eventData" } }, { $match: match },
  ] : [{ $match: match }];
  pipeline.push({ $facet: {
    data: [{ $sort: { eventDate: status === "past" ? -1 : 1, _id: 1 } }, { $skip: (page - 1) * limit }, { $limit: limit },
      { $project: { attendance: 0, googleMeetLink: 0, googleCalendarEventId: 0, calendarSyncStatus: 0, calendarRevision: 0, revision: 0, deletedAt: 0, __v: 0 } }],
    count: [{ $count: "total" }],
  } });
  const [result] = status === "going" ? await EventAttendance.aggregate(pipeline) : await Event.aggregate(pipeline);
  return { data: result.data, pagination: pagination(page, limit, result.count[0]?.total || 0) };
};

export const listAttendees = async (eventId: string, page = 1, limit = 20) => {
  assertEventId(eventId);
  const [data, total] = await Promise.all([
    EventAttendance.find({ event: eventId }).populate("user", "name surname email studentId")
      .sort({ requestedAt: 1, _id: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    EventAttendance.countDocuments({ event: eventId }),
  ]);
  return { data, pagination: pagination(page, limit, total) };
};

/** Count every registration for one authorized event, without loading guest records. */
export const getAttendanceCounts = async (eventId: string) => {
  assertEventId(eventId);
  const rows = await EventAttendance.aggregate<{ _id: string; count: number }>([
    { $match: { event: new Types.ObjectId(eventId) } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const counts = { pending: 0, approved: 0, rejected: 0, cancelled: 0 };
  for (const row of rows) {
    if (Object.prototype.hasOwnProperty.call(counts, row._id)) {
      counts[row._id as keyof typeof counts] = row.count;
    }
  }
  return counts;
};
