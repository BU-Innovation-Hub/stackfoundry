/**
 * Event Controller
 * HTTP handlers for event endpoints
 * 
 * Admin Routes:
 * - POST   /api/v1/events          - Create event
 * - GET    /api/v1/events/admin    - List all events (admin view)
 * - GET    /api/v1/events/stats    - Get event statistics
 * - GET    /api/v1/events/:id      - Get event by ID
 * - PUT    /api/v1/events/:id      - Update event
 * - DELETE /api/v1/events/:id      - Delete event
 * 
 * Public Routes:
 * - GET    /api/v1/events          - List published events
 * - GET    /api/v1/events/featured - Get featured/upcoming events
 * - GET    /api/v1/events/slug/:slug - Get event by slug
 */

import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import * as EventService from "../services/event.service";
import { ApiError } from "../middleware/errorHandler";
import { RequestWithUser } from "../types";
import { EVENT_TYPES, EventType, EventStatus } from "../models/event.model";

// ============================================
// Constants
// ============================================

const VALID_EVENT_STATUSES: EventStatus[] = ["draft", "published", "archived"];

// ============================================
// Helpers
// ============================================

const handleValidationErrors = (req: Request): void => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const messages = errors.array().map((err) => {
            if ("msg" in err) return err.msg;
            return "Validation error";
        });
        throw new ApiError(400, "Validation failed", messages);
    }
};

/**
 * Validate and parse event type from query parameter
 * Returns undefined if not provided, throws ApiError if invalid
 */
const parseEventType = (type: unknown): EventType | undefined => {
    if (type === undefined || type === null || type === "") {
        return undefined;
    }
    const typeStr = String(type);
    if ((EVENT_TYPES as readonly string[]).includes(typeStr)) {
        return typeStr as EventType;
    }
    throw new ApiError(400, `Invalid event type: ${typeStr}. Valid types are: ${EVENT_TYPES.join(", ")}`);
};

/**
 * Validate and parse event status from query parameter
 * Returns undefined if not provided, throws ApiError if invalid
 */
const parseEventStatus = (status: unknown): EventStatus | undefined => {
    if (status === undefined || status === null || status === "") {
        return undefined;
    }
    const statusStr = String(status);
    if (VALID_EVENT_STATUSES.includes(statusStr as EventStatus)) {
        return statusStr as EventStatus;
    }
    throw new ApiError(400, `Invalid event status: ${statusStr}. Valid statuses are: ${VALID_EVENT_STATUSES.join(", ")}`);
};

// ============================================
// Admin Controllers
// ============================================

/**
 * Create a new event
 * POST /api/v1/events
 */
export const createEvent = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        handleValidationErrors(req);

        const user = (req as RequestWithUser).user;
        const {
            title,
            description,
            date,
            time,
            eventDate,
            type,
            image,
            location,
            registrationLink,
            status
        } = req.body;

        const parsedEventDate = new Date(eventDate);
        if (isNaN(parsedEventDate.getTime())) {
            throw new ApiError(400, "Invalid eventDate format");
        }

        const event = await EventService.createEvent(
            {
                title,
                description,
                date,
                time,
                eventDate: new Date(eventDate),
                type,
                image,
                location,
                registrationLink,
                status
            },
            { id: user.id, name: user.name, surname: user.surname }
        );

        res.status(201).json({
            success: true,
            message: "Event created successfully",
            data: event,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get event by ID (admin)
 * GET /api/v1/events/:id
 */
export const getEventById = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        handleValidationErrors(req);

        const event = await EventService.getEventById(req.params.id);

        res.status(200).json({
            success: true,
            data: event,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update event
 * PUT /api/v1/events/:id
 */
export const updateEvent = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        handleValidationErrors(req);

        const {
            title,
            description,
            date,
            time,
            eventDate,
            type,
            image,
            location,
            registrationLink,
            status
        } = req.body;

        const updateData: EventService.UpdateEventData = {
            title,
            description,
            date,
            time,
            type,
            image,
            location,
            registrationLink,
            status,
        };

        // Only include eventDate if provided
        if (eventDate) {
            updateData.eventDate = new Date(eventDate);
        }

        const event = await EventService.updateEvent(req.params.id, updateData);

        res.status(200).json({
            success: true,
            message: "Event updated successfully",
            data: event,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete event
 * DELETE /api/v1/events/:id
 */
export const deleteEvent = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        handleValidationErrors(req);

        await EventService.deleteEvent(req.params.id);

        res.status(200).json({
            success: true,
            message: "Event deleted successfully",
        });
    } catch (error) {
        next(error);
    }
};

/**
 * List all events (admin view)
 * GET /api/v1/events/admin
 */
export const listEventsAdmin = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        handleValidationErrors(req);

        const { page, limit, type, status, search } = req.query;

        // Validate type and status against valid enum values
        const validatedType = parseEventType(type);
        const validatedStatus = parseEventStatus(status);

        const result = await EventService.listEvents(
            {
                page: page ? parseInt(page as string) : undefined,
                limit: limit ? parseInt(limit as string) : undefined,
                type: validatedType,
                status: validatedStatus,
                search: search as string,
            },
            true // isAdmin
        );

        res.status(200).json({
            success: true,
            data: result.events,
            pagination: result.pagination,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get event statistics
 * GET /api/v1/events/stats
 */
export const getEventStats = async (
    _req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const stats = await EventService.getEventStats();

        res.status(200).json({
            success: true,
            data: stats,
        });
    } catch (error) {
        next(error);
    }
};

// ============================================
// Public Controllers
// ============================================

/**
 * List published events (public)
 * GET /api/v1/events
 */
export const listEventsPublic = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        handleValidationErrors(req);

        const { page, limit, type, search } = req.query;

        // Validate type against valid enum values
        const validatedType = parseEventType(type);

        const result = await EventService.listEvents(
            {
                page: page ? parseInt(page as string) : undefined,
                limit: limit ? parseInt(limit as string) : undefined,
                type: validatedType,
                search: search as string,
            },
            false // not admin
        );

        res.status(200).json({
            success: true,
            data: result.events,
            pagination: result.pagination,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get featured/upcoming events for homepage
 * GET /api/v1/events/featured
 */
export const getFeaturedEvents = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const DEFAULT_LIMIT = 4;
        const MAX_LIMIT = 10;

        let limit = DEFAULT_LIMIT;
        if (req.query.limit) {
            const parsed = parseInt(req.query.limit as string, 10);
            if (!Number.isNaN(parsed) && parsed > 0 && parsed <= MAX_LIMIT) {
                limit = parsed;
            }
        }

        const events = await EventService.getFeaturedEvents(limit);

        res.status(200).json({
            success: true,
            data: events,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get event by slug (public)
 * GET /api/v1/events/slug/:slug
 */
export const getEventBySlug = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        handleValidationErrors(req);

        const event = await EventService.getEventBySlug(req.params.slug);

        res.status(200).json({
            success: true,
            data: event,
        });
    } catch (error) {
        next(error);
    }
};
