/**
 * Event Routes
 * 
 * Public Routes (no auth required):
 * GET  /api/v1/events              - List published events
 * GET  /api/v1/events/featured     - Get featured/upcoming events
 * GET  /api/v1/events/slug/:slug   - Get event by slug
 * 
 * Admin Routes (auth + admin role required):
 * POST   /api/v1/events            - Create event
 * GET    /api/v1/events/admin      - List all events (admin view)
 * GET    /api/v1/events/stats      - Get event statistics
 * GET    /api/v1/events/:id        - Get event by ID
 * PUT    /api/v1/events/:id        - Update event
 * DELETE /api/v1/events/:id        - Delete event
 * 
 * IMPORTANT: Static routes must be defined before parameterized routes
 * to prevent route conflicts (e.g., /featured before /:id)
 */

import { Router } from "express";
import * as EventController from "../../controllers/event.controller";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  createEventValidation,
  updateEventValidation,
  eventIdValidation,
  eventSlugValidation,
  listEventsValidation,
} from "../../utils/eventValidation";

const router = Router();

// ============================================
// Static Routes First (to avoid /:id conflicts)
// ============================================

/**
 * @route   POST /api/v1/events
 * @desc    Create a new event
 * @access  Private (admin only)
 */
router.post(
  "/",
  requireAuth,
  requireRole(["innovation_hub_admin"]),
  createEventValidation,
  EventController.createEvent
);

/**
 * @route   GET /api/v1/events
 * @desc    List published events with pagination
 * @access  Public
 */
router.get("/", listEventsValidation, EventController.listEventsPublic);

/**
 * @route   GET /api/v1/events/admin
 * @desc    List all events (admin view with all statuses)
 * @access  Private (admin only)
 */
router.get(
  "/admin",
  requireAuth,
  requireRole(["innovation_hub_admin"]),
  listEventsValidation,
  EventController.listEventsAdmin
);

/**
 * @route   GET /api/v1/events/stats
 * @desc    Get event statistics
 * @access  Private (admin only)
 */
router.get(
  "/stats",
  requireAuth,
  requireRole(["innovation_hub_admin"]),
  EventController.getEventStats
);

/**
 * @route   GET /api/v1/events/featured
 * @desc    Get featured/upcoming events for homepage
 * @access  Public
 */
router.get("/featured", EventController.getFeaturedEvents);

/**
 * @route   GET /api/v1/events/slug/:slug
 * @desc    Get a single event by slug
 * @access  Public
 */
router.get("/slug/:slug", eventSlugValidation, EventController.getEventBySlug);

// ============================================
// Parameterized Routes (after static routes)
// ============================================

/**
 * @route   GET /api/v1/events/:id
 * @desc    Get event by ID
 * @access  Private (admin only)
 */
router.get(
  "/:id",
  requireAuth,
  requireRole(["innovation_hub_admin"]),
  eventIdValidation,
  EventController.getEventById
);

/**
 * @route   PUT /api/v1/events/:id
 * @desc    Update an event
 * @access  Private (admin only)
 */
router.put(
  "/:id",
  requireAuth,
  requireRole(["innovation_hub_admin"]),
  updateEventValidation,
  EventController.updateEvent
);

/**
 * @route   DELETE /api/v1/events/:id
 * @desc    Delete an event
 * @access  Private (admin only)
 */
router.delete(
  "/:id",
  requireAuth,
  requireRole(["innovation_hub_admin"]),
  eventIdValidation,
  EventController.deleteEvent
);

export default router;
