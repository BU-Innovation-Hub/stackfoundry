/**
 * Event Validation Rules
 * Express-validator rules for event CRUD operations
 */

import { body, param, query } from "express-validator";
import { EVENT_TYPES } from "../models/event.model";

// ============================================
// Validation Rules
// ============================================

export const createEventValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 200 })
    .withMessage("Title cannot exceed 200 characters"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),

  body("date")
    .trim()
    .notEmpty()
    .withMessage("Date is required"),

  body("time")
    .trim()
    .notEmpty()
    .withMessage("Time is required"),

  body("eventDate")
    .notEmpty()
    .withMessage("Event date is required")
    .isISO8601()
    .withMessage("Event date must be a valid date"),

  body("type")
    .trim()
    .notEmpty()
    .withMessage("Event type is required")
    .isIn([...EVENT_TYPES])
    .withMessage("Invalid event type"),

  body("image")
    .optional()
    .trim()
    .isURL()
    .withMessage("Image must be a valid URL"),

  body("location")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Location cannot exceed 500 characters"),

  body("registrationLink")
    .optional()
    .trim()
    .isURL()
    .withMessage("Registration link must be a valid URL"),

  body("status")
    .optional()
    .isIn(["draft", "published", "archived"])
    .withMessage("Invalid status"),
];

export const updateEventValidation = [
  param("id")
    .isMongoId()
    .withMessage("Invalid event ID"),

  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Title cannot be empty")
    .isLength({ max: 200 })
    .withMessage("Title cannot exceed 200 characters"),

  body("description")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Description cannot be empty")
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),

  body("date")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Date cannot be empty"),

  body("time")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Time cannot be empty"),

  body("eventDate")
    .optional()
    .isISO8601()
    .withMessage("Event date must be a valid date"),

  body("type")
    .optional()
    .trim()
    .isIn([...EVENT_TYPES])
    .withMessage("Invalid event type"),

  body("image")
    .optional()
    .trim()
    .isURL()
    .withMessage("Image must be a valid URL"),

  body("location")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Location cannot exceed 500 characters"),

  body("registrationLink")
    .optional()
    .trim()
    .isURL()
    .withMessage("Registration link must be a valid URL"),

  body("status")
    .optional()
    .isIn(["draft", "published", "archived"])
    .withMessage("Invalid status"),
];

export const eventIdValidation = [
  param("id")
    .isMongoId()
    .withMessage("Invalid event ID"),
];

export const eventSlugValidation = [
  param("slug")
    .trim()
    .notEmpty()
    .withMessage("Slug is required"),
];

export const listEventsValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50"),

  query("type")
    .optional()
    .isIn([...EVENT_TYPES])
    .withMessage("Invalid event type"),

  query("status")
    .optional()
    .isIn(["draft", "published", "archived"])
    .withMessage("Invalid status"),

  query("search")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Search query cannot exceed 100 characters"),
];
