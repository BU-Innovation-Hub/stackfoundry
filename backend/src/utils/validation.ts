/**
 * Validation Utilities
 * Input validation using express-validator
 */

import { body, param, ValidationChain } from "express-validator";
import mongoose from "mongoose";

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

// ============================================
// Shared Password Strength Rules
// ============================================

const passwordStrengthRules = (field: string): ValidationChain =>
  body(field)
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .isLength({ max: 128 })
    .withMessage("Password cannot exceed 128 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one lowercase letter, one uppercase letter, and one number"
    );

// ============================================
// Param Validation
// ============================================

/**
 * Validate that a route param is a valid MongoDB ObjectId
 */
export const objectIdParam = (paramName: string = "id"): ValidationChain =>
  param(paramName)
    .notEmpty()
    .withMessage(`${paramName} is required`)
    .custom((value: string) => mongoose.Types.ObjectId.isValid(value))
    .withMessage(`${paramName} must be a valid ID`);

// ============================================
// Admin Validation Rules
// ============================================

/**
 * Validation rules for admin creating a new user
 */
export const adminCreateUserValidation: ValidationChain[] = [
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

  passwordStrengthRules("password"),

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

  body("role")
    .trim()
    .notEmpty()
    .withMessage("Role is required")
    .isIn(["student", "member", "instructor", "admin"])
    .withMessage("Role must be one of: student, member, instructor, admin"),
];

/**
 * Validation rules for updating a user's role
 */
export const updateUserRoleValidation: ValidationChain[] = [
  body("role")
    .trim()
    .notEmpty()
    .withMessage("Role is required")
    .isIn(["student", "member", "instructor", "admin"])
    .withMessage("Role must be one of: student, member, instructor, admin"),
];

// ============================================
// Change Password Validation Rules
// ============================================

/**
 * Validation rules for authenticated password change
 */
export const changePasswordValidation: ValidationChain[] = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),

  passwordStrengthRules("newPassword"),

  body("confirmNewPassword")
    .notEmpty()
    .withMessage("Password confirmation is required")
    .custom((value: string, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error("New password and confirmation do not match");
      }
      return true;
    }),
];
