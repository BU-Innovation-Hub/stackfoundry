/**
 * Course / LMS Validation Rules
 * Express-validator rules for courses, levels, topics, materials,
 * enrollments, and progress endpoints.
 *
 * Mirrors the patterns used in blogValidation.ts / eventValidation.ts
 */

import { body, param, query } from "express-validator";

// ============================================
// Shared helpers
// ============================================

const mongoIdParam = (fieldName: string, requiredMessage?: string) => {
  let chain = param(fieldName);
  if (requiredMessage) {
    chain = chain.notEmpty().withMessage(requiredMessage);
  }
  return chain.isMongoId().withMessage("Invalid ID format");
};

const mongoIdBody = (fieldName: string, requiredMessage?: string) => {
  let chain = body(fieldName);
  if (requiredMessage) {
    chain = chain.notEmpty().withMessage(requiredMessage);
  }
  return chain.isMongoId().withMessage("Invalid ID format");
};

const mongoIdQuery = (fieldName: string, requiredMessage?: string) => {
  let chain = query(fieldName);
  if (requiredMessage) {
    chain = chain.notEmpty().withMessage(requiredMessage);
  }
  return chain.isMongoId().withMessage("Invalid ID format");
};

// ============================================
// Course Validations
// ============================================

export const createCourseValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 200 })
    .withMessage("Title cannot exceed 200 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),
];

export const updateCourseValidation = [
  mongoIdParam("id", "Course ID is required"),

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
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),
];

export const courseIdValidation = [
  mongoIdParam("id", "Course ID is required"),
];

export const courseIdParamValidation = [
  mongoIdParam("courseId", "Course ID is required"),
];

// ============================================
// Level Validations
// ============================================

export const createLevelValidation = [
  mongoIdParam("courseId", "Course ID is required"),

  body("levelNumber")
    .notEmpty()
    .withMessage("Level number is required")
    .isInt({ min: 1 })
    .withMessage("Level number must be a positive integer"),

  body("name")
    .trim()
    .notEmpty()
    .withMessage("Level name is required")
    .isLength({ max: 200 })
    .withMessage("Level name cannot exceed 200 characters"),

  body("lockedByDefault")
    .optional()
    .isBoolean()
    .withMessage("lockedByDefault must be a boolean"),
];

export const updateLevelValidation = [
  mongoIdParam("id", "Level ID is required"),

  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Level name cannot be empty")
    .isLength({ max: 200 })
    .withMessage("Level name cannot exceed 200 characters"),

  body("levelNumber")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Level number must be a positive integer"),

  body("lockedByDefault")
    .optional()
    .isBoolean()
    .withMessage("lockedByDefault must be a boolean"),
];

export const levelIdValidation = [
  mongoIdParam("id", "Level ID is required"),
];

export const levelIdParamValidation = [
  mongoIdParam("levelId", "Level ID is required"),
];

// ============================================
// Topic Validations
// ============================================

export const createTopicValidation = [
  mongoIdParam("levelId", "Level ID is required"),

  body("name")
    .trim()
    .notEmpty()
    .withMessage("Topic name is required")
    .isLength({ max: 200 })
    .withMessage("Topic name cannot exceed 200 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Topic description cannot exceed 1000 characters"),
];

export const updateTopicValidation = [
  mongoIdParam("id", "Topic ID is required"),

  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Topic name cannot be empty")
    .isLength({ max: 200 })
    .withMessage("Topic name cannot exceed 200 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Topic description cannot exceed 1000 characters"),
];

export const topicIdValidation = [
  mongoIdParam("id", "Topic ID is required"),
];

// ============================================
// Material Validations
// ============================================

export const createVideoMaterialValidation = [
  body("youtubeUrl")
    .trim()
    .notEmpty()
    .withMessage("YouTube URL is required")
    .isLength({ max: 500 })
    .withMessage("YouTube URL cannot exceed 500 characters"),

  body("levelId")
    .notEmpty()
    .withMessage("Level ID is required")
    .isMongoId()
    .withMessage("Level ID must be a valid ID"),

  body("topicId")
    .optional()
    .isMongoId()
    .withMessage("Topic ID must be a valid ID"),

  body("title")
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage("Title cannot exceed 300 characters"),
];

export const uploadPdfMaterialValidation = [
  body("levelId")
    .notEmpty()
    .withMessage("Level ID is required")
    .isMongoId()
    .withMessage("Level ID must be a valid ID"),

  body("topicId")
    .optional()
    .isMongoId()
    .withMessage("Topic ID must be a valid ID"),

  body("title")
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage("Title cannot exceed 300 characters"),
];

export const materialIdValidation = [
  mongoIdParam("id", "Material ID is required"),
];

export const getMaterialsValidation = [
  query("levelId")
    .notEmpty()
    .withMessage("levelId query parameter is required")
    .isMongoId()
    .withMessage("levelId must be a valid ID"),
];

// ============================================
// Enrollment Validations
// ============================================

export const enrollValidation = [
  body("courseId")
    .notEmpty()
    .withMessage("Course ID is required")
    .isMongoId()
    .withMessage("Course ID must be a valid ID"),
];

export const userEnrollmentsValidation = [
  mongoIdParam("userId", "User ID is required"),
];

// ============================================
// Progress Validations
// ============================================

export const updateProgressValidation = [
  body("materialId")
    .notEmpty()
    .withMessage("Material ID is required")
    .isMongoId()
    .withMessage("Material ID must be a valid ID"),

  body("watchedSeconds")
    .notEmpty()
    .withMessage("watchedSeconds is required")
    .isFloat({ min: 0 })
    .withMessage("watchedSeconds must be a non-negative number"),
];

export const getProgressValidation = [
  query("courseId")
    .notEmpty()
    .withMessage("courseId query parameter is required")
    .isMongoId()
    .withMessage("courseId must be a valid ID"),

  query("user")
    .optional()
    .isMongoId()
    .withMessage("user must be a valid ID"),
];
