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

import Event, { IEvent, EventStatus, EventType } from "../models/event.model";
import { ApiError } from "../middleware/errorHandler";
import { Types } from "mongoose";

// ============================================
// Types
// ============================================

export interface CreateEventData {
  title: string;
  description: string;
  date: string;
  time: string;
  eventDate: Date;
  type: EventType;
  image?: string;
  location?: string;
  registrationLink?: string;
  status?: EventStatus;
}

export interface UpdateEventData {
  title?: string;
  description?: string;
  date?: string;
  time?: string;
  eventDate?: Date;
  type?: EventType;
  image?: string;
  location?: string;
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
  const event = await Event.create({
    ...data,
    author: new Types.ObjectId(author.id),
    authorName: `${author.name} ${author.surname}`,
    // Set publishedAt if creating as published (also handled by pre-save middleware)
    publishedAt: data.status === "published" ? new Date() : undefined,
  });

  return event;
};

/**
 * Get event by ID (admin view - includes all statuses)
 */
export const getEventById = async (id: string): Promise<IEvent> => {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid event ID");
  }

  const event = await Event.findById(id).populate("author", "name surname email");

  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  return event;
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

  return event;
};

/**
 * Update event
 */
export const updateEvent = async (
  id: string,
  data: UpdateEventData
): Promise<IEvent> => {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid event ID");
  }

  const event = await Event.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true, runValidators: true }
  ).populate("author", "name surname email");

  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  return event;
};

/**
 * Delete event (hard delete)
 */
export const deleteEvent = async (id: string): Promise<void> => {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid event ID");
  }

  const event = await Event.findByIdAndDelete(id);

  if (!event) {
    throw new ApiError(404, "Event not found");
  }
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
  } = options;

  const skip = (page - 1) * limit;

  // Build query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = {};

  // Non-admins only see published events
  if (!isAdmin) {
    query.status = "published";
  } else if (status) {
    query.status = status;
  }

  if (type) {
    query.type = type;
  }

  if (authorId) {
    query.author = new Types.ObjectId(authorId);
  }

  // Text search
  if (search) {
    query.$text = { $search: search };
  }

  // Execute query with pagination
  const [events, total] = await Promise.all([
    Event.find(query)
      .populate("author", "name surname")
      .sort(isAdmin ? { updatedAt: -1 } : { eventDate: 1 }) // Upcoming events first for public
      .skip(skip)
      .limit(limit)
      .lean(),
    Event.countDocuments(query),
  ]);

  const pages = Math.ceil(total / limit);

  return {
    events: events as IEvent[],
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
 * Get featured/upcoming events for homepage (limited, no pagination)
 */
export const getFeaturedEvents = async (limit: number = 4): Promise<IEvent[]> => {
  const events = await Event.find({ 
    status: "published",
    eventDate: { $gte: new Date() } // Only future events
  })
    .sort({ eventDate: 1 }) // Soonest events first
    .limit(limit)
    .lean();

  return events as IEvent[];
};

/**
 * Get events by type (public)
 */
export const getEventsByType = async (
  type: EventType,
  limit: number = 10
): Promise<IEvent[]> => {
  const events = await Event.find({ status: "published", type })
    .sort({ eventDate: 1 })
    .limit(limit)
    .lean();

  return events as IEvent[];
};

/**
 * Get event statistics (admin)
 */
export const getEventStats = async (): Promise<{
  total: number;
  published: number;
  drafts: number;
  archived: number;
  totalViews: number;
  upcoming: number;
  byType: Record<string, number>;
}> => {
  const [counts, viewsResult, typeResult, upcomingCount] = await Promise.all([
    Event.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),
    Event.aggregate([
      {
        $group: {
          _id: null,
          totalViews: { $sum: "$views" },
        },
      },
    ]),
    Event.aggregate([
      { $match: { status: "published" } },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
        },
      },
    ]),
    Event.countDocuments({ 
      status: "published", 
      eventDate: { $gte: new Date() } 
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
