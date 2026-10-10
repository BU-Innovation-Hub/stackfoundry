import { ApiError } from "../middleware/errorHandler";
import { Types } from "mongoose";

export const PUBLIC_EVENT_PROJECTION = "-googleMeetLink -googleCalendarEventId -calendarSyncStatus -calendarRevision -deletedAt -revision -__v";
export const assertEventId = (id: string) => {
  if (!Types.ObjectId.isValid(id)) throw new ApiError(400, "Invalid ID");
};

export type EventManagerActor = { id: string; role: string; roleNames?: string[] };
export const canManageEvent = (authorId: unknown, actor: EventManagerActor) => {
  const roles = new Set([actor.role, ...(actor.roleNames || [])]);
  return roles.has("innovation_hub_admin") || (roles.has("mentor") && String(authorId) === actor.id);
};
export const assertEventManager = (authorId: unknown, actor: EventManagerActor) => {
  if (!canManageEvent(authorId, actor)) throw new ApiError(403, "You do not have permission to manage this event", { code: "EVENT_MANAGEMENT_FORBIDDEN" });
};

export const validScheduleMongo = () => ({
  endDate: { $type: "date" },
  $expr: { $gt: ["$endDate", { $ifNull: ["$startDate", "$eventDate"] }] },
});
export const notPastScheduleMongo = (now = new Date()) => ({ $or: [
  { endDate: { $exists: false } }, { endDate: null },
  { $expr: { $lte: ["$endDate", { $ifNull: ["$startDate", "$eventDate"] }] } },
  { endDate: { $gt: now } },
] });

export const parseEventPage = (query: { page?: unknown; limit?: unknown }) => {
  if ([query.page, query.limit].some(value => value !== undefined && typeof value !== "string" && typeof value !== "number")) throw new ApiError(400, "Invalid pagination");
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 20 : Number(query.limit);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50 || !Number.isSafeInteger((page - 1) * limit)) {
    throw new ApiError(400, "page must be positive and limit must be between 1 and 50");
  }
  return { page, limit };
};
export const pagination = (page: number, limit: number, total: number) => ({
  page, limit, total, pages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1,
});
