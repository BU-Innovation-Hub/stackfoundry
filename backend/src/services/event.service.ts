/**
 * Event Service
 * Business logic for event operations
 * 
 * Responsibilities:
 * - CRUD operations for events
 * - Pagination and filtering
 * - Search functionality
 * - View tracking
 */

import Event, { IEvent, EventStatus, EventType, EventLocationType } from "../models/event.model";
import { ApiError } from "../middleware/errorHandler";
import { Types } from "mongoose";
import { eventTransaction } from "./event-transaction.service";
import { PUBLIC_EVENT_PROJECTION, validScheduleMongo, notPastScheduleMongo } from "../utils/event-contract";
const normalizeSchedule = (data: UpdateEventData, before?: IEvent): UpdateEventData => {
    const patch = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as UpdateEventData;
    const start = new Date(patch.startDate || patch.eventDate || before?.startDate || before?.eventDate || "");
    const endValue = patch.endDate || before?.endDate;
    const end = endValue ? new Date(endValue) : null;
    const priorStart = before ? new Date(before.startDate || before.eventDate).getTime() : NaN;
    const scheduleChanged = !before || (patch.startDate !== undefined && new Date(patch.startDate).getTime() !== priorStart) || (patch.eventDate !== undefined && new Date(patch.eventDate).getTime() !== priorStart) || (patch.endDate !== undefined && new Date(patch.endDate).getTime() !== new Date(before.endDate || "").getTime());
    if (Number.isNaN(start.getTime()) || (scheduleChanged && (!end || Number.isNaN(end.getTime()) || end <= start))) throw new ApiError(400, "Set an end date and time later than the event start");
    if (patch.capacity != null && (!Number.isInteger(patch.capacity) || patch.capacity < 1 || patch.capacity < (before?.attendeeCount || 0))) throw new ApiError(409, "Capacity cannot be below existing reservations");
    patch.startDate = start; patch.eventDate = start;
    if (end) patch.endDate = end;
    if (!patch.date && (data.startDate || data.eventDate)) patch.date = start.toLocaleDateString("en-GB", { timeZone: "UTC" });
    if (!patch.time && end && (data.startDate || data.eventDate || data.endDate)) patch.time = start.toISOString().slice(11, 16) + " - " + end.toISOString().slice(11, 16) + " UTC";
    return patch;
};

// ============================================
// Types
// ============================================

export interface CreateEventData {
    title: string;
    description: string;
    date: string;
    time: string;
    eventDate: Date;
    startDate?: Date;
    endDate?: Date;
    type: EventType;
    image?: string;
    locationType?: EventLocationType;
    requireApproval?: boolean;
    capacity?: number | null;
    googleCalendarEventId?: string | null;
    googleMeetLink?: string | null;
    registrationLink?: string;
    status?: EventStatus;
}

export interface UpdateEventData {
    title?: string;
    description?: string;
    date?: string;
    time?: string;
    eventDate?: Date;
    startDate?: Date;
    endDate?: Date;
    type?: EventType;
    image?: string;
    locationType?: EventLocationType;
    requireApproval?: boolean;
    capacity?: number | null;
    googleCalendarEventId?: string | null;
    googleMeetLink?: string | null;
    registrationLink?: string;
    status?: EventStatus;
}

export interface EventListOptions {
    page?: number;
    limit?: number;
    type?: EventType;
    status?: EventStatus;
    search?: string;
    authorId?: string;
    temporal?: "current" | "past";
}

