/**
 * Validation Utilities
 * Input validation using express-validator
 */

import { body, param, ValidationChain } from "express-validator";
import mongoose from "mongoose";

export const BOTHO_EMAIL_DOMAINS = ["bothouniversity.com", "bothouniversity.ac.bw"] as const;

export const isBothoEmail = (email: string): boolean => {
  const normalized = email.trim().toLowerCase();
  return BOTHO_EMAIL_DOMAINS.some((domain) => normalized.endsWith(`@${domain}`));
};

const bothoEmailRule = (field = "email"): ValidationChain =>
  body(field)
    .custom((value: string) => isBothoEmail(value))
    .withMessage("Email must use a Botho University domain");

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
    .custom((email: string) => {
      if (!isBothoUniversityEmail(email)) {
        throw new Error(BOTHO_EMAIL_ERROR);
      }
      return true;
    })
    .isLength({ max: 100 })
    .withMessage("Email cannot exceed 100 characters"),
  bothoEmailRule(),

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
  bothoEmailRule(),

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
  body("studentId").optional({ values: "falsy" }).trim()
    .isLength({ min: 3, max: 30 }).withMessage("Student ID must be between 3 and 30 characters")
    .matches(/^[A-Za-z0-9-]+$/).withMessage("Student ID can only contain letters, numbers, and hyphens"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail()
    .custom((email: string) => {
      if (!isBothoUniversityEmail(email)) {
        throw new Error(BOTHO_EMAIL_ERROR);
      }
      return true;
    })
    .isLength({ max: 100 })
    .withMessage("Email cannot exceed 100 characters"),
  bothoEmailRule(),

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
    .isIn(["student", "member", "mentor", "system_admin", "innovation_hub_admin"])
    .withMessage("Role must be one of: student, member, mentor, system_admin, innovation_hub_admin"),
  body("role").custom((role: string, { req }) => role !== "student" || Boolean(req.body.studentId?.trim()))
    .withMessage("Student ID is required for student users"),
];

/**
 * Validation rules for updating a user's role
 * Note: system_admin is intentionally not assignable through role management
 */
export const updateUserRoleValidation: ValidationChain[] = [
  body("role")
    .trim()
    .notEmpty()
    .withMessage("Role is required")
    .isIn(["student", "member", "mentor", "innovation_hub_admin"])
    .withMessage("Role must be one of: student, member, mentor, innovation_hub_admin"),
];

/**
 * Validation rules for admin updating a user's profile.
 * All fields are optional — only provided fields are updated.
 * studentId is only meaningful for student users (enforced in the service layer).
 */
export const adminUpdateUserValidation: ValidationChain[] = [
  body("email")
    .optional({ values: "falsy" })
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail()
    .isLength({ max: 100 })
    .withMessage("Email cannot exceed 100 characters")
    .custom((value: string) => isBothoEmail(value))
    .withMessage("Email must use a Botho University domain"),

  body("name")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters")
    .matches(/^[A-Za-z\s-]+$/)
    .withMessage("Name can only contain letters, spaces, and hyphens"),

  body("surname")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Surname must be between 2 and 50 characters")
    .matches(/^[A-Za-z\s'-]+$/)
    .withMessage("Surname can only contain letters, spaces, and hyphens"),

  body("studentId")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Student ID must be between 3 and 30 characters")
    .matches(/^[A-Za-z0-9-]+$/)
    .withMessage("Student ID can only contain letters, numbers, and hyphens"),

  // Ensure at least one field was provided
  body().custom((value) => {
    const { name, surname, email, studentId } = value || {};
    if (!name && !surname && !email && !studentId) {
      throw new Error("At least one field (name, surname, email, studentId) must be provided");
    }
    return true;
  }),
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

// ============================================
// Password Reset (OTP) Validation Rules
// ============================================

/**
 * Validation for requesting a reset OTP (forgot password)
 */
export const forgotPasswordValidation: ValidationChain[] = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
];

/**
 * Validation for verifying a reset OTP
 */
export const verifyOtpValidation: ValidationChain[] = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  body("otp")
    .trim()
    .notEmpty()
    .withMessage("OTP is required")
    .matches(/^\d{5}$/)
    .withMessage("OTP must be a 5-digit code"),
];

/**
 * Validation for confirming a password reset
 */
export const resetPasswordValidation: ValidationChain[] = [
  body("token")
    .trim()
    .notEmpty()
    .withMessage("Reset token is required"),
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
