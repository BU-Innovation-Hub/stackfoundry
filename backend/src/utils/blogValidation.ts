/**
 * Blog Validation Rules
 * Express-validator rules for blog CRUD operations
 */

import { body, param, query } from "express-validator";
import { CATEGORIES } from "../models/blog.model";

// ============================================
// Validation Rules
// ============================================

export const createBlogValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 200 })
    .withMessage("Title cannot exceed 200 characters"),

  body("excerpt")
    .trim()
    .notEmpty()
    .withMessage("Excerpt is required")
    .isLength({ max: 500 })
    .withMessage("Excerpt cannot exceed 500 characters"),

  body("content")
    .trim()
    .notEmpty()
    .withMessage("Content is required")
    .isLength({ min: 100 })
    .withMessage("Content must be at least 100 characters"),

  body("category")
    .trim()
    .notEmpty()
    .withMessage("Category is required")
    .isIn([...CATEGORIES])
    .withMessage("Invalid category"),

  body("featuredImage")
    .optional()
    .trim()
    .isURL()
    .withMessage("Featured image must be a valid URL"),

  body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array"),

  body("tags.*")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Each tag cannot exceed 50 characters"),

  body("status")
    .optional()
    .isIn(["draft", "published", "archived"])
    .withMessage("Invalid status"),
];

export const updateBlogValidation = [
  param("id")
    .isMongoId()
    .withMessage("Invalid blog ID"),

  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Title cannot be empty")
    .isLength({ max: 200 })
    .withMessage("Title cannot exceed 200 characters"),

  body("excerpt")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Excerpt cannot be empty")
    .isLength({ max: 500 })
    .withMessage("Excerpt cannot exceed 500 characters"),

  body("content")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Content cannot be empty")
    .isLength({ min: 100 })
    .withMessage("Content must be at least 100 characters"),

  body("category")
    .optional()
    .trim()
    .isIn([...CATEGORIES])
    .withMessage("Invalid category"),

  body("featuredImage")
    .optional()
    .trim()
    .isURL()
    .withMessage("Featured image must be a valid URL"),

  body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array"),

  body("tags.*")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Each tag cannot exceed 50 characters"),

  body("status")
    .optional()
    .isIn(["draft", "published", "archived"])
    .withMessage("Invalid status"),
];

export const blogIdValidation = [
  param("id")
    .isMongoId()
    .withMessage("Invalid blog ID"),
];

export const blogSlugValidation = [
  param("slug")
    .trim()
    .notEmpty()
    .withMessage("Slug is required"),
];

export const listBlogsValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50"),

  query("category")
    .optional()
    .isIn([...CATEGORIES])
    .withMessage("Invalid category"),

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