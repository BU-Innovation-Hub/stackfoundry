/**
 * Validation Utilities
 * Input validation using express-validator
 */

import { body, ValidationChain } from "express-validator";

// ============================================
// Auth Validation Rules
// ============================================

/**
 * Validation rules for user registration
 */
export const registerValidation: ValidationChain[] = [
  body("studentId")
    .trim()
    .notEmpty()
    .withMessage("Student ID is required")
    .isLength({ min: 3, max: 30 })
    .withMessage("Student ID must be between 3 and 30 characters")
    .matches(/^[A-Za-z0-9-]+$/)
    .withMessage("Student ID can only contain letters, numbers, and hyphens"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail()
    .isLength({ max: 100 })
    .withMessage("Email cannot exceed 100 characters"),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .isLength({ max: 128 })
    .withMessage("Password cannot exceed 128 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one lowercase letter, one uppercase letter, and one number"
    ),

  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters")
    .matches(/^[A-Za-z\s-]+$/)
    .withMessage("Name can only contain letters, spaces, and hyphens"),

  body("surname")
    .trim()
    .notEmpty()
    .withMessage("Surname is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Surname must be between 2 and 50 characters")
    .matches(/^[A-Za-z\s'-]+$/)
    .withMessage("Surname can only contain letters, spaces, and hyphens"),
];

/**
 * Validation rules for login
 */
export const loginValidation: ValidationChain[] = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required"),
];
