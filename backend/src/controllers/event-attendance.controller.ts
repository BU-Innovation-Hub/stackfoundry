import { Request, Response, NextFunction } from "express";
import { RequestWithUser } from "../types";
import * as AttendanceService from "../services/event-attendance.service";
import Event from "../models/event.model";
import { ApiError } from "../middleware/errorHandler";

const currentUserId = (req: Request) => (req as RequestWithUser).user.id;

export const join = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attendance = await AttendanceService.joinEvent(req.params.id, currentUserId(req));
    const event = attendance.status === "approved" ? await Event.findById(req.params.id).select("googleMeetLink").lean() : null;
    res.status(201).json({ success: true, data: { ...attendance.toObject(), googleMeetLink: event?.googleMeetLink || null } });
  } catch (error) { next(error); }
};
export const cancel = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await AttendanceService.cancelAttendance(req.params.id, currentUserId(req)) }); } catch (error) { next(error); }
};
export const mine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attendance = await AttendanceService.getMyAttendance(req.params.id, currentUserId(req));
    const event = attendance?.status === "approved" ? await Event.findById(req.params.id).select("googleMeetLink").lean() : null;
    res.json({ success: true, data: attendance ? { ...attendance, googleMeetLink: event?.googleMeetLink || null } : null });
  } catch (error) { next(error); }
};
export const listMine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as "upcoming" | "going" | "past";
    if (!["upcoming", "going", "past"].includes(status)) throw new ApiError(400, "Invalid event status");
    res.json({ success: true, data: await AttendanceService.listMyEvents(currentUserId(req), status) });
  } catch (error) { next(error); }
};

const assertManager = async (req: Request) => {
  const event = await Event.findById(req.params.id).lean();
  if (!event) throw new ApiError(404, "Event not found");
  const user = (req as RequestWithUser).user;
  if (user.role === "mentor" && event.author.toString() !== user.id) throw new ApiError(403, "Mentors can only manage their own events");
  return event;
};
export const list = async (req: Request, res: Response, next: NextFunction) => {
  try { await assertManager(req); res.json({ success: true, data: await AttendanceService.listAttendees(req.params.id) }); } catch (error) { next(error); }
};
export const decide = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await assertManager(req);
    if (!event.requireApproval) throw new ApiError(400, "Approval is not required for this event");
    // decideAttendance owns the atomic transition and fires the approval
    // notification exactly once (only on the actual pending -> approved flip).
    const attendance = await AttendanceService.decideAttendance(req.params.id, req.params.attendanceId, req.body.decision);
    res.json({ success: true, data: attendance });
  } catch (error) { next(error); }
};