export interface EventListResult {
    events: IEvent[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

export interface AuthorInfo {
    id: string;
    name: string;
    surname: string;
}

const normalizeLegacyDates = <T extends Partial<IEvent>>(event: T): T => {
    if (!event.startDate) {
        const legacyDate = event.eventDate ? new Date(event.eventDate) : event.date ? new Date(event.date) : undefined;
        if (legacyDate && !Number.isNaN(legacyDate.getTime())) {
            event.eventDate = legacyDate;
            event.startDate = legacyDate;
        }
    }
    return event;
};

// ============================================
// Service Functions
// ============================================

/**
 * Create a new event
 */
export const createEvent = async (
    data: CreateEventData,
    author: AuthorInfo
): Promise<IEvent> => {
    // Validate author.id before constructing ObjectId to prevent BSONError
    if (!Types.ObjectId.isValid(author.id)) {
        throw new ApiError(400, "Invalid author ID");
    }

    return eventTransaction(async session => {
        const schedule = normalizeSchedule(data);
        if (!schedule.endDate) throw new ApiError(400, "Set an end date and time later than the event start");
        const event = new Event({ ...data, ...schedule, author: new Types.ObjectId(author.id),
            authorName: `${author.name} ${author.surname}`, revision: 1 });
        await event.save({ session });
        return event;
    });
};

/**
 * Get event by ID (admin view - includes all statuses)
 */
export const getEventById = async (id: string): Promise<IEvent> => {
    if (!Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid event ID");
    }

    const event = await Event.findOne({ _id: id, deletedAt: null }).populate("author", "name surname email");

    if (!event) {
        throw new ApiError(404, "Event not found");
    }

    return normalizeLegacyDates(event);
};

/**
 * Get event by slug (public view - only published)
 */
export const getEventBySlug = async (slug: string): Promise<IEvent> => {
    const event = await Event.findBySlug(slug);

    if (!event) {
        throw new ApiError(404, "Event not found");
    }

    // Increment views asynchronously (fire-and-forget)
    Event.incrementViews(event._id.toString()).catch(console.error);

    const publicEvent = normalizeLegacyDates(event);
    delete publicEvent.googleMeetLink;
    delete publicEvent.googleCalendarEventId;
    delete (publicEvent as Partial<IEvent>).calendarSyncStatus;
    delete (publicEvent as Partial<IEvent>).revision;
    delete publicEvent.deletedAt;
    return publicEvent;
};

/**
 * Update event
 */
export const updateEvent = async (
    id: string,
    data: UpdateEventData,
    expectedRevision?: number
): Promise<IEvent> => {
    if (!Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid event ID");
    }

    return eventTransaction(async session => {
        const event = await Event.findOne({ _id: id, deletedAt: null }).session(session);
        if (!event) throw new ApiError(404, "Event not found");
        if (expectedRevision !== undefined && (event.revision || 0) !== expectedRevision) throw new ApiError(409, "Event changed; refresh before saving");
        const patch = normalizeSchedule(data, event);
        Object.assign(event, patch);
        event.revision = (event.revision || 0) + 1;
        await event.save({ session });
        await event.populate("author", "name surname email");
        return event;
    });
};

/**
 * Delete event (hard delete)
 */
export const deleteEvent = async (id: string): Promise<void> => {
    if (!Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid event ID");
    }

    await eventTransaction(async session => {
        const event = await Event.findById(id).session(session);
        if (!event) throw new ApiError(404, "Event not found");
        if (event.deletedAt) return;
        event.deletedAt = new Date();
        event.revision = (event.revision || 0) + 1;
        event.attendeeCount = 0;
        await event.save({ session });
    });
};

/**
 * List events with pagination and filtering
 * Admin view includes all statuses, public view only published
 */
export const listEvents = async (
    options: EventListOptions,
    isAdmin: boolean = false
): Promise<EventListResult> => {
    const {
        page = 1,
        limit = 10,
        type,
        status,
        search,
        authorId,
        temporal,
    } = options;

    const skip = (page - 1) * limit;

    // Build query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { deletedAt: null };
    const now = new Date();
    if (temporal === "past") query.$and = [validScheduleMongo(), { endDate: { $lte: now } }];
    else if (temporal === "current") query.$and = [notPastScheduleMongo(now)];

    // Non-admins see published events, plus archived events that already
    // ended — so past events remain visible in public listings after the
    // automatic archive sweep runs.
    if (!isAdmin) {
        query.$or = [
            { status: "published" },
            { status: "archived", ...validScheduleMongo(), endDate: { $type: "date", $lte: now } },
        ];
    } else if (status) {
        query.status = status;
    }

    if (type) {
        query.type = type;
    }

    if (authorId) {
        if (!Types.ObjectId.isValid(authorId)) {
            throw new ApiError(400, "Invalid author ID");
        }
        query.author = new Types.ObjectId(authorId);
    }

    // Text search
    if (search) {
        query.$text = { $search: search };
    }

    // Execute query with pagination
    const [events, total] = await Promise.all([
        Event.find(query)
            .select(isAdmin ? "" : PUBLIC_EVENT_PROJECTION)
            .populate("author", "name surname")
            .sort(isAdmin ? { updatedAt: -1 } : { eventDate: 1 }) // Upcoming events first for public
            .skip(skip)
            .limit(limit)
            .lean(),
        Event.countDocuments(query),
    ]);

    const pages = Math.ceil(total / limit);

    return {
        events: (events as IEvent[]).map(normalizeLegacyDates),
        pagination: {
            page,
            limit,
            total,
            pages,
            hasNext: page < pages,
            hasPrev: page > 1,
        },
    };
};

/**
 * Archive events whose date passed more than a day ago (drafts and
 * published alike). Idempotent and indexed on {status, eventDate}.
 * Returns the number of events that changed.
 */
export const archiveStaleEvents = async (): Promise<number> => {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await Event.updateMany(
        { deletedAt: null, status: { $ne: "archived" }, ...validScheduleMongo(), endDate: { $type: "date", $lte: cutoff } },
        { $set: { status: "archived" } }
    );
    return result.modifiedCount ?? 0;
};

/**
 * Get featured/upcoming events for homepage (limited, no pagination)
 */
export const getFeaturedEvents = async (limit: number = 4): Promise<IEvent[]> => {
    const events = await Event.find({
        deletedAt: null,
        status: "published",
        ...notPastScheduleMongo() // Ongoing, future, and legacy schedules that need correction
    })
        .sort({ eventDate: 1 }) // Soonest events first
        .limit(limit)
        .select(PUBLIC_EVENT_PROJECTION)
        .lean();

    return events.map(normalizeLegacyDates) as IEvent[];
};

/**
 * Get events by type (public)
 */
export const getEventsByType = async (
    type: EventType,
    limit: number = 10
): Promise<IEvent[]> => {
    const events = await Event.find({ deletedAt: null, status: "published", type })
        .sort({ eventDate: 1 })
        .limit(limit)
        .select(PUBLIC_EVENT_PROJECTION)
        .lean();

    return events.map(normalizeLegacyDates) as IEvent[];
};

/**
 * Get event statistics (admin)
 */
export const getEventStats = async (authorId?: string): Promise<{
    total: number;
    published: number;
    drafts: number;
    archived: number;
    totalViews: number;
    upcoming: number;
    byType: Record<string, number>;
}> => {
    const scope = { deletedAt: null, ...(authorId ? { author: new Types.ObjectId(authorId) } : {}) };
    const [counts, viewsResult, typeResult, upcomingCount] = await Promise.all([
        Event.aggregate([
            { $match: scope },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                },
            },
        ]),
        Event.aggregate([
            { $match: scope },
            {
                $group: {
                    _id: null,
                    totalViews: { $sum: "$views" },
                },
            },
        ]),
        Event.aggregate([
            { $match: { ...scope, status: "published" } },
            {
                $group: {
                    _id: "$type",
                    count: { $sum: 1 },
                },
            },
        ]),
        Event.countDocuments({
            ...scope,
            status: "published",
            ...notPastScheduleMongo()
        }),
    ]);

    const statusCounts = counts.reduce(
        (acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
        },
        { draft: 0, published: 0, archived: 0 } as Record<string, number>
    );

    const byType = typeResult.reduce(
        (acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
        },
        {} as Record<string, number>
    );

    return {
        total: statusCounts.draft + statusCounts.published + statusCounts.archived,
        published: statusCounts.published,
        drafts: statusCounts.draft,
        archived: statusCounts.archived,
        totalViews: viewsResult[0]?.totalViews || 0,
        upcoming: upcomingCount,
        byType,
    };
};
